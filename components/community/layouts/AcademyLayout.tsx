"use client";

import { BookOpen, Users, Award, Star, PlayCircle, TrendingUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

interface AcademyLayoutProps {
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
    _count?: {
      members: number;
      posts: number;
      courses: number;
    };
  };
  courses?: any[];
  instructors?: any[];
}

export function AcademyLayout({
  community,
  courses = [],
  instructors = [],
}: AcademyLayoutProps) {
  const primaryColor = community.primaryColor || "#8B5CF6";
  const secondaryColor = community.secondaryColor || "#EC4899";
  const accentColor = community.accentColor || "#F59E0B";

  const featuredCourses = courses.filter(c => c.isPublished).slice(0, 6);
  const topInstructors = instructors.slice(0, 4);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section - Educational Focus */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        {community.coverImageUrl && (
          <div className="absolute inset-0 opacity-10">
            <Image
              src={community.coverImageUrl}
              alt={community.name}
              fill
              className="object-cover"
            />
          </div>
        )}

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Community Logo */}
            {community.imageUrl && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" }}
                className="mx-auto mb-6 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl shadow-xl ring-4 ring-white"
              >
                <Image
                  src={community.imageUrl}
                  alt={community.name}
                  width={80}
                  height={80}
                  className="object-cover"
                />
              </motion.div>
            )}

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 text-4xl font-bold text-gray-900 sm:text-5xl"
            >
              {community.heroTitle || community.name}
            </motion.h1>

            {/* Subtitle */}
            {(community.heroSubtitle || community.description) && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mx-auto mb-8 max-w-2xl text-lg text-gray-600"
              >
                {community.heroSubtitle || community.description}
              </motion.p>
            )}

            {/* CTA */}
            {community.heroCTA && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Link
                  href={community.heroCTALink || `/dashboard/c/${community.slug}/courses`}
                  className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:scale-105"
                  style={{ backgroundColor: primaryColor }}
                >
                  <BookOpen className="h-5 w-5" />
                  {community.heroCTA}
                </Link>
              </motion.div>
            )}

            {/* Stats */}
            {community.showStats && community._count && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-12 grid grid-cols-3 gap-8"
              >
                <div className="rounded-2xl bg-white/80 p-6 shadow-lg backdrop-blur">
                  <BookOpen className="mx-auto mb-2 h-8 w-8" style={{ color: primaryColor }} />
                  <div className="text-3xl font-bold text-gray-900">
                    {community._count.courses}
                  </div>
                  <div className="text-sm text-gray-600">Courses</div>
                </div>
                <div className="rounded-2xl bg-white/80 p-6 shadow-lg backdrop-blur">
                  <Users className="mx-auto mb-2 h-8 w-8" style={{ color: secondaryColor }} />
                  <div className="text-3xl font-bold text-gray-900">
                    {community._count.members}
                  </div>
                  <div className="text-sm text-gray-600">Students</div>
                </div>
                <div className="rounded-2xl bg-white/80 p-6 shadow-lg backdrop-blur">
                  <Award className="mx-auto mb-2 h-8 w-8" style={{ color: accentColor }} />
                  <div className="text-3xl font-bold text-gray-900">
                    {instructors.length || 5}
                  </div>
                  <div className="text-sm text-gray-600">Instructors</div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* About Section */}
        {community.aboutSection && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 rounded-2xl bg-white p-8 shadow-lg"
          >
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-gray-900">
              <TrendingUp className="h-6 w-6" style={{ color: primaryColor }} />
              About This Academy
            </h2>
            <div
              className="prose max-w-none text-gray-600"
              dangerouslySetInnerHTML={{ __html: community.aboutSection }}
            />
          </motion.div>
        )}

        {/* Featured Courses */}
        <div className="mb-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Featured Courses</h2>
            <Link
              href={`/dashboard/c/${community.slug}/courses`}
              className="text-sm font-medium hover:underline"
              style={{ color: primaryColor }}
            >
              View all courses →
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredCourses.map((course, index) => (
              <CourseCard
                key={course.id}
                course={course}
                communitySlug={community.slug}
                primaryColor={primaryColor}
                accentColor={accentColor}
                index={index}
              />
            ))}
          </div>

          {featuredCourses.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
              <BookOpen className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-gray-600">No courses available yet</p>
            </div>
          )}
        </div>

        {/* Instructors Section */}
        {topInstructors.length > 0 && (
          <div className="mb-12">
            <h2 className="mb-6 text-2xl font-bold text-gray-900">Meet Your Instructors</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {topInstructors.map((instructor, index) => (
                <motion.div
                  key={instructor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="rounded-2xl bg-white p-6 text-center shadow-lg transition-all hover:shadow-xl"
                >
                  {instructor.user?.image && (
                    <Image
                      src={instructor.user.image}
                      alt={instructor.user.name || "Instructor"}
                      width={96}
                      height={96}
                      className="mx-auto mb-4 rounded-full ring-4 ring-gray-100"
                    />
                  )}
                  <h3 className="mb-1 text-lg font-bold text-gray-900">
                    {instructor.user?.name}
                  </h3>
                  <p className="mb-2 text-sm text-gray-500">
                    {instructor.customRole || "Instructor"}
                  </p>
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-gray-600">
                      <BookOpen className="h-4 w-4" />
                      {instructor._count?.courses || 0}
                    </span>
                    <span className="flex items-center gap-1" style={{ color: accentColor }}>
                      <Star className="h-4 w-4 fill-current" />
                      {instructor.level}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Learning Path / Categories */}
        <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-8 text-white shadow-xl">
          <div className="text-center">
            <h2 className="mb-4 text-3xl font-bold">Start Your Learning Journey</h2>
            <p className="mx-auto mb-6 max-w-2xl text-lg opacity-90">
              Join thousands of students mastering new skills and advancing their careers
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href={`/dashboard/c/${community.slug}/courses`}
                className="rounded-full bg-white px-6 py-3 font-semibold text-purple-600 transition-all hover:scale-105"
              >
                Browse All Courses
              </Link>
              <Link
                href={`/dashboard/c/${community.slug}/join`}
                className="rounded-full border-2 border-white px-6 py-3 font-semibold text-white transition-all hover:bg-white hover:text-purple-600"
              >
                Join Community
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Course Card Component
function CourseCard({
  course,
  communitySlug,
  primaryColor,
  accentColor,
  index,
}: {
  course: any;
  communitySlug: string;
  primaryColor: string;
  accentColor: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group overflow-hidden rounded-2xl bg-white shadow-lg transition-all hover:shadow-2xl"
    >
      <Link href={`/dashboard/c/${communitySlug}/courses/${course.slug}`}>
        {/* Course Image */}
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-purple-400 to-pink-400">
          {course.imageUrl ? (
            <Image
              src={course.imageUrl}
              alt={course.title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <BookOpen className="h-16 w-16 text-white opacity-50" />
            </div>
          )}
          {/* Badge */}
          {course.isPaid && (
            <div className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold backdrop-blur">
              ${course.price}
            </div>
          )}
        </div>

        {/* Course Info */}
        <div className="p-6">
          {/* Title */}
          <h3 className="mb-2 text-lg font-bold text-gray-900 group-hover:underline">
            {course.title}
          </h3>

          {/* Description */}
          <p className="mb-4 line-clamp-2 text-sm text-gray-600">
            {course.description || "No description available"}
          </p>

          {/* Meta Info */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-gray-500">
              <Users className="h-4 w-4" />
              <span>{course.enrollmentCount || 0} students</span>
            </div>
            {course._count?.modules > 0 && (
              <div className="flex items-center gap-1 text-gray-500">
                <PlayCircle className="h-4 w-4" />
                <span>{course._count.modules} modules</span>
              </div>
            )}
          </div>

          {/* Progress Bar (if enrolled) */}
          {course.userProgress && (
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-gray-600">Your Progress</span>
                <span className="font-semibold" style={{ color: accentColor }}>
                  {Math.round(course.userProgress)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${course.userProgress}%`,
                    backgroundColor: accentColor,
                  }}
                />
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="mt-4">
            <div
              className="w-full rounded-lg py-2 text-center text-sm font-semibold text-white transition-all group-hover:scale-105"
              style={{ backgroundColor: primaryColor }}
            >
              {course.userProgress ? "Continue Learning" : "Start Learning"}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
