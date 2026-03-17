import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { joinCommunity } from "@/app/actions/communities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { headers } from "next/headers";

function formatHostName(owner: {
  name: string | null;
  firstName: string | null;
  lastName: string | null;
}) {
  const fullName = [owner.firstName, owner.lastName].filter(Boolean).join(" ").trim();
  return fullName || owner.name || "Unytea Host";
}

function formatSchedule(date: Date | null) {
  if (!date) return "No upcoming session announced";
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function sessionUrgencyLabel(date: Date | null) {
  if (!date) return "🟢 Next session coming soon";
  const now = new Date();
  const hoursUntil = (date.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntil <= 2) return "🟢 Starting soon";
  if (hoursUntil <= 24) return "🟢 Today";
  if (hoursUntil <= 72) return "🟢 This week";
  return "🟢 Upcoming";
}

function dayNameFromIndex(dayOfWeek: number | null | undefined) {
  if (dayOfWeek === null || dayOfWeek === undefined) return null;
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return names[dayOfWeek] || null;
}

function everyLabel(series: {
  frequency?: string | null;
  dayOfWeek?: number | null;
  startTime?: string | null;
} | null | undefined) {
  if (!series || series.frequency !== "WEEKLY") return null;
  const day = dayNameFromIndex(series.dayOfWeek);
  if (!day || !series.startTime) return null;

  const [hourRaw, minuteRaw] = series.startTime.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw || "0");
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return `Every ${day}`;

  const sample = new Date();
  sample.setHours(hour, minute, 0, 0);
  return `Every ${day} · ${sample.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

function trackPublicCommunityEvent(params: {
  eventName:
    | "community_preview_view"
    | "join_cta_click"
    | "join_success"
    | "community_card_click"
    | "community_join_click"
    | "community_join_success";
  communityId: string;
  communitySlug: string;
  source: string;
  locale: string;
  userId?: string | null;
  extra?: Record<string, unknown>;
}) {
  console.info("[PublicDiscoveryEvent]", {
    at: new Date().toISOString(),
    ...params,
  });
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  const community = await prisma.community.findUnique({
    where: { slug: params.slug },
    select: {
      name: true,
      description: true,
      imageUrl: true,
      owner: { select: { name: true, firstName: true, lastName: true } },
    },
  });

  if (!community) {
    return {
      title: "Community Not Found | Unytea",
      description: "This community preview is not available.",
      robots: { index: false, follow: false },
    };
  }

  const title = `${community.name} Community | Unytea`;
  const host = formatHostName(community.owner);
  const description =
    community.description?.slice(0, 160) ||
    `Join ${community.name} hosted by ${host} on Unytea.`;
  const canonical = `https://www.unytea.com/${params.locale}/community/${params.slug}`;
  const image = community.imageUrl || "https://www.unytea.com/og-image.png";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      images: [{ url: image, width: 1200, height: 630 }],
      siteName: "Unytea",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    alternates: { canonical },
    robots: { index: true, follow: true },
  };
}

export default async function CommunityPublicPreviewPage({
  params,
  searchParams,
}: {
  params: { locale: string; slug: string };
  searchParams?: { src?: string; rank?: string; sort?: string; paywall?: string; paid?: string; error?: string };
}) {
  const { slug, locale } = params;
  const source = searchParams?.src || "direct";

  const community = await prisma.community.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      isPaid: true,
      pricing: true,
      owner: {
        select: {
          name: true,
          firstName: true,
          lastName: true,
        },
      },
      _count: {
        select: {
          members: true,
          sessions: true,
        },
      },
      sessions: {
        where: {
          status: "SCHEDULED",
          scheduledAt: { gt: new Date() },
        },
        orderBy: { scheduledAt: "asc" },
        take: 1,
        select: {
          id: true,
          title: true,
          scheduledAt: true,
          series: {
            select: {
              frequency: true,
              dayOfWeek: true,
              startTime: true,
              title: true,
            },
          },
        },
      },
      posts: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          author: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              comments: true,
            },
          },
        },
      },
    },
  });

  if (!community) {
    notFound();
  }

  const currentCommunity = community;
  const session = await auth();
  const userId = session?.user?.id;
  let membershipStatus: "ACTIVE" | "PENDING" | null = null;

  const headerBag = headers();
  const userAgent = headerBag.get("user-agent") || "unknown";

  trackPublicCommunityEvent({
    eventName: "community_preview_view",
    communityId: currentCommunity.id,
    communitySlug: currentCommunity.slug,
    source,
    locale,
    userId,
    extra: {
      rank: searchParams?.rank || null,
      sort: searchParams?.sort || null,
      userAgent,
    },
  });

  if (source?.startsWith("explore")) {
    trackPublicCommunityEvent({
      eventName: "community_card_click",
      communityId: currentCommunity.id,
      communitySlug: currentCommunity.slug,
      source,
      locale,
      userId,
      extra: {
        rank: searchParams?.rank || null,
        sort: searchParams?.sort || null,
      },
    });
  }

  if (userId) {
    const membership = await prisma.member.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId: currentCommunity.id,
        },
      },
      select: {
        status: true,
      },
    });

    if (membership?.status === "ACTIVE") membershipStatus = "ACTIVE";
    if (membership?.status === "PENDING") membershipStatus = "PENDING";
  }

  async function handleJoin() {
    "use server";

    const joiner = await auth();

    trackPublicCommunityEvent({
      eventName: "join_cta_click",
      communityId: currentCommunity.id,
      communitySlug: currentCommunity.slug,
      source,
      locale,
      userId: joiner?.user?.id,
      extra: {
        rank: searchParams?.rank || null,
        sort: searchParams?.sort || null,
      },
    });

    trackPublicCommunityEvent({
      eventName: "community_join_click",
      communityId: currentCommunity.id,
      communitySlug: currentCommunity.slug,
      source,
      locale,
      userId: joiner?.user?.id,
      extra: {
        rank: searchParams?.rank || null,
        sort: searchParams?.sort || null,
      },
    });

    if (!joiner?.user?.id) {
      redirect(`/auth/signin?callbackUrl=/${locale}/community/${slug}`);
    }

    const result = await joinCommunity(currentCommunity.id);
    if (result.success) {
      trackPublicCommunityEvent({
        eventName: "join_success",
        communityId: currentCommunity.id,
        communitySlug: currentCommunity.slug,
        source,
        locale,
        userId: joiner.user.id,
      });

      trackPublicCommunityEvent({
        eventName: "community_join_success",
        communityId: currentCommunity.id,
        communitySlug: currentCommunity.slug,
        source,
        locale,
        userId: joiner.user.id,
      });
      redirect(`/dashboard/c/${currentCommunity.slug}`);
    }

    if ((result as { code?: string })?.code === "PAYMENT_REQUIRED") {
      redirect(`/api/stripe/community-checkout-start?communityId=${currentCommunity.id}&slug=${currentCommunity.slug}&locale=${locale}&tier=${defaultTier}`);
    }

    redirect(`/${locale}/community/${currentCommunity.slug}`);
  }

  const nextSession = currentCommunity.sessions[0] ?? null;

  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [sessionsThisWeek, nextSessionAttendingCount, nextThreeSessions] = await Promise.all([
    prisma.mentorSession.count({
      where: {
        communityId: currentCommunity.id,
        status: "SCHEDULED",
        scheduledAt: {
          gte: now,
          lte: weekEnd,
        },
      },
    }),
    nextSession
      ? prisma.sessionParticipation.count({
          where: {
            sessionId: nextSession.id,
          },
        })
      : Promise.resolve(0),
    prisma.mentorSession.findMany({
      where: {
        communityId: currentCommunity.id,
        status: "SCHEDULED",
        scheduledAt: {
          gte: now,
          lte: weekEnd,
        },
      },
      orderBy: { scheduledAt: "asc" },
      take: 3,
      select: {
        id: true,
        title: true,
        scheduledAt: true,
      },
    }),
  ]);

  const pricingRecord =
    currentCommunity.pricing && typeof currentCommunity.pricing === "object"
      ? (currentCommunity.pricing as Record<string, unknown>)
      : null;

  const defaultTier =
    pricingRecord && ["free", "pro", "vip"].includes(pricingRecord.defaultTier as string)
      ? (pricingRecord.defaultTier as "free" | "pro" | "vip")
      : "pro";

  const tierPricing = (pricingRecord?.tierPricing as Record<string, unknown> | undefined) || {};
  const selectedTierPriceRaw = tierPricing[defaultTier];
  const selectedTierPrice = typeof selectedTierPriceRaw === "number" || typeof selectedTierPriceRaw === "string"
    ? Number(selectedTierPriceRaw)
    : 0;

  const accessTypeLabel = currentCommunity.isPaid ? `De pago · ${defaultTier.toUpperCase()}` : "Gratis";
  const subscribeLabel = userId
    ? currentCommunity.isPaid
      ? `Suscribirme ${selectedTierPrice > 0 ? `(USD ${selectedTierPrice})` : `(${defaultTier.toUpperCase()})`}`
      : "Suscribirme"
    : "Iniciar sesión para suscribirme";
  const weeklyIdentity = everyLabel(nextSession?.series);

  return (
<div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6">
        <section className="rounded-xl border border-border bg-card p-6">
          {searchParams?.paywall === "1" && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              Esta comunidad es de pago. Haz clic en “Suscribirme” para completar checkout.
            </div>
          )}
          {searchParams?.paid === "1" && (
            <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
              Pago confirmado. Ya puedes acceder como miembro.
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <h1 className="text-3xl font-bold text-foreground">{currentCommunity.name}</h1>
                <Badge variant="outline">{accessTypeLabel}</Badge>
              </div>
              <p className="text-muted-foreground">{currentCommunity.description || "Community preview page"}</p>
              <p className="mt-2 text-sm text-muted-foreground">Hosted by {formatHostName(currentCommunity.owner)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{currentCommunity._count.members} members</p>
            </div>
            <div className="min-w-[220px]">
              {membershipStatus === "ACTIVE" ? (
                <Link href={`/dashboard/c/${currentCommunity.slug}`}>
                  <Button className="w-full">Entrar a la comunidad</Button>
                </Link>
              ) : membershipStatus === "PENDING" ? (
                <Button className="w-full" disabled>Request pending approval</Button>
              ) : (
                <form action={handleJoin}>
                  <Button className="w-full" type="submit">{subscribeLabel}</Button>
                </form>
              )}
              <p className="mt-2 text-xs text-muted-foreground">Acceso: {accessTypeLabel}. Suscríbete para asistir en vivo y ver grabaciones.</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-primary/30 bg-primary/5 p-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Next Live Session</p>
          <h2 className="mt-2 text-xl font-semibold text-foreground">{nextSession?.title || "Weekly Community Q&A"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{sessionUrgencyLabel(nextSession?.scheduledAt ?? null)} · {formatSchedule(nextSession?.scheduledAt ?? null)}</p>
          {weeklyIdentity && <p className="mt-1 text-xs text-muted-foreground">{weeklyIdentity}</p>}
          <p className="mt-1 text-sm text-muted-foreground">🔥 {nextSessionAttendingCount} attending</p>
          <p className="mt-2 text-sm text-muted-foreground">Join the community to attend live sessions.</p>
          <p className="mt-1 text-xs text-muted-foreground">Members receive reminders automatically.</p>
          <div className="mt-4">
            {membershipStatus === "ACTIVE" ? (
              <Link href={`/dashboard/c/${currentCommunity.slug}`}>
                <Button>Entrar a la comunidad</Button>
              </Link>
            ) : membershipStatus === "PENDING" ? (
              <Button disabled>Request pending approval</Button>
            ) : (
              <form action={handleJoin}>
                <Button type="submit">{userId ? "Suscribirme" : "Iniciar sesión para suscribirme"}</Button>
              </form>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">📅 This week</h2>
          {nextThreeSessions.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Weekly programming is being scheduled now.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {nextThreeSessions.map((session) => (
                <div key={session.id} className="rounded-lg border border-border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {session.scheduledAt.toLocaleDateString("en-US", { weekday: "long" })} · {session.scheduledAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </p>
                  <p className="mt-1 font-medium text-foreground">{session.title}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Recent discussions</h2>
          <div className="mt-4 space-y-3">
            {currentCommunity.posts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No discussion preview yet.</p>
            ) : (
              currentCommunity.posts.map((post) => (
                <div key={post.id} className="rounded-lg border border-border p-3">
                  <p className="font-medium text-foreground">{post.title || post.content.slice(0, 90) || "Untitled discussion"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{post._count.comments} replies</p>
                </div>
              ))
            )}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Join community to read replies.</p>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Members</p>
            <p className="mt-1 flex items-center gap-2 text-xl font-semibold text-foreground"><Users className="h-4 w-4" />{currentCommunity._count.members}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Attending next session</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{nextSessionAttendingCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Sessions this week</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{sessionsThisWeek}</p>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Hosted by {formatHostName(currentCommunity.owner)}</h2>
          <p className="mt-2 text-sm text-muted-foreground">Founder, mentor, and community builder. Hosting weekly sessions to help members learn together and grow faster.</p>
          <p className="mt-2 text-xs text-muted-foreground">Sessions every week</p>
        </section>

        <section className="rounded-xl border border-primary/30 bg-primary/5 p-6">
          <h2 className="text-lg font-semibold text-foreground">Join the community</h2>
          <p className="mt-2 text-sm text-muted-foreground">Attend live sessions • Access recordings • Connect with other members</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {membershipStatus === "ACTIVE" ? (
              <Link href={`/dashboard/c/${currentCommunity.slug}`}>
                <Button>Entrar a la comunidad</Button>
              </Link>
            ) : membershipStatus === "PENDING" ? (
              <Button disabled>Request pending approval</Button>
            ) : (
              <form action={handleJoin}>
                <Button type="submit">{userId ? "Suscribirme" : "Iniciar sesión para suscribirme"}</Button>
              </form>
            )}
            <Link href={`/${locale}/explore`}>
              <Button variant="outline">Volver a explorar</Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
