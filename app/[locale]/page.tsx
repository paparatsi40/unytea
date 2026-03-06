import Link from "next/link";
import { ArrowRight, Video, Sparkles, Palette, Zap, Shield, Globe, LayoutDashboard } from "lucide-react";
import { auth } from "@/lib/auth";
import { LanguageSelector } from "@/components/LanguageSelector";
import { getTranslations } from "next-intl/server";

export default async function Home() {
  const session = await auth();
  const t = await getTranslations("landing");

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass-strong border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Unytea</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm font-medium hover:text-primary transition-colors">
              {t("nav.features")}
            </Link>
            <Link href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">
              {t("nav.pricing")}
            </Link>
            <Link href="#community" className="text-sm font-medium hover:text-primary transition-colors">
              {t("nav.community")}
            </Link>
            {session?.user && (
              <Link 
                href="/dashboard" 
                className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10"
              >
                <LayoutDashboard className="w-4 h-4" />
                {t("nav.dashboard")}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            {session?.user ? (
              <Link
                href="/dashboard"
                className="btn-hover-lift px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium shadow-smooth flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                {t("nav.goToDashboard")}
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  {t("nav.signIn")}
                </Link>
                <Link
                  href="/auth/signup"
                  className="btn-hover-lift px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium shadow-smooth"
                >
                  {t("nav.startFree")}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 slide-up-fade">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-sm font-medium">☕ {t("hero.badge")}</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 slide-up-fade" style={{ animationDelay: "0.1s" }}>
            {t("hero.title.line1")}
            <br />
            <span className="gradient-text">{t("hero.title.line2")}</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto slide-up-fade" style={{ animationDelay: "0.2s" }}>
            {t("hero.description")}
            <strong className="text-foreground"> {t("hero.highlight")}</strong>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 slide-up-fade" style={{ animationDelay: "0.3s" }}>
            <Link
              href="/auth/signup"
              className="btn-hover-lift px-8 py-4 bg-primary text-primary-foreground rounded-xl text-lg font-semibold shadow-smooth-lg inline-flex items-center gap-2 group"
            >
              {t("hero.cta.primary")}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#demo"
              className="btn-hover-lift px-8 py-4 glass-strong rounded-xl text-lg font-semibold inline-flex items-center gap-2"
            >
              <Video className="w-5 h-5" />
              {t("hero.cta.secondary")}
            </Link>
          </div>

          {/* Hero Image / Dashboard Preview */}
          <div className="relative slide-up-fade" style={{ animationDelay: "0.4s" }}>
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-3xl -z-10" />
            <div className="glass-strong rounded-2xl p-2 shadow-smooth-xl">
              <div className="bg-gradient-to-br from-background to-muted/50 rounded-xl overflow-hidden">
                {/* Mock Dashboard UI */}
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-600 rounded-xl flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{t("preview.communityName")}</h3>
                        <p className="text-xs text-muted-foreground">{t("preview.members", { count: 1247 })}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs">🔔</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
                    </div>
                  </div>
                  
                  {/* Content Grid */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Post Card 1 */}
                    <div className="glass rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-rose-500" />
                        <div>
                          <p className="text-sm font-medium">{t("preview.post1.author")}</p>
                          <p className="text-xs text-muted-foreground">{t("preview.post1.time")}</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{t("preview.post1.content")}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>❤️ 24</span>
                        <span>💬 8</span>
                        <span>👁️ 156</span>
                      </div>
                    </div>
                    
                    {/* Post Card 2 */}
                    <div className="glass rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500" />
                        <div>
                          <p className="text-sm font-medium">{t("preview.post2.author")}</p>
                          <p className="text-xs text-muted-foreground">{t("preview.post2.time")}</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{t("preview.post2.content")}</p>
                      <div className="flex gap-2">
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">{t("preview.liveSession")}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Bottom Stats */}
                  <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">👥 {t("preview.online", { count: 24 })}</span>
                      <span className="flex items-center gap-1">📊 {t("preview.activeSessions", { count: 3 })}</span>
                    </div>
                    <span className="text-primary font-medium">{t("preview.joinConversation")} →</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Communities */}
      <section className="py-16 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t("featured.title")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("featured.description")}
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {featuredCommunities.map((community) => (
              <div
                key={community.name}
                className="group relative overflow-hidden rounded-2xl glass-strong card-hover"
              >
                {/* Community Image */}
                <div className="aspect-square relative">
                  <img
                    src={community.image}
                    alt={community.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  
                  {/* Content Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl border border-white/30">
                        {community.emoji}
                      </div>
                    </div>
                    <h3 className="font-semibold text-base mb-1">{community.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-white/90">
                      <span>{t("featured.members", { count: community.members.toLocaleString() })}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        {t("featured.online", { count: community.online })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              {t("features.title.line1")}
              <br />
              <span className="text-primary">{t("features.title.line2")}</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              {t("features.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.key}
                className="card-hover glass-strong rounded-2xl p-6"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{t(`features.items.${feature.key}.title`)}</h3>
                <p className="text-muted-foreground mb-3">{t(`features.items.${feature.key}.description`)}</p>
                {feature.badge && (
                  <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                    {t(`features.items.${feature.key}.badge`)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">{t("comparison.title")}</h2>
            <p className="text-xl text-muted-foreground">
              {t("comparison.subtitle")}
            </p>
          </div>

          <div className="glass-strong rounded-2xl p-8 space-y-4">
            {comparisons.map((item) => (
              <div
                key={item.key}
                className="flex items-start gap-4 pb-4 border-b border-border/50 last:border-0 last:pb-0"
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">{t(`comparison.items.${item.key}.title`)}</h4>
                  <p className="text-sm text-muted-foreground">{t(`comparison.items.${item.key}.description`)}</p>
                </div>
                <span className="text-xs font-medium px-3 py-1 bg-primary/10 text-primary rounded-full flex-shrink-0">
                  {t("comparison.newBadge")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              {t("pricing.title")}
            </h2>
            <p className="text-xl text-muted-foreground">
              {t("pricing.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <div
                key={plan.key}
                className={`glass-strong rounded-2xl p-8 ${
                  plan.featured
                    ? "ring-2 ring-primary shadow-smooth-xl scale-105"
                    : ""
                }`}
              >
                {plan.featured && (
                  <div className="text-center mb-4">
                    <span className="inline-block px-4 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full">
                      {t("pricing.popular")}
                    </span>
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-2">{t(`pricing.plans.${plan.key}.name`)}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">/{t("pricing.perMonth")}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((featureKey) => (
                    <li key={featureKey} className="flex items-start gap-2">
                      <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{t(`pricing.plans.${plan.key}.features.${featureKey}`)}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/signup"
                  className={`btn-hover-lift block text-center py-3 rounded-xl font-semibold ${
                    plan.featured
                      ? "bg-primary text-primary-foreground shadow-smooth"
                      : "glass border border-border"
                  }`}
                >
                  {t("pricing.cta")}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="glass-strong rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-purple-500/10 -z-10" />
            <h2 className="text-4xl font-bold mb-4">
              {t("cta.title")}
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              {t("cta.description")}
            </p>
            <Link
              href="/auth/signup"
              className="btn-hover-lift inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl text-lg font-semibold shadow-smooth-lg"
            >
              {t("cta.button")}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold">Unytea</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Unytea. {t("footer.slogan")}
            </p>
            <div className="flex gap-6">
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("footer.privacy")}
              </Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("footer.terms")}
              </Link>
              <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("footer.contact")}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Featured Communities data
const featuredCommunities = [
  {
    name: "Design Masters",
    members: 1247,
    online: 42,
    emoji: "🎨",
    image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=400&fit=crop",
  },
  {
    name: "Code Wizards",
    members: 3892,
    online: 156,
    emoji: "⚡",
    image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=400&fit=crop",
  },
  {
    name: "Fitness Tribe",
    members: 2156,
    online: 89,
    emoji: "💪",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop",
  },
  {
    name: "Mindful Living",
    members: 876,
    online: 34,
    emoji: "🧘",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=400&fit=crop",
  },
  {
    name: "Startup Hub",
    members: 5634,
    online: 234,
    emoji: "🚀",
    image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400&h=400&fit=crop",
  },
  {
    name: "Photo Pros",
    members: 1543,
    online: 67,
    emoji: "📸",
    image: "https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=400&h=400&fit=crop",
  },
  {
    name: "Music Makers",
    members: 2341,
    online: 98,
    emoji: "🎵",
    image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop",
  },
  {
    name: "Crypto Circle",
    members: 4521,
    online: 312,
    emoji: "₿",
    image: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400&h=400&fit=crop",
  },
];

// Features data
const features = [
  {
    key: "video",
    icon: Video,
    badge: true,
  },
  {
    key: "customization",
    icon: Palette,
    badge: true,
  },
  {
    key: "security",
    icon: Shield,
    badge: false,
  },
  {
    key: "multilanguage",
    icon: Globe,
    badge: true,
  },
  {
    key: "gamification",
    icon: Zap,
    badge: false,
  },
  {
    key: "analytics",
    icon: LayoutDashboard,
    badge: true,
  },
];

const comparisons = [
  { key: "buddy" },
  { key: "auditorium" },
  { key: "videocalls" },
  { key: "brand" },
  { key: "price" },
  { key: "websockets" },
];

// Pricing data
const pricingPlans = [
  {
    key: "free",
    price: 0,
    featured: false,
    features: ["one", "two", "three", "four", "five"],
  },
  {
    key: "pro",
    price: 49,
    featured: true,
    features: ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine"],
  },
  {
    key: "premium",
    price: 149,
    featured: false,
    features: ["one", "two", "three", "four", "five", "six"],
  },
];
