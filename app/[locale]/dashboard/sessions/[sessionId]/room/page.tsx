import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSession } from "@/app/actions/sessions";
import { VideoRoom } from "@/components/sessions/VideoRoom";
import { BackButton } from "@/components/navigation/BackButton";
import { getLocale } from "next-intl/server";

export default async function SessionRoomPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const session = await auth();
  const locale = await getLocale();
  
  if (!session?.user?.id) {
    redirect(`/${locale}/auth/signin`);
  }

  const { sessionId } = await params;
  
  // Check if sessionId is valid
  if (!sessionId || sessionId === 'undefined') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-destructive">Invalid session ID</p>
          <BackButton
            fallbackUrl={`/${locale}/dashboard`}
            label="Back to Dashboard"
            className="mt-4"
          />
        </div>
      </div>
    );
  }
  
  const result = await getSession(sessionId);

  if (!result.success || !result.session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-lg text-destructive mb-2">Session not found</p>
          <p className="text-sm text-muted-foreground mb-4">
            {result.error || "Unable to load this session. It may have been deleted or you don't have access to it."}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Session ID: {sessionId}
          </p>
          <BackButton
            fallbackUrl={`/${locale}/dashboard`}
            label="Back to Dashboard"
            className="mt-4"
          />
        </div>
      </div>
    );
  }

  const videoSession = result.session;

  if (!videoSession.roomId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-destructive">Invalid session - No room ID</p>
          <BackButton
            fallbackUrl={`/${locale}/dashboard`}
            label="Back to Dashboard"
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
          fallbackUrl={`/${locale}/dashboard`}
          label="Back to Dashboard"
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

        <div className="w-32" />
      </div>

      <VideoRoom
        roomName={videoSession.roomId}
        sessionId={sessionId}
        userId={session.user.id}
        mentorId={videoSession.mentorId}
      />
    </div>
  );
}
