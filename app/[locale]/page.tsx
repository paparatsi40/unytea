"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Sparkles,
  LayoutDashboard,
  ArrowRight,
  Play,
  Star,
  CheckCircle,
  Users,
  Zap,
  Video,
  BookOpen,
  MessageSquare,
  TrendingUp,
  Award,
  Shield,
  Globe,
  Clock,
  ChevronDown,
  Quote,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Home() {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const t = useTranslations("landing");

  return (
    <div className="min-h-screen bg-background">
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
            <Link href="#testimonials" className="text-sm font-medium hover:text-primary transition-colors">
              {t("nav.testimonials")}
            </Link>
            <Link href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">
              {t("nav.pricing")}
            </Link>
            <Link href="#faq" className="text-sm font-medium hover:text-primary transition-colors">
              {t("nav.faq")}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="btn-hover-lift px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium shadow-smooth flex items-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4" />
              {t("nav.goToDashboard")}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section - Compact with 2-column layout */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-600/5 to-background" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background/80" />

        <div className="container mx-auto px-4 relative z-10 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-7xl mx-auto">
            {/* Left Column - Content */}
            <div className="text-center lg:text-left">
              {/* Trust Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-medium">{t("hero.badge")}</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
                {t("hero.title")}
                <br />
                <span className="gradient-text">{t("hero.subtitle")}</span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground mb-6 max-w-xl mx-auto lg:mx-0">
                {t("hero.description")}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start items-center mb-6">
                <Link
                  href="/auth/signup"
                  className="btn-hover-lift px-6 py-3 bg-primary text-primary-foreground rounded-xl text-base font-semibold shadow-smooth-lg inline-flex items-center gap-2 group"
                >
                  {t("hero.cta.primary")}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <button 
                  onClick={() => setShowDemoModal(true)}
                  className="btn-hover-lift px-6 py-3 glass-strong rounded-xl text-base font-semibold inline-flex items-center gap-2 group"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Play className="w-4 h-4 text-primary fill-primary" />
                  </div>
                  {t("hero.cta.secondary")}
                </button>
              </div>

              {/* Social Proof */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <Avatar key={i} className="w-7 h-7 border-2 border-background">
                        <AvatarImage src={`https://i.pravatar.cc/150?img=${i + 10}`} />
                        <AvatarFallback>U{i}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <span>{t("hero.socialProof.members")}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  ))}
                  <span className="ml-2">{t("hero.socialProof.rating")}</span>
                </div>
              </div>
            </div>

            {/* Right Column - Dashboard Mockup */}
            <div className="relative hidden lg:block">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-card">
                {/* Mockup Header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-background text-xs text-muted-foreground">
                      <span className="w-3 h-3 rounded-full bg-primary/20" />
                      unytea.com/dashboard
                    </div>
                  </div>
                </div>
                {/* Mockup Content */}
                <div className="p-4 space-y-3">
                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Members", value: "2,847", icon: Users },
                      { label: "Revenue", value: "$12.4K", icon: Zap },
                      { label: "Engagement", value: "94%", icon: TrendingUp },
                    ].map((stat, i) => (
                      <div key={i} className="bg-muted/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                          <stat.icon className="w-3 h-3" />
                          {stat.label}
                        </div>
                        <div className="text-lg font-bold">{stat.value}</div>
                      </div>
                    ))}
                  </div>
                  {/* Feed Preview */}
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex gap-3 p-3 bg-muted/30 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 bg-muted rounded w-1/3" />
                          <div className="h-2 bg-muted/50 rounded w-full" />
                          <div className="h-2 bg-muted/50 rounded w-2/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Course Card */}
                  <div className="flex gap-3 p-3 bg-gradient-to-r from-primary/5 to-purple-600/5 rounded-lg border border-primary/10">
                    <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">Community Mastery</div>
                      <div className="text-xs text-muted-foreground">247 students enrolled</div>
                      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full w-3/4 bg-primary rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Decorative Elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-purple-600/20 rounded-full blur-2xl" />
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </div>
      </section>

      {/* Social Proof Numbers */}
      <section className="py-16 px-4 border-y border-border/50 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl md:text-5xl font-bold gradient-text">10K+</p>
              <p className="text-muted-foreground mt-2">{t("stats.communities")}</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-bold gradient-text">500K+</p>
              <p className="text-muted-foreground mt-2">{t("stats.members")}</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-bold gradient-text">$2M+</p>
              <p className="text-muted-foreground mt-2">{t("stats.revenue")}</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-bold gradient-text">98%</p>
              <p className="text-muted-foreground mt-2">{t("stats.satisfaction")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Instructor Spotlight */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-purple-600/20 rounded-3xl blur-2xl" />
              <div className="relative aspect-square rounded-2xl overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&h=600&fit=crop"
                  alt="Lead Instructor"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Floating Badge */}
              <div className="absolute -bottom-4 -right-4 bg-card rounded-xl p-4 shadow-xl border">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Verified Expert</p>
                    <p className="text-sm text-muted-foreground">10+ years experience</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20">Meet Your Guide</Badge>
              <h2 className="text-4xl font-bold">Learn from Industry Leaders</h2>
              <p className="text-lg text-muted-foreground">
                Our platform brings together the world's best creators, coaches, and educators. 
                Connect directly with experts who have built 7-figure businesses and helped 
                thousands of students succeed.
              </p>
              <ul className="space-y-4">
                {[
                  "Direct access to top industry experts",
                  "Live Q&A sessions every week",
                  "Personalized feedback on your work",
                  "Exclusive insider strategies",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup">
                <Button size="lg" className="mt-4">
                  Join the Community
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* What You'll Learn */}
      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge className="mb-4">Curriculum</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need to
              <br />
              <span className="gradient-text">Build & Scale</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A complete ecosystem to create, engage, and monetize your community
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Video,
                title: "Live Sessions",
                description: "Host video calls, webinars, and 1-on-1 coaching with integrated scheduling.",
              },
              {
                icon: BookOpen,
                title: "Course Builder",
                description: "Create structured courses with modules, lessons, quizzes, and progress tracking.",
              },
              {
                icon: MessageSquare,
                title: "Community Feed",
                description: "Engaging social feed with posts, reactions, comments, and rich media.",
              },
              {
                icon: Users,
                title: "Member Management",
                description: "Advanced roles, permissions, and member analytics at your fingertips.",
              },
              {
                icon: Zap,
                title: "AI Assistant",
                description: "Get AI-powered insights, content suggestions, and member matching.",
              },
              {
                icon: TrendingUp,
                title: "Analytics Dashboard",
                description: "Track engagement, revenue, growth, and make data-driven decisions.",
              },
            ].map((feature, i) => (
              <Card key={i} className="group hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline - What Happens After Joining */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Your Journey Starts Here</h2>
            <p className="text-xl text-muted-foreground">
              Here's exactly what happens when you join Unytea
            </p>
          </div>

          <div className="space-y-8">
            {[
              {
                step: "01",
                title: "Create Your Account",
                description: "Sign up in 30 seconds. No credit card required for the free trial.",
                time: "Day 1",
              },
              {
                step: "02",
                title: "Set Up Your Community",
                description: "Choose your layout, customize your branding, and set your community rules.",
                time: "Day 1-2",
              },
              {
                step: "03",
                title: "Invite Your First Members",
                description: "Use our invite system or share your community link. Watch members join instantly.",
                time: "Day 2-3",
              },
              {
                step: "04",
                title: "Launch Your First Content",
                description: "Post your first update, create a course, or schedule a live session.",
                time: "Day 3-5",
              },
              {
                step: "05",
                title: "Grow & Monetize",
                description: "Engage your community, track analytics, and start generating revenue.",
                time: "Week 2+",
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    {item.step}
                  </div>
                  {i < 4 && <div className="w-0.5 flex-1 bg-border mt-2" />}
                </div>
                <div className="flex-1 pb-8">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">{item.title}</h3>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {item.time}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/auth/signup">
              <Button size="lg" className="btn-hover-lift">
                Start Your Journey
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge className="mb-4">Testimonials</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Loved by Creators
              <br />
              <span className="gradient-text">Worldwide</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "Unytea transformed how I engage with my audience. My community grew 300% in just 3 months!",
                author: "Sarah Chen",
                role: "Business Coach",
                avatar: "https://i.pravatar.cc/150?img=5",
                rating: 5,
              },
              {
                quote: "The best platform I've used. The AI assistant alone saves me 10 hours every week.",
                author: "Marcus Johnson",
                role: "Fitness Creator",
                avatar: "https://i.pravatar.cc/150?img=11",
                rating: 5,
              },
              {
                quote: "Finally, a platform that understands creators. The monetization features are incredible.",
                author: "Emma Williams",
                role: "Online Educator",
                avatar: "https://i.pravatar.cc/150?img=9",
                rating: 5,
              },
            ].map((testimonial, i) => (
              <Card key={i} className="relative overflow-hidden">
                <CardContent className="p-6">
                  <Quote className="w-8 h-8 text-primary/20 absolute top-4 right-4" />
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    ))}
                  </div>
                  <p className="text-foreground mb-6 relative z-10">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={testimonial.avatar} />
                      <AvatarFallback>{testimonial.author[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">{testimonial.author}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges & Certifications */}
      <section className="py-16 px-4 border-y border-border/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold mb-2">Trusted by Industry Leaders</h3>
            <p className="text-muted-foreground">Secure, reliable, and built for scale</p>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60">
            <div className="flex items-center gap-2">
              <Shield className="w-8 h-8" />
              <span className="font-semibold">SOC 2 Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-8 h-8" />
              <span className="font-semibold">GDPR Ready</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-8 h-8" />
              <span className="font-semibold">99.99% Uptime</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-8 h-8" />
              <span className="font-semibold">24/7 Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge className="mb-4">Pricing</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Simple, Transparent
              <br />
              <span className="gradient-text">Pricing</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free, upgrade when you're ready. No hidden fees, no surprises.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <Card className="relative">
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold mb-2">Free</h3>
                <p className="text-muted-foreground mb-4">Perfect for getting started</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    "1 Community",
                    "Up to 100 members",
                    "Basic features",
                    "Community support",
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/signup">
                  <Button variant="outline" className="w-full">Get Started</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="relative border-primary ring-2 ring-primary/20 scale-105">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
              </div>
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold mb-2">Professional</h3>
                <p className="text-muted-foreground mb-4">For growing creators</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$49</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    "1 Community",
                    "Unlimited members",
                    "Video calls & streaming",
                    "Course builder",
                    "AI assistant",
                    "Analytics dashboard",
                    "Priority support",
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/signup">
                  <Button className="w-full">Start Free Trial</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card className="relative">
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold mb-2">Premium</h3>
                <p className="text-muted-foreground mb-4">For power users</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$149</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    "3 Communities",
                    "Unlimited members",
                    "White-label option",
                    "Advanced analytics",
                    "API access",
                    "Dedicated support",
                    "Custom integrations",
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/signup">
                  <Button variant="outline" className="w-full">Contact Sales</Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <p className="text-center text-muted-foreground mt-8">
            All plans include a 14-day free trial. No credit card required.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-16">
            <Badge className="mb-4">FAQ</Badge>
            <h2 className="text-4xl font-bold mb-4">Common Questions</h2>
            <p className="text-xl text-muted-foreground">
              Everything you need to know about Unytea
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                question: "Can I migrate from Skool or other platforms?",
                answer: "Absolutely! We offer free migration assistance from Skool, Circle, Facebook Groups, and other platforms. Our team will help you transfer your members, content, and data seamlessly.",
              },
              {
                question: "Do I need technical skills to use Unytea?",
                answer: "Not at all! Unytea is designed to be user-friendly for everyone. Our drag-and-drop builder and intuitive interface mean you can set up your community in minutes, no coding required.",
              },
              {
                question: "How does the 14-day free trial work?",
                answer: "You get full access to all Professional features for 14 days. No credit card required to start. At the end of your trial, choose the plan that fits your needs or continue with our free tier.",
              },
              {
                question: "Can I monetize my community?",
                answer: "Yes! Unytea has built-in monetization features including paid memberships, course sales, and subscription billing. We integrate with Stripe for secure payment processing with just 5% platform fee.",
              },
              {
                question: "What support options are available?",
                answer: "Free plans include community support. Professional plans get priority email support with 24-hour response time. Premium plans get dedicated support with 4-hour response time and a dedicated success manager.",
              },
              {
                question: "Is my data secure?",
                answer: "Security is our top priority. We're SOC 2 compliant, GDPR ready, and use enterprise-grade encryption. Your data is stored securely and never shared with third parties.",
              },
            ].map((faq, i) => (
              <FAQItem key={i} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Build Your
            <br />
            <span className="gradient-text">Dream Community?</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join 10,000+ creators who are already engaging, teaching, and growing with Unytea.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="btn-hover-lift px-8 py-6 text-lg">
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline" 
              className="px-8 py-6 text-lg"
              onClick={() => setShowDemoModal(true)}
            >
              <Play className="w-5 h-5 mr-2" />
              Watch Demo
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-6">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-16 px-4 bg-card">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">Unytea</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                The modern platform for creators to build, engage, and monetize their communities.
              </p>
              <div className="flex gap-4">
                {["twitter", "linkedin", "youtube", "instagram"].map((social) => (
                  <Link
                    key={social}
                    href={`https://${social}.com/unytea`}
                    className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary/20 transition-colors"
                  >
                    <span className="text-xs font-bold uppercase">{social[0]}</span>
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#features" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Changelog</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Roadmap</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground transition-colors">Documentation</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">API Reference</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Community</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground transition-colors">About</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Careers</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Contact</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Privacy</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 Unytea. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Terms of Service</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </footer>
      {/* Demo Video Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-4xl bg-background rounded-2xl overflow-hidden shadow-2xl">
            <button
              onClick={() => setShowDemoModal(false)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="aspect-video bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Play className="w-10 h-10 text-primary fill-primary" />
                </div>
                <p className="text-lg font-medium">Demo Video Coming Soon</p>
                <p className="text-muted-foreground mt-2">
                  We&apos;re preparing an amazing demo video for you!
                </p>
                <Button 
                  onClick={() => setShowDemoModal(false)}
                  className="mt-6"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// FAQ Accordion Component
function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group bg-card rounded-lg border border-border overflow-hidden">
      <summary className="flex items-center justify-between p-6 cursor-pointer list-none hover:bg-muted/50 transition-colors">
        <span className="font-semibold text-lg pr-4">{question}</span>
        <ChevronDown className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform flex-shrink-0" />
      </summary>
      <div className="px-6 pb-6 text-muted-foreground">
        {answer}
      </div>
    </details>
  );
}
