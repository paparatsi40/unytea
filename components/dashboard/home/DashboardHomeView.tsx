"use client";

import Link from "next/link";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Calendar, Users, MessageSquare, Plus, BarChart3, Settings, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { formatDistanceToNow, format } from "date-fns";
import { enUS, es, fr } from "date-fns/locale";
import type { OnboardingProgress } from "@/app/actions/onboarding";
import type { TodayDashboardData } from "@/app/actions/today-dashboard";

interface Props {
  data: TodayDashboardData;
  onboardingProgress: OnboardingProgress | null;
}

const DATE_FNS_LOCALES = { en: enUS, es, fr } as const;

export function DashboardHomeView({ data, onboardingProgress }: Props) {
  const t = useTranslations("dashboard.home");
  const locale = useLocale();
  const dfLocale = DATE_FNS_LOCALES[locale as keyof typeof DATE_FNS_LOCALES] ?? enUS;

  const s = data.weeklyStats.sessionsThisWeek;
  const heroText =
    s === 0
      ? t("actionFirst.noSessions")
      : s <= 2
        ? t("actionFirst.fewSessions", { count: s })
        : t("actionFirst.manySessions", { count: s });

  // Onboarding checklist items, localized, built from the boolean flags.
  const onboardingItems = onboardingProgress
    ? [
        { id: "profile", href: "/dashboard/settings", completed: onboardingProgress.hasProfile },
        {
          id: "post",
          href: "/dashboard/communities",
          completed: onboardingProgress.hasCreatedPost,
        },
        {
          id: "session",
          href: "/dashboard/sessions",
          completed: onboardingProgress.hasAttendedSession,
        },
        {
          id: "lesson",
          href: "/dashboard/library?tab=courses",
          completed: onboardingProgress.hasCompletedLesson,
        },
        { id: "buddy", href: "/dashboard/communities", completed: onboardingProgress.hasBuddy },
      ].map((item) => ({
        ...item,
        title: t(`onboarding.${item.id}.title`),
        description: t(`onboarding.${item.id}.description`),
      }))
    : [];

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("welcomeBack", { name: data.user.name })}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/communities/new">
            <Plus className="mr-2 h-4 w-4" />
            {t("createCommunity")}
          </Link>
        </Button>
      </header>

      {/* Onboarding (new users only) */}
      {onboardingItems.length > 0 && <OnboardingChecklist items={onboardingItems} />}

      {/* Action-first hero */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-2xl text-lg font-medium text-foreground">{heroText}</p>
          <Button asChild>
            <Link href="/dashboard/sessions/create">
              <Calendar className="mr-2 h-4 w-4" />
              {t("actionFirst.scheduleSession")}
            </Link>
          </Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat value={data.weeklyStats.sessionsThisWeek} label={t("actionFirst.statSessions")} />
          <Stat value={data.weeklyStats.newMembersThisWeek} label={t("actionFirst.statMembers")} />
          <Stat value={data.weeklyStats.postsThisWeek} label={t("actionFirst.statPosts")} />
        </div>
      </Card>

      {/* Next live session */}
      {data.nextLiveSession && (
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("nextLiveSession.title")}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-purple-100">
                <Video className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{data.nextLiveSession.title}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(data.nextLiveSession.scheduledAt), "PPp", { locale: dfLocale })}{" "}
                  · {t("nextLiveSession.minutes", { minutes: data.nextLiveSession.duration })} ·{" "}
                  {formatDistanceToNow(new Date(data.nextLiveSession.scheduledAt), {
                    addSuffix: true,
                    locale: dfLocale,
                  })}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild>
                <Link href={`/dashboard/sessions/${data.nextLiveSession.id}/room`}>
                  {t("nextLiveSession.joinNow")}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/dashboard/sessions/${data.nextLiveSession.id}`}>
                  {t("nextLiveSession.viewDetails")}
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Your communities */}
      {data.communities.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("yourCommunities.title")}</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/communities">{t("yourCommunities.viewAll")}</Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.communities.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/c/${c.slug}`}
                className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent"
              >
                <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                  {c.imageUrl ? (
                    <Image
                      src={c.imageUrl}
                      alt={c.name}
                      fill
                      unoptimized
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-bold text-muted-foreground">
                      {c.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("yourCommunities.memberCount", { count: c.memberCount })} ·{" "}
                    {c.role === "owner"
                      ? t("yourCommunities.ownerBadge")
                      : t("yourCommunities.memberBadge")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent activity */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("recentActivity.title")}</h2>
        {data.recentActivity.length > 0 ? (
          <Card className="divide-y divide-border">
            {data.recentActivity.map((event, i) => (
              <Link
                key={`${event.type}-${i}`}
                href={event.href}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                  {event.type === "new_member" ? (
                    <Users className="h-4 w-4 text-blue-600" />
                  ) : (
                    <MessageSquare className="h-4 w-4 text-green-600" />
                  )}
                </div>
                <p className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {event.type === "new_member"
                    ? t("recentActivity.newMember", {
                        actor: event.actorName,
                        community: event.communityName,
                      })
                    : t("recentActivity.newPost", {
                        actor: event.actorName,
                        community: event.communityName,
                      })}
                </p>
                <span className="flex-shrink-0 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(event.at), { addSuffix: true, locale: dfLocale })}
                </span>
              </Link>
            ))}
          </Card>
        ) : (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            {t("recentActivity.noActivity")}
          </Card>
        )}
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("quickActions.title")}</h2>
        <div className="flex flex-wrap gap-2">
          <QuickAction href="/dashboard/sessions/create" icon={<Calendar className="h-4 w-4" />}>
            {t("quickActions.createSession")}
          </QuickAction>
          <QuickAction href="/dashboard/communities" icon={<MessageSquare className="h-4 w-4" />}>
            {t("quickActions.createPost")}
          </QuickAction>
          <QuickAction href="/dashboard/communities" icon={<Users className="h-4 w-4" />}>
            {t("quickActions.inviteMember")}
          </QuickAction>
          <QuickAction href="/dashboard/analytics" icon={<BarChart3 className="h-4 w-4" />}>
            {t("quickActions.viewAnalytics")}
          </QuickAction>
          <QuickAction href="/dashboard/settings" icon={<Settings className="h-4 w-4" />}>
            {t("quickActions.openSettings")}
          </QuickAction>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Button asChild variant="outline">
      <Link href={href}>
        {icon}
        <span className="ml-2">{children}</span>
      </Link>
    </Button>
  );
}
