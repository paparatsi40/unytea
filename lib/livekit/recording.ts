/**
 * LiveKit Recording Service
 * 
 * Handles automatic recording of video sessions using LiveKit Egress API
 */

import { EgressClient, EncodedFileOutput, RoomCompositeEgressRequest } from 'livekit-server-sdk';

const egressClient = new EgressClient(
  process.env.LIVEKIT_URL!,
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
);

export interface RecordingConfig {
  roomName: string;
  sessionId: string;
  outputPath?: string;
  width?: number;
  height?: number;
  videoCodec?: 'H264' | 'VP8' | 'VP9';
  audioCodec?: 'AAC' | 'OPUS';
}

export interface RecordingInfo {
  egressId: string;
  roomName: string;
  status: 'active' | 'ended' | 'failed';
  startedAt: number;
  endedAt?: number;
  fileUrl?: string;
  error?: string;
}

/**
 * Start recording a LiveKit room
 */
export async function startRecording(config: RecordingConfig): Promise<string> {
  try {
    const {
      roomName,
      sessionId,
      outputPath = `sessions/${sessionId}`,
      width: _width = 1920,
      height: _height = 1080,
      videoCodec: _videoCodec = 'H264',
      audioCodec: _audioCodec = 'AAC',
    } = config;

    console.log(`🎬 Starting recording for room: ${roomName}`);

    // Configure output to R2/S3
    const output = {
      fileType: 'MP4' as const, // or 'WEBM', 'OGG'
      filepath: `${outputPath}/recording.mp4`,
      // If using S3/R2 directly
      s3: {
        accessKey: process.env.R2_ACCESS_KEY_ID!,
        secret: process.env.R2_SECRET_ACCESS_KEY!,
        region: 'auto', // Cloudflare R2 uses 'auto'
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        bucket: process.env.R2_BUCKET_NAME!,
      },
    } as unknown as EncodedFileOutput;

    // Create room composite egress (records entire room view)
    const request: RoomCompositeEgressRequest = {
      roomName,
      layout: 'grid', // 'grid', 'speaker', or 'single-speaker'
      audioOnly: false,
      videoOnly: false,
      customBaseUrl: '', // Optional: custom layout URL
      file: output,
    };

    const egress = await egressClient.startRoomCompositeEgress(roomName, output, {
      layout: 'grid',
      audioOnly: false,
      videoOnly: false,
    });

    console.log(`✅ Recording started with egress ID: ${egress.egressId}`);

    return egress.egressId;
  } catch (error) {
    console.error('❌ Error starting recording:', error);
    throw new Error(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Stop an active recording
 */
export async function stopRecording(egressId: string): Promise<void> {
  try {
    console.log(`⏹️ Stopping recording: ${egressId}`);
    
    await egressClient.stopEgress(egressId);
    
    console.log(`✅ Recording stopped: ${egressId}`);
  } catch (error) {
    console.error('❌ Error stopping recording:', error);
    throw new Error(`Failed to stop recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get recording status
 */
export async function getRecordingStatus(egressId: string): Promise<RecordingInfo> {
  try {
    const egress = await egressClient.listEgress({ egressId });
    
    if (!egress || egress.length === 0) {
      throw new Error('Recording not found');
    }

    const recording = egress[0];
    
    return {
      egressId: recording.egressId,
      roomName: recording.roomName,
      status: recording.status === 'EGRESS_COMPLETE' ? 'ended' : 
              recording.status === 'EGRESS_FAILED' ? 'failed' : 'active',
      startedAt: Number(recording.startedAt),
      endedAt: recording.endedAt ? Number(recording.endedAt) : undefined,
      fileUrl: recording.file?.location,
      error: recording.error,
    };
  } catch (error) {
    console.error('❌ Error getting recording status:', error);
    throw new Error(`Failed to get recording status: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * List all recordings for a room
 */
export async function listRoomRecordings(roomName: string): Promise<RecordingInfo[]> {
  try {
    const egresses = await egressClient.listEgress({ roomName });
    
    return egresses.map(recording => ({
      egressId: recording.egressId,
      roomName: recording.roomName,
      status: recording.status === 'EGRESS_COMPLETE' ? 'ended' : 
              recording.status === 'EGRESS_FAILED' ? 'failed' : 'active',
      startedAt: Number(recording.startedAt),
      endedAt: recording.endedAt ? Number(recording.endedAt) : undefined,
      fileUrl: recording.file?.location,
      error: recording.error,
    }));
  } catch (error) {
    console.error('❌ Error listing recordings:', error);
    throw new Error(`Failed to list recordings: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}