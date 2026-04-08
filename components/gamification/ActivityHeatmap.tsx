"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { format, subDays, startOfWeek, eachDayOfInterval } from "date-fns";

interface ActivityDay {
  date: string; // yyyy-MM-dd
  total: number;
}

interface ActivityHeatmapProps {
  data: ActivityDay[];
  weeks?: number; // Number of weeks to show (default 12)
}

export function ActivityHeatmap({ data, weeks = 12 }: ActivityHeatmapProps) {
  const { grid, maxActivity } = useMemo(() => {
    const activityMap = new Map<string, number>();
    let max = 0;
    for (const d of data) {
      activityMap.set(d.date, d.total);
      if (d.total > max) max = d.total;
    }

    const today = new Date();
    const start = startOfWeek(subDays(today, weeks * 7 - 1), {
      weekStartsOn: 0,
    });
    const days = eachDayOfInterval({ start, end: today });

    // Group by week
    const weekGroups: { date: Date; count: number }[][] = [];
    let currentWeek: { date: Date; count: number }[] = [];

    for (const day of days) {
      const key = format(day, "yyyy-MM-dd");
      const count = activityMap.get(key) || 0;
      currentWeek.push({ date: day, count });

      if (day.getDay() === 6) {
        weekGroups.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      weekGroups.push(currentWeek);
    }

    return { grid: weekGroups, maxActivity: max || 1 };
  }, [data, weeks]);

  const getIntensity = (count: number): string => {
    if (count === 0) return "bg-zinc-800/50";
    const ratio = count / maxActivity;
    if (ratio >= 0.75) return "bg-purple-500";
    if (ratio >= 0.5) return "bg-purple-600/70";
    if (ratio >= 0.25) return "bg-purple-700/50";
    return "bg-purple-800/40";
  };

  const totalActiveDays = data.filter((d) => d.total > 0).length;
  const totalActivities = data.reduce((sum, d) => sum + d.total, 0);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-300">Activity</h3>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span>{totalActiveDays} active days</span>
          <span>{totalActivities} actions</span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="flex gap-[3px] overflow-x-auto pb-2">
        {grid.map((week, weekIdx) => (
          <div key={weekIdx} className="flex flex-col gap-[3px]">
            {week.map(({ date, count }) => (
              <div
                key={date.toISOString()}
                className={cn(
                  "h-3 w-3 rounded-sm transition-colors",
                  getIntensity(count)
                )}
                title={`${format(date, "MMM d, yyyy")}: ${count} action${count !== 1 ? "s" : ""}`}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-end gap-1 text-xs text-zinc-500">
        <span>Less</span>
        <div className="h-3 w-3 rounded-sm bg-zinc-800/50" />
        <div className="h-3 w-3 rounded-sm bg-purple-800/40" />
        <div className="h-3 w-3 rounded-sm bg-purple-700/50" />
        <div className="h-3 w-3 rounded-sm bg-purple-600/70" />
        <div className="h-3 w-3 rounded-sm bg-purple-500" />
        <span>More</span>
      </div>
    </div>
  );
}
