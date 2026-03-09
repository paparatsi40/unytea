import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSession } from "@/app/actions/sessions";
import { VideoRoom } from "@/components/sessions/VideoRoom";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function SessionRoomPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const result = await getSession(params.sessionId);

  if (!result.success || !result.session) {
    redirect("/dashboard/sessions");
  }

  const videoSession = result.session;

  if (!videoSession.roomId) {
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
        onLeave={() => {
          window.location.href = "/dashboard/sessions";
        }}
      />
    </div>
  );
}