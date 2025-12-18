"use client";

import { BookOpen, Users, CheckCircle2, Award, Zap, Sparkles } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface CourseCardProps {
  course: any;
  progress?: number;
  completed?: boolean;
}

export function CourseCard({ course, progress = 0, completed = false }: CourseCardProps) {
  const isPaid = course.isPaid;
  const tier = course.tier || "standard";
  const hasCertificate = course.certificateEnabled;

  return (
    <Link
      href={`/dashboard/courses/${course.id}`}
      className="group relative overflow-hidden rounded-2xl border-2 border-border/50 bg-card transition-all hover:scale-[1.02] hover:border-primary/50 hover:shadow-2xl"
    >
      {/* Premium Ribbon/Badge */}
      <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
        {isPaid ? (
          <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-500 to-blue-600 px-3 py-1 text-xs font-bold text-white shadow-lg">
            <Zap className="h-3 w-3" />
            PREMIUM
          </div>
        ) : (
          <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-green-400 to-green-600 px-3 py-1 text-xs font-bold text-white shadow-lg">
            <Sparkles className="h-3 w-3" />
            FREE
          </div>
        )}
        {tier === "intro" && (
          <div className="rounded-full bg-purple-500/90 px-2 py-0.5 text-xs font-semibold text-white">
            Intro
          </div>
        )}
        {tier === "advanced" && (
          <div className="rounded-full bg-orange-500/90 px-2 py-0.5 text-xs font-semibold text-white">
            Advanced
          </div>
        )}
        {hasCertificate && (
          <div className="flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-amber-900">
            <Award className="h-3 w-3" />
            Certificate
          </div>
        )}
      </div>

      {/* Price Badge (if paid) */}
      {isPaid && course.price && (
        <div className="absolute right-4 top-4 z-10 rounded-xl bg-white/95 px-3 py-1.5 font-bold text-indigo-600 shadow-lg backdrop-blur">
          <span className="text-xs">$</span>
          <span className="text-lg">{course.price}</span>
        </div>
      )}

      {/* Image */}
      {course.imageUrl ? (
        <div className="relative h-48 w-full overflow-hidden bg-muted">
          <Image
            src={course.imageUrl}
            alt={course.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        </div>
      ) : (
        <div
          className={`flex h-48 items-center justify-center ${
            isPaid
              ? "bg-gradient-to-br from-indigo-500/20 to-purple-500/20"
              : "bg-gradient-to-br from-green-400/20 to-emerald-500/20"
          }`}
        >
          <BookOpen className={`h-16 w-16 ${isPaid ? "text-indigo-500" : "text-green-500"}`} />
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {/* Title */}
        <h3 className="mb-2 line-clamp-2 text-xl font-bold text-foreground transition-colors group-hover:text-primary">
          {course.title}
        </h3>

        {/* Description */}
        {course.description && (
          <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
            {course.description}
          </p>
        )}

        {/* Stats */}
        <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
          {course._count?.modules > 0 && (
            <div className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              <span>{course._count.modules} modules</span>
            </div>
          )}
          {course.enrollmentCount !== undefined && course.enrollmentCount > 0 && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{course.enrollmentCount} students</span>
            </div>
          )}
        </div>

        {/* Progress Bar (if enrolled) */}
        {progress > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold text-foreground">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full transition-all ${
                  completed
                    ? "bg-gradient-to-r from-green-500 to-green-600"
                    : "bg-gradient-to-r from-primary to-primary/80"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Completed Badge */}
        {completed && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            <span>Completed</span>
          </div>
        )}

        {/* CTA hint */}
        {!progress && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              {isPaid ? "Buy to access" : "Start learning free"}
            </span>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                isPaid ? "bg-indigo-100 text-indigo-600" : "bg-green-100 text-green-600"
              } transition-transform group-hover:translate-x-1`}
            >
              →
            </div>
          </div>
        )}
      </div>

      {/* Hover Glow Effect */}
      <div
        className={`absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${
          isPaid
            ? "bg-gradient-to-br from-indigo-500/5 to-blue-500/5"
            : "bg-gradient-to-br from-green-400/5 to-emerald-500/5"
        }`}
      />
    </Link>
  );
}