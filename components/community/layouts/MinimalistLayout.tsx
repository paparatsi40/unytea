"use client";

import { ArrowRight, Users, MessageSquare, BookOpen, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

interface MinimalistLayoutProps {
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
    heroCTA?: string | null;
    heroCTALink?: string | null;
    aboutSection?: string | null;
    showStats?: boolean;
    _count?: {
      members: number;
      posts: number;
      courses: number;
    };
  };
  posts?: any[];
  courses?: any[];
  members?: any[];
}

export function MinimalistLayout({
  community,
  posts = [],
  courses = [],
  members = [],
}: MinimalistLayoutProps) {
  const primaryColor = community.primaryColor || "#18181B";
  const accentColor = community.accentColor || "#3B82F6";

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - Minimal */}
      <div className="border-b border-gray-100">
        <div className="mx-auto max-w-4xl px-6 py-20 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Logo */}
            {community.imageUrl && (
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg">
                <Image
                  src={community.imageUrl}
                  alt={community.name}
                  width={48}
                  height={48}
                  className="object-cover"
                />
              </div>
            )}

            {/* Title */}
            <div>
              <h1 className="mb-4 text-5xl font-semibold tracking-tight text-gray-900">
                {community.heroTitle || community.name}
              </h1>
              {(community.heroSubtitle || community.description) && (
                <p className="text-xl leading-relaxed text-gray-600">
                  {community.heroSubtitle || community.description}
                </p>
              )}
            </div>

            {/* CTA */}
            {community.heroCTA && (
              <div className="flex items-center gap-4">
                <Link
                  href={community.heroCTALink || `/dashboard/c/${community.slug}/join`}
                  className="inline-flex items-center gap-2 rounded-lg px-6 py-3 font-medium text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: accentColor }}
                >
                  {community.heroCTA}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}

            {/* Stats - Minimal */}
            {community.showStats && community._count && (
              <div className="flex items-center gap-8 pt-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">{community._count.members} members</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-sm">{community._count.posts} posts</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-sm">{community._count.courses} courses</span>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-4xl px-6 py-16 sm:px-8">
        {/* About */}
        {community.aboutSection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-20"
          >
            <div
              className="prose prose-lg prose-gray max-w-none"
              dangerouslySetInnerHTML={{ __html: community.aboutSection }}
            />
          </motion.div>
        )}

        {/* Posts Section */}
        {posts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-20"
          >
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">Recent Discussions</h2>
              <Link
                href={`/dashboard/c/${community.slug}/posts`}
                className="text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                View all
              </Link>
            </div>

            <div className="space-y-6">
              {posts.slice(0, 6).map((post) => (
                <Link
                  key={post.id}
                  href={`/dashboard/c/${community.slug}/posts/${post.id}`}
                  className="group block border-b border-gray-100 pb-6 transition-colors hover:border-gray-200"
                >
                  <div className="mb-2 flex items-center gap-2">
                    {post.author?.image && (
                      <Image
                        src={post.author.image}
                        alt={post.author.name || "User"}
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                    )}
                    <span className="text-sm text-gray-500">
                      {post.author?.name} · {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <h3 className="mb-2 text-lg font-medium text-gray-900 group-hover:text-blue-600">
                    {post.title || "Untitled"}
                  </h3>
                  
                  <p className="mb-3 text-gray-600 line-clamp-2">
                    {post.content}
                  </p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{post._count?.comments || 0} comments</span>
                    <span>·</span>
                    <span>{post._count?.reactions || 0} reactions</span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Courses Section */}
        {courses.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mb-20"
          >
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">Courses</h2>
              <Link
                href={`/dashboard/c/${community.slug}/courses`}
                className="text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                View all
              </Link>
            </div>

            <div className="grid gap-8 sm:grid-cols-2">
              {courses.slice(0, 4).map((course) => (
                <Link
                  key={course.id}
                  href={`/dashboard/c/${community.slug}/courses/${course.slug}`}
                  className="group"
                >
                  {/* Course Image */}
                  {course.imageUrl ? (
                    <div className="mb-4 overflow-hidden rounded-lg">
                      <Image
                        src={course.imageUrl}
                        alt={course.title}
                        width={400}
                        height={225}
                        className="aspect-video w-full object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="mb-4 flex aspect-video w-full items-center justify-center rounded-lg bg-gray-100">
                      <BookOpen className="h-12 w-12 text-gray-400" />
                    </div>
                  )}

                  <h3 className="mb-2 text-lg font-medium text-gray-900 group-hover:text-blue-600">
                    {course.title}
                  </h3>
                  
                  <p className="mb-3 text-sm text-gray-600 line-clamp-2">
                    {course.description}
                  </p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{course.enrollmentCount || 0} students</span>
                    {course.isPaid && (
                      <>
                        <span>·</span>
                        <span className="font-medium" style={{ color: accentColor }}>
                          ${course.price}
                        </span>
                      </>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Members Section */}
        {members.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">Community Members</h2>
              <Link
                href={`/dashboard/c/${community.slug}/members`}
                className="text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                View all
              </Link>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {members.slice(0, 6).map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-4 rounded-lg border border-gray-100 p-4 transition-colors hover:border-gray-200"
                >
                  {member.user?.image ? (
                    <Image
                      src={member.user.image}
                      alt={member.user.name || "Member"}
                      width={48}
                      height={48}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                      <Users className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 overflow-hidden">
                    <div className="truncate font-medium text-gray-900">
                      {member.user?.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      Level {member.level} · {member.points} pts
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center sm:px-8">
          <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Sparkles className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="mb-4 text-3xl font-semibold text-gray-900">
            Join the community
          </h2>
          <p className="mb-8 text-lg text-gray-600">
            Connect with like-minded people and grow together
          </p>
          <Link
            href={`/dashboard/c/${community.slug}/join`}
            className="inline-flex items-center gap-2 rounded-lg px-6 py-3 font-medium text-white transition-all hover:opacity-90"
            style={{ backgroundColor: accentColor }}
          >
            Get started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
