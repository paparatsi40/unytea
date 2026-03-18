"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, isToday, isTomorrow } from "date-fns";
import { Calendar, Clock, Radio, Video } from "lucide-react";
import { getSessionFeedState } from "@/app/actions/community-feed";

type SessionAnnouncementAttachment = {
  sessionId?: string;
  sessionTitle?: string;
  sessionDescription?: string;
  scheduledAt?: string;
  duration?: number;
  mentorId?: string;
  mentorName?: string;
  mentorImage?: string | null;
};

type PostAttachment = {
  url: string;
  name: string;
  type: "image" | "document" | "media";
};

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
    attachments?: SessionAnnouncementAttachment | PostAttachment[] | null;
  };
}

export function SessionAnnouncementCard({ post }: SessionAnnouncementCardProps) {
  const sessionData = Array.isArray(post.attachments) ? null : post.attachments;
  const [sessionState, setSessionState] = useState<{
    status: string;
    hasRecording: boolean;
    recordingUrl: string | null;
    discussionCount: number;
  } | null>(null);

  if (!sessionData?.sessionId) {
    return null;
  }

  const scheduledAt = sessionData.scheduledAt ? new Date(sessionData.scheduledAt) : null;

  const formatDate = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEE, MMM d");
  };

  const formatTime = (date: Date) => format(date, "h:mm a");

  const isUpcoming = scheduledAt ? scheduledAt > new Date() : false;
  const effectiveStatus = sessionState?.status || (isUpcoming ? "SCHEDULED" : "COMPLETED");
  const isLive = effectiveStatus === "IN_PROGRESS";
  const hasRecording = !!sessionState?.hasRecording;

  useEffect(() => {
    let mounted = true;

    async function loadState() {
      if (!sessionData?.sessionId) return;
      const stateResult = await getSessionFeedState(sessionData.sessionId);
      if (!mounted) return;

      if (stateResult.success && stateResult.state) {
        setSessionState(stateResult.state);
      }
    }

    loadState();
    return () => {
      mounted = false;
    };
  }, [sessionData?.sessionId]);

  const ctaHref = isLive
    ? `/dashboard/sessions/${sessionData.sessionId}/room?src=feed_session_card_live`
    : hasRecording && sessionState?.recordingUrl
      ? `${sessionState.recordingUrl}${sessionState.recordingUrl.includes("?") ? "&" : "?"}src=feed_session_recording`
      : `/dashboard/sessions/${sessionData.sessionId}/room?src=feed_session_card`;

  const ctaLabel = isLive ? "Join live" : hasRecording ? "Watch recording" : "Open session";

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 text-purple-700">
            {isLive ? <Radio className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
          </div>
          <p className="text-xs font-medium text-gray-600">Session shared</p>
        </div>

        <Badge className={`border-0 text-[10px] ${isLive ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700"}`}>
          {isLive ? "Live" : hasRecording ? "Recording" : isUpcoming ? "Upcoming" : "Session"}
        </Badge>
      </div>

      <h3 className="text-sm font-semibold text-gray-900">{sessionData.sessionTitle || post.title || "Live session"}</h3>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-600">
        {scheduledAt && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-gray-400" />
            {formatDate(scheduledAt)}
          </span>
        )}

        {scheduledAt && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            {formatTime(scheduledAt)}
          </span>
        )}

        {sessionData.duration ? <span>{sessionData.duration} min</span> : null}
        {sessionData.mentorName ? <span>with {sessionData.mentorName}</span> : null}
      </div>

      <div className="mt-3">
        {hasRecording && sessionState?.recordingUrl ? (
          <Link href={ctaHref} target="_blank" rel="noreferrer">
            <Button size="sm" variant="outline" className="h-8 rounded-full px-3 text-xs">
              {ctaLabel}
            </Button>
          </Link>
        ) : (
          <Link href={ctaHref}>
            <Button size="sm" variant="outline" className="h-8 rounded-full px-3 text-xs">
              {ctaLabel}
            </Button>
          </Link>
        )}
      </div>
    </article>
  );
}
