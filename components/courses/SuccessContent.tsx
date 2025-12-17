"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles, BookOpen, ArrowRight, Gift, Award } from "lucide-react";

interface SuccessContentProps {
  course: {
    id: string;
    title: string;
    isPaid: boolean;
    certificateEnabled: boolean;
    liveSupportEnabled: boolean;
  };
}

export function SuccessContent({ course }: SuccessContentProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950">
      {/* Confetti effect - Client-side only */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => {
          const left = `${Math.random() * 100}%`;
          const animationDelay = `${Math.random() * 3}s`;
          const animationDuration = `${3 + Math.random() * 2}s`;
          const color = [
            "bg-amber-400",
            "bg-pink-500",
            "bg-violet-600",
            "bg-blue-500",
            "bg-emerald-500",
          ][Math.floor(Math.random() * 5)];
          return (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left,
                top: `-10%`,
                animationDelay,
                animationDuration,
              }}
            >
              <div className={`w-2 h-2 rounded-full ${color}`} />
            </div>
          );
        })}
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16 max-w-3xl">
        {/* Success Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-green-400 rounded-full blur-2xl opacity-30 animate-pulse" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600">
              <CheckCircle2 className="h-12 w-12 text-white" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            🎉 Welcome Aboard!
          </h1>
          <p className="text-xl text-muted-foreground">
            You're now enrolled in
          </p>
          <p className="text-2xl md:text-3xl font-bold text-foreground">
            {course.title}
          </p>
        </div>

        {/* What's Next Card */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg rounded-2xl border border-border/50 p-8 space-y-6 shadow-2xl">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-indigo-500" />
            <h2 className="text-2xl font-semibold">What's Next?</h2>
          </div>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex gap-4 p-4 rounded-lg border border-border/30 bg-background/50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/10">
                <span className="text-lg font-bold text-indigo-500">1</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">Start Learning</h3>
                <p className="text-sm text-muted-foreground">
                  Jump into the course content and begin your learning journey
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4 p-4 rounded-lg border border-border/30 bg-background/50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
                <span className="text-lg font-bold text-purple-500">2</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">Track Your Progress</h3>
                <p className="text-sm text-muted-foreground">
                  Complete lessons to unlock achievements and track your advancement
                </p>
              </div>
            </div>

            {/* Step 3 */}
            {course.certificateEnabled && (
              <div className="flex gap-4 p-4 rounded-lg border border-border/30 bg-background/50">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                  <Award className="h-5 w-5 text-amber-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">Earn Your Certificate</h3>
                  <p className="text-sm text-muted-foreground">
                    Complete all lessons to receive your certificate of completion
                  </p>
                </div>
              </div>
            )}

            {/* Step 4 */}
            {course.liveSupportEnabled && (
              <div className="flex gap-4 p-4 rounded-lg border border-border/30 bg-background/50">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                  <span className="text-lg font-bold text-green-500">💬</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">Get Live Support</h3>
                  <p className="text-sm text-muted-foreground">
                    Join live Q&A sessions and get help from the community
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link href={`/dashboard/courses/${course.id}`} className="flex-1">
              <Button size="lg" className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700">
                <BookOpen className="mr-2 h-5 w-5" />
                Start Learning Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Extra Info */}
        {course.isPaid && (
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              📧 A receipt has been sent to your email
            </p>
          </div>
        )}

        {/* Community CTA */}
        <div className="mt-8 p-6 rounded-xl border-2 border-dashed border-border/50 bg-background/30 backdrop-blur text-center">
          <Gift className="h-8 w-8 text-primary mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-2">
            Loving the course? Share it with friends!
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Help others discover this amazing learning experience
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="outline" size="sm">
              Share on Twitter
            </Button>
            <Button variant="outline" size="sm">
              Share on LinkedIn
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
