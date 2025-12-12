import { auth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";

export default async function CommunitySettingsPage({
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

  // Check if user is owner
  if (community.ownerId !== session.user.id) {
    redirect(`/dashboard/communities/${params.communityId}/feed`);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {community.name} - Settings
        </h1>
        <p className="mt-2 text-muted-foreground">
          Manage your community settings
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border-2 border-dashed border-border bg-muted/20">
        <div className="rounded-full bg-primary/10 p-6 mb-6">
          <Settings className="h-12 w-12 text-primary" />
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-2">
          Settings Coming Soon
        </h3>
        <p className="text-muted-foreground max-w-md">
          Configure community name, description, privacy settings, branding, and more.
        </p>
      </div>
    </div>
  );
}
