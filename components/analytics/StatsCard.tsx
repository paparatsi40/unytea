"use client";

import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface StatsCardProps {
  title: string;
  value: number | string;
  change?: string;
  icon: LucideIcon;
  color?: "blue" | "green" | "purple" | "orange" | "red";
}

export function StatsCard({ title, value, change, icon: Icon, color = "blue" }: StatsCardProps) {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-500",
    green: "bg-green-500/10 text-green-500",
    purple: "bg-purple-500/10 text-purple-500",
    orange: "bg-orange-500/10 text-orange-500",
    red: "bg-red-500/10 text-red-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm transition-all hover:border-border hover:shadow-lg"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
      </div>

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="mb-1 text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value.toLocaleString()}</p>
          {change && (
            <p className="mt-2 text-sm text-green-500">{change}</p>
          )}
        </div>

        <div className={`rounded-xl p-3 ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </motion.div>
  );
}