import { notFound } from "next/navigation";
import { subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { SectionInstance } from "@/components/section-builder/types";
import type {
  LandingActivityStatus,
  LandingCommunity,
  LandingSampleMember,
} from "@/components/section-builder/types";
import { HeroRender } from "@/components/section-builder/sections/Hero";
import { FeaturesRender } from "@/components/section-builder/sections/Features";
import { CTARender } from "@/components/section-builder/sections/CTA";
import { TestimonialsRender } from "@/components/section-builder/sections/Testimonials";
import { FAQRender } from "@/components/section-builder/sections/FAQ";
import { StatsRender } from "@/components/section-builder/sections/Stats";
import { OwnerBioRender } from "@/components/section-builder/sections/OwnerBio";
import { GalleryRender } from "@/components/section-builder/sections/Gallery";
import { UpcomingSessionsRender } from "@/components/section-builder/sections/UpcomingSessions";
import { PostsFeedRender } from "@/components/section-builder/sections/PostsFeed";
import { MembershipTiersRender } from "@/components/section-builder/sections/MembershipTiers";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { PaywallLockedView } from "@/components/community/PaywallLockedView";

async function getCommunity(slug: string) {
  const community = await prisma.community.findUnique({
    where: { slug },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      _count: {
        select: {
          members: true,
          posts: true,
          courses: true,
        },
      },
    },
  });

  return community;
}

// TODO(shared-helper): duplicated from lib/explore-query.ts (both private
// there). Extract computeInitials + classifyActivity into a shared module
// and import from both call sites.
const ACTIVITY_WINDOW_DAYS = 30;

function computeInitials(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "??";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return (parts[0].slice(0, 2) || parts[0]).toUpperCase();
  return ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase();
}

function classifyActivity(totalActions: number): LandingActivityStatus {
  const avgPerWeek = (totalActions / ACTIVITY_WINDOW_DAYS) * 7;
  if (avgPerWeek >= 10) return "very_active";
  if (avgPerWeek >= 5) return "active";
  if (avgPerWeek >= 1) return "moderate";
  return "quiet";
}

type LandingContext = {
  communityId: string;
  communitySlug: string;
  community: LandingCommunity;
  sampleMembers: LandingSampleMember[];
  activityStatus: LandingActivityStatus | null;
};

function renderSection(section: SectionInstance, index: number, context: LandingContext) {
  const key = section.id || `section-${index}`;
  // Inject page-level community context into host-configured props. Sections
  // that need it (UpcomingSessions/PostsFeed/MembershipTiers via id/slug;
  // Hero/OwnerBio/Stats via community + sampleMembers/activityStatus) read
  // these; presentational sections simply ignore the extra props.
  const propsWithContext = {
    ...section.props,
    communityId: context.communityId,
    communitySlug: context.communitySlug,
    community: context.community,
    sampleMembers: context.sampleMembers,
    activityStatus: context.activityStatus,
  };

  switch (section.type) {
    case "hero":
      return <HeroRender key={key} {...propsWithContext} />;
    case "features":
      return <FeaturesRender key={key} {...propsWithContext} />;
    case "cta":
      return <CTARender key={key} {...propsWithContext} />;
    case "testimonials":
      return <TestimonialsRender key={key} {...propsWithContext} />;
    case "faq":
      return <FAQRender key={key} {...propsWithContext} />;
    case "stats":
      return <StatsRender key={key} {...propsWithContext} />;
    case "ownerBio":
      return <OwnerBioRender key={key} {...propsWithContext} />;
    case "gallery":
      return <GalleryRender key={key} {...propsWithContext} />;
    case "upcomingSessions":
      return <UpcomingSessionsRender key={key} {...propsWithContext} />;
    case "postsFeed":
      return <PostsFeedRender key={key} {...propsWithContext} />;
    case "membershipTiers":
      return <MembershipTiersRender key={key} {...propsWithContext} />;
    case "pricing":
      return (
        <div key={key} className="p-8 text-center text-gray-500">
          Pricing section coming soon
        </div>
      );
    case "video":
      return (
        <div key={key} className="p-8 text-center text-gray-500">
          Video section coming soon
        </div>
      );
    default:
      console.warn(`Unknown section type: ${section.type}`);
      return null;
  }
}

export default async function PublicCommunityPage(props: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const params = await props.params;
  const community = await getCommunity(params.slug);

  if (!community) {
    notFound();
  }

  const session = await auth();
  const isOwner = session?.user?.id === community.owner.id;

  // Paywall gate with owner exception: non-owner visitors see the locked
  // view. Owner passes through to their own landing so they can preview
  // the page they'll show once payment is added. They manage the paywall
  // state via the dashboard PaywallBanner (mounted in the dashboard layout).
  if (community.paywallLocked && !isOwner) {
    return (
      <PaywallLockedView
        communityName={community.name}
        communityImageUrl={community.imageUrl}
        locale={params.locale}
      />
    );
  }

  // Parse landing layout
  const sections = Array.isArray(community.landingLayout)
    ? (community.landingLayout as unknown as SectionInstance[])
    : [];

  // Trimmed community object passed to data-aware sections (Hero/OwnerBio/Stats).
  // Only the fields they need — avoids shipping landingLayout/heavy columns to
  // the client when these sections render.
  const landingCommunity: LandingCommunity = {
    id: community.id,
    slug: community.slug,
    name: community.name,
    description: community.description,
    imageUrl: community.imageUrl,
    coverImageUrl: community.coverImageUrl,
    primaryColor: community.primaryColor,
    secondaryColor: community.secondaryColor,
    isPaid: community.isPaid,
    memberCount: community.memberCount,
    ownerTitle: community.ownerTitle,
    ownerLinks: community.ownerLinks,
    owner: {
      id: community.owner.id,
      name: community.owner.name,
      image: community.owner.image,
    },
  };

  // Stats needs sample-member avatars + an activity status. Only run these
  // extra queries when a Stats section is actually present in the layout.
  let sampleMembers: LandingSampleMember[] = [];
  let activityStatus: LandingActivityStatus | null = null;
  if (sections.some((s) => s.type === "stats")) {
    const since = subDays(new Date(), ACTIVITY_WINDOW_DAYS);
    const [memberRows, postCount, commentCount] = await Promise.all([
      prisma.member.findMany({
        where: {
          communityId: community.id,
          status: "ACTIVE",
          userId: { not: community.owner.id },
        },
        orderBy: { joinedAt: "asc" },
        take: 7,
        select: { user: { select: { id: true, name: true, image: true } } },
      }),
      prisma.post.count({
        where: { communityId: community.id, deletedAt: null, createdAt: { gte: since } },
      }),
      prisma.comment.count({
        where: { post: { communityId: community.id }, createdAt: { gte: since } },
      }),
    ]);
    sampleMembers = memberRows.map((m) => ({
      id: m.user.id,
      name: m.user.name ?? "Unknown",
      image: m.user.image,
      initials: computeInitials(m.user.name),
    }));
    activityStatus = classifyActivity(postCount + commentCount);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href={isOwner ? `/dashboard/c/${params.slug}` : "/dashboard"}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-foreground">{community.name}</h1>
              <p className="text-xs text-muted-foreground">Public Landing Page</p>
            </div>
          </div>

          {isOwner && (
            <Link href={`/dashboard/c/${params.slug}/settings/landing`}>
              <Button variant="outline" size="sm">
                Edit Landing Page
              </Button>
            </Link>
          )}
        </div>
      </div>
      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {sections.length === 0 ? (
          // Empty State
          <div className="mx-auto max-w-3xl rounded-2xl border-2 border-dashed border-border bg-white p-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
              <svg
                className="h-8 w-8 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-gray-900">No Landing Page Yet</h2>
            <p className="mb-6 text-gray-600">
              {isOwner
                ? "Get started by creating your landing page with our Section Builder"
                : "This community hasn't set up their landing page yet"}
            </p>
            {isOwner && (
              <Link href={`/dashboard/c/${params.slug}/settings/landing`}>
                <Button>Build Landing Page</Button>
              </Link>
            )}
          </div>
        ) : (
          // Render Sections
          <div className="mx-auto max-w-6xl space-y-12">
            {sections.map((section, index) =>
              renderSection(section, index, {
                communityId: community.id,
                communitySlug: community.slug,
                community: landingCommunity,
                sampleMembers,
                activityStatus,
              })
            )}
            {/* Footer CTA if owner */}
            {isOwner && (
              <div className="mt-16 rounded-lg border border-blue-200 bg-blue-50 p-6 text-center">
                <p className="mb-3 text-sm text-blue-900">
                  👋 You're viewing your public landing page
                </p>
                <Link href={`/dashboard/c/${params.slug}/settings/landing`}>
                  <Button variant="outline" size="sm">
                    Edit Landing Page
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
      {/* Footer */}
      <footer className="mt-24 border-t border-border bg-white py-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {community.name}. Powered by Unytea.
          </p>
        </div>
      </footer>
    </div>
  );
}
