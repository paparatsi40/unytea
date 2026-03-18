import { CheckCircle2, Lock } from "lucide-react";
import { RARITY_CONFIG } from "@/lib/achievements-data";

type AchievementItem = {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  rarity: keyof typeof RARITY_CONFIG;
  isUnlocked: boolean;
  unlockedAt: Date | null;
  progress: number;
};

export function AchievementGridCard({ achievement }: { achievement: AchievementItem }) {
  const rarityConfig = RARITY_CONFIG[achievement.rarity];

  return (
    <div
      className={`relative glass-strong rounded-xl p-6 transition-all duration-300 ${
        achievement.isUnlocked ? "hover:shadow-lg hover:scale-[1.02]" : "opacity-75"
      }`}
    >
      <div className="absolute top-3 right-3">
        <span className="text-xs px-2 py-1 rounded-full font-medium bg-muted text-muted-foreground">
          {rarityConfig.name}
        </span>
      </div>

      <div className="flex items-start gap-4 mb-4">
        <div className="text-5xl">{achievement.icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
            {achievement.name}
            {achievement.isUnlocked ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            ) : (
              <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )}
          </h3>
          <p className="text-sm text-muted-foreground">{achievement.description}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Reward</span>
          <span className="font-semibold text-primary">+{achievement.points} points</span>
        </div>

        {!achievement.isUnlocked ? (
          <>
            <div className="bg-primary/10 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${achievement.progress}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground text-right">
              {achievement.progress}% complete
            </div>
          </>
        ) : (
          achievement.unlockedAt && (
            <div className="text-xs text-muted-foreground">
              Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
            </div>
          )
        )}
      </div>
    </div>
  );
}
