"use client";
import { getSession } from "@/app/actions/sessions";
import { VideoRoom } from "@/components/sessions/VideoRoom";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SessionRoomPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useCurrentUser();
  const [videoSession, setVideoSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check auth
    if (!isAuthLoading && !user) {
      router.push("/auth/signin");
      return;
    }

    if (!isAuthLoading && user) {
      // Get session data
      getSession(params.sessionId).then((result) => {
        if (!result.success || !result.session) {
          router.push("/dashboard/sessions");
          return;
        }
        setVideoSession(result.session);
        setLoading(false);
      });
    }
  }, [params.sessionId, user, isAuthLoading, router]);

  if (isAuthLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!videoSession?.roomId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-destructive">Invalid session</p>
          <Link
            href="/dashboard/sessions"
            className="mt-4 text-sm text-primary hover:underline"
          >
            Back to sessions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/dashboard/sessions"
          className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sessions
        </Link>

        <div className="text-center">
          <h1 className="text-lg font-semibold text-foreground">
            {videoSession.title}
          </h1>
          {videoSession.description && (
            <p className="text-sm text-muted-foreground">
              {videoSession.description}
            </p>
          )}
        </div>

        <div className="w-32" /> {/* Spacer for centering */}
      </div>

      {/* Video Room */}
      <VideoRoom
        roomName={videoSession.roomId}
        sessionId={videoSession.id}
      />
    </div>
  );
}