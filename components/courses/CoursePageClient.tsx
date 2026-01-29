"use client";

import { useState } from "react";
import Link from "next/link";
import { EnrollButton } from "./EnrollButton";
import { CourseContent } from "./CourseContent";
import {
  BookOpen,
  Users,
  Award,
  PlayCircle,
  CheckCircle2,
  Star,
  TrendingUp,
  BarChart,
  Sparkles,
  MessageSquare,
} from "lucide-react";

interface CoursePageClientProps {
  course: any;
  hasAccess: boolean;
  isOwner: boolean;
  enrollment: any;
  whatYouWillLearn: string[];
  locale?: string;
  testimonials: any[];
  previewVideoUrl?: string | null;
  upgradeCourse?: any;
  moduleCount: number;
  lessonCount: number;
}

export function CoursePageClient({
  course,
  hasAccess,
  isOwner,
  enrollment,
  whatYouWillLearn,
  testimonials,
  previewVideoUrl,
  upgradeCourse,
  moduleCount,
  lessonCount,
  locale = "en",
}: CoursePageClientProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "curriculum" | "reviews">("overview");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Draft Preview Banner */}
      {isOwner && !course.isPublished && (
        <div className="bg-amber-500 text-white py-3 px-4">
          <div className="container mx-auto flex items-center justify-between">
            <span className="font-medium">
              📝 DRAFT PREVIEW - Only you can see this course
            </span>
            <Link href={`/${locale}/dashboard/courses/${course.id}/edit`}>
              <button className="px-4 py-1 bg-white text-amber-600 rounded-md font-medium hover:bg-amber-50 transition-colors">
                Back to Edit
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* Compact Header Banner */}
      <section
        className={`w-full px-0 py-6 ${
          course.isPaid
            ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-600"
            : "bg-gradient-to-r from-green-400 via-emerald-500 to-green-600"
        } shadow-lg`}
      >
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    course.isPaid
                      ? "bg-yellow-400/30 text-yellow-100"
                      : "bg-white/20 text-white"
                  }`}
                >
                  {course.isPaid ? "PREMIUM" : "FREE"}
                </span>
                {course.tier && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-black/20 text-white uppercase">
                    {course.tier}
                  </span>
                )}
                {course.certificateEnabled && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white">
                    <Award className="h-3 w-3" />
                    Certificate
                  </span>
                )}
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white drop-shadow-lg mb-2">
                {course.title}
              </h1>
              {course.description && (
                <p className="text-white/90 text-sm lg:text-base max-w-3xl">
                  {course.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-white/90">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {course.enrollmentCount} students
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  {lessonCount} lessons
                </span>
                <span className="flex items-center gap-1">
                  <BarChart className="h-4 w-4" />
                  {moduleCount} modules
                </span>
              </div>
            </div>
            <div className="lg:w-auto">
              {course.isPaid && (
                <div className="text-3xl font-bold text-white mb-2">
                  ${course.price}
                </div>
              )}
              {!hasAccess && !isOwner && (
                <EnrollButton
                  courseId={course.id}
                  isPaid={course.isPaid}
                  price={course.price}
                  currency={course.currency || "$"}
                  userOwnsCourse={!!enrollment}
                />
              )}
              {hasAccess && (
                <div className="rounded-lg bg-white/20 backdrop-blur text-white px-5 py-2.5 font-semibold text-sm text-center flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Enrolled
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-6">
        {/* Tabs Navigation */}
        <div className="flex items-center gap-1 mb-6 bg-card/50 backdrop-blur p-1 rounded-lg border border-border w-fit">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "overview"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Overview
          </button>
          {hasAccess && (
            <button
              onClick={() => setActiveTab("curriculum")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "curriculum"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Curriculum
            </button>
          )}
          {testimonials.length > 0 && (
            <button
              onClick={() => setActiveTab("reviews")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "reviews"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Reviews
            </button>
          )}
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <>
                {/* Preview Video */}
                {previewVideoUrl && (
                  <div className="rounded-lg overflow-hidden border border-border shadow-lg bg-card">
                    <video controls className="w-full aspect-video bg-black">
                      <source src={previewVideoUrl} />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                )}

                {/* What You'll Learn */}
                {whatYouWillLearn.length > 0 && (
                  <div className="bg-card border border-border rounded-lg p-5 shadow">
                    <h2 className="font-bold text-xl mb-4 text-foreground flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      What you'll learn
                    </h2>
                    <ul className="grid sm:grid-cols-2 gap-3">
                      {whatYouWillLearn.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <span className="text-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sales Content */}
                {course.salesPageContent && (
                  <div className="bg-card border border-border rounded-lg p-5 shadow">
                    <h2 className="font-bold text-xl mb-4 text-foreground">About this course</h2>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {course.salesPageContent}
                      </p>
                    </div>
                  </div>
                )}

                {/* Progress Card (if enrolled) */}
                {hasAccess && (
                  <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20 rounded-lg p-5 shadow">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-bold text-xl text-foreground flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Your Progress
                      </h2>
                      <span className="text-2xl font-bold text-primary">
                        {enrollment?.progress || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-background/50 rounded-full h-3 mb-3">
                      <div
                        className="bg-gradient-to-r from-primary to-purple-500 h-3 rounded-full transition-all"
                        style={{ width: `${enrollment?.progress || 0}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Keep going! You're making great progress.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Curriculum Tab */}
            {activeTab === "curriculum" && hasAccess && (
              <div className="bg-card border border-border rounded-lg p-5 shadow">
                <CourseContent
                  course={course}
                  hasAccess={hasAccess}
                  isOwner={isOwner}
                  enrollment={enrollment}
                />
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === "reviews" && testimonials.length > 0 && (
              <div className="space-y-4">
                {testimonials.map((testimonial: any, i: number) => (
                  <div key={i} className="bg-card border border-border rounded-lg p-5 shadow">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex">
                        {[...Array(5)].map((_, j) => (
                          <Star
                            key={j}
                            className={`h-4 w-4 ${
                              j < (testimonial.rating || 5)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-foreground italic mb-2">"{testimonial.quote}"</p>
                    <p className="text-sm text-muted-foreground">
                      — {testimonial.author || "Anonymous"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sticky Sidebar */}
          <aside className="space-y-4 lg:sticky lg:top-20 self-start">
            {/* Course Stats */}
            <div className="rounded-lg border border-border bg-card p-4 shadow">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Course Details
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Modules
                  </span>
                  <span className="font-semibold text-foreground">{moduleCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <PlayCircle className="h-4 w-4" />
                    Lessons
                  </span>
                  <span className="font-semibold text-foreground">{lessonCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Students
                  </span>
                  <span className="font-semibold text-foreground">
                    {course.enrollmentCount}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <BarChart className="h-4 w-4" />
                    Level
                  </span>
                  <span className="font-semibold text-foreground capitalize">
                    {course.tier || "All levels"}
                  </span>
                </div>
                {course.certificateEnabled && (
                  <div className="pt-2 mt-2 border-t border-border">
                    <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                      <Award className="h-4 w-4" />
                      Certificate included
                    </div>
                  </div>
                )}
                {course.liveSupportEnabled && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                    <MessageSquare className="h-4 w-4" />
                    Live Q&A support
                  </div>
                )}
              </div>
            </div>

            {/* Upsell Card */}
            {hasAccess && upgradeCourse && course.tier === "intro" && (
              <div className="rounded-lg border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 p-4 shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-yellow-600" />
                  <span className="font-bold text-foreground">Ready for more?</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Upgrade to <strong>{upgradeCourse.title}</strong> for advanced content and
                  certification!
                </p>
                <Link
                  href={`/dashboard/courses/${upgradeCourse.id}`}
                  className="block w-full text-center bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-2 px-4 rounded-lg transition-all shadow hover:shadow-lg text-sm"
                >
                  Upgrade Now →
                </Link>
              </div>
            )}

            {/* Quick Actions */}
            {hasAccess && (
              <div className="rounded-lg border border-border bg-card p-4 shadow">
                <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setActiveTab("curriculum")}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent transition-colors text-sm flex items-center gap-2 text-foreground"
                  >
                    <PlayCircle className="h-4 w-4 text-primary" />
                    Continue Learning
                  </button>
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent transition-colors text-sm flex items-center gap-2 text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    Ask a Question
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
