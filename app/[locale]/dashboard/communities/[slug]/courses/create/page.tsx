import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CreateCourseForm } from "@/components/courses/CreateCourseForm";
import { BookOpen, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function CreateCoursePage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Fetch community and verify ownership
  const community = await prisma.community.findFirst({
    where: {
      slug: slug,
    },
  });

  if (!community) {
    redirect(`/${locale}/dashboard/communities`);
  }

  // Check if user is the owner
  if (community.ownerId !== session.user.id) {
    redirect(`/${locale}/dashboard/communities/${slug}/courses`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container max-w-4xl py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/dashboard/communities/${slug}/courses`}
            className="rounded-xl p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-3">
                <BookOpen className="h-7 w-7 text-primary" />
              </div>
              Create New Course
            </h1>
            <p className="text-muted-foreground mt-1">
              Share your knowledge with your community
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-3xl border border-border/50 bg-card/50 backdrop-blur-xl shadow-xl p-8">
          <CreateCourseForm communityId={community.id} slug={slug} locale={locale} />
        </div>
      </div>
    </div>
  );
}
