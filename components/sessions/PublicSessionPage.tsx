"use client";

import { useEffect, useState } from "react";
import { askQuestionForNextSession } from "@/app/actions/public-sessions";
import { getSessionRSVPStatus, setSessionRSVPStatus } from "@/app/actions/sessions";
import { useRouter, useSearchParams } from "next/navigation";
import { Play, Calendar, Users, Clock, Share2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

interface PublicSessionPageProps {
  locale?: string;
  session: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    status: string;
    visibility: string;
    canWatchRecording: boolean;
    isMember: boolean;
    scheduledAt: Date;
    duration: number | null;
    attendeeCount: number;
    host: {
      id: string;
      name: string | null;
      image: string | null;
      bio: string | null;
    };
    community: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      imageUrl: string | null;
      memberCount: number;
    };
    recording: {
      id: string;
      url: string | null;
      status: string;
      durationSeconds: number | null;
    } | null;
    notes: {
      id: string;
      content: string;
      summary: string | null;
      keyInsights: string[];
      chapters: { title: string; timestamp?: string }[];
      quotes: { text: string; reason?: string }[];
      createdAt: Date;
    } | null;
};
  relatedSessions?: {
    id: string;
    slug: string | null;
    title: string;
    description: string | null;
    scheduledAt: Date;
    host: {
      id: string;
      name: string | null;
      image: string | null;
    };
    attendeeCount: number;
    duration: number | null;
  }[];
  nextSession?: {
    id: string;
    title: string;
    scheduledAt: Date;
    duration: number | null;
  } | null;
  relatedCommunities?: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    memberCount: number;
    nextSession: {
      id: string;
      title: string;
      scheduledAt: Date;
      attendingCount: number;
    } | null;
  }[];
}

export function PublicSessionPage({ locale = "en", session, relatedSessions, nextSession, relatedCommunities }: PublicSessionPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
const [isPlaying, setIsPlaying] = useState(false);
  const [question, setQuestion] = useState("");
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);
  const [questionMessage, setQuestionMessage] = useState<string | null>(null);
  const [isRSVPLoading, setIsRSVPLoading] = useState(false);
  const [nextRsvpStatus, setNextRsvpStatus] = useState<"attending" | "interested" | null>(null);
  const [nextAttendingCount, setNextAttendingCount] = useState<number | null>(null);
  const [nextInterestedCount, setNextInterestedCount] = useState<number | null>(null);
  const [nextAttendingPreview, setNextAttendingPreview] = useState<Array<{ id: string; name: string | null; image: string | null }>>([]);
  const [rsvpMessage, setRsvpMessage] = useState<string | null>(null);

  const formattedDate = format(new Date(session.scheduledAt), "MMMM d, yyyy");
  const canViewPremiumContent = session.canWatchRecording || session.isMember;
  const ref = searchParams?.get("ref") || null;
  const src = searchParams?.get("src") || null;
  const joinParams = new URLSearchParams();
  if (ref) joinParams.set("ref", ref);
  joinParams.set("src", "public_session_join_cta");
  if (src) joinParams.set("parent_src", src);
  const joinCommunityHref = `/c/${session.community.slug}${joinParams.toString() ? `?${joinParams.toString()}` : ""}`;
const roomParams = new URLSearchParams();
  roomParams.set("src", "public_next_live_card");
  if (ref) roomParams.set("ref", ref);
  if (src) roomParams.set("parent_src", src);
  const nextSessionRoomHref = `/dashboard/sessions/${nextSession?.id}/room?${roomParams.toString()}`;
  const formattedDuration = session.recording?.durationSeconds
? `${Math.round(session.recording.durationSeconds / 60)} min`
    : session.duration
    ? `${session.duration} min`
    : null;

  const buildGoogleCalendarUrl = (item: { title: string; description?: string | null; scheduledAt: Date; duration?: number | null; }) => {
    const start = new Date(item.scheduledAt);
    const end = new Date(start.getTime() + (item.duration || 60) * 60 * 1000);
    const formatCalDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: item.title,
      details: item.description || "Join this live session on Unytea.",
      dates: `${formatCalDate(start)}/${formatCalDate(end)}`,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const downloadAppleCalendarIcs = (item: { id: string; title: string; description?: string | null; scheduledAt: Date; duration?: number | null; }) => {
    const start = new Date(item.scheduledAt);
    const end = new Date(start.getTime() + (item.duration || 60) * 60 * 1000);
    const formatCalDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Unytea//Session//EN",
      "BEGIN:VEVENT",
      `UID:${item.id}@unytea`,
      `DTSTAMP:${formatCalDate(new Date())}`,
      `DTSTART:${formatCalDate(start)}`,
      `DTEND:${formatCalDate(end)}`,
      `SUMMARY:${(item.title || "Unytea Session").replace(/,/g, "\\,")}`,
      `DESCRIPTION:${(item.description || "Join this live session on Unytea.").replace(/\n/g, " ").replace(/,/g, "\\,")}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${item.title || "unytea-session"}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.set("src", "public_share");

    if (navigator.share) {
      await navigator.share({
        title: session.title,
        text: `Watch "${session.title}" by ${session.host.name} on Unytea`,
        url: shareUrl.toString(),
      });
    } else {
      await navigator.clipboard.writeText(shareUrl.toString());
    }
  };

  const shareToNetwork = (network: "twitter" | "linkedin" | "whatsapp") => {
    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.set("src", "public_share_network");
    const text = encodeURIComponent(`Join this live session: ${session.title}`);
    const url = encodeURIComponent(shareUrl.toString());

    const target =
      network === "twitter"
        ? `https://twitter.com/intent/tweet?text=${text}&url=${url}`
        : network === "linkedin"
        ? `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
        : `https://wa.me/?text=${text}%20${url}`;

    window.open(target, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    let active = true;

    async function loadNextSessionRsvp() {
      if (!nextSession) return;
      const status = await getSessionRSVPStatus(nextSession.id);
      if (!active || !status.success) return;
      setNextRsvpStatus(status.status);
      setNextAttendingCount(status.attendingCount);
      setNextInterestedCount(status.interestedCount || 0);
      setNextAttendingPreview(status.attendingPreview || []);
    }

    loadNextSessionRsvp();
    return () => {
      active = false;
    };
  }, [nextSession?.id]);

  const handleSetNextSessionRSVP = async (status: "attending" | "interested") => {
    if (!nextSession) return;
    setIsRSVPLoading(true);
    setRsvpMessage(null);

    const result = await setSessionRSVPStatus(nextSession.id, status);
    if (result.success) {
      setNextRsvpStatus(result.status ?? null);
      setNextAttendingCount(result.attendingCount || 0);
      setNextInterestedCount(result.interestedCount || 0);
      setNextAttendingPreview(result.attendingPreview || []);
      if (!result.status) {
        setRsvpMessage("RSVP removed.");
      } else if (result.status === "attending") {
        setRsvpMessage("You're attending the next live session.");
      } else {
        setRsvpMessage("Marked as interested.");
      }
    } else {
      setRsvpMessage(result.error || "Could not update RSVP.");
    }

    setIsRSVPLoading(false);
  };

  const handleAskQuestion = async () => {
    if (!nextSession) return;
    setQuestionMessage(null);
    setIsSubmittingQuestion(true);

    const sourceParts = ["public_session_page_ask", src, ref].filter(Boolean);
    const result = await askQuestionForNextSession({
      communityId: session.community.id,
      question,
      source: sourceParts.join("_"),
    });

    if (result.success) {
      setQuestion("");
      setQuestionMessage("Question submitted for the next live session.");
    } else {
      setQuestionMessage(result.error || "Could not submit your question.");
    }

    setIsSubmittingQuestion(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Navigation */}
      <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
              className="text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Unytea
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="text-zinc-400 hover:text-white"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button variant="ghost" size="sm" onClick={() => shareToNetwork("twitter")} className="text-zinc-400 hover:text-white">X</Button>
              <Button variant="ghost" size="sm" onClick={() => shareToNetwork("linkedin")} className="text-zinc-400 hover:text-white">LinkedIn</Button>
              <Button variant="ghost" size="sm" onClick={() => shareToNetwork("whatsapp")} className="text-zinc-400 hover:text-white">WhatsApp</Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Badge className={`mb-3 border ${session.canWatchRecording ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border-amber-500/30"}`}>
            {session.canWatchRecording ? "Recording Available" : "Members-only recording"}
          </Badge>
          <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            {session.title}
          </h1>
          <p className="mb-4 text-lg text-zinc-400 max-w-3xl">
            {session.description}
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {formattedDate}
            </div>
            {formattedDuration && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {formattedDuration}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {session.attendeeCount} attended
            </div>
          </div>
        </div>

        {/* Video Player */}
        {session.recording?.url && (
          <div className="mb-8 aspect-video overflow-hidden rounded-xl bg-zinc-900">
            {isPlaying ? (
              <video
                src={session.recording.url}
                controls
                autoPlay
                className="h-full w-full"
              />
            ) : (
              <div
                onClick={() => setIsPlaying(true)}
                className="flex h-full cursor-pointer items-center justify-center bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <Play className="h-10 w-10 fill-current" />
                  </div>
                  <span className="text-zinc-400">Click to play recording</span>
                </div>
              </div>
            )}
          </div>
        )}

        {session.recording && !session.recording.url && (
          <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
            <h3 className="text-lg font-semibold text-white">Members-only replay</h3>
            <p className="mt-2 text-sm text-zinc-300">
              This recording is available to community members. Join to watch the full replay and attend the next live session.
            </p>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="about" className="w-full">
              <TabsList className="mb-6 bg-zinc-900">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="notes" disabled={!session.notes || !canViewPremiumContent}>
                  Notes {session.notes && canViewPremiumContent && "✓"}
                </TabsTrigger>
                <TabsTrigger value="community">Community</TabsTrigger>
              </TabsList>

              <TabsContent value="about" className="space-y-6">
                {/* Host Card */}
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={session.host.image || undefined} />
                        <AvatarFallback className="bg-zinc-700 text-white">
                          {session.host.name?.charAt(0).toUpperCase() || "H"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">
                          Hosted by {session.host.name}
                        </h3>
                        <p className="text-sm text-zinc-500">
                          Live session host at {session.community.name}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {session.notes?.summary && canViewPremiumContent && (
                  <Card className="border-zinc-800 bg-zinc-900/50">
                    <CardContent className="p-6">
                      <h3 className="mb-2 font-semibold text-white">AI Summary</h3>
                      <p className="text-zinc-300">{session.notes.summary}</p>

                      {session.notes.keyInsights.length > 0 && (
                        <div className="mt-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Key takeaways</p>
                          <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-300">
                            {session.notes.keyInsights.slice(0, 5).map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {session.notes.chapters.length > 0 && (
                        <div className="mt-5">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Chapters</p>
                          <div className="space-y-2">
                            {session.notes.chapters.slice(0, 6).map((chapter, idx) => (
                              <div key={idx} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm">
                                <span className="text-zinc-200">{chapter.title}</span>
                                {chapter.timestamp && <span className="text-zinc-500">{chapter.timestamp}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {session.notes.quotes.length > 0 && (
                        <div className="mt-5">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Key quotes</p>
                          <div className="space-y-3">
                            {session.notes.quotes.slice(0, 3).map((quote, idx) => (
                              <blockquote key={idx} className="rounded-md border-l-2 border-emerald-500/50 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-300">
                                “{quote.text}”
                                {quote.reason && (
                                  <div className="mt-1 text-xs text-zinc-500">{quote.reason}</div>
                                )}
                              </blockquote>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Session Notes */}
                {session.notes?.content && canViewPremiumContent && (
                  <Card className="border-zinc-800 bg-zinc-900/50">
                    <CardContent className="p-6">
                      <h3 className="mb-4 font-semibold text-white">Session Notes</h3>
                      <div className="prose prose-invert max-w-none text-zinc-300">
                        {session.notes.content}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {session.notes && !canViewPremiumContent && (
                  <Card className="border-amber-500/30 bg-amber-500/10">
                    <CardContent className="p-6">
                      <h3 className="mb-2 font-semibold text-white">Members-only insights</h3>
                      <p className="text-sm text-zinc-300">
                        Join the community to unlock AI summary, key takeaways, chapters, and full session notes.
                      </p>
                      <Button
                        className="mt-4 bg-emerald-500 text-white hover:bg-emerald-600"
                        onClick={() => router.push(joinCommunityHref)}
                      >
                        Join to unlock insights
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="notes">
                {session.notes?.content && canViewPremiumContent ? (
                  <Card className="border-zinc-800 bg-zinc-900/50">
                    <CardContent className="p-6">
                      <div className="prose prose-invert max-w-none text-zinc-300">
                        {session.notes.content}
                      </div>
                    </CardContent>
                  </Card>
                ) : session.notes && !canViewPremiumContent ? (
                  <Card className="border-amber-500/30 bg-amber-500/10">
                    <CardContent className="p-6">
                      <p className="text-sm text-zinc-300">
                        Notes are available for community members only.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <p className="text-zinc-500">No notes available for this session.</p>
                )}
              </TabsContent>

              <TabsContent value="community">
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={session.community.imageUrl || undefined} />
                        <AvatarFallback className="bg-zinc-700 text-white">
                          {session.community.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-white">
                          {session.community.name}
                        </h3>
                        <p className="mb-2 text-sm text-zinc-500">
                          {session.community.memberCount} members
                        </p>
                        <p className="text-zinc-400">
                          {session.community.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Related Sessions */}
            {relatedSessions && relatedSessions.length > 0 && (
              <div className="mt-8">
                <h3 className="mb-4 text-xl font-semibold text-white">
                  Related sessions
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {relatedSessions.map((related) => {
                    const hasPublicPage = Boolean(related.slug);
                    return (
                      <Card
                        key={related.id}
                        className={`border-zinc-800 bg-zinc-900/50 transition-colors ${hasPublicPage ? "cursor-pointer hover:bg-zinc-800" : "opacity-70"}`}
                        onClick={() => {
                          if (!hasPublicPage) return;
                          const qs = new URLSearchParams();
                          if (ref) qs.set("ref", ref);
                          qs.set("src", "public_related_card");
                          if (src) qs.set("parent_src", src);
                          const suffix = qs.toString() ? `?${qs.toString()}` : "";
                          router.push(`/${locale}/s/${related.slug}${suffix}`);
                        }}
                      >
                        <CardContent className="p-4">
                          <h4 className="mb-2 font-medium text-white line-clamp-2">
                            {related.title}
                          </h4>
                          <div className="flex items-center gap-3 text-sm text-zinc-500">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={related.host.image || undefined} />
                              <AvatarFallback className="bg-zinc-700 text-xs">
                                {related.host.name?.charAt(0) || "H"}
                              </AvatarFallback>
                            </Avatar>
                            <span>{related.host.name}</span>
                          </div>
                          {!hasPublicPage && (
                            <p className="mt-2 text-xs text-zinc-500">No public page for this session</p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cross-community discovery */}
            {relatedCommunities && relatedCommunities.length > 0 && (
              <div className="mt-8">
                <h3 className="mb-2 text-xl font-semibold text-white">Other communities hosting this week</h3>
                <p className="mb-4 text-sm text-zinc-400">Discover active communities and join their next live sessions.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {relatedCommunities.map((community) => (
                    <Card
                      key={community.id}
                      className="cursor-pointer border-zinc-800 bg-zinc-900/50 transition-colors hover:bg-zinc-800"
                      onClick={() => router.push(`/${locale}/community/${community.slug}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={community.imageUrl || undefined} />
                            <AvatarFallback className="bg-zinc-700 text-white">
                              {community.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-white truncate">{community.name}</p>
                            <p className="mt-1 text-xs text-zinc-400">{community.memberCount} members</p>
                            {community.nextSession && (
                              <p className="mt-2 text-xs text-emerald-400">
                                {format(new Date(community.nextSession.scheduledAt), "EEE, MMM d · h:mm a")} · {community.nextSession.attendingCount} attending
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar — CTA */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4 border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={session.community.imageUrl || undefined} />
                    <AvatarFallback className="bg-zinc-700">
                      {session.community.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-white">
                      {session.community.name}
                    </h3>
                    <p className="text-sm text-zinc-500">
                      {session.community.memberCount} members
                    </p>
                  </div>
                </div>

                <p className="mb-6 text-sm text-zinc-400">
                  Join this community to access live sessions, recordings, and connect with like-minded people.
                </p>

                {nextSession && (
                  <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
                      Next live session
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">{nextSession.title}</p>
                    <p className="mt-1 text-xs text-zinc-300">
                      {format(new Date(nextSession.scheduledAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                    <p className="mt-1 text-xs text-zinc-300">
                      {nextAttendingCount ?? 0} attending · {nextInterestedCount ?? 0} interested
                    </p>
                    {nextAttendingPreview.length > 0 && (
                      <div className="mt-2 flex -space-x-2">
                        {nextAttendingPreview.slice(0, 5).map((member) => (
                          <Avatar key={member.id} className="h-6 w-6 border border-zinc-900">
                            <AvatarImage src={member.image || ""} alt={member.name || "Member"} />
                            <AvatarFallback className="bg-zinc-800 text-[10px] text-zinc-200">
                              {(member.name || "M").slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    )}
                    {session.isMember ? (
                      <>
                        <Button
                          onClick={() => handleSetNextSessionRSVP("attending")}
                          disabled={isRSVPLoading}
                          variant={nextRsvpStatus === "attending" ? "secondary" : "default"}
                          className={`mt-3 w-full ${nextRsvpStatus === "attending" ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700" : "bg-emerald-500 text-white hover:bg-emerald-600"}`}
                        >
                          {isRSVPLoading ? "Updating..." : "Attending"}
                        </Button>
                        <Button
                          onClick={() => handleSetNextSessionRSVP("interested")}
                          disabled={isRSVPLoading}
                          variant={nextRsvpStatus === "interested" ? "secondary" : "outline"}
                          className={`mt-2 w-full ${nextRsvpStatus === "interested" ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700" : "border-zinc-700 text-zinc-200 hover:bg-zinc-800"}`}
                        >
                          {isRSVPLoading ? "Updating..." : "Interested"}
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          className="mt-2 w-full border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                        >
                          <a href={buildGoogleCalendarUrl({
                            title: nextSession.title,
                            description: session.description,
                            scheduledAt: new Date(nextSession.scheduledAt),
                            duration: nextSession.duration,
                          })} target="_blank" rel="noreferrer">
                            Add to Google Calendar
                          </a>
                        </Button>
                        <Button
                          onClick={() =>
                            downloadAppleCalendarIcs({
                              id: nextSession.id,
                              title: nextSession.title,
                              description: session.description,
                              scheduledAt: new Date(nextSession.scheduledAt),
                              duration: nextSession.duration,
                            })
                          }
                          variant="outline"
                          className="mt-2 w-full border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                        >
                          Add to Apple Calendar
                        </Button>
                        {rsvpMessage && (
                          <p className="mt-2 text-xs text-zinc-300">{rsvpMessage}</p>
                        )}
                        <Button
                          onClick={() => router.push(nextSessionRoomHref)}
                          variant="outline"
                          className="mt-2 w-full border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                        >
                          View session room
                        </Button>
</>
                    ) : (
                      <p className="mt-2 text-xs text-zinc-300">Join community to RSVP and participate live.</p>
                    )}
                  </div>
                )}

                {nextSession && session.isMember && (
                  <div className="mb-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Ask a question for next session
                    </p>
                    <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Drop your question for the host..."
                      className="min-h-[84px] w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
                    />
                    <Button
                      disabled={isSubmittingQuestion || question.trim().length < 5}
                      onClick={handleAskQuestion}
                      className="w-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                    >
                      {isSubmittingQuestion ? "Submitting..." : "Submit Question"}
                    </Button>
                    {questionMessage && (
                      <p className="text-xs text-zinc-400">{questionMessage}</p>
                    )}
                  </div>
                )}

                <Button
                  className="mb-3 w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={() => router.push(joinCommunityHref)}
                >
                  {session.isMember ? "Go to Community" : "Join Community"}
                </Button>

                <Button
                  variant="outline"
                  className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  onClick={() => router.push(`/${locale}/explore`)}
                >
                  Explore Communities
                </Button>

                {!session.isMember && (
                  <p className="mt-4 text-center text-xs text-zinc-500">
                    Free to join. No credit card required.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}