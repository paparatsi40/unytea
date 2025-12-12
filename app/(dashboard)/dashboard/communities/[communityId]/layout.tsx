import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CommunitySidebar } from "@/components/community/CommunitySidebar";

export default async function CommunityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { communityId: string };
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const supabase = createClient();

  // Fetch community data
  const { data: community, error } = await supabase
    .from("communities")
    .select("*")
    .eq("id", params.communityId)
    .single();

  if (error || !community) {
    redirect("/dashboard");
  }

  // Check if user is owner
  const isOwner = community.ownerId === session.user.id;

  // Check if user is member (if not owner)
  if (!isOwner) {
    const { data: membership } = await supabase
      .from("community_members")
      .select("*")
      .eq("communityId", params.communityId)
      .eq("userId", session.user.id)
      .single();

    if (!membership) {
      // User is not a member, redirect to dashboard
      redirect("/dashboard");
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <CommunitySidebar
        communityId={params.communityId}
        userId={session.user.id}
        isOwner={isOwner}
      />
      <main className="ml-64 flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
