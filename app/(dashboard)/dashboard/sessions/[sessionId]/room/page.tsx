import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSession } from "@/app/actions/sessions";
import { VideoRoom } from "@/components/sessions/VideoRoom";
import { BackButton } from "@/components/navigation/BackButton";

export default async function SessionRoomPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
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
          <BackButton 
            fallbackUrl="/dashboard/sessions"
            label="Back to sessions"
            className="mt-4"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <BackButton 
          fallbackUrl="/dashboard/sessions"
          label="Back to Sessions"
        />

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

      {/* Video Room - onLeave is now optional, handles navigation internally */}
      <VideoRoom 
        roomName={videoSession.roomId} 
        sessionId={params.sessionId}
        userId={session.user.id}
        mentorId={videoSession.mentorId}
      />

    </div>
  );
}