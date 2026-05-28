"use client";

import { Users, MessageSquare, BookOpen, TrendingUp, Award, Calendar } from "lucide-react";

interface StatItem {
  label: string;
  value: number | string;
  icon?: "users" | "posts" | "courses" | "growth" | "achievements" | "events";
  trend?: {
    value: number;
    positive: boolean;
  };
}

interface StatsSectionProps {
  stats: StatItem[];
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };
}

const ICON_MAP = {
  users: Users,
  posts: MessageSquare,
  courses: BookOpen,
  growth: TrendingUp,
  achievements: Award,
  events: Calendar,
};

export function StatsSection({ stats, theme }: StatsSectionProps) {
  const primaryColor = theme?.primaryColor || "#0ea5e9";

  return (
    <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon ? ICON_MAP[stat.icon] : Users;

        return (
          <div
            key={index}
            className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            {/* Icon */}
            <div
              className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg"
              style={{
                backgroundColor: `${primaryColor}15`,
                color: primaryColor,
              }}
            >
              <Icon className="h-6 w-6" />
            </div>

            {/* Value */}
            <div className="mb-1 text-3xl font-bold text-gray-900">
              {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
            </div>

            {/* Label */}
            <div className="text-sm text-gray-500">{stat.label}</div>

            {/* Trend */}
            {stat.trend && (
              <div
                className={`mt-2 text-xs font-medium ${
                  stat.trend.positive ? "text-green-600" : "text-red-600"
                }`}
              >
                {stat.trend.positive ? "↑" : "↓"} {stat.trend.value}%
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
