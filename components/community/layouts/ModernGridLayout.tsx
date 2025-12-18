"use client";

import { motion } from "framer-motion";
import { Users, BookOpen, MessageSquare, TrendingUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface ModernGridLayoutProps {
  community: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    imageUrl?: string | null;
    coverImageUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
    heroTitle?: string | null;
    heroSubtitle?: string | null;
    heroCTA?: string | null;
    heroCTALink?: string | null;
    aboutSection?: string | null;
    showStats?: boolean;
    showMembers?: boolean;
    showCourses?: boolean;
    _count?: {
      members: number;
      posts: number;
      courses: number;
    };
  };
  posts?: any[];
  members?: any[];
  courses?: any[];
}

export function ModernGridLayout({
  community,
  posts = [],
  members = [],
  courses = [],
}: ModernGridLayoutProps) {
  const primaryColor = community.primaryColor || "#8B5CF6";
  const secondaryColor = community.secondaryColor || "#EC4899";
  const accentColor = community.accentColor || "#F59E0B";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero Section */}
      <div
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}15 0%, ${secondaryColor}15 100%)`,
        }}
      >
        {/* Cover Image */}
        {community.coverImageUrl && (
          <div className="absolute inset-0 opacity-20">
            <Image
              src={community.coverImageUrl}
              alt={community.name}
              fill
              className="object-cover"
            />
          </div>
        )}

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            {/* Community Logo */}
            {community.imageUrl && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="mx-auto mb-6 flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl shadow-2xl ring-4 ring-white"
              >
                <Image
                  src={community.imageUrl}
                  alt={community.name}
                  width={96}
                  height={96}
                  className="object-cover"
                />
              </motion.div>
            )}

            {/* Hero Title */}
            <h1 className="mb-4 text-5xl font-bold text-gray-900">
              {community.heroTitle || community.name}
            </h1>

            {/* Hero Subtitle */}
            {(community.heroSubtitle || community.description) && (
              <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-600">
                {community.heroSubtitle || community.description}
              </p>
            )}

            {/* CTA Button */}
            {community.heroCTA && (
              <Link
                href={community.heroCTALink || `/dashboard/c/${community.slug}/join`}
                className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:scale-105"
                style={{ backgroundColor: primaryColor }}
              >
                {community.heroCTA}
              </Link>
            )}

            {/* Stats Bar */}
            {community.showStats && community._count && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-12 grid grid-cols-3 gap-8"
              >
                <div className="rounded-2xl bg-white/80 p-6 shadow-lg backdrop-blur">
                  <Users className="mx-auto mb-2 h-8 w-8" style={{ color: primaryColor }} />
                  <div className="text-3xl font-bold text-gray-900">
                    {community._count.members}
                  </div>
                  <div className="text-sm text-gray-600">Members</div>
                </div>
                <div className="rounded-2xl bg-white/80 p-6 shadow-lg backdrop-blur">
                  <MessageSquare className="mx-auto mb-2 h-8 w-8" style={{ color: secondaryColor }} />
                  <div className="text-3xl font-bold text-gray-900">
                    {community._count.posts}
                  </div>
                  <div className="text-sm text-gray-600">Posts</div>
                </div>
                <div className="rounded-2xl bg-white/80 p-6 shadow-lg backdrop-blur">
                  <BookOpen className="mx-auto mb-2 h-8 w-8" style={{ color: accentColor }} />
                  <div className="text-3xl font-bold text-gray-900">
                    {community._count.courses}
                  </div>
                  <div className="text-sm text-gray-600">Courses</div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Main Content - Masonry Grid */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* About Section */}
        {community.aboutSection && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 rounded-3xl bg-white p-8 shadow-lg"
          >
            <h2 className="mb-4 text-2xl font-bold text-gray-900">About</h2>
            <div
              className="prose max-w-none text-gray-600"
              dangerouslySetInnerHTML={{ __html: community.aboutSection }}
            />
          </motion.div>
        )}

        {/* Masonry Grid Layout */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Featured Posts */}
          {posts.slice(0, 6).map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group overflow-hidden rounded-2xl bg-white shadow-lg transition-all hover:shadow-2xl"
            >
              <Link href={`/dashboard/c/${community.slug}/posts/${post.id}`}>
                <div className="p-6">
                  <div className="mb-3 flex items-center gap-3">
                    {post.author?.image && (
                      <Image
                        src={post.author.image}
                        alt={post.author.name || "User"}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900">
                        {post.author?.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-gray-900 group-hover:text-[var(--primary)]">
                    {post.title || "Untitled Post"}
                  </h3>
                  <p className="line-clamp-3 text-sm text-gray-600">
                    {post.content}
                  </p>
                  {post._count && (
                    <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        {post._count.comments}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        {post._count.reactions}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}

          {/* Featured Courses */}
          {community.showCourses && courses.slice(0, 3).map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (posts.length + index) * 0.1 }}
              className="group overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-6 text-white shadow-lg transition-all hover:shadow-2xl"
            >
              <Link href={`/dashboard/c/${community.slug}/courses/${course.slug}`}>
                <BookOpen className="mb-4 h-12 w-12" />
                <h3 className="mb-2 text-xl font-bold">{course.title}</h3>
                <p className="mb-4 text-sm opacity-90">
                  {course.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    {course.enrollmentCount} enrolled
                  </span>
                  {course.isPaid && (
                    <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                      ${course.price}
                    </span>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}

          {/* Member Highlights */}
          {community.showMembers && members.slice(0, 3).map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (posts.length + courses.length + index) * 0.1 }}
              className="rounded-2xl bg-white p-6 text-center shadow-lg"
            >
              {member.user?.image && (
                <Image
                  src={member.user.image}
                  alt={member.user.name || "Member"}
                  width={80}
                  height={80}
                  className="mx-auto mb-4 rounded-full ring-4 ring-purple-100"
                />
              )}
              <h3 className="mb-1 text-lg font-bold text-gray-900">
                {member.user?.name}
              </h3>
              <div className="mb-2 text-sm text-gray-500">
                Level {member.level}
              </div>
              <div className="text-sm font-semibold" style={{ color: accentColor }}>
                {member.points} points
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Custom CSS */}
      <style jsx>{`
        :root {
          --primary: ${primaryColor};
          --secondary: ${secondaryColor};
          --accent: ${accentColor};
        }
      `}</style>
    </div>
  );
}
