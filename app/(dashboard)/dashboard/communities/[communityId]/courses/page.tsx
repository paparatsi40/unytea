import { auth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";

export default async function CommunityCoursesPage({
  params,
}: {
  params: { communityId: string };
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const supabase = createClient();
  const { data: community } = await supabase
    .from("communities")
    .select("*")
    .eq("id", params.communityId)
    .single();

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

      <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border-2 border-dashed border-border bg-muted/20">
        <div className="rounded-full bg-primary/10 p-6 mb-6">
          <BookOpen className="h-12 w-12 text-primary" />
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-2">
          Courses Coming Soon
        </h3>
        <p className="text-muted-foreground max-w-md">
          Create and sell courses exclusive to this community. Modules, lessons, and progress tracking.
        </p>
      </div>
    </div>
  );
}
