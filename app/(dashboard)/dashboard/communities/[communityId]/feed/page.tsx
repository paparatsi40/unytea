import { auth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Home } from "lucide-react";

export default async function CommunityFeedPage({
  params,
}: {
  params: { communityId: string };
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const supabase = createClient();

  // Fetch community
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {community.name} - Feed
        </h1>
        <p className="mt-2 text-muted-foreground">
          {community.description || "Welcome to your community feed"}
        </p>
      </div>

      {/* Placeholder Content */}
      <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border-2 border-dashed border-border bg-muted/20">
        <div className="rounded-full bg-primary/10 p-6 mb-6">
          <Home className="h-12 w-12 text-primary" />
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-2">
          Feed Coming Soon
        </h3>
        <p className="text-muted-foreground max-w-md">
          The community feed feature is currently being built. Here you'll see posts, discussions, and updates from your community members.
        </p>
      </div>
    </div>
  );
}
