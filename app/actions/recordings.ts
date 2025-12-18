"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { startRecording, stopRecording } from "@/lib/livekit/recording";
import { transcribeFromUrl, processTranscription } from "@/lib/ai/transcription";
import { revalidatePath } from "next/cache";

/**
 * Start recording a session
 */
export async function startSessionRecording(sessionId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get session details
    const mentorSession = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      include: {
        mentor: true,
        mentee: true,
      },
    });

    if (!mentorSession) {
      return { success: false, error: "Session not found" };
    }

    // Check if user is mentor or mentee
    if (
      mentorSession.mentorId !== session.user.id &&
      mentorSession.menteeId !== session.user.id
    ) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if recording already exists
    const existingRecording = await prisma.sessionRecording.findUnique({
      where: { sessionId },
    });

    if (existingRecording) {
      return {
        success: false,
        error: "Recording already exists for this session",
      };
    }

    // Start LiveKit recording
    const egressId = await startRecording({
      roomName: mentorSession.videoRoomName || `session-${sessionId}`,
      sessionId,
    });

    // Create recording record
    const recording = await prisma.sessionRecording.create({
      data: {
        sessionId,
        egressId,
        roomId: mentorSession.videoRoomName || `session-${sessionId}`,
        status: "PROCESSING",
        recordingUrl: "", // Will be updated when recording is complete
        startedAt: new Date(),
      },
    });

    revalidatePath(`/dashboard/sessions/${sessionId}`);

    return {
      success: true,
      recordingId: recording.id,
      egressId,
    };
  } catch (error) {
    console.error("Error starting recording:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to start recording",
    };
  }
}

/**
 * Stop recording a session
 */
export async function stopSessionRecording(sessionId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const recording = await prisma.sessionRecording.findUnique({
      where: { sessionId },
      include: {
        session: true,
      },
    });

    if (!recording) {
      return { success: false, error: "Recording not found" };
    }

    // Check permissions
    if (
      recording.session.mentorId !== session.user.id &&
      recording.session.menteeId !== session.user.id
    ) {
      return { success: false, error: "Unauthorized" };
    }

    // Stop LiveKit recording
    if (recording.egressId) {
      await stopRecording(recording.egressId);
    }

    // Update recording status
    await prisma.sessionRecording.update({
      where: { id: recording.id },
      data: {
        status: "PROCESSING",
        completedAt: new Date(),
      },
    });

    revalidatePath(`/dashboard/sessions/${sessionId}`);

    return { success: true };
  } catch (error) {
    console.error("Error stopping recording:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to stop recording",
    };
  }
}

/**
 * Get session recording with transcription
 */
export async function getSessionRecording(sessionId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const recording = await prisma.sessionRecording.findUnique({
      where: { sessionId },
      include: {
        session: {
          include: {
            mentor: true,
            mentee: true,
          },
        },
        transcription: true,
      },
    });

    if (!recording) {
      return { success: false, error: "Recording not found" };
    }

    // Check permissions
    if (
      recording.session.mentorId !== session.user.id &&
      recording.session.menteeId !== session.user.id
    ) {
      return { success: false, error: "Unauthorized" };
    }

    return {
      success: true,
      recording: {
        id: recording.id,
        sessionId: recording.sessionId,
        recordingUrl: recording.recordingUrl,
        thumbnailUrl: recording.thumbnailUrl,
        duration: recording.duration,
        fileSize: recording.fileSize,
        status: recording.status,
        startedAt: recording.startedAt,
        completedAt: recording.completedAt,
        transcription: recording.transcription
          ? {
              id: recording.transcription.id,
              fullText: recording.transcription.fullText,
              segments: recording.transcription.segments,
              summary: recording.transcription.summary,
              keyPoints: recording.transcription.keyPoints,
              actionItems: recording.transcription.actionItems,
              topics: recording.transcription.topics,
              language: recording.transcription.language,
              wordCount: recording.transcription.wordCount,
              status: recording.transcription.status,
            }
          : null,
      },
    };
  } catch (error) {
    console.error("Error getting recording:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to get recording",
    };
  }
}

/**
 * Process recording webhook from LiveKit
 * This is called when LiveKit finishes a recording
 */
export async function processRecordingWebhook(data: {
  egressId: string;
  roomName: string;
  fileUrl: string;
  duration?: number;
  fileSize?: number;
}) {
  try {
    console.log("📥 Processing recording webhook:", data);

    // Find recording by egressId
    const recording = await prisma.sessionRecording.findFirst({
      where: { egressId: data.egressId },
      include: { session: true },
    });

    if (!recording) {
      console.error("Recording not found for egressId:", data.egressId);
      return { success: false, error: "Recording not found" };
    }

    // Update recording with file URL
    await prisma.sessionRecording.update({
      where: { id: recording.id },
      data: {
        recordingUrl: data.fileUrl,
        duration: data.duration,
        fileSize: data.fileSize,
        status: "READY",
        completedAt: new Date(),
      },
    });

    console.log("✅ Recording updated successfully");

    // Start transcription process in background
    // In production, this should be a background job (BullMQ, Inngest, etc.)
    processRecordingTranscription(recording.id, data.fileUrl).catch((err) => {
      console.error("Error processing transcription:", err);
    });

    return { success: true };
  } catch (error) {
    console.error("Error processing recording webhook:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to process recording webhook",
    };
  }
}

/**
 * Process transcription for a recording
 * This should ideally run as a background job
 */
async function processRecordingTranscription(
  recordingId: string,
  videoUrl: string
) {
  try {
    console.log(`🎙️ Starting transcription for recording: ${recordingId}`);

    const recording = await prisma.sessionRecording.findUnique({
      where: { id: recordingId },
      include: { session: true },
    });

    if (!recording) {
      throw new Error("Recording not found");
    }

    // Create transcription record
    const transcription = await prisma.sessionTranscription.create({
      data: {
        recordingId,
        fullText: "",
        segments: [],
        status: "PROCESSING",
      },
    });

    try {
      // Transcribe audio using Whisper
      const transcriptionResult = await transcribeFromUrl(videoUrl);

      // Process with GPT-4 for summary and insights
      const aiResult = await processTranscription(
        transcriptionResult.fullText,
        `Session: ${recording.session.title}`
      );

      // Update transcription with results
      await prisma.sessionTranscription.update({
        where: { id: transcription.id },
        data: {
          fullText: transcriptionResult.fullText,
          segments: transcriptionResult.segments as any,
          summary: aiResult.summary,
          keyPoints: aiResult.keyPoints,
          actionItems: aiResult.actionItems,
          topics: aiResult.topics,
          language: transcriptionResult.language,
          wordCount: transcriptionResult.wordCount,
          status: "READY",
        },
      });

      console.log(`✅ Transcription completed for recording: ${recordingId}`);

      // TODO: Send notification to participants that recording is ready
    } catch (error) {
      console.error("Error during transcription:", error);

      // Update transcription with error
      await prisma.sessionTranscription.update({
        where: { id: transcription.id },
        data: {
          status: "ERROR",
          processingError:
            error instanceof Error ? error.message : "Transcription failed",
        },
      });

      // Update recording retry count
      await prisma.sessionRecording.update({
        where: { id: recordingId },
        data: {
          retryCount: { increment: 1 },
          processingError:
            error instanceof Error ? error.message : "Transcription failed",
        },
      });
    }
  } catch (error) {
    console.error("Error processing transcription:", error);
    throw error;
  }
}

/**
 * Get all recordings for a user's sessions
 */
export async function getUserRecordings() {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const recordings = await prisma.sessionRecording.findMany({
      where: {
        session: {
          OR: [
            { mentorId: session.user.id },
            { menteeId: session.user.id },
          ],
        },
        status: "READY",
      },
      include: {
        session: {
          include: {
            mentor: true,
            mentee: true,
          },
        },
        transcription: {
          select: {
            id: true,
            status: true,
            summary: true,
            topics: true,
          },
        },
      },
      orderBy: {
        completedAt: "desc",
      },
    });

    return {
      success: true,
      recordings: recordings.map((r) => ({
        id: r.id,
        sessionId: r.sessionId,
        sessionTitle: r.session.title,
        recordingUrl: r.recordingUrl,
        thumbnailUrl: r.thumbnailUrl,
        duration: r.duration,
        completedAt: r.completedAt,
        hasTranscription: r.transcription?.status === "READY",
        transcriptionSummary: r.transcription?.summary,
        topics: r.transcription?.topics || [],
      })),
    };
  } catch (error) {
    console.error("Error getting user recordings:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to get recordings",
    };
  }
}