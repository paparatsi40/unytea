"use client";

import { BookOpen, Clock, Users, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface CourseCardProps {
  course: any;
  progress?: number;
  completed?: boolean;
}

export function CourseCard({ course, progress = 0, completed = false }: CourseCardProps) {
  return (
    <Link
      href={`/dashboard/courses/${course.id}`}
      className="group relative overflow-hidden rounded-xl border border-border/50 bg-card transition-all hover:border-border hover:shadow-lg"
    >
      {/* Image */}
      {course.imageUrl ? (
        <div className="relative h-40 w-full overflow-hidden bg-muted">
          <Image
            src={course.imageUrl}
            alt={course.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
          <BookOpen className="h-12 w-12 text-indigo-500" />
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {/* Title */}
        <h3 className="mb-2 line-clamp-2 text-lg font-bold text-foreground group-hover:text-primary">
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
          {course.enrollmentCount > 0 && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{course.enrollmentCount}</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
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
          <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-green-500">
            <CheckCircle2 className="h-4 w-4" />
            <span>Completed</span>
          </div>
        )}

        {/* Price Badge */}
        {course.isPaid && (
          <div className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground">
            ${course.price}
          </div>
        )}
      </div>
    </Link>
  );
}