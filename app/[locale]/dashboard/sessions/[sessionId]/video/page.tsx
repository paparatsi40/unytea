"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { EnhancedVideoCall } from "@/components/video-call/EnhancedVideoCall";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Video, Clock, User, Calendar } from "lucide-react";
import { Loader2 } from "lucide-react";
import { PointsNotification, usePointsNotifications } from "@/components/live-session/PointsNotification";
import { trackSessionJoin, trackSessionLeave } from "@/app/actions/live-gamification";
import { formatPointsNotification } from "@/lib/live-gamification";
import { FeedbackModal } from "@/components/live-session/FeedbackModal";
import { submitSessionFeedback, hasSubmittedFeedback } from "@/app/actions/session-feedback";

interface SessionData {
  id: string;
  title: string;
  description: string | null;
  scheduledAt: string;
  duration: number;
  status: string;
  videoRoomName: string | null;
  mentor: {
    id: string;
    name: string | null;
    image: string | null;
  };
  mentee: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

export default function SessionVideoPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.sessionId as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [inCall, setInCall] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [alreadyHasFeedback, setAlreadyHasFeedback] = useState(false);
  
  // Gamification
  const { currentNotification, addNotification, clearCurrent } = usePointsNotifications();

  useEffect(() => {
    if (sessionId) {
      fetchSession();
      checkFeedbackStatus();
    }
  }, [sessionId]);

  async function checkFeedbackStatus() {
    try {
      const hasFeedback = await hasSubmittedFeedback(sessionId);
      setAlreadyHasFeedback(hasFeedback);
    } catch (error) {
      console.error("Error checking feedback status:", error);
    }
  }

  async function fetchSession() {
    try {
      setLoading(true);
      const response = await fetch(`/api/sessions/${sessionId}`);
      
      if (!response.ok) {
        throw new Error("Failed to load session");
      }

      const data = await response.json();
      setSession(data.session);
      setCurrentUserId(data.currentUserId);
    } catch (err) {
      console.error("Error fetching session:", err);
      setError(err instanceof Error ? err.message : "Failed to load session");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinCall() {
    setInCall(true);
    
    // Track session join and award points
    try {
      const result = await trackSessionJoin(sessionId);
      if (result.success && !result.alreadyTracked) {
        const notification = formatPointsNotification("JOIN_SESSION", result.pointsEarned ?? 0);
        addNotification(
          result.pointsEarned ?? 0,
          notification.title,
          notification.message,
          notification.emoji
        );
      }
    } catch (error) {
      console.error("Error tracking session join:", error);
    }
  }

  async function handleLeaveCall() {
    // Track session leave and award bonus points if stayed full duration
    try {
      const result = await trackSessionLeave(sessionId);
      if (result.success && result.bonusPoints > 0) {
        const notification = formatPointsNotification("STAY_FULL_SESSION", result.bonusPoints);
        addNotification(
          result.bonusPoints,
          notification.title,
          notification.message,
          notification.emoji
        );
        
        // Wait for notification to show, then show feedback modal
        setTimeout(() => {
          setInCall(false);
          if (!alreadyHasFeedback) {
            setShowFeedbackModal(true);
          } else {
            router.push("/dashboard/sessions");
          }
        }, 3000);
        return;
      }
    } catch (error) {
      console.error("Error tracking session leave:", error);
    }
    
    setInCall(false);
    
    // Show feedback modal if user hasn't submitted feedback yet
    if (!alreadyHasFeedback) {
      setShowFeedbackModal(true);
    } else {
      router.push("/dashboard/sessions");
    }
  }

  async function handleFeedbackSubmit(rating: number, comment?: string) {
    try {
      await submitSessionFeedback(sessionId, rating, comment);
      setAlreadyHasFeedback(true);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      throw error;
    }
  }

  function handleFeedbackClose() {
    setShowFeedbackModal(false);
    router.push("/dashboard/sessions");
  }

  if (loading) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <h2 className="text-xl font-bold text-red-900">Error</h2>
          <p className="mt-2 text-red-700">{error || "Session not found"}</p>
          <Button
            onClick={() => router.push("/dashboard/sessions")}
            variant="outline"
            className="mt-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sessions
          </Button>
        </div>
      </div>
    );
  }

  // Verify user is mentor or mentee
  const isParticipant =
    currentUserId === session.mentor.id || currentUserId === session.mentee.id;

  if (!isParticipant) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-8 text-center">
          <h2 className="text-xl font-bold text-yellow-900">Access Denied</h2>
          <p className="mt-2 text-yellow-700">
            Only the mentor and mentee can join this video call.
          </p>
          <Button
            onClick={() => router.push("/dashboard/sessions")}
            variant="outline"
            className="mt-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sessions
          </Button>
        </div>
      </div>
    );
  }

  // Get room name and participant name
  const roomName = session.videoRoomName || `session-${session.id}`;
  const isMentor = currentUserId === session.mentor.id;
  const participantName = isMentor
    ? session.mentor.name || "Mentor"
    : session.mentee.name || "Mentee";

  // Format date and time
  const scheduledDate = new Date(session.scheduledAt);
  const formattedDate = scheduledDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = scheduledDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (inCall) {
    return (
      <>
        {/* Points Notification */}
        {currentNotification && (
          <PointsNotification
            points={currentNotification.points}
            title={currentNotification.title}
            message={currentNotification.message}
            emoji={currentNotification.emoji}
            show={true}
            onComplete={clearCurrent}
          />
        )}

        <div className="space-y-6 h-screen flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{session.title}</h1>
              <p className="mt-2 text-muted-foreground">
                {isMentor ? "Mentor" : "Mentee"} •{" "}
                {isMentor ? session.mentee.name : session.mentor.name}
              </p>
            </div>
            <Button variant="outline" onClick={handleLeaveCall}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Leave Call
            </Button>
          </div>

          {/* Enhanced Video Call with all Phase 1 features */}
          <div className="flex-1 px-6 pb-6">
            <EnhancedVideoCall
              roomName={roomName}
              participantName={participantName}
              userId={currentUserId!}
              onDisconnect={handleLeaveCall}
              isModerator={isMentor}
            />
          </div>

          {/* Gamification tip */}
          <div className="px-6 pb-6">
            <div className="rounded-lg border border-purple-200 bg-purple-50 dark:bg-purple-900/20 p-4">
              <div className="flex gap-3">
                <div className="text-2xl">🎮</div>
                <div>
                  <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                    Earn more points during this session!
                  </h3>
                  <p className="mt-1 text-xs text-purple-700 dark:text-purple-300">
                    Stay engaged to earn bonus points. Use reactions, participate in chat, and answer polls!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Modal */}
        <FeedbackModal
          isOpen={showFeedbackModal}
          onClose={handleFeedbackClose}
          onSubmit={handleFeedbackSubmit}
          sessionTitle={session?.title || "Session"}
        />
      </>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mentor Session</h1>
          <p className="mt-2 text-muted-foreground">
            Ready to start your video call
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/sessions")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Main Card */}
      <div className="rounded-2xl border bg-white p-8">
        {/* Session Info */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
              <Video className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{session.title}</h2>
              <p className="text-sm text-muted-foreground">
                {isMentor ? "with" : "with"}{" "}
                {isMentor ? session.mentee.name : session.mentor.name}
              </p>
            </div>
          </div>

          {session.description && (
            <p className="text-muted-foreground">{session.description}</p>
          )}
        </div>

        {/* Details Grid */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Date
            </div>
            <p className="font-semibold">{formattedDate}</p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Time & Duration
            </div>
            <p className="font-semibold">
              {formattedTime} • {session.duration}m
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              Your Role
            </div>
            <p className="font-semibold">{isMentor ? "Mentor" : "Mentee"}</p>
          </div>
        </div>

        {/* Join Button */}
        <Button onClick={handleJoinCall} className="w-full" size="lg">
          <Video className="mr-2 h-5 w-5" />
          Join Video Call
        </Button>
      </div>

      {/* Info Banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex gap-3">
          <div className="text-2xl">💡</div>
          <div>
            <h3 className="text-sm font-semibold text-blue-900">
              Before you join:
            </h3>
            <ul className="mt-2 space-y-1 text-xs text-blue-700">
              <li>• Make sure your camera and microphone are working</li>
              <li>• Find a quiet place with good lighting</li>
              <li>• Test your internet connection</li>
              <li>• Have any materials or notes ready</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Gamification Banner */}
      <div className="rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-4">
        <div className="flex gap-3">
          <div className="text-2xl">🎮</div>
          <div>
            <h3 className="text-sm font-semibold text-purple-900">
              Earn points during this session!
            </h3>
            <ul className="mt-2 space-y-1 text-xs text-purple-700">
              <li>• <strong>+10 points</strong> for joining the session</li>
              <li>• <strong>+30 points</strong> if you stay for the full duration</li>
              <li>• Stay engaged and earn bonus points for participation!</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={handleFeedbackClose}
        onSubmit={handleFeedbackSubmit}
        sessionTitle={session?.title || "Session"}
      />
    </div>
  );
}
