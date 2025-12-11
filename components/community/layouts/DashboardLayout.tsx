"use client";

import { 
  BarChart3, TrendingUp, Users, MessageSquare, BookOpen, 
  Award, Clock, Activity, ArrowUp, ArrowDown, Eye, Heart 
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

interface DashboardLayoutProps {
  community: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    imageUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
    heroTitle?: string | null;
    heroSubtitle?: string | null;
    aboutSection?: string | null;
    showStats?: boolean;
    _count?: {
      members: number;
      posts: number;
      courses: number;
    };
  };
  posts?: any[];
  members?: any[];
  analytics?: {
    memberGrowth?: number;
    postGrowth?: number;
    engagementRate?: number;
    activeUsers?: number;
  };
}

export function DashboardLayout({
  community,
  posts = [],
  members = [],
  analytics = {},
}: DashboardLayoutProps) {
  const primaryColor = community.primaryColor || "#8B5CF6";
  const secondaryColor = community.secondaryColor || "#EC4899";
  const accentColor = community.accentColor || "#F59E0B";

  // Mock analytics data if not provided
  const stats = {
    memberGrowth: analytics.memberGrowth || 12,
    postGrowth: analytics.postGrowth || 8,
    engagementRate: analytics.engagementRate || 24,
    activeUsers: analytics.activeUsers || Math.floor((community._count?.members || 0) * 0.6),
  };

  const topPosts = posts.slice(0, 5);
  const topMembers = members.slice(0, 6);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {community.imageUrl && (
                <Image
                  src={community.imageUrl}
                  alt={community.name}
                  width={48}
                  height={48}
                  className="rounded-lg"
                />
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {community.heroTitle || community.name}
                </h1>
                <p className="text-sm text-gray-500">Community Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/c/${community.slug}/analytics`}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Full Analytics
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Key Metrics Grid */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Members"
            value={community._count?.members || 0}
            change={stats.memberGrowth}
            icon={Users}
            color={primaryColor}
            trend="up"
          />
          <MetricCard
            title="Total Posts"
            value={community._count?.posts || 0}
            change={stats.postGrowth}
            icon={MessageSquare}
            color={secondaryColor}
            trend="up"
          />
          <MetricCard
            title="Active Users"
            value={stats.activeUsers}
            change={stats.engagementRate}
            icon={Activity}
            color={accentColor}
            trend="up"
          />
          <MetricCard
            title="Courses"
            value={community._count?.courses || 0}
            change={5}
            icon={BookOpen}
            color="#10B981"
            trend="up"
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content - 2 columns */}
          <div className="lg:col-span-2">
            {/* About Section */}
            {community.aboutSection && (
              <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900">
                  <BarChart3 className="h-5 w-5" style={{ color: primaryColor }} />
                  Community Overview
                </h2>
                <div
                  className="prose prose-sm max-w-none text-gray-600"
                  dangerouslySetInnerHTML={{ __html: community.aboutSection }}
                />
              </div>
            )}

            {/* Engagement Chart Placeholder */}
            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Engagement Overview</h3>
                <select className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm">
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last 90 days</option>
                </select>
              </div>
              
              {/* Simple Bar Chart Visualization */}
              <div className="flex h-48 items-end justify-between gap-2">
                {[65, 80, 70, 90, 75, 95, 85].map((height, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className="w-full rounded-t-lg transition-all hover:opacity-80"
                      style={{
                        height: `${height}%`,
                        backgroundColor: primaryColor,
                      }}
                    />
                    <span className="text-xs text-gray-500">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Posts */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                <TrendingUp className="h-5 w-5" style={{ color: accentColor }} />
                Trending Posts
              </h3>
              <div className="space-y-3">
                {topPosts.map((post, index) => (
                  <Link
                    key={post.id}
                    href={`/dashboard/c/${community.slug}/posts/${post.id}`}
                    className="flex items-center gap-4 rounded-lg p-3 transition-colors hover:bg-gray-50"
                  >
                    <div
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ backgroundColor: index < 3 ? accentColor : '#9CA3AF' }}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h4 className="truncate text-sm font-semibold text-gray-900">
                        {post.title || "Untitled Post"}
                      </h4>
                      <p className="text-xs text-gray-500">
                        by {post.author?.name || "Unknown"} • {post._count?.comments || 0} comments
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {post.viewCount || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-4 w-4" />
                        {post._count?.reactions || 0}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="mb-4 text-lg font-bold text-gray-900">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avg. Response Time</span>
                  <span className="font-semibold text-gray-900">2.3h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Posts Today</span>
                  <span className="font-semibold text-gray-900">
                    {Math.floor(Math.random() * 20 + 5)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">New Members</span>
                  <span className="font-semibold text-gray-900">
                    {Math.floor(Math.random() * 10 + 3)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Engagement Rate</span>
                  <span className="font-semibold" style={{ color: accentColor }}>
                    {stats.engagementRate}%
                  </span>
                </div>
              </div>
            </div>

            {/* Top Contributors */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="mb-4 text-lg font-bold text-gray-900">Top Contributors</h3>
              <div className="space-y-3">
                {topMembers.map((member, index) => (
                  <div key={member.id} className="flex items-center gap-3">
                    {member.user?.image ? (
                      <Image
                        src={member.user.image}
                        alt={member.user.name || "User"}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                        <Users className="h-5 w-5 text-gray-500" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900">
                        {member.user?.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {member.points} points • Level {member.level}
                      </div>
                    </div>
                    {index < 3 && (
                      <Award
                        className="h-5 w-5"
                        style={{ color: index === 0 ? '#F59E0B' : index === 1 ? '#94A3B8' : '#CD7F32' }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="mb-4 text-lg font-bold text-gray-900">Recent Activity</h3>
              <div className="space-y-3">
                <ActivityItem
                  icon={MessageSquare}
                  text="New post in General"
                  time="5m ago"
                  color={primaryColor}
                />
                <ActivityItem
                  icon={Users}
                  text="3 new members joined"
                  time="1h ago"
                  color={secondaryColor}
                />
                <ActivityItem
                  icon={BookOpen}
                  text="Course completed"
                  time="2h ago"
                  color={accentColor}
                />
                <ActivityItem
                  icon={Award}
                  text="Achievement unlocked"
                  time="3h ago"
                  color="#10B981"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  color,
  trend,
}: {
  title: string;
  value: number;
  change: number;
  icon: any;
  color: string;
  trend: "up" | "down";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
        </div>
        <div
          className="rounded-lg p-3"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="h-6 w-6" style={{ color }} />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1 text-sm">
        {trend === "up" ? (
          <ArrowUp className="h-4 w-4 text-green-500" />
        ) : (
          <ArrowDown className="h-4 w-4 text-red-500" />
        )}
        <span className={trend === "up" ? "text-green-600" : "text-red-600"}>
          {change}%
        </span>
        <span className="text-gray-500">vs last month</span>
      </div>
    </motion.div>
  );
}

// Activity Item Component
function ActivityItem({
  icon: Icon,
  text,
  time,
  color,
}: {
  icon: any;
  text: string;
  time: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{text}</p>
        <p className="text-xs text-gray-500">{time}</p>
      </div>
    </div>
  );
}
