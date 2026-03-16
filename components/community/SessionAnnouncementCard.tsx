"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, isToday, isTomorrow, formatDistanceToNow } from "date-fns";
import { Video, Calendar, Clock, Users, ArrowRight, Sparkles } from "lucide-react";
import { getSessionRSVPStatus, toggleSessionRSVP } from "@/app/actions/sessions";
import { askQuestionForNextSession } from "@/app/actions/public-sessions";
import { toast } from "sonner";

interface SessionAnnouncementCardProps {
  post: {
    id: string;
    title: string | null;
    content: string;
    createdAt: Date;
    communityId?: string;
    author: {
      id: string;
      name: string | null;
      image: string | null;
    };
    attachments?: {
      sessionId?: string;
      sessionTitle?: string;
      sessionDescription?: string;
      scheduledAt?: string;
      duration?: number;
      mentorId?: string;
      mentorName?: string;
      mentorImage?: string | null;
    } | null;
  };
}

export function SessionAnnouncementCard({ post }: SessionAnnouncementCardProps) {
  const sessionData = post.attachments;
  const [isHovered, setIsHovered] = useState(false);
  const [isAttending, setIsAttending] = useState(false);
  const [attendingCount, setAttendingCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [question, setQuestion] = useState("");
  const [isQuestionSubmitting, setIsQuestionSubmitting] = useState(false);

  if (!sessionData?.sessionId) {
    // Fallback to regular rendering if no session data
    return null;
  }

  const scheduledAt = sessionData.scheduledAt
    ? new Date(sessionData.scheduledAt)
    : null;

  const formatDate = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEEE, MMMM d");
  };

  const formatTime = (date: Date) => {
    return format(date, "h:mm a");
  };

  const isUpcoming = scheduledAt && scheduledAt > new Date();

  useEffect(() => {
    let mounted = true;

    async function loadRSVPStatus() {
      if (!sessionData?.sessionId || !isUpcoming) return;
      const result = await getSessionRSVPStatus(sessionData.sessionId);
      if (mounted && result.success) {
        setIsAttending(result.isAttending);
        setAttendingCount(result.attendingCount);
      }
    }

    loadRSVPStatus();
    return () => {
      mounted = false;
    };
  }, [sessionData?.sessionId, isUpcoming]);

  const handleToggleRSVP = async () => {
    if (!sessionData?.sessionId || !isUpcoming || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await toggleSessionRSVP(sessionData.sessionId, window.location.pathname);
      if (!result.success) {
        toast.error(result.error || "Could not update RSVP");
        return;
      }

      const nextAttending = result.action === "rsvped";
      setIsAttending(nextAttending);
      setAttendingCount((prev) => Math.max(0, prev + (nextAttending ? 1 : -1)));
      toast.success(nextAttending ? "You are attending this session" : "RSVP removed");
    } catch {
      toast.error("Could not update RSVP");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!post.communityId) {
      toast.error("Community context missing");
      return;
    }

    const trimmed = question.trim();
    if (trimmed.length < 5) {
      toast.error("Write at least 5 characters");
      return;
    }

    setIsQuestionSubmitting(true);
    try {
      const result = await askQuestionForNextSession({
        communityId: post.communityId,
        question: trimmed,
      });

      if (!result.success) {
        toast.error(result.error || "Could not post question");
        return;
      }

      setQuestion("");
      toast.success("Question added to discussion");
    } catch {
      toast.error("Could not post question");
    } finally {
      setIsQuestionSubmitting(false);
    }
  };

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-purple-200/50 bg-gradient-to-br from-purple-50 via-white to-pink-50 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-purple-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated background decoration */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-purple-200/30 blur-3xl transition-all group-hover:bg-purple-300/40" />
      <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-pink-200/30 blur-3xl transition-all group-hover:bg-pink-300/40" />

      {/* Header with badge */}
      <div className="relative flex items-center gap-3 border-b border-purple-100/50 px-6 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-md">
          <Video className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 text-xs">
              <Sparkles className="mr-1 h-3 w-3" />
              Live Session
            </Badge>
            <span className="text-xs text-zinc-500">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative px-6 py-5">
        {/* Session Title */}
        <h3 className="text-xl font-bold text-gray-900 group-hover:text-purple-700 transition-colors">
          {sessionData.sessionTitle || post.title}
        </h3>

        {sessionData.sessionDescription && (
          <p className="mt-2 text-sm text-gray-600 line-clamp-2">
            {sessionData.sessionDescription}
          </p>
        )}

        {/* Session Details */}
        {scheduledAt && (
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-purple-700 font-medium">
              <Calendar className="h-4 w-4" />
              {formatDate(scheduledAt)}
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <Clock className="h-4 w-4 text-gray-400" />
              {formatTime(scheduledAt)}
            </div>
            {sessionData.duration && (
              <div className="flex items-center gap-1.5 text-gray-600">
                <Clock className="h-4 w-4 text-gray-400" />
                {sessionData.duration} min
              </div>
            )}
            {isUpcoming && (
              <div className="flex items-center gap-1.5 text-gray-600">
                <Users className="h-4 w-4 text-gray-400" />
                {attendingCount} attending
              </div>
            )}
          </div>
        )}

        {/* Host Info */}
        {sessionData.mentorName && (
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-400 to-pink-400">
              {sessionData.mentorImage ? (
                <img
                  src={sessionData.mentorImage}
                  alt={sessionData.mentorName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-semibold text-white">
                  {sessionData.mentorName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <span className="text-sm text-gray-700">
              with <span className="font-medium">{sessionData.mentorName}</span>
            </span>
          </div>
        )}

        {/* Pre-live discussion */}
        {isUpcoming && (
          <div className="mt-5 rounded-xl border border-purple-200/70 bg-white/80 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-purple-700">
              Pre-session discussion
            </p>
            <div className="flex gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Drop your question for the host..."
                className="flex-1 rounded-md border border-purple-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-purple-400"
              />
              <Button
                type="button"
                onClick={handleAskQuestion}
                disabled={isQuestionSubmitting}
                className="bg-purple-600 text-white hover:bg-purple-700"
              >
                {isQuestionSubmitting ? "Posting..." : "Ask"}
              </Button>
            </div>
          </div>
        )}

        {/* CTA Buttons */}
        <div className="mt-5 space-y-2">
          {isUpcoming && (
            <Button
              type="button"
              variant={isAttending ? "outline" : "default"}
              disabled={isSubmitting}
              onClick={handleToggleRSVP}
              className={isAttending ? "w-full rounded-full" : "w-full rounded-full bg-emerald-600 text-white hover:bg-emerald-700"}
            >
              <Users className="mr-2 h-4 w-4" />
              {isSubmitting ? "Updating..." : isAttending ? "Attending" : "RSVP"}
            </Button>
          )}

          <Link href={`/dashboard/sessions/${sessionData.sessionId}/room`}>
            <Button
              className={`w-full rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold shadow-md transition-all ${
                isHovered ? "shadow-lg scale-[1.02]" : ""
              }`}
            >
              {isUpcoming ? (
                <>
                  <Video className="mr-2 h-4 w-4" />
                  Join Session
                </>
              ) : (
                <>
                  <Video className="mr-2 h-4 w-4" />
                  Enter Room
                </>
              )}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Bottom decoration */}
      <div className="relative h-1 w-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500" />
    </div>
  );
}
