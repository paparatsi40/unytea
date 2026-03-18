import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserAchievements } from "@/app/actions/achievements";
import { ACHIEVEMENT_CATEGORIES } from "@/lib/achievements-data";
import { Trophy } from "lucide-react";
import { AchievementGridCard } from "@/components/achievements/AchievementGridCard";

export const metadata = {
  title: "Achievements | Unytea",
  description: "Track your progress and unlock achievements",
};

export default async function AchievementsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const result = await getUserAchievements(session.user.id);

  if (!result.success || !result.achievements || !result.byCategory || !result.stats) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <div className="text-center">
          <Trophy className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            Failed to load achievements
          </h2>
          <p className="text-muted-foreground">
            {result.error || "An error occurred"}
          </p>
        </div>
      </div>
    );
  }

  const { byCategory, stats } = result;

  return (
    <div className="container max-w-6xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Trophy className="w-8 h-8 text-primary" />
            Achievements
          </h1>
          <p className="text-muted-foreground mt-2">
            Track your progress and unlock rewards
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-strong rounded-xl p-6">
          <div className="text-3xl font-bold text-primary mb-1">
            {stats.unlocked}/{stats.total}
          </div>
          <div className="text-sm text-muted-foreground">Achievements Unlocked</div>
          <div className="mt-3 bg-primary/10 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${(stats.unlocked / stats.total) * 100}%` }}
            />
          </div>
        </div>

        <div className="glass-strong rounded-xl p-6">
          <div className="text-3xl font-bold text-yellow-500 mb-1">
            {stats.totalPoints}
          </div>
          <div className="text-sm text-muted-foreground">Points Earned</div>
          <div className="mt-3 flex items-center gap-1">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-yellow-500">From Achievements</span>
          </div>
        </div>

        <div className="glass-strong rounded-xl p-6">
          <div className="text-3xl font-bold text-purple-500 mb-1">
            {Math.round((stats.unlocked / stats.total) * 100)}%
          </div>
          <div className="text-sm text-muted-foreground">Completion Rate</div>
          <div className="mt-3 text-xs text-muted-foreground">
            Keep going! 
          </div>
        </div>
      </div>

      {/* Achievements by Category */}
      {Object.entries(byCategory).map(([category, categoryAchievements]) => {
        const categoryInfo = ACHIEVEMENT_CATEGORIES[category as keyof typeof ACHIEVEMENT_CATEGORIES];
        const unlockedCount = categoryAchievements.filter(a => a.isUnlocked).length;

        return (
          <div key={category} className="space-y-4">
            {/* Category Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{categoryInfo.icon}</span>
                <div>
                  <h2 className="text-2xl font-bold">{categoryInfo.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {unlockedCount}/{categoryAchievements.length} unlocked
                  </p>
                </div>
              </div>
            </div>

            {/* Achievements Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryAchievements.map((achievement) => (
                <AchievementGridCard key={achievement.id} achievement={achievement} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
