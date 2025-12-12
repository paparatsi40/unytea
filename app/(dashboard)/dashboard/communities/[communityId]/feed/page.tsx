import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Home, Sparkles } from "lucide-react";

export default async function CommunityFeedPage({
  params,
}: {
  params: { communityId: string };
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Fetch community
  const community = await prisma.community.findFirst({
    where: {
      id: params.communityId,
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  if (!community) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {community.name} - Feed
        </h1>
        <p className="mt-2 text-muted-foreground">
          {community.description || "Welcome to your community feed"}
        </p>
      </div>

      {/* Professional Coming Soon */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-purple-500/5 p-12 text-center">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Sparkles className="h-12 w-12 text-primary" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Feed Coming in Next Update
          </h2>
          
          <p className="text-muted-foreground mb-6 text-lg">
            The community feed is currently in development. Soon you'll be able to:
          </p>

          <div className="grid gap-4 text-left max-w-md mx-auto mb-8">
            <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">✓</span>
              </div>
              <div>
                <p className="font-semibold text-foreground">Create Posts</p>
                <p className="text-sm text-muted-foreground">Share updates, questions, and discussions</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">✓</span>
              </div>
              <div>
                <p className="font-semibold text-foreground">Rich Media</p>
                <p className="text-sm text-muted-foreground">Upload images, videos, and files</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">✓</span>
              </div>
              <div>
                <p className="font-semibold text-foreground">Comments & Reactions</p>
                <p className="text-sm text-muted-foreground">Engage with your community</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            In the meantime, use <strong className="text-foreground">Chat</strong> for conversations and <strong className="text-foreground">Sessions</strong> for video calls.
          </p>
        </div>
      </div>
    </div>
  );
}
