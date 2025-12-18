import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SectionInstance } from "@/components/section-builder/types";
import { HeroRender } from "@/components/section-builder/sections/Hero";
import { FeaturesRender } from "@/components/section-builder/sections/Features";
import { CTARender } from "@/components/section-builder/sections/CTA";
import { TestimonialsRender } from "@/components/section-builder/sections/Testimonials";
import { FAQRender } from "@/components/section-builder/sections/FAQ";
import { StatsRender } from "@/components/section-builder/sections/Stats";
import { OwnerBioRender } from "@/components/section-builder/sections/OwnerBio";
import { GalleryRender } from "@/components/section-builder/sections/Gallery";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";

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

function renderSection(section: SectionInstance, index: number) {
  const key = section.id || `section-${index}`;
  
  switch (section.type) {
    case "hero":
      return <HeroRender key={key} {...section.props} />;
    case "features":
      return <FeaturesRender key={key} {...section.props} />;
    case "cta":
      return <CTARender key={key} {...section.props} />;
    case "testimonials":
      return <TestimonialsRender key={key} {...section.props} />;
    case "faq":
      return <FAQRender key={key} {...section.props} />;
    case "stats":
      return <StatsRender key={key} {...section.props} />;
    case "ownerBio":
      return <OwnerBioRender key={key} {...section.props} />;
    case "gallery":
      return <GalleryRender key={key} {...section.props} />;
    case "pricing":
      return <div key={key} className="p-8 text-center text-gray-500">Pricing section coming soon</div>;
    case "video":
      return <div key={key} className="p-8 text-center text-gray-500">Video section coming soon</div>;
    default:
      console.warn(`Unknown section type: ${section.type}`);
      return null;
  }
}

export default async function PublicCommunityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const community = await getCommunity(slug);

  if (!community) {
    notFound();
  }

  const session = await auth();
  const isOwner = session?.user?.id === community.owner.id;

  // Parse landing layout
  const sections: SectionInstance[] = Array.isArray(community.landingLayout)
    ? (community.landingLayout as unknown as SectionInstance[])
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href={isOwner ? `/dashboard/c/${slug}` : "/dashboard"}>
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
            <Link href={`/dashboard/c/${slug}/settings/landing`}>
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
            <h2 className="mb-2 text-2xl font-bold text-gray-900">
              No Landing Page Yet
            </h2>
            <p className="mb-6 text-gray-600">
              {isOwner
                ? "Get started by creating your landing page with our Section Builder"
                : "This community hasn't set up their landing page yet"}
            </p>
            {isOwner && (
              <Link href={`/dashboard/c/${slug}/settings/landing`}>
                <Button>Build Landing Page</Button>
              </Link>
            )}
          </div>
        ) : (
          // Render Sections
          <div className="mx-auto max-w-6xl space-y-12">
            {sections.map((section, index) => renderSection(section, index))}

            {/* Footer CTA if owner */}
            {isOwner && (
              <div className="mt-16 rounded-lg border border-blue-200 bg-blue-50 p-6 text-center">
                <p className="mb-3 text-sm text-blue-900">
                  👋 You're viewing your public landing page
                </p>
                <Link href={`/dashboard/c/${slug}/settings/landing`}>
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
