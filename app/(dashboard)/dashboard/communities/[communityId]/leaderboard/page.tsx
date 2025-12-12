import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Trophy, Award } from "lucide-react";

export default async function CommunityLeaderboardPage({
  params,
}: {
  params: { communityId: string };
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const community = await prisma.community.findUnique({
    where: { id: params.communityId },
  });

  if (!community) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {community.name} - Leaderboard
        </h1>
        <p className="mt-2 text-muted-foreground">
          Gamification & achievements
        </p>
      </div>

      <div className="rounded-xl border border-border bg-gradient-to-br from-yellow-500/5 to-orange-500/5 p-12 text-center">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-yellow-500/10 p-4">
              <Trophy className="h-12 w-12 text-yellow-500" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Leaderboard Coming Soon
          </h2>
          
          <p className="text-muted-foreground mb-8 text-lg">
            Reward and motivate your most active community members.
          </p>

          <div className="grid gap-3 text-left max-w-sm mx-auto">
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
              <span className="text-foreground">Points & rankings</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
              <span className="text-foreground">Badges & achievements</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
              <span className="text-foreground">Activity streaks</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
              <span className="text-foreground">Rewards system</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
