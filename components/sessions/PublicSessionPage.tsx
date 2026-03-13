"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Users,
  Play,
  Headphones,
  Video,
  ArrowRight,
  Share2,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PublicSessionData } from "@/app/actions/public-sessions";
import { SessionTranscript } from "./SessionTranscript";
import { JoinSessionCTA } from "./JoinSessionCTA";

interface Props {
  session: PublicSessionData;
}

export function PublicSessionPage({ session }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "transcript" | "resources">("overview");

  const isLive = session.status === "IN_PROGRESS";
  const isUpcoming = session.status === "SCHEDULED";
  const isPast = session.status === "COMPLETED";
  const hasRecording = !!(session.recording?.status === "READY" && session.recording?.url);

  const formatDate = (date: Date) => {
    return format(date, "EEEE, MMMM do 'at' h:mm a");
  };

  const getStatusBadge = () => {
    if (isLive) return <Badge className="bg-red-500 animate-pulse">🔴 LIVE NOW</Badge>;
    if (isUpcoming) return <Badge className="bg-blue-500">📅 Upcoming</Badge>;
    if (hasRecording) return <Badge className="bg-green-500">🎥 Replay Available</Badge>;
    return <Badge className="bg-gray-500">Ended</Badge>;
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              U
            </div>
            <span className="font-semibold text-gray-900">Unytea</span>
          </div>
          <JoinSessionCTA session={session} />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <nav className="text-sm text-gray-500 mb-4">
          <a href="/" className="hover:text-gray-900">Unytea</a>
          {session.community && (
            <>
              <span className="mx-2">/</span>
              <a href={`/c/${session.community.slug}`} className="hover:text-gray-900">
                {session.community.name}
              </a>
            </>
          )}
          <span className="mx-2">/</span>
          <span className="text-gray-900">{session.title}</span>
        </nav>

        {/* Hero Section */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-8">
          <div className="p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                {getStatusBadge()}
                {session.mode === "AUDIO" ? (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Headphones className="w-3 h-3" />
                    Audio Only
                  </Badge>
                ) : (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Video className="w-3 h-3" />
                    Video
                  </Badge>
                )}
              </div>
              <button className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
                <Share2 className="w-4 h-4" />
                <span className="text-sm">Share</span>
              </button>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {session.title}
            </h1>

            {session.description && (
              <p className="text-lg text-gray-600 mb-6 max-w-3xl">
                {session.description}
              </p>
            )}

            {/* Host Info */}
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="w-14 h-14">
                <AvatarImage src={session.mentor.image || ""} />
                <AvatarFallback className="bg-violet-100 text-violet-700 text-lg">
                  {session.mentor.name?.[0] || "H"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-gray-900">{session.mentor.name || "Host"}</p>
                {session.mentor.bio && (
                  <p className="text-sm text-gray-500">{session.mentor.bio.slice(0, 100)}...</p>
                )}
              </div>
            </div>

            {/* Session Meta */}
            <div className="flex flex-wrap gap-6 text-sm text-gray-600 mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-violet-600" />
                {formatDate(session.scheduledAt)}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-violet-600" />
                {session.duration} minutes
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-600" />
                {session.attendeeCount} attending
              </div>
            </div>

            {/* CTA Button */}
            <div className="flex flex-wrap gap-3">
              {isLive && (
                <Button
                  size="lg"
                  className="bg-red-500 hover:bg-red-600 text-white animate-pulse"
                  onClick={() => router.push(`/dashboard/sessions/${session.id}/room`)}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Join Live Session
                </Button>
              )}
              {isUpcoming && (
                <Button
                  size="lg"
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                  onClick={() => router.push(`/signup?redirect=/dashboard/sessions/${session.id}/room`)}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  RSVP to Attend
                </Button>
              )}
              {hasRecording && (
                <Button
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => window.open(session.recording!.url!, "_blank")}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Watch Replay
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="border-t bg-gray-50">
            <div className="flex">
              {["overview", "transcript", "resources"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-6 py-3 text-sm font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? "border-b-2 border-violet-600 text-violet-700 bg-white"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        {activeTab === "overview" && (
          <div className="grid md:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="md:col-span-2 space-y-6">
              {/* What You'll Learn */}
              {session.notes?.keyInsights && session.notes.keyInsights.length > 0 && (
                <section className="bg-white rounded-xl p-6 shadow-sm border">
                  <h2 className="text-xl font-semibold mb-4">Key Takeaways</h2>
                  <ul className="space-y-3">
                    {session.notes.keyInsights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Session Summary */}
              {session.notes?.summary && (
                <section className="bg-white rounded-xl p-6 shadow-sm border">
                  <h2 className="text-xl font-semibold mb-4">Session Summary</h2>
                  <div className="prose max-w-none text-gray-700">
                    {session.notes.summary.split("\n").map((paragraph, i) => (
                      <p key={i} className="mb-4">{paragraph}</p>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Community Card */}
              {session.community && (
                <section className="bg-white rounded-xl p-6 shadow-sm border">
                  <h3 className="font-semibold mb-3">Hosted in</h3>
                  <a
                    href={`/c/${session.community.slug}`}
                    className="flex items-center gap-3 group"
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={session.community.imageUrl || ""} />
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
                        {session.community.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium group-hover:text-violet-600 transition-colors">
                        {session.community.name}
                      </p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        Join community
                        <ArrowRight className="w-3 h-3" />
                      </p>
                    </div>
                  </a>
                </section>
              )}

              {/* Series Info */}
              {session.series && (
                <section className="bg-white rounded-xl p-6 shadow-sm border">
                  <h3 className="font-semibold mb-3">Part of a series</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    This session is part of a {session.series.frequency.toLowerCase()} series that
                    repeats every {session.series.interval} {session.series.frequency.toLowerCase()}s.
                  </p>
                  <Badge variant="outline" className="text-violet-600 border-violet-200">
                    Recurring Session
                  </Badge>
                </section>
              )}

              {/* Recording Info */}
              {session.recording && (
                <section className="bg-white rounded-xl p-6 shadow-sm border">
                  <h3 className="font-semibold mb-3">Recording</h3>
                  <div className="flex items-center gap-2 text-sm mb-2">
                    {session.recording.status === "PROCESSING" && (
                      <>
                        <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                        <span className="text-yellow-600">Processing...</span>
                      </>
                    )}
                    {session.recording.status === "READY" && (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-green-600">Available</span>
                      </>
                    )}
                    {session.recording.status === "FAILED" && (
                      <span className="text-red-600">Unavailable</span>
                    )}
                  </div>
                  {session.recording.durationSeconds && (
                    <p className="text-sm text-gray-500">
                      Duration: {Math.floor(session.recording.durationSeconds / 60)}:
                      {String(session.recording.durationSeconds % 60).padStart(2, "0")}
                    </p>
                  )}
                </section>
              )}
            </div>
          </div>
        )}

        {activeTab === "transcript" && (
          <SessionTranscript sessionId={session.id} hasAccess={isPast || hasRecording} />
        )}

        {activeTab === "resources" && (
          <div className="bg-white rounded-xl p-8 shadow-sm border">
            <h2 className="text-xl font-semibold mb-4">Session Resources</h2>
            {session.notes?.resources && session.notes.resources.length > 0 ? (
              <ul className="space-y-3">
                {session.notes.resources.map((resource, i) => (
                  <li key={i}>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg border hover:border-violet-300 hover:bg-violet-50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                        <span className="text-violet-600 text-xs font-bold uppercase">
                          {resource.type.slice(0, 3)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{resource.title}</p>
                        <p className="text-sm text-gray-500">{resource.type}</p>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No resources available for this session yet.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
