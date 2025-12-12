import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BookOpen, GraduationCap } from "lucide-react";

export default async function CommunityCoursesPage({
  params,
}: {
  params: { communityId: string };
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const community = await prisma.community.findUnique({
    where: { id: params.communityId },
  });

  if (!community) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {community.name} - Courses
        </h1>
        <p className="mt-2 text-muted-foreground">
          Educational content for your community
        </p>
      </div>

      <div className="rounded-xl border border-border bg-gradient-to-br from-purple-500/5 to-blue-500/5 p-12 text-center">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-purple-500/10 p-4">
              <GraduationCap className="h-12 w-12 text-purple-500" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Courses Coming Soon
          </h2>
          
          <p className="text-muted-foreground mb-8 text-lg">
            Create and sell courses exclusive to your community members.
          </p>

          <div className="grid gap-3 text-left max-w-sm mx-auto">
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-purple-500"></div>
              <span className="text-foreground">Video lessons & modules</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-purple-500"></div>
              <span className="text-foreground">Progress tracking</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-purple-500"></div>
              <span className="text-foreground">Assignments & quizzes</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-purple-500"></div>
              <span className="text-foreground">Certificates</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
