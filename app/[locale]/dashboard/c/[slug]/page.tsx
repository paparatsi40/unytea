import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getCommunityWithSections } from "@/app/actions/community-builder";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { joinCommunity } from "@/app/actions/communities";
import Link from "next/link";
import { Users, Lock, ArrowLeft, BookOpen, CheckCircle, Star, TrendingUp, Award, Zap, Target } from "lucide-react";

// Import all layout components
import { ModernGridLayout } from "@/components/community/layouts/ModernGridLayout";
import { ClassicForumLayout } from "@/components/community/layouts/ClassicForumLayout";
import { AcademyLayout } from "@/components/community/layouts/AcademyLayout";
import { DashboardLayout } from "@/components/community/layouts/DashboardLayout";
import { MinimalistLayout } from "@/components/community/layouts/MinimalistLayout";
import { CommunitySubHeader } from "@/components/community/CommunitySubHeader";

// Layout component mapping
const LAYOUT_COMPONENTS = {
  MODERN_GRID: ModernGridLayout,
  CLASSIC_FORUM: ClassicForumLayout,
  ACADEMY: AcademyLayout,
  DASHBOARD: DashboardLayout,
  MINIMALIST: MinimalistLayout,
} as const;

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Component for Join Community UI - PUBLIC LANDING PAGE
function JoinCommunityView({ community, stats }: { community: any; stats?: any }) {
  async function handleJoin() {
    "use server";
    const session = await auth();
    if (!session?.user?.id) {
      redirect("/auth/signin");
    }
    
    const result = await joinCommunity(community.id);
    if (result.success) {
      redirect(`/dashboard/c/${community.slug}`);
    }
  }

  const primaryColor = community.primaryColor || "#8B5CF6";
  const secondaryColor = community.secondaryColor || "#EC4899";
  const accentColor = community.accentColor || "#F59E0B";

  // Mock data - en producción esto vendría de la DB
  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Student",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
      content: "This community completely transformed my learning journey. The support and resources are incredible!",
      rating: 5
    },
    {
      name: "Mike Chen",
      role: "Professional",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
      content: "Best investment I've made this year. The networking alone is worth it.",
      rating: 5
    },
    {
      name: "Emma Davis",
      role: "Entrepreneur",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
      content: "Finally, a community that delivers on its promises. Highly recommended!",
      rating: 5
    }
  ];

  const curriculum = [
    { icon: "🎯", title: "Core Fundamentals", description: "Master the essential skills and concepts" },
    { icon: "🚀", title: "Advanced Techniques", description: "Take your knowledge to the next level" },
    { icon: "💡", title: "Real-World Projects", description: "Apply what you learn with hands-on work" },
    { icon: "🤝", title: "Community Support", description: "Get help from peers and mentors" }
  ];

  const faqs = [
    { q: "What's included in this community?", a: "You'll get access to exclusive courses, live sessions, a supportive community, and all future updates." },
    { q: "Is there a money-back guarantee?", a: "Yes! If you're not satisfied within the first 30 days, we'll refund you 100%." },
    { q: "Can I cancel anytime?", a: "Absolutely. No long-term commitments. Cancel anytime." },
    { q: "How do I get support?", a: "You can reach out in the community chat, attend live Q&A sessions, or message the team directly." }
  ];

  return (
    <div 
      className="min-h-screen bg-white"
      style={{
        // @ts-ignore - CSS variables
        '--community-primary': primaryColor,
        '--community-secondary': secondaryColor,
        '--community-accent': accentColor,
      } as React.CSSProperties}
    >
      {/* 🎯 HERO SECTION - ÉPICO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-900 via-purple-700 to-pink-600">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAzLTRzMiAyIDIgNHYyYzAgMi0xIDMtMiAzcy0zLTEtMy0zdi0yem0wLTEwYzAtMiAyLTQgMy00czIgMiAyIDR2MmMwIDItMSAzLTIgM3MtMy0xLTMtM3YtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] animate-pulse"></div>
        </div>

        {community.coverImageUrl && (
          <div className="absolute inset-0 opacity-10">
            <img
              src={community.coverImageUrl}
              alt={community.name}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            {/* Left: Content */}
            <div className="text-white">
              {/* Badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm backdrop-blur-lg">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
                </span>
                <span>1+ active members</span>
              </div>

              {/* Logo */}
              {community.imageUrl && (
                <div className="mb-6 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl shadow-2xl ring-4 ring-white/20">
                  <img
                    src={community.imageUrl}
                    alt={community.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              {/* Title */}
              <h1 className="mb-6 text-5xl font-bold leading-tight lg:text-7xl">
                {community.heroTitle || community.name}
              </h1>

              {/* Subtitle */}
              <p className="mb-8 text-xl text-white/90 lg:text-2xl">
                {community.heroSubtitle || community.description || "Join our exclusive community and start your transformation today"}
              </p>

              {/* CTA Primary */}
              <form action={handleJoin} className="mb-8">
                <Button
                  type="submit"
                  size="lg"
                  className="group h-auto bg-white px-10 py-5 text-lg font-bold text-purple-600 shadow-2xl transition-all hover:scale-105 hover:bg-gray-50 hover:shadow-white/20"
                >
                  <span>{community.requireApproval ? "Request to Join Now" : "Join Now - It's Free!"}</span>
                  <ArrowLeft className="ml-2 h-5 w-5 rotate-180 transition-transform group-hover:translate-x-1" />
                </Button>
              </form>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-white/80">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span>Cancel anytime</span>
                </div>
                {community.isPrivate && (
                  <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-yellow-400" />
                    <span>Private community</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Stat Cards */}
            <div className="hidden lg:block">
              <div className="grid gap-4">
                {/* Large Stat */}
                <div className="rounded-3xl bg-white/10 p-8 backdrop-blur-lg">
                  <div className="mb-2 text-6xl font-bold text-white">1+</div>
                  <div className="text-lg text-white/80">Active Members</div>
                  <div className="mt-4 h-2 w-full rounded-full bg-white/20">
                    <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-green-400 to-green-600"></div>
                  </div>
                </div>

                {/* Small Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-white/10 p-6 backdrop-blur-lg">
                    <div className="mb-1 text-3xl font-bold text-white">0</div>
                    <div className="text-sm text-white/80">Courses</div>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-6 backdrop-blur-lg">
                    <div className="mb-1 text-3xl font-bold text-white">0</div>
                    <div className="text-sm text-white/80">Posts</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* 📚 WHAT YOU'LL GET */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900">
              What You'll Get Inside
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to succeed in one place
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {curriculum.map((item, i) => (
              <div
                key={i}
                className="group rounded-2xl border-2 border-gray-100 bg-white p-8 shadow-sm transition-all hover:border-purple-200 hover:shadow-xl"
              >
                <div className="mb-4 text-5xl">{item.icon}</div>
                <h3 className="mb-2 text-xl font-bold text-gray-900">
                  {item.title}
                </h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🎯 WHY CHOOSE US - EPIC STATS */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 py-20">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <span className="mb-4 inline-block rounded-full bg-purple-600 px-4 py-1 text-sm font-semibold text-white">
              WHY CHOOSE US
            </span>
            <h2 className="mb-4 text-4xl font-bold text-gray-900">
              Join a Community That Delivers Results
            </h2>
            <p className="text-xl text-gray-600">
              Numbers don't lie. See the impact we're making.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Stat 1 */}
            <div className="group relative overflow-hidden rounded-3xl bg-white p-8 shadow-lg transition-all hover:scale-105 hover:shadow-2xl">
              <div className="absolute right-4 top-4 opacity-10">
                <TrendingUp className="h-24 w-24 text-purple-600" />
              </div>
              <div className="relative">
                <div className="mb-2 text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  100%
                </div>
                <div className="text-lg font-semibold text-gray-900">Success Rate</div>
                <p className="mt-2 text-gray-600">
                  Members who actively participate see real transformation
                </p>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="group relative overflow-hidden rounded-3xl bg-white p-8 shadow-lg transition-all hover:scale-105 hover:shadow-2xl">
              <div className="absolute right-4 top-4 opacity-10">
                <Zap className="h-24 w-24 text-purple-600" />
              </div>
              <div className="relative">
                <div className="mb-2 text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  24/7
                </div>
                <div className="text-lg font-semibold text-gray-900">Support Available</div>
                <p className="mt-2 text-gray-600">
                  Get help whenever you need it from our community and AI assistant
                </p>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="group relative overflow-hidden rounded-3xl bg-white p-8 shadow-lg transition-all hover:scale-105 hover:shadow-2xl">
              <div className="absolute right-4 top-4 opacity-10">
                <Award className="h-24 w-24 text-purple-600" />
              </div>
              <div className="relative">
                <div className="mb-2 text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {stats?._count.members || 1}+
                </div>
                <div className="text-lg font-semibold text-gray-900">Active Members</div>
                <p className="mt-2 text-gray-600">
                  Join a growing community of like-minded individuals
                </p>
              </div>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-start gap-4 rounded-2xl bg-white p-6 shadow-md">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="mb-1 font-semibold text-gray-900">Goal-Oriented Learning</h3>
                <p className="text-sm text-gray-600">Structured paths to achieve your objectives</p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-2xl bg-white p-6 shadow-md">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="mb-1 font-semibold text-gray-900">Peer Learning</h3>
                <p className="text-sm text-gray-600">Learn from and with fellow members</p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-2xl bg-white p-6 shadow-md">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100">
                <BookOpen className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="mb-1 font-semibold text-gray-900">Exclusive Resources</h3>
                <p className="text-sm text-gray-600">Access premium content not available elsewhere</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 💬 TESTIMONIALS */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900">
              Loved by Members
            </h2>
            <p className="text-xl text-gray-600">
              See what our community members have to say
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial, i) => (
              <div
                key={i}
                className="rounded-2xl bg-white p-8 shadow-lg transition-transform hover:scale-105"
              >
                {/* Stars */}
                <div className="mb-4 flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="text-yellow-400">★</span>
                  ))}
                </div>

                {/* Content */}
                <p className="mb-6 text-gray-700">"{testimonial.content}"</p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="h-12 w-12 rounded-full"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ❓ FAQ */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to know
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details
                key={i}
                className="group rounded-2xl border-2 border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-purple-200"
              >
                <summary className="flex cursor-pointer items-center justify-between font-semibold text-gray-900">
                  <span>{faq.q}</span>
                  <span className="text-2xl transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-4 text-gray-600">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 🚀 FINAL CTA */}
      <section className="bg-gradient-to-br from-purple-900 via-purple-700 to-pink-600 py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-6 text-5xl font-bold text-white">
            Ready to Get Started?
          </h2>
          <p className="mb-8 text-xl text-white/90">
            Join {community.name} today and start your transformation
          </p>

          <form action={handleJoin}>
            <Button
              type="submit"
              size="lg"
              className="group h-auto bg-white px-10 py-5 text-lg font-bold text-purple-600 shadow-2xl transition-all hover:scale-105 hover:bg-gray-50"
            >
              <span>{community.requireApproval ? "Request to Join Now" : "Join Now - It's Free!"}</span>
              <ArrowLeft className="ml-2 h-5 w-5 rotate-180 transition-transform group-hover:translate-x-1" />
            </Button>
          </form>

          <p className="mt-6 text-sm text-white/70">
            No credit card required • Cancel anytime • 30-day guarantee
          </p>
        </div>
      </section>

      {/* 📍 FOOTER */}
      <footer className="border-t border-gray-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <Link href="/dashboard/communities" className="text-gray-600 hover:text-gray-900 transition-colors">
            ← Back to Communities
          </Link>
          <p className="mt-4 text-sm text-gray-500">
            © 2025 {community.name}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default async function CommunityPage({ params }: PageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const { slug } = await params;

  console.log("🔍 Loading community page for slug:", slug);

  // Get community with all sections and data
  const result = await getCommunityWithSections(slug);

  if (!result.success || !result.community) {
    console.log("❌ Community not found with slug:", slug);
    notFound();
  }

  const community = result.community;

  console.log("🔍 DEBUG - Checking membership:");
  console.log("  Slug:", slug);
  console.log("  Session User ID:", session.user.id);
  console.log("  Community ID:", community.id);
  console.log("  Community Name:", community.name);
  console.log("  Community Slug:", community.slug);

  // Check if user is a member with more detailed logging
  const membership = await prisma.member.findFirst({
    where: {
      userId: session.user.id,
      communityId: community.id,
    },
  });

  console.log("  Membership found:", membership ? "YES ✅" : "NO ❌");
  if (membership) {
    console.log("  Role:", membership.role);
    console.log("  Status:", membership.status);
  } else {
    console.log("  ⚠️ NO MEMBERSHIP - This should NOT happen for community creators!");
    console.log("  Checking all memberships for this user...");
    
    // DEBUG: Check all memberships for this user
    const allMemberships = await prisma.member.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        role: true,
        status: true,
        communityId: true,
        community: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });
    console.log("  User's all memberships:", allMemberships);
  }

  // If not a member, show join page
  if (!membership) {
    // Get basic stats for the join page
    const joinPageStats = await prisma.community.findUnique({
      where: { id: community.id },
      select: {
        _count: {
          select: {
            members: true,
            posts: true,
          },
        },
      },
    });
    
    return <JoinCommunityView community={community} stats={joinPageStats} />;
  }

  // If membership is pending, show pending message
  if (membership.status === "PENDING") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-2xl">
            <Link href="/dashboard/communities">
              <Button variant="ghost" className="mb-6 flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Communities</span>
              </Button>
            </Link>

            <div className="rounded-2xl border border-border bg-card p-8 shadow-xl text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
                <Lock className="h-8 w-8 text-amber-500" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                Membership Pending
              </h1>
              <p className="mt-2 text-muted-foreground">
                Your request to join <strong>{community.name}</strong> is pending approval.
                You'll be notified when the community owner reviews your request.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If membership is not active (suspended/banned)
  if (membership.status !== "ACTIVE") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-2xl">
            <Link href="/dashboard/communities">
              <Button variant="ghost" className="mb-6 flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Communities</span>
              </Button>
            </Link>

            <div className="rounded-2xl border border-border bg-card p-8 shadow-xl text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                <Lock className="h-8 w-8 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                Access Denied
              </h1>
              <p className="mt-2 text-muted-foreground">
                Your access to <strong>{community.name}</strong> has been restricted.
                Please contact the community owner for more information.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User is an active member, show community content
  // Get additional community data for layouts
  const [posts, members, courses, stats] = await Promise.all([
    // Recent posts
    prisma.post.findMany({
      where: { communityId: community.id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),

    // Active members
    prisma.member.findMany({
      where: {
        communityId: community.id,
        status: "ACTIVE",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { points: "desc" },
      take: 12,
    }),

    // Courses (placeholder - actual course model if exists)
    [] as any[],

    // Community stats
    prisma.community.findUnique({
      where: { id: community.id },
      select: {
        _count: {
          select: {
            members: true,
            posts: true,
          },
        },
      },
    }),
  ]);

  // Select the layout component based on community settings
  const layoutType = (community.layoutType || "MODERN_GRID") as keyof typeof LAYOUT_COMPONENTS;
  const LayoutComponent = LAYOUT_COMPONENTS[layoutType] || ModernGridLayout;

  // Prepare theme object
  const theme = {
    primaryColor: community.primaryColor || "#0ea5e9",
    secondaryColor: community.secondaryColor || "#06b6d4",
    accentColor: community.accentColor || "#3b82f6",
    font: community.fontFamily || "Inter",
  };

  // Prepare layout props
  const layoutProps = {
    community: {
      id: community.id,
      name: community.name,
      description: community.description,
      slug: community.slug,
      coverImageUrl: community.coverImageUrl,
      imageUrl: community.imageUrl,
      primaryColor: community.primaryColor,
      secondaryColor: community.secondaryColor,
      accentColor: community.accentColor,
      heroTitle: community.heroTitle || community.name,
      heroSubtitle: community.heroSubtitle || community.description,
      heroCTA: membership.role === "OWNER" 
        ? "⚙️ Manage Community" 
        : "✍️ Create Post",
      heroCTALink: membership.role === "OWNER"
        ? `/dashboard/c/${community.slug}/settings`
        : `/dashboard/c/${community.slug}/posts/new`,
      aboutSection: community.aboutSection || "",
      showStats: community.showStats !== false,
      showMembers: community.showMembers !== false,
      showCourses: community.showCourses !== false,
      _count: {
        members: stats?._count.members || 0,
        posts: stats?._count.posts || 0,
        courses: courses.length || 0,
      },
    },
    stats: {
      members: stats?._count.members || 0,
      posts: stats?._count.posts || 0,
      courses: courses.length || 0,
    },
    posts,
    members,
    courses,
    theme,
    sections: community.sections || [],
  };

  return (
    <div 
      className="min-h-screen bg-gray-50"
      style={{
        // @ts-ignore - CSS variables
        '--community-primary': theme.primaryColor,
        '--community-secondary': theme.secondaryColor,
        '--community-accent': theme.accentColor,
      } as React.CSSProperties}
    >
      <CommunitySubHeader 
        communitySlug={community.slug}
        communityName={community.name}
      />
      <LayoutComponent {...layoutProps} />
    </div>
  );
}
