import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LanguageSelector } from "@/components/LanguageSelector";
import {
  Sparkles,
  LayoutDashboard,
  ArrowRight,
  ArrowDown,
  Star,
  CheckCircle,
  Users,
  Video,
  BookOpen,
  TrendingUp,
  X,
  CreditCard,
  Twitter,
  Github,
  Linkedin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLatestPosts } from "./blog/posts";
import { localizedAlternates } from "@/lib/seo/locale-metadata";
import { HeaderAuthCTA } from "./_home/HeaderAuthCTA";
import { DemoVideoTrigger } from "./_home/DemoVideoTrigger";
import { FeatureCard } from "./_home/FeatureCard";
import { UseCaseCard } from "./_home/UseCaseCard";
import { ProblemImage } from "./_home/ProblemImage";
import { PricingSection } from "@/components/marketing/PricingSection";

const META = {
  en: {
    title: "Unytea — One platform for every audience you serve",
    description:
      "Unytea is the live platform for creators running multiple communities. Live sessions, courses, gamification — for every audience you serve.",
  },
  es: {
    title: "Unytea — Una plataforma para cada audiencia",
    description:
      "Unytea es la plataforma para creadores que gestionan varias comunidades. Sesiones en vivo, cursos, gamificación — para cada audiencia que sirves.",
  },
  fr: {
    title: "Unytea — Une plateforme pour chaque audience",
    description:
      "Unytea est la plateforme pour les créateurs qui gèrent plusieurs communautés. Sessions en direct, cours, gamification — pour chaque audience que vous servez.",
  },
} as const;

type SupportedLocale = keyof typeof META;

function resolveLocale(value: string): SupportedLocale {
  return (Object.keys(META) as SupportedLocale[]).includes(value as SupportedLocale)
    ? (value as SupportedLocale)
    : "en";
}

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const locale = resolveLocale(params.locale);
  const m = META[locale];
  return {
    title: m.title,
    description: m.description,
    openGraph: {
      title: m.title,
      description: m.description,
      type: "website",
    },
    ...localizedAlternates({ path: "", locale }),
  };
}

export default async function Home(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const locale = resolveLocale(params.locale);
  setRequestLocale(locale);

  const t = await getTranslations("landing");
  const tBilling = await getTranslations("billing.pricing");

  return (
    <div className="min-h-screen bg-background">
      {/* 1️⃣ HERO SECTION */}
      <nav className="glass-strong fixed top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Image
              src="/unytea-logo.png"
              alt="Unytea"
              width={32}
              height={32}
              className="h-8 w-8 rounded-md object-cover"
            />
            <span className="text-xl font-bold">Unytea</span>
          </div>
          <div className="hidden items-center gap-6 md:flex">
            {/* Explore is first in nav: highest-discovery-funnel surface for the
             * §2 emerging-creator persona (no audience → discovery is the
             * platform's job). */}
            <Link
              href={`/${locale}/explore`}
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              {t("nav.explore")}
            </Link>
            <Link
              href="#features"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              {t("nav.features")}
            </Link>
            <Link
              href="#comparison"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              {t("nav.vsSkool")}
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              {t("nav.pricing")}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <HeaderAuthCTA locale={locale} />
          </div>
        </div>
      </nav>

      {/* Hero Content */}
      <section className="relative flex min-h-screen items-center overflow-hidden pt-20">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-pink-50 opacity-70" />
        <div className="container relative z-10 mx-auto px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-primary">
                <Star className="h-4 w-4" />
                <span className="text-sm font-medium">{t("hero.badge")}</span>
              </div>
              <h1 className="mb-6 text-5xl font-bold leading-tight md:text-6xl lg:text-7xl">
                {t("hero.titleStart")}{" "}
                <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                  {t("hero.titleHighlight")}
                </span>
              </h1>
              <p className="mb-8 max-w-xl text-xl text-muted-foreground">{t("hero.description")}</p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
                <Link
                  href={`/${locale}/auth/signup`}
                  className="btn-hover-lift flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 font-semibold text-primary-foreground shadow-lg"
                >
                  {t("hero.cta.primary")}
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href={`/${locale}/auth/signup`}
                  className="flex items-center justify-center gap-2 rounded-xl border-2 border-border px-8 py-4 font-semibold transition-colors hover:border-primary"
                >
                  <Users className="h-5 w-5" />
                  {t("hero.cta.start_trial")}
                </Link>
                <DemoVideoTrigger />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{t("hero.guarantee")}</p>
            </div>
            {/* Mock del producto - lado derecho */}
            <div className="relative">
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl">
                {/* Browser chrome */}
                <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-4">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                  <span className="ml-4 text-sm font-semibold tracking-wide text-slate-700">
                    unytea.com/live/community-masterclass
                  </span>
                </div>

                {/* Live session header */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute -inset-1 animate-pulse rounded-full bg-red-500" />
                      <div className="relative rounded-full bg-red-500 px-3 py-1 text-xs font-bold">
                        {t("hero.demo.live")}
                      </div>
                    </div>
                    <div>
                      <div className="font-bold tracking-tight text-slate-900">
                        {t("hero.demo.sessionTitle")}
                      </div>
                      <div className="text-sm text-slate-700">{t("hero.demo.sessionSubtitle")}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Users className="h-4 w-4" />
                    <span>{t("hero.demo.attending", { count: 247 })}</span>
                  </div>
                </div>

                {/* Video grid */}
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-slate-700/80 ring-1 ring-white/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-500/20" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary">
                      <Video className="h-8 w-8" />
                    </div>
                    <div className="absolute bottom-2 left-2 rounded border border-white/20 bg-slate-900/85 px-2 py-1 text-xs font-semibold text-white">
                      {t("hero.demo.youHost")}
                    </div>
                  </div>
                  <div className="relative flex aspect-video items-center justify-center rounded-xl bg-slate-700/80 ring-1 ring-white/10">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-600">
                      <span className="text-lg">👩</span>
                    </div>
                    <div className="absolute bottom-2 left-2 rounded border border-white/20 bg-slate-900/85 px-2 py-1 text-xs font-semibold text-white">
                      Sarah M.
                    </div>
                  </div>
                  <div className="relative flex aspect-video items-center justify-center rounded-xl bg-slate-700/80 ring-1 ring-white/10">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-600">
                      <span className="text-lg">👨</span>
                    </div>
                    <div className="absolute bottom-2 left-2 rounded border border-white/20 bg-slate-900/85 px-2 py-1 text-xs font-semibold text-white">
                      Mike R.
                    </div>
                  </div>
                  <div className="relative flex aspect-video items-center justify-center rounded-xl bg-slate-700/80 ring-1 ring-white/10">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-600">
                      <span className="text-lg">👩</span>
                    </div>
                    <div className="absolute bottom-2 left-2 rounded border border-white/20 bg-slate-900/85 px-2 py-1 text-xs font-semibold text-white">
                      Lisa K.
                    </div>
                    <div className="absolute bottom-2 right-2 rounded border border-white/20 bg-slate-900/90 px-2 py-1 text-xs font-semibold text-white">
                      {t("hero.demo.moreAttendees", { count: 24 })}
                    </div>
                  </div>
                </div>

                {/* Chat preview */}
                <div className="rounded-xl bg-white p-3 ring-1 ring-slate-300">
                  <div className="space-y-2 text-sm">
                    <div className="flex gap-2">
                      <span className="font-medium text-slate-500">Mike:</span>
                      <span className="text-slate-900">{t("hero.demo.chatMessage1")}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium text-slate-500">Sarah:</span>
                      <span className="text-slate-900">{t("hero.demo.chatMessage2")}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium text-slate-500">Lisa:</span>
                      <span className="text-slate-900">{t("hero.demo.chatMessage3")}</span>
                    </div>
                  </div>
                </div>

                {/* Subtle light decoration */}
                <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-slate-100 blur-3xl" />
                <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-slate-100/80 blur-3xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature bullets - quick understanding */}
      <section className="border-y bg-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-3 w-3 text-green-600" />
              </div>
              <span>Live sessions</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-3 w-3 text-green-600" />
              </div>
              <span>Courses</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-3 w-3 text-green-600" />
              </div>
              <span>Community discussions</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-3 w-3 text-green-600" />
              </div>
              <span>Built-in monetization</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2️⃣ PROBLEMA DEL MERCADO */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-6 text-3xl font-bold md:text-4xl">
              Most community platforms are built like{" "}
              <span className="text-muted-foreground">forums from 2010</span>.
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              They focus on posts and discussions. But modern communities need more:
            </p>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="group relative mb-4 h-40 w-full overflow-hidden rounded-xl bg-gradient-to-br from-gray-100 to-gray-200">
                  <ProblemImage
                    src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=400&q=80"
                    alt="Boring meeting"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 shadow-lg">
                      <X className="h-8 w-8 text-white" strokeWidth={3} />
                    </div>
                  </div>
                </div>
                <h3 className="mb-2 text-lg font-semibold">Live interaction</h3>
                <p className="text-sm text-muted-foreground">
                  Missing real-time video, whiteboard, screen sharing
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="group relative mb-4 h-40 w-full overflow-hidden rounded-xl bg-gradient-to-br from-gray-100 to-gray-200">
                  <ProblemImage
                    src="https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=400&q=80"
                    alt="Disorganized materials"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 shadow-lg">
                      <X className="h-8 w-8 text-white" strokeWidth={3} />
                    </div>
                  </div>
                </div>
                <h3 className="mb-2 text-lg font-semibold">Structured learning</h3>
                <p className="text-sm text-muted-foreground">No integrated courses or workshops</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="group relative mb-4 h-40 w-full overflow-hidden rounded-xl bg-gradient-to-br from-gray-100 to-gray-200">
                  <ProblemImage
                    src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=400&q=80"
                    alt="Complex payments"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 shadow-lg">
                      <X className="h-8 w-8 text-white" strokeWidth={3} />
                    </div>
                  </div>
                </div>
                <h3 className="mb-2 text-lg font-semibold">Monetization tools</h3>
                <p className="text-sm text-muted-foreground">Complex payment setups, high fees</p>
              </div>
            </div>
            <p className="mt-12 text-xl font-medium">
              <span className="font-bold text-primary">Unytea</span> was built for modern community
              businesses.
            </p>
          </div>
        </div>
      </section>

      {/* 3️⃣ TU SOLUCIÓN - FEATURES */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <Badge className="mb-4">Features</Badge>
            <h2 className="mb-4 text-4xl font-bold">
              Everything you need to run a community business
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              One platform. All your tools. Zero integration headaches.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Live Sessions - Hero Feature (larger card) */}
            <div className="md:col-span-2 lg:col-span-1 lg:row-span-2">
              <FeatureCard
                image="https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?auto=format&fit=crop&w=600&q=80"
                title="🎥 Live Sessions"
                description="Interactive video calls with whiteboard, screen sharing, and recordings. Our most loved feature."
                highlighted
                large
              />
            </div>
            <FeatureCard
              image="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=400&q=80"
              title="Courses"
              description="Create, host, and sell courses with progress tracking and certificates."
            />
            <FeatureCard
              image="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=400&q=80"
              title="Community Feed"
              description="Engage your members with posts, comments, reactions, and direct messaging."
            />
            <FeatureCard
              image="https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=400&q=80"
              title="Whiteboard"
              description="Collaborate visually in real-time during live sessions."
            />
            <FeatureCard
              image="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80"
              title="Screen Sharing"
              description="Present slides, demos, and tutorials seamlessly."
            />
            <FeatureCard
              image="https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=400&q=80"
              title="AI Assistant"
              description="Get AI-powered suggestions, moderation, and content ideas."
            />
          </div>
        </div>
      </section>

      {/* 4️⃣ CASOS DE USO */}
      <section className="bg-gradient-to-br from-purple-50 to-pink-50 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <Badge className="mb-4">Use Cases</Badge>
            <h2 className="mb-4 text-4xl font-bold">Communities built on Unytea</h2>
            <p className="text-xl text-muted-foreground">
              See how different creators use our platform
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <UseCaseCard
              image="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80"
              title="Coaching Communities"
              features={[
                "Weekly group calls",
                "Paid memberships",
                "Student discussions",
                "1-on-1 scheduling",
              ]}
            />
            <UseCaseCard
              image="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&q=80"
              title="Learning Communities"
              features={[
                "Online courses",
                "Live workshops",
                "Community support",
                "Progress tracking",
              ]}
            />
            <UseCaseCard
              image="https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&q=80"
              title="Expert Communities"
              features={[
                "Mastermind groups",
                "Live Q&A sessions",
                "Premium content",
                "Direct access",
              ]}
            />
          </div>
        </div>
      </section>

      {/* 5️⃣ HOW IT WORKS - SIMPLIFICADO */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <Badge className="mb-4">Simple Process</Badge>
            <h2 className="mb-4 text-4xl font-bold">Launch your community in minutes</h2>
            <p className="text-xl text-muted-foreground">No technical skills required</p>
          </div>
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-5">
            <StepCard
              number={1}
              title="Create"
              description="Set up your community with your brand, colors, and custom domain."
            />
            <StepCard
              number={2}
              title="Invite"
              description="Share your link and invite your first members in seconds."
            />
            <StepCard
              number={3}
              title="Go Live"
              description="Host your first live session, course, or workshop immediately."
            />
            <StepCard
              number={4}
              title="Launch Course"
              description="Create and publish your first course with modules and lessons."
            />
            <StepCard
              number={5}
              title="Monetize"
              description="Set up pricing, subscriptions, and start earning revenue."
            />
          </div>
          <div className="mt-12 text-center">
            <Link href={`/${locale}/auth/signup`}>
              <Button size="lg" className="px-8">
                Start Building Free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 6️⃣ COMPARACIÓN - SECCIÓN CRÍTICA */}
      <section id="comparison" className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <Badge className="mb-4">Comparison</Badge>
            <h2 className="mb-4 text-4xl font-bold">Why creators choose Unytea</h2>
            <p className="text-xl text-muted-foreground">See how we compare to other platforms</p>
          </div>
          <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="grid grid-cols-3 bg-muted/50 p-4 font-semibold">
              <div>Feature</div>
              <div className="text-center">Skool</div>
              <div className="text-center text-primary">Unytea</div>
            </div>
            <ComparisonRow feature="Community Feed" skool="✓" unytea="✓" />
            <ComparisonRow feature="Courses" skool="✓" unytea="✓" />
            <ComparisonRow feature="Live Video Sessions" skool="✓" unytea="✓" />
            <ComparisonRow feature="Collaborative Whiteboard" skool="✗" unytea="✓" highlighted />
            <ComparisonRow feature="Screen Sharing" skool="✗" unytea="✓" highlighted />
            <ComparisonRow feature="AI Assistant" skool="✗" unytea="✓" highlighted />
            <ComparisonRow feature="Certificates" skool="✗" unytea="✓" highlighted />
            <ComparisonRow feature="Multi-language (i18n)" skool="✗" unytea="✓" highlighted />
            <ComparisonRow feature="Custom Domain" skool="✗" unytea="✓" highlighted />
            <ComparisonRow feature="Quizzes &amp; Assessments" skool="✗" unytea="✓" highlighted />
            {/* Skool: Hobby plan ($9/mo) charges 10% per transaction; Pro plan ($99/mo) charges 2.9-3.9%.
                Unytea: 5% flat across all plans. Stripe processing extra in both. */}
            <ComparisonRow feature="Platform Fee" skool="2.9–10%*" unytea="5% flat" highlighted />
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            * Skool fee depends on plan: 10% on Hobby ($9/mo), 2.9% on Pro ($99/mo). Stripe
            processing extra in both.
          </p>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Used by creators switching from Skool, Circle, Mighty Networks, and Facebook Groups
          </p>
        </div>
      </section>

      {/* 7️⃣ MONETIZACIÓN */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Badge className="mb-4">Monetization</Badge>
              <h2 className="mb-6 text-4xl font-bold">
                Turn your community into a business with live sessions
              </h2>
              <p className="mb-8 text-lg text-muted-foreground">
                Members can pay for access to your content, courses, and live sessions. All powered
                by Stripe.
              </p>
              <div className="space-y-4">
                <MonetizationItem
                  icon={Users}
                  title="Paid Memberships"
                  description="Charge monthly or annual access fees"
                />
                <MonetizationItem
                  icon={BookOpen}
                  title="Courses"
                  description="Sell one-time or drip courses"
                />
                <MonetizationItem
                  icon={Video}
                  title="Workshops"
                  description="Host paid live sessions and events"
                />
                <MonetizationItem
                  icon={CreditCard}
                  title="Flat Platform Fee"
                  description="One simple 5% on all plans, plus Stripe processing"
                />
              </div>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 p-8">
              <div className="rounded-xl bg-white p-6 shadow-lg">
                <div className="mb-6 flex items-center justify-between">
                  <span className="font-medium">Monthly Revenue</span>
                  <Badge variant="secondary">This Month</Badge>
                </div>
                <div className="mb-2 text-4xl font-bold">$12,450</div>
                <div className="mb-6 flex items-center text-sm text-green-600">
                  <TrendingUp className="mr-1 h-4 w-4" />
                  +23% from last month
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Memberships</span>
                    <span className="font-medium">$8,200</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Courses</span>
                    <span className="font-medium">$3,150</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Workshops</span>
                    <span className="font-medium">$1,100</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9️⃣ PRICING */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-16 max-w-4xl text-center">
            <Badge className="mb-4">Pricing</Badge>
            <h2 className="mb-4 text-4xl font-bold">{tBilling("headerTitle")}</h2>
            <p className="mb-2 text-lg text-muted-foreground">{tBilling("headerSubtitle")}</p>
            <p className="text-base text-muted-foreground">{tBilling("headerDetail")}</p>
          </div>

          <PricingSection locale={locale} />

          <div className="mx-auto mt-10 max-w-6xl rounded-2xl border bg-muted/20 p-6">
            <h3 className="mb-2 text-lg font-semibold">{tBilling("freeForMembersTitle")}</h3>
            <p className="text-sm text-muted-foreground">{tBilling("freeForMembersBody")}</p>
          </div>

          <div className="mx-auto mt-8 grid max-w-6xl gap-4 md:grid-cols-2">
            <FaqItem
              q="Do members pay to use Unytea?"
              a="No. Members can create an account, explore communities, and join for free. They only pay if a host charges for community access or sells a course."
            />
            <FaqItem
              q="When do transaction fees apply?"
              a="Transaction fees apply only when you sell paid community access or courses through Unytea."
            />
            <FaqItem
              q="Is there a free trial?"
              a="Yes. Every plan starts with a 14-day free trial — no credit card required. At day 14, if you haven't added payment, your community is paywalled (your data stays safe, members just can't interact) until you add a card. You can come back any time."
            />
            <FaqItem
              q="Can I change plans later?"
              a="Yes. You can upgrade as your community grows and unlock lower transaction fees, more tools, and more operational control."
            />
            <FaqItem
              q="Who is Pro for?"
              a="Pro is for operators managing multiple communities, brands, or teams that need white-labeling, API access, and zero transaction fees."
            />
          </div>
        </div>
      </section>

      {/* REPLACE TOOLS - CONSOLIDATE EVERYTHING */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-20 text-white">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <Badge className="mb-4 border-white/20 bg-white/10 text-white hover:bg-white/20">
              Consolidate Your Stack
            </Badge>
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Replace your entire community stack
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-gray-400">
              Run your entire community business with one platform
            </p>
          </div>

          {/* Tools being replaced */}
          <div className="mb-10 flex flex-wrap items-center justify-center gap-4 md:gap-6">
            {[
              { name: "Zoom", color: "bg-blue-500", icon: "Z", feature: "→ Live sessions" },
              { name: "Kajabi", color: "bg-orange-500", icon: "K", feature: "→ Courses" },
              { name: "Facebook", color: "bg-blue-600", icon: "f", feature: "→ Community" },
              { name: "Slack", color: "bg-purple-600", icon: "S", feature: "→ Chat" },
              { name: "Skool", color: "bg-green-500", icon: "S", feature: "→ Memberships" },
            ].map((tool) => (
              <div
                key={tool.name}
                className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm transition-all hover:bg-white/20"
              >
                <div
                  className={`h-10 w-10 ${tool.color} flex items-center justify-center rounded-lg text-lg font-bold text-white shadow-lg`}
                >
                  {tool.icon}
                </div>
                <div>
                  <div className="text-sm font-semibold">{tool.name}</div>
                  <div className="text-xs font-medium text-green-400">{tool.feature}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Arrow pointing to Unytea */}
          <div className="mb-8 flex justify-center">
            <div className="flex items-center gap-4 text-gray-400">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-gray-500" />
              <ArrowDown className="h-6 w-6 animate-bounce" />
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-gray-500" />
            </div>
          </div>

          {/* Unytea solution */}
          <div className="text-center">
            <div className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-primary to-purple-600 px-8 py-4 shadow-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-lg">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <div className="text-left">
                <div className="text-xl font-bold">Unytea</div>
                <div className="text-sm text-white/80">One platform. Everything you need.</div>
              </div>
            </div>

            <p className="mt-6 text-base text-gray-400">
              No integrations. No complexity. Just one platform.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Save $300+/month • Cancel 5 subscriptions • Everything connected
            </p>
          </div>
        </div>
      </section>

      {/* WHAT YOU CAN RUN TODAY */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="mb-10 text-center">
            <Badge className="mb-4">Built In</Badge>
            <h2 className="mb-4 text-3xl font-bold">
              Run your community with features available today
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              No mock promises — these workflows are already live in the product.
            </p>
          </div>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            <div className="rounded-xl border bg-white p-6 text-center transition-all hover:shadow-lg">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100">
                <LayoutDashboard className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Customize Landing Page</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Use Appearance + Section Presets to shape your public community page.
              </p>
              <div className="text-xs font-medium text-green-600">✓ Available now</div>
            </div>
            <div className="rounded-xl border bg-white p-6 text-center transition-all hover:shadow-lg">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-100">
                <Video className="h-7 w-7 text-orange-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Host Live Sessions</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Schedule sessions, track attendance, and manage reminders from one control center.
              </p>
              <div className="text-xs font-medium text-green-600">✓ Available now</div>
            </div>
            <div className="rounded-xl border bg-white p-6 text-center transition-all hover:shadow-lg">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-purple-100">
                <CreditCard className="h-7 w-7 text-purple-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Monetize Access & Courses</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Set paid access, sell courses, and manage subscriptions with Stripe-powered
                payments.
              </p>
              <div className="text-xs font-medium text-green-600">✓ Available now</div>
            </div>
          </div>
        </div>
      </section>

      {/* OPERATIONAL ADVANTAGE */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 text-center">
              <Badge className="mb-4 bg-purple-100 text-purple-700 hover:bg-purple-100">
                Why operators choose Unytea
              </Badge>
              <h2 className="mb-4 text-3xl font-bold md:text-4xl">
                Everything in one operating system
              </h2>
              <p className="text-lg text-muted-foreground">
                Run sessions, content, community, and monetization without stitching together extra
                tools.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-xl border bg-gradient-to-br from-gray-50 to-gray-100 p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <Video className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="mb-2 font-semibold">Run live sessions with control</h3>
                <p className="text-sm text-muted-foreground">
                  Schedule upcoming sessions, track attendance, and manage reminders from one
                  sessions hub.
                </p>
              </div>
              <div className="rounded-xl border bg-gradient-to-br from-gray-50 to-gray-100 p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                  <LayoutDashboard className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="mb-2 font-semibold">Shape your landing fast</h3>
                <p className="text-sm text-muted-foreground">
                  Use Appearance and Section Presets to customize your public page without custom
                  code.
                </p>
              </div>
              <div className="rounded-xl border bg-gradient-to-br from-gray-50 to-gray-100 p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="mb-2 font-semibold">Monetize and optimize</h3>
                <p className="text-sm text-muted-foreground">
                  Sell access and courses with Stripe while using analytics and achievements to
                  improve retention.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9️⃣.5 LATEST FROM THE BLOG — internal links to surface fresh content for crawlers */}
      <section className="bg-muted/20 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="mb-2 text-sm font-medium text-primary">{t("blogSection.eyebrow")}</p>
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">{t("blogSection.title")}</h2>
            <p className="text-base text-muted-foreground">{t("blogSection.subtitle")}</p>
          </div>

          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
            {getLatestPosts(3).map((post) => (
              <Link
                key={post.slug}
                href={`/${locale}/blog/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl border bg-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-primary/10 to-purple-100">
                  <Image
                    src={post.featuredImage}
                    alt={post.title}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-grow flex-col p-5">
                  <h3 className="mb-2 line-clamp-2 text-base font-semibold transition-colors group-hover:text-primary">
                    {post.title}
                  </h3>
                  <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
                  <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                    <span>{post.readTime}</span>
                    <span>
                      {/*
                        Append T12:00:00 so the date isn't parsed as UTC
                        midnight (which retrocedes a day in negative-offset
                        timezones like America/Mexico). Noon local time is
                        safe across every IANA zone.
                      */}
                      {new Date(post.date + "T12:00:00").toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href={`/${locale}/blog`}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              {t("blogSection.readMore")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 🔟 CTA FINAL */}
      <section className="bg-gradient-to-br from-primary to-purple-600 py-20 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-6 text-4xl font-bold md:text-5xl">
            Start building your community today
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-xl opacity-90">
            Create your community, invite members, and host your first live session — all in less
            than 5 minutes.
          </p>
          <Link
            href={`/${locale}/auth/signup`}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-bold text-primary transition-colors hover:bg-white/90"
          >
            Create Your Community Free
            <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="mt-6 text-sm opacity-80">
            ✓ 14-day free trial &nbsp;•&nbsp; ✓ No credit card required &nbsp;•&nbsp; ✓ Cancel
            anytime
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8 grid gap-8 md:grid-cols-5">
            <div className="md:col-span-2">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">Unytea</span>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                The live platform for community-based learning.
              </p>
              <div className="flex items-center gap-3">
                <a
                  href="https://twitter.com/unytea"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Twitter"
                >
                  <Twitter className="h-4 w-4" />
                </a>
                <a
                  href="https://github.com/paparatsi40/unytea"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="GitHub"
                >
                  <Github className="h-4 w-4" />
                </a>
                <a
                  href="https://linkedin.com/company/unytea"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              </div>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="#features"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="#pricing"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/${locale}/changelog`}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Changelog
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href={`/${locale}/documentation`}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/${locale}/blog`}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Blog
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href={`/${locale}/privacy`}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/${locale}/terms`}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Terms
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/${locale}/cookies`}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Cookies
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Unytea. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="group text-center">
      <div className="relative mx-auto mb-4 h-16 w-16">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-purple-600 opacity-20 transition-transform group-hover:scale-110" />
        <div className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-600 text-xl font-bold text-white shadow-lg">
          {number}
        </div>
      </div>
      <h3 className="mb-2 text-lg font-semibold transition-colors group-hover:text-primary">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function ComparisonRow({
  feature,
  skool,
  unytea,
  highlighted = false,
}: {
  feature: string;
  skool: string;
  unytea: string;
  highlighted?: boolean;
}) {
  return (
    <div className={`grid grid-cols-3 border-t p-4 ${highlighted ? "bg-primary/5" : ""}`}>
      <div className="font-medium">{feature}</div>
      <div className="text-center">
        {skool === "✓" ? (
          <span className="text-green-600">✓</span>
        ) : skool === "✗" ? (
          <span className="text-red-400">✗</span>
        ) : (
          <span className="text-muted-foreground">{skool}</span>
        )}
      </div>
      <div className="text-center font-medium text-primary">
        {unytea === "✓" ? (
          <span className="text-green-600">✓</span>
        ) : (
          <span className="text-muted-foreground">{unytea}</span>
        )}
      </div>
    </div>
  );
}

function MonetizationItem({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <h4 className="mb-1.5 text-sm font-semibold">{q}</h4>
      <p className="text-sm text-muted-foreground">{a}</p>
    </div>
  );
}
