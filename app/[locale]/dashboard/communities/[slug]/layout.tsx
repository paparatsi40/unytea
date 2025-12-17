import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CommunitySidebar } from "@/components/community/CommunitySidebar";

async function getCommunity(slug: string, userId: string) {
  const community = await prisma.community.findUnique({
    where: { slug: slug },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  if (!community) return null;

  // Check if user is a member
  const membership = await prisma.member.findFirst({
    where: {
      communityId: community.id,
      userId: userId,
    },
  });

  return { community, membership };
}

export default async function CommunityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string; locale: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const { slug, locale } = await params;
  const data = await getCommunity(slug, session.user.id);

  if (!data) {
    notFound();
  }

  const { community, membership } = data;
  const isOwner = community.ownerId === session.user.id;
  const isMember = !!membership;

  // For non-members and non-owners, show simple layout (no sidebar) to display preview page
  if (!isMember && !isOwner) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto py-8">
          {children}
        </main>
      </div>
    );
  }

  // For members and owners, show full layout with sidebar
  return (
    <div className="flex min-h-screen bg-background">
      <CommunitySidebar
        communityId={community.id}
        slug={community.slug}
        userId={session.user.id}
        isOwner={isOwner}
        locale={locale}
      />
      <main className="ml-64 flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
