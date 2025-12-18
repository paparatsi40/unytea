import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { 
  Users, 
  Plus,
  Crown,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  BookOpen,
  Activity,
  Sparkles,
  Compass,
} from "lucide-react";
import { getTranslations } from 'next-intl/server';

export default async function DashboardPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await auth();
  const { locale } = await params;
  const t = await getTranslations('dashboard');
  
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Fetch communities where user is owner
  const ownedCommunities = await prisma.community.findMany({
    where: { ownerId: session.user.id },
    select: {
      id: true,
      name: true,
      slug: true,
      memberCount: true,
    },
  });

  // Fetch communities where user is member
  const memberCommunities = await prisma.member.findMany({
    where: { 
      userId: session.user.id,
      community: {
        ownerId: { not: session.user.id }
      }
    },
    include: {
      community: {
        select: {
          id: true,
          memberCount: true,
        },
      },
    },
  });

  const joinedCommunities = memberCommunities.map(m => m.community).filter(Boolean) || [];
  const totalCommunities = (ownedCommunities?.length || 0) + (joinedCommunities?.length || 0);
  const totalMembers = [...ownedCommunities, ...joinedCommunities].reduce(
    (sum, c) => sum + (c.memberCount || 0), 
    0
  );

  return (
    <div className="space-y-6 bg-gradient-to-br from-background via-background to-primary/5 -m-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            {session.user.name ? t('welcome.titleWithName', { name: session.user.name }) : t('welcome.title')} <span className="text-3xl">👋</span>
          </h1>
          <p className="mt-1 text-base text-muted-foreground">
            {t('welcome.subtitle')}
          </p>
        </div>
        <Link
          href={`/${locale}/dashboard/communities/new`}
          className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-primary to-purple-600 text-primary-foreground rounded-lg text-base font-semibold hover:from-primary/90 hover:to-purple-600/90 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">{t('actions.newCommunity')}</span>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="group relative overflow-hidden rounded-lg border border-border bg-card/80 backdrop-blur p-6 transition-all hover:border-primary/50 hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-base font-semibold text-muted-foreground uppercase tracking-wider">
                {t('stats.totalCommunities')}
              </p>
              <p className="mt-2 text-4xl font-bold text-foreground">
                {totalCommunities}
              </p>
              <div className="mt-2 flex items-center gap-1 text-base text-emerald-600">
                <TrendingUp className="h-5 w-5" />
                <span>{t('stats.active')}</span>
              </div>
            </div>
            <div className="rounded-lg p-3 bg-blue-500/10">
              <Users className="h-7 w-7 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-lg border border-border bg-card/80 backdrop-blur p-6 transition-all hover:border-primary/50 hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-base font-semibold text-muted-foreground uppercase tracking-wider">
                {t('stats.youOwn')}
              </p>
              <p className="mt-2 text-4xl font-bold text-foreground">
                {ownedCommunities?.length || 0}
              </p>
              <div className="mt-2 flex items-center gap-1 text-base text-yellow-600">
                <Crown className="h-5 w-5" />
                <span>{t('stats.owner')}</span>
              </div>
            </div>
            <div className="rounded-lg p-3 bg-yellow-500/10">
              <Crown className="h-7 w-7 text-yellow-500" />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-lg border border-border bg-card/80 backdrop-blur p-6 transition-all hover:border-primary/50 hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-base font-semibold text-muted-foreground uppercase tracking-wider">
                {t('stats.totalMembers')}
              </p>
              <p className="mt-2 text-4xl font-bold text-foreground">
                {totalMembers}
              </p>
              <div className="mt-2 flex items-center gap-1 text-base text-purple-600">
                <Activity className="h-5 w-5" />
                <span>{t('stats.across')}</span>
              </div>
            </div>
            <div className="rounded-lg p-3 bg-purple-500/10">
              <TrendingUp className="h-7 w-7 text-purple-500" />
            </div>
          </div>
        </div>

        <Link
          href={`/${locale}/dashboard/courses`}
          className="group relative overflow-hidden rounded-lg border border-border bg-gradient-to-br from-primary/10 to-purple-500/10 backdrop-blur p-6 transition-all hover:border-primary hover:shadow-md cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-base font-semibold text-muted-foreground uppercase tracking-wider">
                {t('stats.quickAccess')}
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {t('quickLinks.myCourses')}
              </p>
              <div className="mt-2 flex items-center gap-1 text-base text-primary">
                <Sparkles className="h-5 w-5" />
                <span>{t('stats.learn')}</span>
              </div>
            </div>
            <div className="rounded-lg p-3 bg-primary/20">
              <BookOpen className="h-7 w-7 text-primary" />
            </div>
          </div>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main Content */}
        <div className="space-y-6">
          {/* 🔥 DISCOVER COMMUNITIES - DESTACADO */}
          <div className="relative overflow-hidden rounded-2xl shadow-2xl min-h-[280px]">
            {/* Background Image */}
            <div className="absolute inset-0">
              <img 
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1400&h=400&fit=crop&q=80" 
                alt="Team collaboration"
                className="h-full w-full object-cover"
              />
            </div>

            {/* Simple Dark Overlay */}
            <div className="absolute inset-0 bg-black/65 z-30" />
            
            {/* Top Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500 z-50" />
            
            <div className="relative px-8 py-10 z-50">
              <div className="flex items-center justify-between gap-8">
                <div className="flex-1 max-w-3xl">
                  <h2 className="text-4xl font-bold text-white mb-4 flex items-center gap-3 leading-tight">
                    <Compass className="h-10 w-10" /> {t('discover.title')}
                  </h2>
                  <p className="text-lg text-white/90 mb-8 leading-relaxed">
                    {t('discover.description')}
                  </p>
                  <Link
                    href={`/${locale}/dashboard/communities?tab=discover`}
                    className="inline-flex items-center gap-3 px-10 py-4 bg-white text-primary rounded-xl text-base font-bold hover:shadow-2xl hover:scale-105 transition-all duration-300 shadow-xl"
                  >
                    <Sparkles className="h-5 w-5" />
                    {t('discover.button')}
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </div>
                
                <div className="hidden lg:block">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-white/15 backdrop-blur-sm p-6 text-center border border-white/20 shadow-lg hover:scale-105 transition-transform">
                      <div className="text-4xl font-black text-white mb-1">100+</div>
                      <div className="text-sm font-semibold text-white/80">{t('discover.stats.communities')}</div>
                    </div>
                    <div className="rounded-2xl bg-white/15 backdrop-blur-sm p-6 text-center border border-white/20 shadow-lg hover:scale-105 transition-transform">
                      <div className="text-4xl font-black text-white mb-1">50k+</div>
                      <div className="text-sm font-semibold text-white/80">{t('discover.stats.members')}</div>
                    </div>
                    <div className="rounded-2xl bg-white/15 backdrop-blur-sm p-6 text-center col-span-2 border border-white/20 shadow-lg hover:scale-105 transition-transform">
                      <div className="text-4xl font-black text-white mb-1">∞</div>
                      <div className="text-sm font-semibold text-white/80">{t('discover.stats.possibilities')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Access Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href={`/${locale}/dashboard/communities`}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all hover:border-primary hover:shadow-lg"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-blue-500/10 p-3">
                  <Users className="h-7 w-7 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {t('quickAccess.myCommunities')}
                  </h3>
                  <p className="mt-2 text-base text-muted-foreground">
                    {t('quickAccess.myCommunitiesDesc')}
                  </p>
                  <div className="mt-4 flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-yellow-600">
                      <Crown className="h-4 w-4" />
                      {ownedCommunities.length} {t('quickAccess.owned')}
                    </span>
                    <span className="flex items-center gap-1 text-purple-600">
                      <Users className="h-4 w-4" />
                      {joinedCommunities.length} {t('quickAccess.joined')}
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>

            <Link
              href={`/${locale}/dashboard/communities?tab=discover`}
              className="group relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/10 to-purple-500/10 p-6 transition-all hover:border-primary hover:shadow-lg"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/20 p-3">
                  <Compass className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {t('quickAccess.explore')}
                  </h3>
                  <p className="mt-2 text-base text-muted-foreground">
                    {t('quickAccess.exploreDesc')}
                  </p>
                  <div className="mt-4">
                    <span className="inline-flex items-center gap-1 text-sm text-primary font-semibold">
                      <Sparkles className="h-4 w-4" />
                      {t('quickAccess.browseNow')}
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          </div>

          {/* Empty State if no communities */}
          {totalCommunities === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center rounded-lg border-2 border-dashed border-border bg-card/50">
              <div className="rounded-full bg-primary/10 p-6 mb-5">
                <Users className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">
                {t('emptyState.title')}
              </h3>
              <p className="text-base text-muted-foreground mb-8 max-w-md">
                {t('emptyState.description')}
              </p>
              <Link
                href={`/${locale}/dashboard/communities/new`}
                className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-lg text-base font-semibold hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-5 w-5" />
                {t('actions.createFirstCommunity')}
              </Link>
            </div>
          )}
        </div>

        {/* Sidebar - Recent Activity & Quick Links */}
        <aside className="space-y-4 lg:sticky lg:top-20 self-start">
          {/* Recent Activity */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              {t('sections.recentActivity')}
            </h3>
            <div className="space-y-3">
              {totalCommunities > 0 ? (
                <>
                  <div className="flex items-start gap-3 text-base">
                    <div className="rounded-full bg-green-500/10 p-1.5 mt-0.5">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-foreground font-semibold">{t('activity.allSet')}</p>
                      <p className="text-muted-foreground mt-1">
                        {t('activity.communitiesActive', { count: totalCommunities })}
                      </p>
                    </div>
                  </div>
                  {ownedCommunities.slice(0, 2).map((community) => (
                    <div key={community.id} className="flex items-start gap-3 text-base">
                      <div className="rounded-full bg-blue-500/10 p-1.5 mt-0.5">
                        <Crown className="h-4 w-4 text-yellow-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-foreground font-semibold line-clamp-1">{community.name}</p>
                        <p className="text-muted-foreground mt-1">
                          {t('activity.membersCount', { count: community.memberCount || 0 })}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-6 text-base text-muted-foreground">
                  {t('activity.noActivity')}
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {t('sections.quickLinks')}
            </h3>
            <div className="space-y-2">
              <Link
                href={`/${locale}/dashboard/courses`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors group"
              >
                <div className="rounded-lg bg-primary/10 p-2.5">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-semibold text-foreground group-hover:text-primary">{t('quickLinks.myCourses')}</p>
                  <p className="text-base text-muted-foreground">{t('quickLinks.myCoursesDesc')}</p>
                </div>
              </Link>
              {/* Sessions link removed - sessions only exist within communities */}
              <Link
                href={`/${locale}/dashboard/messages`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors group"
              >
                <div className="rounded-lg bg-blue-500/10 p-2.5">
                  <MessageSquare className="h-6 w-6 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-semibold text-foreground group-hover:text-primary">{t('quickLinks.messages')}</p>
                  <p className="text-base text-muted-foreground">{t('quickLinks.messagesDesc')}</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Upgrade CTA */}
          <div className="rounded-lg border border-primary/20 bg-gradient-to-br from-primary/10 to-purple-500/10 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/20 p-2.5">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {t('upgrade.title')}
                </h3>
                <p className="text-base text-muted-foreground mb-4">
                  {t('upgrade.description')}
                </p>
                <Link
                  href={`/${locale}/dashboard/upgrade`}
                  className="inline-block text-base font-semibold text-primary hover:underline"
                >
                  {t('actions.learnMore')}
                </Link>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
