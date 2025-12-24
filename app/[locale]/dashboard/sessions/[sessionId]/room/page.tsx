import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSession } from "@/app/actions/sessions";
import { VideoRoom } from "@/components/sessions/VideoRoom";
import { BackButton } from "@/components/navigation/BackButton";
import { getLocale } from "next-intl/server";

export default async function SessionRoomPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const locale = await getLocale();

  const { sessionId } = params;
  const result = await getSession(sessionId);

  if (!result.success || !result.session) {
    redirect(`/${locale}/dashboard/sessions`);
  }

  const videoSession = result.session;

  if (!videoSession.roomId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-destructive">Invalid session</p>
          <BackButton
            fallbackUrl={`/${locale}/dashboard/sessions`}
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
          fallbackUrl={`/${locale}/dashboard/sessions`}
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
