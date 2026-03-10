"use client";

import { useEffect, useState } from "react";
import { Trophy, Star, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface GamificationWidgetProps {
  userId: string;
}

export function GamificationWidget({ userId }: GamificationWidgetProps) {
  const [stats, setStats] = useState({
    level: 1,
    points: 0,
    nextLevelPoints: 100,
    achievements: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await fetch("/api/user/gamification-stats");
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Error loading gamification stats:", error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [userId]);

  const progressPercentage = Math.min(
    100,
    (stats.points / stats.nextLevelPoints) * 100
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <h3 className="font-semibold">Your Progress</h3>
          </div>
          <Badge variant="secondary" className="font-bold">
            <Star className="h-3 w-3 mr-1" />
            Level {stats.level}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Level Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {stats.level}
            </div>
            <div>
              <p className="font-semibold">Level {stats.level}</p>
              <p className="text-sm text-muted-foreground">
                {stats.points} XP
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{stats.points}</p>
            <p className="text-xs text-muted-foreground">Total XP</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress to Level {stats.level + 1}</span>
            <span className="font-medium">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {stats.nextLevelPoints - stats.points} XP needed for next level
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-bold">{stats.achievements}</p>
            <p className="text-xs text-muted-foreground">Achievements</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <Trophy className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
            <p className="text-lg font-bold">#{Math.max(1, 100 - stats.level * 5)}</p>
            <p className="text-xs text-muted-foreground">Ranking</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
