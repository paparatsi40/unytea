import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  // Fetch community data
  const community = await prisma.community.findUnique({
    where: { id: params.communityId },
  });

  if (!community) {
    redirect("/dashboard");
  }

  // Check if user is owner
  const isOwner = community.ownerId === session.user.id;

  // Check if user is member (if not owner)
  if (!isOwner) {
    const membership = await prisma.member.findFirst({
      where: {
        communityId: params.communityId,
        userId: session.user.id,
      },
    });

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
