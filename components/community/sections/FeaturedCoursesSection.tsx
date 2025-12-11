"use client";

import { BookOpen, Clock, Users, Star, PlayCircle } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface Course {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  instructor?: {
    name: string;
    image?: string;
  };
  duration?: string;
  lessonsCount?: number;
  studentsCount?: number;
  rating?: number;
  price?: number;
  level?: "Beginner" | "Intermediate" | "Advanced";
}

interface FeaturedCoursesSectionProps {
  title?: string;
  courses: Course[];
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };
}

export function FeaturedCoursesSection({
  title = "Featured Courses",
  courses,
  theme,
}: FeaturedCoursesSectionProps) {
  const primaryColor = theme?.primaryColor || "#0ea5e9";

  if (courses.length === 0) {
    return null;
  }

  const getLevelColor = (level?: string) => {
    switch (level) {
      case "Beginner":
        return "bg-green-100 text-green-700";
      case "Intermediate":
        return "bg-yellow-100 text-yellow-700";
      case "Advanced":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 
          className="text-2xl font-bold"
          style={{ color: primaryColor }}
        >
          {title}
        </h2>
        <a 
          href="#" 
          className="text-sm hover:underline"
          style={{ color: primaryColor }}
        >
          View all courses →
        </a>
      </div>

      {/* Courses Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.slice(0, 6).map((course) => (
          <article
            key={course.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer"
          >
            {/* Course Image */}
            <div className="relative h-48 bg-gradient-to-br from-sky-100 to-purple-100">
              {course.imageUrl ? (
                <Image
                  src={course.imageUrl}
                  alt={course.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <BookOpen className="h-16 w-16 text-sky-500 opacity-50" />
                </div>
              )}

              {/* Play Icon Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20">
                <PlayCircle className="h-16 w-16 text-white" />
              </div>

              {/* Level Badge */}
              {course.level && (
                <div className="absolute top-3 left-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getLevelColor(course.level)}`}>
                    {course.level}
                  </span>
                </div>
              )}

              {/* Price Badge */}
              {course.price !== undefined && (
                <div 
                  className="absolute top-3 right-3 px-3 py-1 rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  {course.price === 0 ? "FREE" : `$${course.price}`}
                </div>
              )}
            </div>

            {/* Course Info */}
            <div className="p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2">
                {course.title}
              </h3>

              {course.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {course.description}
                </p>
              )}

              {/* Course Stats */}
              <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-4">
                {course.lessonsCount && (
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    <span>{course.lessonsCount} lessons</span>
                  </div>
                )}
                
                {course.duration && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{course.duration}</span>
                  </div>
                )}

                {course.studentsCount && (
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{course.studentsCount} students</span>
                  </div>
                )}

                {course.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current text-yellow-400" />
                    <span>{course.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>

              {/* Instructor */}
              {course.instructor && (
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
                  {course.instructor.image ? (
                    <Image
                      src={course.instructor.image}
                      alt={course.instructor.name}
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-gray-200" />
                  )}
                  <span className="text-xs text-gray-600">
                    {course.instructor.name}
                  </span>
                </div>
              )}

              {/* CTA */}
              <Button
                size="sm"
                className="w-full"
                style={{ backgroundColor: primaryColor }}
              >
                Enroll Now
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}