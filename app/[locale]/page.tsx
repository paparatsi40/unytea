"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { LanguageSelector } from "@/components/LanguageSelector";
import {
  Sparkles,
  LayoutDashboard,
  LogIn,
  UserPlus,
  ArrowRight,
  ArrowDown,
  Play,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Home() {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const t = useTranslations("landing");
  const authT = useTranslations("auth");
  const { data: session } = useSession();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale || "en";
  const isLoggedIn = !!session?.user;

  return (
    <div className="min-h-screen bg-background">
      {/* 1️⃣ HERO SECTION */}
      <nav className="fixed top-0 w-full z-50 glass-strong border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
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
          <div className="hidden md:flex items-center gap-6">
            <Link href={`/${locale}/explore`} className="text-sm font-medium hover:text-primary transition-colors">
              {t("nav.explore")}
            </Link>
            <Link href="#features" className="text-sm font-medium hover:text-primary transition-colors">
              {t("nav.features")}
            </Link>
            <Link href="#comparison" className="text-sm font-medium hover:text-primary transition-colors">
              {t("nav.vsSkool")}
            </Link>
            <Link href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">
              {t("nav.pricing")}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            {isLoggedIn ? (
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
                  className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  {authT("signIn")}
                </Link>
                <Link
                  href="/auth/signup"
                  className="btn-hover-lift px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium shadow-smooth flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  {authT("signUp")}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Content */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-pink-50 opacity-70" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
                <Star className="w-4 h-4" />
                <span className="text-sm font-medium">{t("hero.badge")}</span>
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                {t("hero.titleStart")}{" "}
                <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                  {t("hero.titleHighlight")}
                </span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-xl">
                {t("hero.description")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/auth/signup"
                  className="btn-hover-lift px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2"
                >
                  {t("hero.cta.primary")}
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href={`/${locale}/explore`}
                  className="px-8 py-4 border-2 border-border rounded-xl font-semibold hover:border-primary transition-colors flex items-center justify-center gap-2"
                >
                  <Users className="w-5 h-5" />
                  {t("hero.cta.explore")}
                </Link>
                <button
                  onClick={() => setShowDemoModal(true)}
                  className="px-8 py-4 border-2 border-border rounded-xl font-semibold hover:border-primary transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  {t("hero.cta.secondary")}
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-4">{t("hero.guarantee")}</p>
            </div>
            {/* Mock del producto - lado derecho */}
            <div className="relative">
              <div className="relative bg-white rounded-2xl shadow-2xl p-6 border border-slate-200 text-slate-900 overflow-hidden">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-200">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="ml-4 text-sm text-slate-700 font-semibold tracking-wide">unytea.com/live/community-masterclass</span>
                </div>
                
                {/* Live session header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute -inset-1 bg-red-500 rounded-full animate-pulse" />
                      <div className="relative px-3 py-1 bg-red-500 rounded-full text-xs font-bold">{t("hero.demo.live")}</div>
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 tracking-tight">{t("hero.demo.sessionTitle")}</div>
                      <div className="text-sm text-slate-700">{t("hero.demo.sessionSubtitle")}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-800 font-semibold">
                    <Users className="w-4 h-4" />
                    <span>{t("hero.demo.attending", { count: 247 })}</span>
                  </div>
                </div>
                
                {/* Video grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-700/80 ring-1 ring-white/10 rounded-xl aspect-video flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-500/20" />
                    <div className="relative w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                      <Video className="w-8 h-8" />
                    </div>
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-slate-900/85 border border-white/20 rounded text-xs font-semibold text-white">{t("hero.demo.youHost")}</div>
                  </div>
                  <div className="bg-slate-700/80 ring-1 ring-white/10 rounded-xl aspect-video flex items-center justify-center relative">
                    <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
                      <span className="text-lg">👩</span>
                    </div>
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-slate-900/85 border border-white/20 rounded text-xs font-semibold text-white">Sarah M.</div>
                  </div>
                  <div className="bg-slate-700/80 ring-1 ring-white/10 rounded-xl aspect-video flex items-center justify-center relative">
                    <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
                      <span className="text-lg">👨</span>
                    </div>
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-slate-900/85 border border-white/20 rounded text-xs font-semibold text-white">Mike R.</div>
                  </div>
                  <div className="bg-slate-700/80 ring-1 ring-white/10 rounded-xl aspect-video flex items-center justify-center relative">
                    <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
                      <span className="text-lg">👩</span>
                    </div>
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-slate-900/85 border border-white/20 rounded text-xs font-semibold text-white">Lisa K.</div>
                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-slate-900/90 border border-white/20 rounded text-xs font-semibold text-white">{t("hero.demo.moreAttendees", { count: 24 })}</div>
                  </div>
                </div>
                
                {/* Chat preview */}
                <div className="bg-white ring-1 ring-slate-300 rounded-xl p-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex gap-2">
                      <span className="text-slate-500 font-medium">Mike:</span>
                      <span className="text-slate-900">{t("hero.demo.chatMessage1")}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-slate-500 font-medium">Sarah:</span>
                      <span className="text-slate-900">{t("hero.demo.chatMessage2")}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-slate-500 font-medium">Lisa:</span>
                      <span className="text-slate-900">{t("hero.demo.chatMessage3")}</span>
                    </div>
                  </div>
                </div>
                
                {/* Subtle light decoration */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-slate-100 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-slate-100/80 rounded-full blur-3xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature bullets - quick understanding */}
      <section className="py-8 bg-white border-y">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-3 h-3 text-green-600" />
              </div>
              <span>Live sessions</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-3 h-3 text-green-600" />
              </div>
              <span>Courses</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-3 h-3 text-green-600" />
              </div>
              <span>Community discussions</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-3 h-3 text-green-600" />
              </div>
              <span>Built-in monetization</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2️⃣ PROBLEMA DEL MERCADO */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Most community platforms are built like{" "}
              <span className="text-muted-foreground">forums from 2010</span>.
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              They focus on posts and discussions. But modern communities need more:
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="w-full h-40 rounded-xl overflow-hidden mb-4 bg-gradient-to-br from-gray-100 to-gray-200 relative group">
                  <img 
                    src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=400&q=80" 
                    alt="Boring meeting"
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                      <X className="w-8 h-8 text-white" strokeWidth={3} />
                    </div>
                  </div>
                </div>
                <h3 className="font-semibold mb-2 text-lg">Live interaction</h3>
                <p className="text-sm text-muted-foreground">Missing real-time video, whiteboard, screen sharing</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="w-full h-40 rounded-xl overflow-hidden mb-4 bg-gradient-to-br from-gray-100 to-gray-200 relative group">
                  <img 
                    src="https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=400&q=80" 
                    alt="Disorganized materials"
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                      <X className="w-8 h-8 text-white" strokeWidth={3} />
                    </div>
                  </div>
                </div>
                <h3 className="font-semibold mb-2 text-lg">Structured learning</h3>
                <p className="text-sm text-muted-foreground">No integrated courses or workshops</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="w-full h-40 rounded-xl overflow-hidden mb-4 bg-gradient-to-br from-gray-100 to-gray-200 relative group">
                  <img 
                    src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=400&q=80" 
                    alt="Complex payments"
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                      <X className="w-8 h-8 text-white" strokeWidth={3} />
                    </div>
                  </div>
                </div>
                <h3 className="font-semibold mb-2 text-lg">Monetization tools</h3>
                <p className="text-sm text-muted-foreground">Complex payment setups, high fees</p>
              </div>
            </div>
            <p className="text-xl font-medium mt-12">
              <span className="text-primary font-bold">Unytea</span> was built for modern community businesses.
            </p>
          </div>
        </div>
      </section>

      {/* 3️⃣ TU SOLUCIÓN - FEATURES */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Features</Badge>
            <h2 className="text-4xl font-bold mb-4">Everything you need to run a community business</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              One platform. All your tools. Zero integration headaches.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
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
      <section className="py-20 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Use Cases</Badge>
            <h2 className="text-4xl font-bold mb-4">Communities built on Unytea</h2>
            <p className="text-xl text-muted-foreground">See how different creators use our platform</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <UseCaseCard
              image="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80"
              title="Coaching Communities"
              features={["Weekly group calls", "Paid memberships", "Student discussions", "1-on-1 scheduling"]}
            />
            <UseCaseCard
              image="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&q=80"
              title="Learning Communities"
              features={["Online courses", "Live workshops", "Community support", "Progress tracking"]}
            />
            <UseCaseCard
              image="https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&q=80"
              title="Expert Communities"
              features={["Mastermind groups", "Live Q&A sessions", "Premium content", "Direct access"]}
            />
          </div>
        </div>
      </section>

      {/* 5️⃣ HOW IT WORKS - SIMPLIFICADO */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Simple Process</Badge>
            <h2 className="text-4xl font-bold mb-4">Launch your community in minutes</h2>
            <p className="text-xl text-muted-foreground">No technical skills required</p>
          </div>
          <div className="grid md:grid-cols-5 gap-6 max-w-6xl mx-auto">
            <StepCard number={1} title="Create" description="Set up your community with your brand, colors, and custom domain." />
            <StepCard number={2} title="Invite" description="Share your link and invite your first members in seconds." />
            <StepCard number={3} title="Go Live" description="Host your first live session, course, or workshop immediately." />
            <StepCard number={4} title="Launch Course" description="Create and publish your first course with modules and lessons." />
            <StepCard number={5} title="Monetize" description="Set up pricing, subscriptions, and start earning revenue." />
          </div>
          <div className="text-center mt-12">
            <Link href="/auth/signup">
              <Button size="lg" className="px-8">
                Start Building Free <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 6️⃣ COMPARACIÓN - SECCIÓN CRÍTICA */}
      <section id="comparison" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Comparison</Badge>
            <h2 className="text-4xl font-bold mb-4">Why creators choose Unytea</h2>
            <p className="text-xl text-muted-foreground">See how we compare to other platforms</p>
          </div>
          <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
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
          <p className="text-center text-muted-foreground mt-6 text-sm">
            * Skool fee depends on plan: 10% on Hobby ($9/mo), 2.9% on Pro ($99/mo). Stripe processing extra in both.
          </p>
          <p className="text-center text-muted-foreground mt-2 text-sm">
            Used by creators switching from Skool, Circle, Mighty Networks, and Facebook Groups
          </p>
        </div>
      </section>

      {/* 7️⃣ MONETIZACIÓN */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4">Monetization</Badge>
              <h2 className="text-4xl font-bold mb-6">
                Turn your community into a business with live sessions
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Members can pay for access to your content, courses, and live sessions. All powered by Stripe.
              </p>
              <div className="space-y-4">
                <MonetizationItem icon={Users} title="Paid Memberships" description="Charge monthly or annual access fees" />
                <MonetizationItem icon={BookOpen} title="Courses" description="Sell one-time or drip courses" />
                <MonetizationItem icon={Video} title="Workshops" description="Host paid live sessions and events" />
                <MonetizationItem icon={CreditCard} title="Flat Platform Fee" description="One simple 5% on all plans, plus Stripe processing" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-8 rounded-2xl">
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <span className="font-medium">Monthly Revenue</span>
                  <Badge variant="secondary">This Month</Badge>
                </div>
                <div className="text-4xl font-bold mb-2">$12,450</div>
                <div className="flex items-center text-green-600 text-sm mb-6">
                  <TrendingUp className="w-4 h-4 mr-1" />
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

      {/* 8️⃣ TESTIMONIALS */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4">Testimonials</Badge>
            <h2 className="text-4xl font-bold mb-4">Loved by creators</h2>
            <p className="text-xl text-muted-foreground">See what our users say about Unytea</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <TestimonialCard
              quote="Unytea helped me consolidate my coaching community, courses, and live sessions into one platform. Game changer!"
              author="Sarah Chen"
              role="Business Coach"
              rating={5}
            />
            <TestimonialCard
              quote="The live sessions feature is incredible. My students love the interactive whiteboard and screen sharing."
              author="Marcus Johnson"
              role="Course Creator"
              rating={5}
            />
            <TestimonialCard
              quote="The whiteboard, screen sharing, and AI assistant during live sessions changed how I run workshops. Nothing else offers this."
              author="Emma Williams"
              role="Community Founder"
              rating={5}
            />
          </div>
        </div>
      </section>

      {/* 9️⃣ PRICING */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 max-w-4xl mx-auto">
            <Badge className="mb-4">Pricing</Badge>
            <h2 className="text-4xl font-bold mb-4">Simple pricing for community businesses</h2>
            <p className="text-lg text-muted-foreground mb-2">Hosts pay for the platform. Members join for free.</p>
            <p className="text-base text-muted-foreground">Run your community, live sessions, and courses in one place.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            <PricingCard
              name="Start"
              price={0}
              description="Perfect for testing"
              features={[
                "1 community",
                "Up to 50 members",
                "Community feed",
                "Simple live sessions",
                "Basic library",
                "Basic courses",
                "Basic analytics",
                "Unytea branding",
                "8% transaction fee",
              ]}
              cta="Start free"
              footnote="Validate your first community idea."
            />
            <PricingCard
              name="Creator"
              price={49}
              description="Best for launching and monetizing one community"
              features={[
                "Everything in Start, plus",
                "Unlimited members",
                "Live sessions",
                "Full courses",
                "Paid community access",
                "Paid course sales",
                "Basic growth tools",
                "5% transaction fee",
              ]}
              cta="Choose Creator"
              footnote="Launch, sell, and grow one community."
            />
            <PricingCard
              name="Business"
              price={99}
              description="Best for operators running one community business"
              features={[
                "Everything in Creator, plus",
                "Custom domain",
                "Advanced analytics",
                "Up to 5 admins",
                "Attendance insights",
                "Session performance tools",
                "Lower transaction fee",
                "2% transaction fee",
              ]}
              cta="Choose Business"
              popular
              popularLabel="Recommended"
              footnote="Run a serious community business with deeper insights."
            />
            <PricingCard
              name="Pro"
              price={199}
              description="Best for teams scaling multiple communities"
              features={[
                "Everything in Business, plus",
                "Up to 3 communities",
                "White-label experience",
                "API access",
                "Unlimited admins",
                "Multi-community operations",
                "0% transaction fee",
              ]}
              cta="Choose Pro"
              footnote="Manage multiple communities at scale."
            />
          </div>

          <div className="mt-10 rounded-2xl border bg-muted/20 p-6 max-w-6xl mx-auto">
            <h3 className="text-lg font-semibold mb-2">Free for members. Built for hosts.</h3>
            <p className="text-sm text-muted-foreground">
              Anyone can create an account, explore communities, and join for free. Hosts pay for Unytea to run their business, and transaction fees only apply when they sell paid access or courses.
            </p>
          </div>

          <div className="mt-8 grid md:grid-cols-2 gap-4 max-w-6xl mx-auto">
            <FaqItem
              q="Do members pay to use Unytea?"
              a="No. Members can create an account, explore communities, and join for free. They only pay if a host charges for community access or sells a course."
            />
            <FaqItem
              q="When do transaction fees apply?"
              a="Transaction fees apply only when you sell paid community access or courses through Unytea."
            />
            <FaqItem
              q="Can I start for free?"
              a="Yes. The Start plan lets you launch one community, test demand, and validate your idea before upgrading."
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
      <section className="py-20 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-white/10 text-white border-white/20 hover:bg-white/20">
              Consolidate Your Stack
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Replace your entire community stack
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Run your entire community business with one platform
            </p>
          </div>
          
          {/* Tools being replaced */}
          <div className="flex flex-wrap justify-center items-center gap-4 md:gap-6 mb-10">
            {[
              { name: "Zoom", color: "bg-blue-500", icon: "Z", feature: "→ Live sessions" },
              { name: "Kajabi", color: "bg-orange-500", icon: "K", feature: "→ Courses" },
              { name: "Facebook", color: "bg-blue-600", icon: "f", feature: "→ Community" },
              { name: "Slack", color: "bg-purple-600", icon: "S", feature: "→ Chat" },
              { name: "Skool", color: "bg-green-500", icon: "S", feature: "→ Memberships" },
            ].map((tool) => (
              <div key={tool.name} className="group flex items-center gap-3 bg-white/10 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/10 hover:bg-white/20 transition-all">
                <div className={`w-10 h-10 ${tool.color} rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                  {tool.icon}
                </div>
                <div>
                  <div className="font-semibold text-sm">{tool.name}</div>
                  <div className="text-xs text-green-400 font-medium">{tool.feature}</div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Arrow pointing to Unytea */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-4 text-gray-400">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-gray-500" />
              <ArrowDown className="w-6 h-6 animate-bounce" />
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-gray-500" />
            </div>
          </div>
          
          {/* Unytea solution */}
          <div className="text-center">
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-primary to-purple-600 px-8 py-4 rounded-2xl shadow-2xl">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <div className="text-left">
                <div className="font-bold text-xl">Unytea</div>
                <div className="text-sm text-white/80">One platform. Everything you need.</div>
              </div>
            </div>
            
            <p className="mt-6 text-gray-400 text-base">
              No integrations. No complexity. Just one platform.
            </p>
            <p className="mt-2 text-gray-500 text-sm">
              Save $300+/month • Cancel 5 subscriptions • Everything connected
            </p>
          </div>
        </div>
      </section>

      {/* WHAT YOU CAN RUN TODAY */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <Badge className="mb-4">Built In</Badge>
            <h2 className="text-3xl font-bold mb-4">Run your community with features available today</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              No mock promises — these workflows are already live in the product.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-xl border hover:shadow-lg transition-all text-center">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <LayoutDashboard className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Customize Landing Page</h3>
              <p className="text-sm text-muted-foreground mb-4">Use Appearance + Section Presets to shape your public community page.</p>
              <div className="text-xs text-green-600 font-medium">✓ Available now</div>
            </div>
            <div className="bg-white p-6 rounded-xl border hover:shadow-lg transition-all text-center">
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Video className="w-7 h-7 text-orange-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Host Live Sessions</h3>
              <p className="text-sm text-muted-foreground mb-4">Schedule sessions, track attendance, and manage reminders from one control center.</p>
              <div className="text-xs text-green-600 font-medium">✓ Available now</div>
            </div>
            <div className="bg-white p-6 rounded-xl border hover:shadow-lg transition-all text-center">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Monetize Access & Courses</h3>
              <p className="text-sm text-muted-foreground mb-4">Set paid access, sell courses, and manage subscriptions with Stripe-powered payments.</p>
              <div className="text-xs text-green-600 font-medium">✓ Available now</div>
            </div>
          </div>
        </div>
      </section>

      {/* OPERATIONAL ADVANTAGE */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <Badge className="mb-4 bg-purple-100 text-purple-700 hover:bg-purple-100">Why operators choose Unytea</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything in one operating system</h2>
              <p className="text-lg text-muted-foreground">
                Run sessions, content, community, and monetization without stitching together extra tools.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl border bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <Video className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">Run live sessions with control</h3>
                <p className="text-sm text-muted-foreground">Schedule upcoming sessions, track attendance, and manage reminders from one sessions hub.</p>
              </div>
              <div className="p-6 rounded-xl border bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                  <LayoutDashboard className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="font-semibold mb-2">Shape your landing fast</h3>
                <p className="text-sm text-muted-foreground">Use Appearance and Section Presets to customize your public page without custom code.</p>
              </div>
              <div className="p-6 rounded-xl border bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">Monetize and optimize</h3>
                <p className="text-sm text-muted-foreground">Sell access and courses with Stripe while using analytics and achievements to improve retention.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🔟 CTA FINAL */}
      <section className="py-20 bg-gradient-to-br from-primary to-purple-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Start building your community today
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Create your community, invite members, and host your first live session — all in less than 5 minutes.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary rounded-xl font-bold text-lg hover:bg-white/90 transition-colors"
          >
            Create Your Community Free
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-sm mt-6 opacity-80">
            ✓ 14-day free trial &nbsp;•&nbsp; ✓ No credit card required &nbsp;•&nbsp; ✓ Cancel anytime
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 border-t bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-5 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">Unytea</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                The live platform for community-based learning.
              </p>
              <div className="flex items-center gap-3">
                <a href="https://twitter.com/unytea" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Twitter">
                  <Twitter className="w-4 h-4" />
                </a>
                <a href="https://github.com/paparatsi40/unytea" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="GitHub">
                  <Github className="w-4 h-4" />
                </a>
                <a href="https://linkedin.com/company/unytea" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="LinkedIn">
                  <Linkedin className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link href={`/${locale}/changelog`} className="text-muted-foreground hover:text-foreground transition-colors">Changelog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href={`/${locale}/documentation`} className="text-muted-foreground hover:text-foreground transition-colors">Documentation</Link></li>
                <li><Link href={`/${locale}/explore`} className="text-muted-foreground hover:text-foreground transition-colors">Community</Link></li>
                <li><Link href={`/${locale}/blog`} className="text-muted-foreground hover:text-foreground transition-colors">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href={`/${locale}/privacy`} className="text-muted-foreground hover:text-foreground transition-colors">Privacy</Link></li>
                <li><Link href={`/${locale}/terms`} className="text-muted-foreground hover:text-foreground transition-colors">Terms</Link></li>
                <li><Link href={`/${locale}/cookies`} className="text-muted-foreground hover:text-foreground transition-colors">Cookies</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Unytea. All rights reserved.
          </div>
        </div>
      </footer>

      {/* DEMO MODAL */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-2">{t("demoModal.title")}</h3>
            <p className="text-muted-foreground mb-6">{t("demoModal.description")}</p>
            <Button onClick={() => setShowDemoModal(false)} className="w-full">
              {t("demoModal.close")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// COMPONENTES AUXILIARES

function FeatureCard({ image, title, description, highlighted = false, large = false }: { image: string; title: string; description: string; highlighted?: boolean; large?: boolean }) {
  const [imgError, setImgError] = useState(false);
  
  return (
    <div className={`group relative p-6 rounded-xl border transition-all duration-300 hover:shadow-xl hover:scale-[1.02] overflow-hidden ${highlighted ? 'border-primary bg-gradient-to-br from-primary/10 to-purple-100' : 'bg-gradient-to-br from-white to-gray-50'} ${large ? 'h-full flex flex-col' : ''}`}>
      {/* Background decoration */}
      <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 transition-transform group-hover:scale-150 ${highlighted ? 'bg-primary' : 'bg-gray-400'}`} />
      
      {/* Image container with gradient fallback */}
      <div className={`relative w-full rounded-xl mb-4 overflow-hidden shadow-md ${large ? 'h-48' : 'h-32'} ${imgError ? 'bg-gradient-to-br from-gray-200 to-gray-300' : ''}`}>
        {!imgError && (
          <img 
            src={image} 
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            onError={() => setImgError(true)}
          />
        )}
        {imgError && (
          <div className="w-full h-full flex items-center justify-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${highlighted ? 'bg-primary/20' : 'bg-gray-300'}`}>
              <Sparkles className={`w-6 h-6 ${highlighted ? 'text-primary' : 'text-gray-500'}`} />
            </div>
          </div>
        )}
        {highlighted && !imgError && (
          <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
        )}
      </div>
      <h3 className={`relative font-semibold mb-2 ${large ? 'text-xl' : 'text-lg'}`}>{title}</h3>
      <p className={`relative text-muted-foreground ${large ? 'text-base flex-grow' : 'text-sm'}`}>{description}</p>
    </div>
  );
}

function UseCaseCard({ image, title, features }: { image: string; title: string; features: string[] }) {
  const [imgError, setImgError] = useState(false);
  
  return (
    <div className="group relative bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl border hover:shadow-xl hover:scale-[1.02] transition-all duration-300 overflow-hidden">
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-100 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {/* Decorative circle */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-500" />
      
      <div className="relative">
        {/* Image with fallback */}
        <div className={`w-full h-40 rounded-xl overflow-hidden mb-4 shadow-sm ${imgError ? 'bg-gradient-to-br from-gray-200 to-gray-300' : ''}`}>
          {!imgError ? (
            <img 
              src={image} 
              alt={title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-primary/60" />
              </div>
            </div>
          )}
        </div>
        <h3 className="font-semibold text-lg mb-4">{title}</h3>
        <ul className="space-y-2">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StepCard({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="group text-center">
      <div className="relative w-16 h-16 mx-auto mb-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-purple-600 rounded-full opacity-20 group-hover:scale-110 transition-transform" />
        <div className="relative w-full h-full bg-gradient-to-br from-primary to-purple-600 text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
          {number}
        </div>
      </div>
      <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}

function ComparisonRow({ feature, skool, unytea, highlighted = false }: { feature: string; skool: string; unytea: string; highlighted?: boolean }) {
  return (
    <div className={`grid grid-cols-3 p-4 border-t ${highlighted ? 'bg-primary/5' : ''}`}>
      <div className="font-medium">{feature}</div>
      <div className="text-center">{skool === '✓' ? <span className="text-green-600">✓</span> : skool === '✗' ? <span className="text-red-400">✗</span> : <span className="text-muted-foreground">{skool}</span>}</div>
      <div className="text-center font-medium text-primary">{unytea === '✓' ? <span className="text-green-600">✓</span> : <span className="text-muted-foreground">{unytea}</span>}</div>
    </div>
  );
}

function MonetizationItem({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function TestimonialCard({ quote, author, role, rating }: { quote: string; author: string; role: string; rating: number }) {
  return (
    <div className="bg-white p-6 rounded-xl border">
      <div className="flex gap-1 mb-4">
        {Array.from({ length: rating }).map((_, i) => (
          <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
        ))}
      </div>
      <p className="text-muted-foreground mb-4 italic">&ldquo;{quote}&rdquo;</p>
      <div className="flex items-center gap-3">
        <Avatar className="w-10 h-10">
          <AvatarFallback>{author[0]}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium">{author}</div>
          <div className="text-sm text-muted-foreground">{role}</div>
        </div>
      </div>
    </div>
  );
}

function PricingCard({
  name,
  price,
  description,
  features,
  popular = false,
  popularLabel = "Recommended",
  cta,
  footnote,
}: {
  name: string;
  price: number;
  description: string;
  features: string[];
  popular?: boolean;
  popularLabel?: string;
  cta: string;
  footnote?: string;
}) {
  return (
    <div className={`relative p-6 rounded-xl border bg-white ${popular ? "border-primary ring-2 ring-primary/20" : "border-border"}`}>
      {popular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white">
          {popularLabel}
        </Badge>
      )}
      <div className="text-center mb-6">
        <h3 className="font-semibold text-lg">{name}</h3>
        <div className="mt-2">
          <span className="text-4xl font-bold">${price}</span>
          <span className="text-muted-foreground">/month</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <ul className="space-y-2.5 mb-6">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Link href="/auth/signup">
        <Button className="w-full" variant={popular ? "default" : "outline"}>
          {cta}
        </Button>
      </Link>
      {footnote ? <p className="mt-4 text-xs text-muted-foreground">{footnote}</p> : null}
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <h4 className="text-sm font-semibold mb-1.5">{q}</h4>
      <p className="text-sm text-muted-foreground">{a}</p>
    </div>
  );
}
