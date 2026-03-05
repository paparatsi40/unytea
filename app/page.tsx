import Link from "next/link";
import { ArrowRight, Video, Sparkles, Palette, Zap, Shield, Globe, LayoutDashboard } from "lucide-react";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

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
              Features
            </Link>
            <Link href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">
              Pricing
            </Link>
            <Link href="#community" className="text-sm font-medium hover:text-primary transition-colors">
              Community
            </Link>
            {session?.user && (
              <Link 
                href="/dashboard" 
                className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            {session?.user ? (
              <Link
                href="/dashboard"
                className="btn-hover-lift px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium shadow-smooth flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="btn-hover-lift px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium shadow-smooth"
                >
                  Start Free
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
            <span className="text-sm font-medium">☕ Now in Beta</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 slide-up-fade" style={{ animationDelay: "0.1s" }}>
            Where Communities
            <br />
            <span className="gradient-text">Unite</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto slide-up-fade" style={{ animationDelay: "0.2s" }}>
            Like sharing tea with friends, Unytea makes community building warm, human, and genuine.
            <strong className="text-foreground"> Everything Skool has, plus the soul it's missing.</strong>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 slide-up-fade" style={{ animationDelay: "0.3s" }}>
            <Link
              href="/auth/signup"
              className="btn-hover-lift px-8 py-4 bg-primary text-primary-foreground rounded-xl text-lg font-semibold shadow-smooth-lg inline-flex items-center gap-2 group"
            >
              Start Building Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#demo"
              className="btn-hover-lift px-8 py-4 glass-strong rounded-xl text-lg font-semibold inline-flex items-center gap-2"
            >
              <Video className="w-5 h-5" />
              Watch Demo
            </Link>
          </div>

          {/* Hero Image / Dashboard Preview */}
          <div className="relative slide-up-fade" style={{ animationDelay: "0.4s" }}>
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-3xl -z-10" />
            <div className="glass-strong rounded-2xl p-2 shadow-smooth-xl">
              <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-xl aspect-video flex items-center justify-center">
                <div className="text-center">
                  <Sparkles className="w-16 h-16 mx-auto mb-4 text-primary" />
                  <p className="text-lg font-medium text-muted-foreground">
                    ☕ Your Community Space Awaits
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Community with Soul.
              <br />
              <span className="text-primary">Not Just Another Platform.</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              We took what works and added the warmth that's missing.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="card-hover glass-strong rounded-2xl p-6"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground mb-3">{feature.description}</p>
                {feature.badge && (
                  <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                    {feature.badge}
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
            <h2 className="text-4xl font-bold mb-4">Why Choose Unytea Over Skool?</h2>
            <p className="text-xl text-muted-foreground">
              Same core features. Better soul. Half the price.
            </p>
          </div>

          <div className="glass-strong rounded-2xl p-8 space-y-4">
            {comparisons.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-4 pb-4 border-b border-border/50 last:border-0 last:pb-0"
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <span className="text-xs font-medium px-3 py-1 bg-primary/10 text-primary rounded-full flex-shrink-0">
                  NEW
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
              Simple, Honest Pricing
            </h2>
            <p className="text-xl text-muted-foreground">
              Start free. Scale as you grow. Cancel anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`glass-strong rounded-2xl p-8 ${
                  plan.featured
                    ? "ring-2 ring-primary shadow-smooth-xl scale-105"
                    : ""
                }`}
              >
                {plan.featured && (
                  <div className="text-center mb-4">
                    <span className="inline-block px-4 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
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
                  Get Started
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
              Ready to Unite Your Community?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join us and experience community building that feels like home. ☕
            </p>
            <Link
              href="/auth/signup"
              className="btn-hover-lift inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl text-lg font-semibold shadow-smooth-lg"
            >
              Start Building Free
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
              2024 Unytea. Where Communities Unite. ☕
            </p>
            <div className="flex gap-6">
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Features data
const features = [
  {
    icon: Video,
    title: "Built-in Video Calls",
    description: "1-on-1 and group sessions with recording, transcription, and screen sharing.",
    badge: "Skool doesn't have this",
  },
  {
    icon: Palette,
    title: "Complete Customization",
    description: "Your brand, your colors, your domain. Make it truly yours.",
    badge: "Skool doesn't have this",
  },
  {
    icon: Sparkles,
    title: "Buddy System",
    description: "Smart member matching and accountability partnerships that drive real connections.",
    badge: "Nobody else has this",
  },
  {
    icon: Zap,
    title: "Auditorium View",
    description: "Visual presence showing who's online in real-time. Community that feels alive.",
    badge: "Nobody else has this",
  },
  {
    icon: Shield,
    title: "Real-time Everything",
    description: "0ms latency with WebSockets. Discord-level performance for your community.",
    badge: null,
  },
  {
    icon: Globe,
    title: "Modern & Beautiful",
    description: "2024 design, not 2015. Glassmorphism, smooth animations, delightful UX.",
    badge: null,
  },
];

// Comparison data
const comparisons = [
  {
    title: "Buddy System",
    description: "Smart member matching for accountability partnerships. Skool doesn't have this at all.",
  },
  {
    title: "Auditorium View",
    description: "Visual presence showing who's online in real-time. Nobody else has this.",
  },
  {
    title: "Videocalls Integrated",
    description: "Schedule, host, and record sessions without leaving the platform. No more Zoom links.",
  },
  {
    title: "Your Brand, Your Way",
    description: "Custom domains, colors, fonts, and CSS. Skool communities all look the same.",
  },
  {
    title: "Half the Price",
    description: "$49/month vs Skool's $99. Same core features, more soul.",
  },
  {
    title: "Real-time WebSockets",
    description: "Discord-level performance. 0ms latency. 90% less server load.",
  },
];

// Pricing data
const pricingPlans = [
  {
    name: "Free",
    price: 0,
    featured: false,
    features: [
      "1 community",
      "Up to 50 members",
      "Basic community features",
      "3 video calls/month",
      "Unytea branding",
    ],
  },
  {
    name: "Professional",
    price: 49,
    featured: true,
    features: [
      "1 community",
      "Unlimited members",
      "Full customization",
      "Unlimited video calls",
      "Buddy System",
      "Auditorium View",
      "Custom domain",
      "Advanced analytics",
      "Priority support",
    ],
  },
  {
    name: "Premium",
    price: 149,
    featured: false,
    features: [
      "3 communities",
      "Everything in Pro",
      "White-label",
      "API access",
      "Dedicated support",
      "Custom integrations",
      "Migration assistance",
    ],
  },
];
