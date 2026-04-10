import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  CreditCard,
  Globe,
  LifeBuoy,
  MessageSquare,
  Palette,
  Play,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Documentation | Unytea",
  description:
    "Guides and references for launching, growing, and operating your community on Unytea.",
  openGraph: {
    title: "Documentation | Unytea",
    description:
      "Guides and references for launching, growing, and operating your community on Unytea.",
  },
};

type DocSection = {
  icon: typeof BookOpen;
  title: string;
  description: string;
  topics: string[];
};

const sections: DocSection[] = [
  {
    icon: Play,
    title: "Getting Started",
    description:
      "Set up your account, create your first community, and understand the platform basics.",
    topics: [
      "Account creation and profile setup",
      "Creating your first community",
      "Inviting members and sharing your community link",
      "Understanding roles: Owner, Admin, Moderator, Member",
    ],
  },
  {
    icon: Palette,
    title: "Community Branding",
    description:
      "Customize the look and feel of your community to match your brand identity.",
    topics: [
      "Community logo, banner, and color scheme",
      "Custom landing page for public visitors",
      "Category and topic organization",
      "Custom domain setup (coming soon)",
    ],
  },
  {
    icon: BookOpen,
    title: "Courses and Content",
    description:
      "Build structured learning paths with modules, lessons, and progress tracking.",
    topics: [
      "Creating courses with the module builder",
      "Rich text editing with TipTap (images, code, embeds)",
      "Setting prerequisites and completion criteria",
      "Tracking member progress and issuing certificates",
    ],
  },
  {
    icon: Video,
    title: "Live Sessions",
    description:
      "Host real-time video sessions with screen sharing, recordings, and collaborative tools.",
    topics: [
      "Scheduling and announcing sessions",
      "Screen sharing and presentation mode",
      "Collaborative whiteboard (Excalidraw)",
      "Session recordings and post-session summaries",
    ],
  },
  {
    icon: MessageSquare,
    title: "Messaging and Chat",
    description:
      "Real-time communication for your community with channels, threads, and direct messages.",
    topics: [
      "Community channels and discussion threads",
      "Direct messaging between members",
      "Real-time presence indicators",
      "File sharing and media attachments",
    ],
  },
  {
    icon: CreditCard,
    title: "Payments and Billing",
    description:
      "Monetize your community with subscriptions, one-time payments, and tiered access.",
    topics: [
      "Connecting your Stripe account",
      "Setting up subscription plans and pricing tiers",
      "Managing member billing and invoices",
      "Payout schedules and transaction fees",
    ],
  },
  {
    icon: Sparkles,
    title: "AI Features",
    description:
      "Leverage AI to assist members, moderate content, and personalize recommendations.",
    topics: [
      "AI chat assistant for member support",
      "Automated content moderation",
      "Personalized course and community recommendations",
      "AI usage limits and configuration",
    ],
  },
  {
    icon: Users,
    title: "Member Management",
    description:
      "Manage your community members, roles, permissions, and engagement.",
    topics: [
      "Member onboarding and welcome flows",
      "Role assignment and permission levels",
      "Member activity tracking and engagement metrics",
      "Handling removals and bans",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Moderation and Safety",
    description:
      "Keep your community safe with moderation tools, reporting, and content policies.",
    topics: [
      "Content reporting and review workflows",
      "Community guidelines and acceptable use policies",
      "Automated moderation with AI flagging",
      "Managing reported content and appeals",
    ],
  },
  {
    icon: Globe,
    title: "Internationalization",
    description:
      "Reach a global audience with multi-language support built into the platform.",
    topics: [
      "Supported languages: English, Spanish, French",
      "Locale-based routing and URL structure",
      "Translating community content",
      "Adding new language support",
    ],
  },
  {
    icon: Zap,
    title: "API and Integrations",
    description:
      "Connect Unytea with your existing tools and workflows through our API.",
    topics: [
      "API authentication and rate limits",
      "Webhook events for community activity",
      "Zapier and third-party integrations (coming soon)",
      "Embedding community widgets on external sites",
    ],
  },
  {
    icon: LifeBuoy,
    title: "Support",
    description:
      "Get help with your account, billing, or technical issues.",
    topics: [
      "Frequently asked questions",
      "Account recovery and security",
      "Billing disputes and refund requests",
      "Contact support at support@unytea.com",
    ],
  },
];

export default function DocumentationPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b bg-muted/20">
        <div className="container mx-auto px-4 py-12">
          <p className="text-sm text-muted-foreground mb-2">Resources</p>
          <h1 className="text-4xl font-bold tracking-tight">Documentation</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Everything you need to launch, grow, and manage your community on
            Unytea. From first setup to advanced features.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.title}
                className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow"
              >
                <Icon className="w-5 h-5 text-primary mb-3" />
                <h2 className="text-lg font-semibold mb-2">{section.title}</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {section.description}
                </p>
                <div className="space-y-1.5">
                  {section.topics.map((topic) => (
                    <p
                      key={topic}
                      className="text-xs text-muted-foreground flex items-start gap-2"
                    >
                      <span className="text-primary mt-0.5 shrink-0">
                        &bull;
                      </span>
                      {topic}
                    </p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="max-w-6xl mt-12 rounded-xl border bg-muted/30 p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">
            Can&apos;t find what you need?
          </h2>
          <p className="text-muted-foreground mb-4">
            Our support team is here to help. Reach out and we&apos;ll get back
            to you within 24 hours.
          </p>
          <a
            href="mailto:support@unytea.com"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <LifeBuoy className="w-4 h-4" />
            Contact Support
          </a>
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
