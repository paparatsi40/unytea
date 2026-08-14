import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { JoinCommunityButton } from "@/components/community/JoinCommunityButton";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ plan?: string }>;
};

/**
 * Join page for a community — READ ONLY.
 *
 * This page used to join the visitor as a side effect of rendering: on a plain
 * GET it ran `prisma.member.create()` plus a `memberCount` increment. Three
 * things were wrong with that, in increasing order of severity:
 *
 *   1. Next prefetches links on hover, and a prefetch is a GET. Pointing at the
 *      link was enough to join the community — no click required. The Sentry
 *      event that surfaced this carried `_rsc=` in the query string, which is
 *      exactly a prefetch/RSC request.
 *   2. The `findUnique`-then-`create` pair is a check, not a lock. Two
 *      concurrent GETs (prefetch racing the navigation) both passed the check
 *      and both reached the create; the loser hit the (userId, communityId)
 *      unique index, threw inside the render, and took the whole page down with
 *      React #441. The visitor saw nothing at all.
 *   3. It wrote membership rows without going through `joinCommunity`, so it
 *      skipped the `defineAction` seam entirely: no rate limit, no member-limit
 *      check against the owner's plan, no approval flow. Paid communities were
 *      NOT joinable this way — the write sat behind `if (!community.isPaid)` —
 *      but every other guarantee the seam provides was absent.
 *
 * The render now only reads. Joining happens when the visitor clicks, through
 * `joinCommunity`, which owns all of those rules. The only redirects left are
 * for people who have no join to make: owners, and members who are already in.
 */
export default async function CommunityJoinPage(props: Props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  setRequestLocale(params.locale);

  const t = await getTranslations("community.join");

  const community = await prisma.community.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      coverImageUrl: true,
      imageUrl: true,
      isPaid: true,
      requireApproval: true,
      memberCount: true,
      ownerId: true,
    },
  });

  if (!community) {
    redirect(`/${params.locale}/explore`);
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;

  // Owners and existing members have nothing to join. Both branches are pure
  // navigation — no write, on any path through this function.
  if (userId) {
    if (community.ownerId === userId) {
      redirect(`/dashboard/c/${community.slug}`);
    }

    const membership = await prisma.member.findUnique({
      where: { userId_communityId: { userId, communityId: community.id } },
      select: { status: true },
    });

    if (membership?.status === "ACTIVE") {
      redirect(`/dashboard/c/${community.slug}`);
    }

    if (membership?.status === "PENDING") {
      return (
        <JoinShell community={community}>
          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <p className="font-medium text-foreground">{t("pendingTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("pendingBody", { community: community.name })}
            </p>
          </div>
        </JoinShell>
      );
    }
  }

  // Anonymous: show the community and route through sign-in, returning here so
  // the visitor lands back on the CTA rather than on a generic dashboard.
  if (!userId) {
    const callbackUrl = `/${params.locale}/c/${params.slug}/join${
      searchParams.plan ? `?plan=${encodeURIComponent(searchParams.plan)}` : ""
    }`;

    return (
      <JoinShell community={community}>
        <Button size="lg" className="w-full sm:w-auto" asChild>
          <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}>
            {t("signInCta")}
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">{t("signInHint")}</p>
      </JoinShell>
    );
  }

  // Paid: membership is created by the Stripe webhook once the subscription is
  // paid (app/api/stripe/webhook, `type: "community_membership"`). The CTA
  // therefore hands off to the checkout starter that sets that metadata —
  // never to a direct write, which is what would let someone in without paying.
  if (community.isPaid) {
    const tier = searchParams.plan === "vip" ? "vip" : "pro";
    const checkoutUrl =
      `/api/stripe/community-checkout-start?communityId=${encodeURIComponent(community.id)}` +
      `&slug=${encodeURIComponent(community.slug)}` +
      `&locale=${encodeURIComponent(params.locale)}` +
      `&tier=${tier}`;

    return (
      <JoinShell community={community}>
        <Button size="lg" className="w-full sm:w-auto" asChild>
          {/* A plain link, not a form: the route is a GET that redirects to
              Stripe. It creates no membership of its own. */}
          <a href={checkoutUrl}>{t("joinPaidCta")}</a>
        </Button>
      </JoinShell>
    );
  }

  return (
    <JoinShell community={community}>
      {community.requireApproval && (
        <p className="text-sm text-muted-foreground">{t("approvalNotice")}</p>
      )}
      <JoinCommunityButton communityId={community.id} communitySlug={community.slug} />
    </JoinShell>
  );
}

type JoinCommunity = {
  slug: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  imageUrl: string | null;
  isPaid: boolean;
  memberCount: number;
};

/** The read-only presentation every branch shares. */
async function JoinShell({
  community,
  children,
}: {
  community: JoinCommunity;
  children: React.ReactNode;
}) {
  const t = await getTranslations("community.join");

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {community.coverImageUrl && (
            <div className="relative h-40 w-full bg-muted">
              <Image
                src={community.coverImageUrl}
                alt=""
                fill
                unoptimized
                sizes="(min-width: 768px) 42rem, 100vw"
                className="object-cover"
              />
            </div>
          )}

          <div className="space-y-5 p-6">
            <div className="flex items-start gap-4">
              {community.imageUrl && (
                <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
                  <Image
                    src={community.imageUrl}
                    alt=""
                    fill
                    unoptimized
                    sizes="56px"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold text-foreground">
                  {t("heading", { community: community.name })}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("membersCount", { count: community.memberCount })} ·{" "}
                  {community.isPaid ? t("paidBadge") : t("freeBadge")}
                </p>
              </div>
            </div>

            {community.description && (
              <p className="text-sm text-muted-foreground">{community.description}</p>
            )}

            <div className="space-y-3">{children}</div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/explore"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("backToExplore")}
          </Link>
        </div>
      </div>
    </main>
  );
}
