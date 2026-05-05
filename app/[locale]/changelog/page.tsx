import type { Metadata } from "next";
import Link from "next/link";
import { Rocket, Shield, Zap, Paintbrush, Bug } from "lucide-react";
import { localizedAlternates } from "@/lib/seo/locale-metadata";

const META = {
  title: "Changelog | Unytea",
  description:
    "See what's new on Unytea — recent updates, features, improvements, and fixes.",
};

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  return {
    title: META.title,
    description: META.description,
    openGraph: {
      title: META.title,
      description: META.description,
    },
    ...localizedAlternates({ path: "/changelog", locale: params.locale }),
  };
}

type ChangeType = "feature" | "improvement" | "fix" | "security" | "design";

type ChangeEntry = {
  type: ChangeType;
  text: string;
};

type ReleaseEntry = {
  version: string;
  date: string;
  title: string;
  changes: ChangeEntry[];
};

const changeConfig: Record<
  ChangeType,
  { label: string; color: string; icon: typeof Rocket }
> = {
  feature: { label: "New", color: "bg-emerald-100 text-emerald-800", icon: Rocket },
  improvement: { label: "Improved", color: "bg-blue-100 text-blue-800", icon: Zap },
  fix: { label: "Fixed", color: "bg-amber-100 text-amber-800", icon: Bug },
  security: { label: "Security", color: "bg-red-100 text-red-800", icon: Shield },
  design: { label: "Design", color: "bg-purple-100 text-purple-800", icon: Paintbrush },
};

const RELEASES: ReleaseEntry[] = [
  {
    version: "0.9.0",
    date: "April 10, 2026",
    title: "Search, Reporting, and Platform Hardening",
    changes: [
      {
        type: "feature",
        text: "Global search across posts, courses, communities, and members with instant results.",
      },
      {
        type: "feature",
        text: "Content reporting system — flag inappropriate content with categorized reasons and admin review workflow.",
      },
      {
        type: "security",
        text: "Distributed rate limiting with Upstash Redis, replacing in-memory storage for production reliability.",
      },
      {
        type: "feature",
        text: "End-to-end test suite with Playwright covering authentication, navigation, and community flows.",
      },
      {
        type: "improvement",
        text: "Architecture documentation fully rewritten to reflect current tech stack and feature set.",
      },
    ],
  },
  {
    version: "0.8.0",
    date: "April 9, 2026",
    title: "Blog, Legal Pages, and Footer Navigation",
    changes: [
      {
        type: "feature",
        text: "Blog with SEO metadata, Open Graph tags, JSON-LD structured data, and individual article pages.",
      },
      {
        type: "feature",
        text: "Privacy Policy, Terms of Service, and Cookie Policy pages.",
      },
      {
        type: "feature",
        text: "Documentation hub with getting started, billing, community operations, and support sections.",
      },
      {
        type: "design",
        text: "Footer links wired to all new resource and legal pages.",
      },
    ],
  },
  {
    version: "0.7.0",
    date: "March 2026",
    title: "AI Features and Real-Time Collaboration",
    changes: [
      {
        type: "feature",
        text: "AI-powered chat assistant with context-aware responses for community members.",
      },
      {
        type: "feature",
        text: "AI content moderation with automated flagging and manual review queue.",
      },
      {
        type: "feature",
        text: "Personalized course and community recommendations powered by OpenAI.",
      },
      {
        type: "improvement",
        text: "Real-time messaging rebuilt with Pusher for instant message delivery and presence indicators.",
      },
    ],
  },
  {
    version: "0.6.0",
    date: "February 2026",
    title: "Live Sessions and Video Infrastructure",
    changes: [
      {
        type: "feature",
        text: "Live video sessions powered by LiveKit with support for screen sharing and recordings.",
      },
      {
        type: "feature",
        text: "Session scheduling with automated reminders and calendar integration.",
      },
      {
        type: "improvement",
        text: "Excalidraw collaborative whiteboard embedded in session rooms.",
      },
    ],
  },
  {
    version: "0.5.0",
    date: "January 2026",
    title: "Payments and Creator Monetization",
    changes: [
      {
        type: "feature",
        text: "Stripe integration for subscriptions, one-time payments, and community access gating.",
      },
      {
        type: "feature",
        text: "Stripe Connect onboarding for creators with automated payout management.",
      },
      {
        type: "feature",
        text: "Customer portal for members to manage billing, invoices, and subscription status.",
      },
      {
        type: "security",
        text: "Webhook signature verification for all Stripe events.",
      },
    ],
  },
  {
    version: "0.4.0",
    date: "December 2025",
    title: "Courses and Learning Paths",
    changes: [
      {
        type: "feature",
        text: "Structured course builder with modules, lessons, and progress tracking.",
      },
      {
        type: "feature",
        text: "Rich text editor powered by TipTap with image uploads, code blocks, and embeds.",
      },
      {
        type: "improvement",
        text: "Course completion certificates and member achievement badges.",
      },
    ],
  },
  {
    version: "0.3.0",
    date: "November 2025",
    title: "Community Foundation",
    changes: [
      {
        type: "feature",
        text: "Community creation with customizable branding, categories, and member roles.",
      },
      {
        type: "feature",
        text: "Discussion posts with threaded comments, reactions, and pinning.",
      },
      {
        type: "feature",
        text: "Member profiles with activity feeds and community membership lists.",
      },
      {
        type: "design",
        text: "Responsive layout with PWA support for mobile and desktop.",
      },
    ],
  },
  {
    version: "0.2.0",
    date: "October 2025",
    title: "Authentication and Internationalization",
    changes: [
      {
        type: "feature",
        text: "NextAuth v5 authentication with email/password, Google, and GitHub providers.",
      },
      {
        type: "feature",
        text: "Multi-language support (English, Spanish, French) with locale-based routing.",
      },
      {
        type: "security",
        text: "Email verification, password reset flow, and secure session management.",
      },
    ],
  },
];

export default function ChangelogPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b bg-muted/20">
        <div className="container mx-auto px-4 py-12">
          <p className="text-sm text-muted-foreground mb-2">Product</p>
          <h1 className="text-4xl font-bold tracking-tight">Changelog</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            A timeline of what we&apos;ve shipped. New features, improvements,
            and fixes — all in one place.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <div className="max-w-3xl">
          <div className="relative border-l-2 border-muted pl-8 space-y-12">
            {RELEASES.map((release) => (
              <div key={release.version} className="relative">
                {/* Timeline dot */}
                <div className="absolute -left-[calc(2rem+5px)] top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />

                <div className="flex flex-wrap items-baseline gap-3 mb-2">
                  <span className="text-xs font-mono font-medium bg-muted px-2 py-0.5 rounded">
                    v{release.version}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {release.date}
                  </span>
                </div>

                <h2 className="text-xl font-semibold mb-4">{release.title}</h2>

                <div className="space-y-3">
                  {release.changes.map((change, i) => {
                    const config = changeConfig[change.type];
                    const Icon = config.icon;
                    return (
                      <div key={i} className="flex gap-3 items-start">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${config.color}`}
                        >
                          <Icon className="w-3 h-3" />
                          {config.label}
                        </span>
                        <p className="text-sm text-muted-foreground">
                          {change.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-10">
          <Link
            href={`/${locale}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            &larr; Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}
