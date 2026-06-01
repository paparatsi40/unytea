"use client";

import Link from "next/link";
import { Lock, ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface GateCommunity {
  name: string;
  description?: string | null;
  members?: number;
  posts?: number;
}

interface CommunityGateViewProps {
  state: "join" | "pending" | "denied";
  community: GateCommunity;
  // Server action passed from the page; only used in the "join" state.
  onJoin?: () => Promise<void>;
}

export function CommunityGateView({ state, community, onJoin }: CommunityGateViewProps) {
  const t = useTranslations("dashboard.communityAdmin.gate");

  if (state === "join") {
    return (
      <div className="min-h-screen bg-white">
        <div className="relative overflow-hidden bg-gradient-to-br from-purple-900 via-purple-700 to-pink-600 py-24">
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="mb-4 text-4xl font-bold text-white">{community.name}</h1>
              {community.description && (
                <p className="mx-auto mb-8 max-w-2xl text-xl text-white/80">
                  {community.description}
                </p>
              )}
              <div className="mb-8 flex items-center justify-center gap-4 text-white/60">
                <span>{t("members", { count: community.members ?? 0 })}</span>
                <span>•</span>
                <span>{t("posts", { count: community.posts ?? 0 })}</span>
              </div>
              <form action={onJoin}>
                <Button
                  type="submit"
                  size="lg"
                  className="bg-white text-purple-900 hover:bg-white/90"
                >
                  {t("joinCta")}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Shared shell for pending / denied states.
  const isPending = state === "pending";
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-2xl">
          <Link href="/dashboard/communities">
            <Button variant="ghost" className="mb-6 flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>{t("backToCommunities")}</span>
            </Button>
          </Link>

          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
            <div
              className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
                isPending ? "bg-amber-500/10" : "bg-red-500/10"
              }`}
            >
              <Lock className={`h-8 w-8 ${isPending ? "text-amber-500" : "text-red-500"}`} />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {isPending ? t("pendingTitle") : t("deniedTitle")}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {isPending
                ? t("pendingBody", { name: community.name })
                : t("deniedBody", { name: community.name })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
