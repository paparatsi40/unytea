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
  Radio,
  MessageSquare,
  RotateCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getLatestPosts } from "./blog/posts";
import { localizedAlternates } from "@/lib/seo/locale-metadata";
import { localizedOpenGraph } from "@/lib/seo/open-graph";
import { HeaderAuthCTA } from "./_home/HeaderAuthCTA";
import { DemoVideoTrigger } from "./_home/DemoVideoTrigger";
import { FeatureCard } from "./_home/FeatureCard";
import { UseCaseCard } from "./_home/UseCaseCard";
import { ProblemImage } from "./_home/ProblemImage";
import { PricingSection } from "@/components/marketing/PricingSection";
import { PAID_PLANS, PLATFORM_FEE_PERCENT } from "@/lib/plans";

const META = {
  en: {
    title: "Unytea — One platform for every audience you serve",
    description:
      "Unytea is the live platform for creators running multiple communities. Live sessions, courses, monetization — for every audience you serve.",
  },
  es: {
    title: "Unytea — Una plataforma para cada audiencia",
    description:
      "Unytea es la plataforma para creadores que gestionan varias comunidades. Sesiones en vivo, cursos y monetización — para cada audiencia que sirves.",
  },
  fr: {
    title: "Unytea — Une plateforme pour chaque audience",
    description:
      "Unytea est la plateforme pour les créateurs qui gèrent plusieurs communautés. Sessions en direct, cours, monétisation — pour chaque audience que vous servez.",
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
    // Spread the shared defaults. Writing a bare object here is what stripped
    // the homepage of og:image, og:url and og:site_name — see
    // lib/seo/open-graph.ts.
    openGraph: {
      ...localizedOpenGraph(locale),
      title: m.title,
      description: m.description,
    },
    ...localizedAlternates({ path: "", locale }),
  };
}

export default async function Home(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const locale = resolveLocale(params.locale);
  setRequestLocale(locale);

  const t = await getTranslations("landing");
  // The platform fee is tiered, not flat. Both numbers come from
  // PLATFORM_FEE_PERCENT so the page cannot drift from what Stripe charges —
  // the copy used to claim "5% flat", which was wrong for Business and Pro and
  // buried the 0% that Pro actually gets.
  const paidPlanFees = PAID_PLANS.map((plan) => PLATFORM_FEE_PERCENT[plan]);
  const minFee = Math.min(...paidPlanFees);
  const maxFee = Math.max(...paidPlanFees);
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
              <span>{t("bullets.live")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-3 w-3 text-green-600" />
              </div>
              <span>{t("bullets.courses")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-3 w-3 text-green-600" />
              </div>
              <span>{t("bullets.discussions")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-3 w-3 text-green-600" />
              </div>
              <span>{t("bullets.monetization")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2️⃣ PROBLEMA DEL MERCADO */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-6 text-3xl font-bold md:text-4xl">
              {t("problem.titleStart")}
              <span className="text-muted-foreground">{t("problem.titleHighlight")}</span>.
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">{t("problem.subtitle")}</p>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="group relative mb-4 h-40 w-full overflow-hidden rounded-xl bg-gradient-to-br from-gray-100 to-gray-200">
                  <ProblemImage
                    src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=400&q=80"
                    alt={t("problem.live.imageAlt")}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 shadow-lg">
                      <X className="h-8 w-8 text-white" strokeWidth={3} />
                    </div>
                  </div>
                </div>
                <h3 className="mb-2 text-lg font-semibold">{t("problem.live.title")}</h3>
                <p className="text-sm text-muted-foreground">{t("problem.live.description")}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="group relative mb-4 h-40 w-full overflow-hidden rounded-xl bg-gradient-to-br from-gray-100 to-gray-200">
                  <ProblemImage
                    src="https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=400&q=80"
                    alt={t("problem.learning.imageAlt")}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 shadow-lg">
                      <X className="h-8 w-8 text-white" strokeWidth={3} />
                    </div>
                  </div>
                </div>
                <h3 className="mb-2 text-lg font-semibold">{t("problem.learning.title")}</h3>
                <p className="text-sm text-muted-foreground">{t("problem.learning.description")}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="group relative mb-4 h-40 w-full overflow-hidden rounded-xl bg-gradient-to-br from-gray-100 to-gray-200">
                  <ProblemImage
                    src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=400&q=80"
                    alt={t("problem.monetization.imageAlt")}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 shadow-lg">
                      <X className="h-8 w-8 text-white" strokeWidth={3} />
                    </div>
                  </div>
                </div>
                <h3 className="mb-2 text-lg font-semibold">{t("problem.monetization.title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("problem.monetization.description")}
                </p>
              </div>
            </div>
            <p className="mt-12 text-xl font-medium">
              {t.rich("problem.conclusion", {
                brand: (chunks) => <span className="font-bold text-primary">{chunks}</span>,
              })}
            </p>
          </div>
        </div>
      </section>

      {/* 2️⃣.4 WHY COMMUNITIES FAIL — creator-level pain */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <Badge variant="destructive" className="mb-4">
              {t("whyFail.badge")}
            </Badge>
            <h2 className="mb-4 text-4xl font-bold">{t("whyFail.title")}</h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              {t("whyFail.subtitle")}
            </p>
          </div>
          <div className="mx-auto mb-12 grid max-w-3xl gap-6 md:grid-cols-2">
            <div className="flex items-start gap-3">
              <X className="mt-1 h-6 w-6 flex-shrink-0 text-red-500" />
              <p className="text-lg">{t("whyFail.pain1")}</p>
            </div>
            <div className="flex items-start gap-3">
              <X className="mt-1 h-6 w-6 flex-shrink-0 text-red-500" />
              <p className="text-lg">{t("whyFail.pain2")}</p>
            </div>
            <div className="flex items-start gap-3">
              <X className="mt-1 h-6 w-6 flex-shrink-0 text-red-500" />
              <p className="text-lg">{t("whyFail.pain3")}</p>
            </div>
            <div className="flex items-start gap-3">
              <X className="mt-1 h-6 w-6 flex-shrink-0 text-red-500" />
              <p className="text-lg">{t("whyFail.pain4")}</p>
            </div>
          </div>
          <div className="mx-auto max-w-2xl text-center">
            <p className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-2xl font-semibold text-transparent">
              {t("whyFail.conclusion")}
            </p>
          </div>
        </div>
      </section>

      {/* 2️⃣.5 HOW IT WORKS — live-first workflow */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <Badge className="mb-4">{t("howItWorks.badge")}</Badge>
            <h2 className="mb-4 text-4xl font-bold">{t("howItWorks.title")}</h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              {t("howItWorks.subtitle")}
            </p>
          </div>
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3 lg:grid-cols-6">
            {[
              { icon: Radio, key: "session" },
              { icon: Video, key: "recording" },
              { icon: Sparkles, key: "summary" },
              { icon: MessageSquare, key: "discussion" },
              { icon: BookOpen, key: "library" },
              { icon: TrendingUp, key: "growth" },
            ].map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.key} className="flex flex-col items-center text-center">
                  <div className="relative mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-600 text-lg font-bold text-white shadow-lg">
                    {i + 1}
                  </div>
                  <Icon className="mb-2 h-8 w-8 text-primary" />
                  <h3 className="mb-2 font-semibold">{t(`howItWorks.${step.key}.title`)}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t(`howItWorks.${step.key}.description`)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3️⃣ TU SOLUCIÓN - FEATURES */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <Badge className="mb-4">{t("featureGrid.badge")}</Badge>
            <h2 className="mb-4 text-4xl font-bold">{t("featureGrid.title")}</h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              {t("featureGrid.subtitle")}
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Live Sessions - Hero Feature (larger card) */}
            <div className="md:col-span-2 lg:col-span-1 lg:row-span-2">
              <FeatureCard
                image="https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?auto=format&fit=crop&w=600&q=80"
                title={t("featureGrid.live.title")}
                description={t("featureGrid.live.description")}
                highlighted
                large
              />
            </div>
            <FeatureCard
              image="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=400&q=80"
              title={t("featureGrid.courses.title")}
              description={t("featureGrid.courses.description")}
            />
            <FeatureCard
              image="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=400&q=80"
              title={t("featureGrid.feed.title")}
              description={t("featureGrid.feed.description")}
            />
            <FeatureCard
              image="https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=400&q=80"
              title={t("featureGrid.whiteboard.title")}
              description={t("featureGrid.whiteboard.description")}
            />
            <FeatureCard
              image="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80"
              title={t("featureGrid.screenShare.title")}
              description={t("featureGrid.screenShare.description")}
            />
          </div>
        </div>
      </section>

      {/* 3️⃣.5 POST-SESSION FOLLOW-UP
          Was "AI SECTION", with an AI Coach card beside this one. Nothing in
          the codebase implements that coach — no aiCoach/AICoach/ai-coach
          anywhere under lib/, app/actions/ or components/ — so the card and its
          keys are gone. The recap that remains is real but calls no model: it
          is assembled from session data and the notes taken during the session
          (lib/jobs/session-recap.ts). With neither half being AI, the section
          is framed around what it actually is. */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <Badge className="mb-4">{t("followUp.badge")}</Badge>
            <h2 className="mb-4 text-4xl font-bold">{t("followUp.title")}</h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              {t("followUp.subtitle")}
            </p>
          </div>
          {/* One card, centred, rather than a two-column grid left half empty. */}
          <div className="mx-auto max-w-2xl">
            <div className="rounded-xl border bg-white p-8 shadow-sm transition-all hover:shadow-lg">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-purple-100">
                <RotateCw className="h-7 w-7 text-purple-600" />
              </div>
              <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-purple-600">
                {t("followUp.recap.eyebrow")}
              </p>
              <h3 className="mb-3 text-2xl font-bold">{t("followUp.recap.title")}</h3>
              <p className="text-muted-foreground">{t("followUp.recap.description")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4️⃣ CASOS DE USO */}
      <section className="bg-gradient-to-br from-purple-50 to-pink-50 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <Badge className="mb-4">{t("useCases.badge")}</Badge>
            <h2 className="mb-4 text-4xl font-bold">{t("useCases.title")}</h2>
            <p className="text-xl text-muted-foreground">{t("useCases.subtitle")}</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <UseCaseCard
              image="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80"
              title={t("useCases.coaching.title")}
              features={t.raw("useCases.coaching.features")}
            />
            <UseCaseCard
              image="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&q=80"
              title={t("useCases.learning.title")}
              features={t.raw("useCases.learning.features")}
            />
            <UseCaseCard
              image="https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&q=80"
              title={t("useCases.expert.title")}
              features={t.raw("useCases.expert.features")}
            />
          </div>
        </div>
      </section>

      {/* 6️⃣ COMPARACIÓN - SECCIÓN CRÍTICA */}
      <section id="comparison" className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <Badge className="mb-4">{t("comparison.badge")}</Badge>
            <h2 className="mb-4 text-4xl font-bold">{t("comparison.title")}</h2>
            <p className="text-xl text-muted-foreground">{t("comparison.subtitle")}</p>
          </div>
          <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="grid grid-cols-3 bg-muted/50 p-4 font-semibold">
              <div>{t("comparison.headerFeature")}</div>
              <div className="text-center">Skool</div>
              <div className="text-center text-primary">Unytea</div>
            </div>
            <ComparisonRow feature={t("comparison.rows.feed")} skool="✓" unytea="✓" />
            <ComparisonRow feature={t("comparison.rows.courses")} skool="✓" unytea="✓" />
            <ComparisonRow feature={t("comparison.rows.liveVideo")} skool="✓" unytea="✓" />
            <ComparisonRow
              feature={t("comparison.rows.whiteboard")}
              skool="✗"
              unytea="✓"
              highlighted
            />
            <ComparisonRow
              feature={t("comparison.rows.certificates")}
              skool="✗"
              unytea="✓"
              highlighted
            />
            <ComparisonRow
              feature={t("comparison.rows.multiLanguage")}
              skool="✗"
              unytea="✓"
              highlighted
            />
            {/* Skool: Hobby plan ($9/mo) charges 10% per transaction; Pro plan ($99/mo) charges 2.9-3.9%.
                Unytea: 5% flat across all plans. Stripe processing extra in both. */}
            <ComparisonRow
              feature={t("comparison.rows.platformFee")}
              skool="2.9–10%*"
              unytea={t("comparison.unyteaFee", { min: minFee })}
              highlighted
            />
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("comparison.footnote", { min: minFee, max: maxFee })}
          </p>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {t("comparison.switchers")}
          </p>
        </div>
      </section>

      {/* 7️⃣ MONETIZACIÓN */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Badge className="mb-4">{t("monetization.badge")}</Badge>
              <h2 className="mb-6 text-4xl font-bold">{t("monetization.title")}</h2>
              <p className="mb-8 text-lg text-muted-foreground">{t("monetization.description")}</p>
              <div className="space-y-4">
                <MonetizationItem
                  icon={Users}
                  title={t("monetization.memberships.title")}
                  description={t("monetization.memberships.description")}
                />
                <MonetizationItem
                  icon={BookOpen}
                  title={t("monetization.courses.title")}
                  description={t("monetization.courses.description")}
                />
                <MonetizationItem
                  icon={Video}
                  title={t("monetization.workshops.title")}
                  description={t("monetization.workshops.description")}
                />
                <MonetizationItem
                  icon={CreditCard}
                  title={t("monetization.fee.title")}
                  description={t("monetization.fee.description", { min: minFee, max: maxFee })}
                />
              </div>
            </div>
            <div className="relative rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 p-8">
              <span className="absolute right-4 top-4 z-10 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                {t("monetization.example.badge")}
              </span>
              <div className="rounded-xl bg-white p-6 shadow-lg">
                <div className="mb-6 flex items-center justify-between">
                  <span className="font-medium">{t("monetization.example.revenueLabel")}</span>
                  <Badge variant="secondary">{t("monetization.example.periodBadge")}</Badge>
                </div>
                <div className="mb-2 text-4xl font-bold">$12,450</div>
                <div className="mb-6 flex items-center text-sm text-green-600">
                  <TrendingUp className="mr-1 h-4 w-4" />
                  {t("monetization.example.delta")}
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("monetization.example.memberships")}
                    </span>
                    <span className="font-medium">$8,200</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("monetization.example.courses")}
                    </span>
                    <span className="font-medium">$3,150</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("monetization.example.workshops")}
                    </span>
                    <span className="font-medium">$1,100</span>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                {t("monetization.example.disclaimer")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9️⃣ PRICING */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-16 max-w-4xl text-center">
            <Badge className="mb-4">{t("nav.pricing")}</Badge>
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
            {["q1", "q2", "q3", "q4", "q5"].map((n) => (
              <FaqItem
                key={n}
                q={t(`pricingFaq.${n}`)}
                a={t(`pricingFaq.${n.replace("q", "a")}`)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* REPLACE TOOLS - CONSOLIDATE EVERYTHING */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-20 text-white">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <Badge className="mb-4 border-white/20 bg-white/10 text-white hover:bg-white/20">
              {t("replaceStack.badge")}
            </Badge>
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">{t("replaceStack.title")}</h2>
            <p className="mx-auto max-w-2xl text-xl text-gray-400">{t("replaceStack.subtitle")}</p>
          </div>

          {/* Tools being replaced */}
          <div className="mb-10 flex flex-wrap items-center justify-center gap-4 md:gap-6">
            {[
              { name: "Zoom", color: "bg-blue-500", icon: "Z", key: "zoom" },
              { name: "Kajabi", color: "bg-orange-500", icon: "K", key: "kajabi" },
              { name: "Facebook", color: "bg-blue-600", icon: "f", key: "facebook" },
              { name: "Slack", color: "bg-purple-600", icon: "S", key: "slack" },
              { name: "Skool", color: "bg-green-500", icon: "S", key: "skool" },
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
                  <div className="text-xs font-medium text-green-400">
                    {t(`replaceStack.${tool.key}`)}
                  </div>
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
                <div className="text-sm text-white/80">{t("replaceStack.tagline")}</div>
              </div>
            </div>

            <p className="mt-6 text-base text-gray-400">{t("replaceStack.closing")}</p>
            <p className="mt-2 text-sm text-gray-500">{t("replaceStack.savings")}</p>
          </div>
        </div>
      </section>

      {/* RUN EVERYTHING FROM ONE PLACE — consolidated (was: What You Can Run Today + Operational Advantage) */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <Badge className="mb-4">{t("allInOne.badge")}</Badge>
            <h2 className="mb-4 text-4xl font-bold">{t("allInOne.title")}</h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              {t("allInOne.subtitle")}
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            <div className="rounded-xl border bg-white p-6 text-center transition-all hover:shadow-lg">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-100">
                <Video className="h-7 w-7 text-orange-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{t("allInOne.host.title")}</h3>
              <p className="text-sm text-muted-foreground">{t("allInOne.host.description")}</p>
            </div>
            <div className="rounded-xl border bg-white p-6 text-center transition-all hover:shadow-lg">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100">
                <LayoutDashboard className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{t("allInOne.customize.title")}</h3>
              <p className="text-sm text-muted-foreground">{t("allInOne.customize.description")}</p>
            </div>
            <div className="rounded-xl border bg-white p-6 text-center transition-all hover:shadow-lg">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-purple-100">
                <CreditCard className="h-7 w-7 text-purple-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{t("allInOne.monetize.title")}</h3>
              <p className="text-sm text-muted-foreground">{t("allInOne.monetize.description")}</p>
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
          <h2 className="mb-6 text-4xl font-bold md:text-5xl">{t("finalCta.title")}</h2>
          <p className="mx-auto mb-8 max-w-2xl text-xl opacity-90">{t("finalCta.description")}</p>
          <Link
            href={`/${locale}/auth/signup`}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-bold text-primary transition-colors hover:bg-white/90"
          >
            {t("finalCta.cta")}
            <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="mt-6 text-sm opacity-80">{t("finalCta.guarantee")}</p>
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
              <p className="mb-4 text-sm text-muted-foreground">{t("footer.description")}</p>
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
              <h4 className="mb-4 font-semibold">{t("footer.product")}</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="#features"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t("footer.links.features")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="#pricing"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t("footer.links.pricing")}
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/${locale}/changelog`}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t("footer.links.changelog")}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">{t("footer.resources")}</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href={`/${locale}/documentation`}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t("footer.links.documentation")}
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/${locale}/blog`}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t("footer.links.blog")}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">{t("footer.legalLabel")}</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href={`/${locale}/privacy`}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t("footer.legal.privacy")}
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/${locale}/terms`}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t("footer.legal.terms")}
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/${locale}/cookies`}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t("footer.legal.cookies")}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Unytea. {t("footer.rights")}
          </div>
        </div>
      </footer>
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
