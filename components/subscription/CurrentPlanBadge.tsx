"use client";

import { useCurrentUser } from "@/hooks/use-current-user";
import { Badge } from "@/components/ui/badge";
import { Crown, Zap, Sparkles } from "lucide-react";

export function CurrentPlanBadge() {
  const { user } = useCurrentUser();

  if (!user) return null;

  const plan = (user as any).subscriptionPlan || "FREE";
  const status = (user as any).subscriptionStatus || "ACTIVE";

  const getPlanConfig = (planName: string) => {
    switch (planName) {
      case "PROFESSIONAL":
        return {
          label: "Professional",
          icon: Zap,
          className: "bg-purple-100 text-purple-700 border-purple-300",
        };
      case "SCALE":
        return {
          label: "Scale",
          icon: Crown,
          className: "bg-blue-100 text-blue-700 border-blue-300",
        };
      case "ENTERPRISE":
        return {
          label: "Enterprise",
          icon: Sparkles,
          className: "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-none",
        };
      default:
        return {
          label: "Free",
          icon: null,
          className: "bg-gray-100 text-gray-700 border-gray-300",
        };
    }
  };

  const config = getPlanConfig(plan);
  const Icon = config.icon;

  return (
    <Badge className={`${config.className} flex items-center gap-1.5 px-3 py-1`}>
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {config.label}
      {status !== "ACTIVE" && status !== "TRIALING" && (
        <span className="ml-1 text-xs opacity-70">({status})</span>
      )}
    </Badge>
  );
}
