import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { WelcomeMessageEditor } from "@/components/community/settings/WelcomeMessageEditor";

export default async function WelcomeMessageSettingsPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Get community
  const community = await prisma.community.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      welcomeMessage: true,
      showWelcomeMessage: true,
      ownerId: true,
    },
  });

  if (!community) {
    redirect("/dashboard/communities");
  }

  // Check if user is owner
  const isOwner = community.ownerId === session.user.id;

  if (!isOwner) {
    redirect(`/${locale}/dashboard/communities/${slug}`);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome Message</h1>
        <p className="mt-2 text-muted-foreground">
          Customize the welcome message that new members see when they join your community
        </p>
      </div>

      {/* Editor */}
      <WelcomeMessageEditor
        communitySlug={community.slug}
        initialMessage={community.welcomeMessage || ""}
        initialEnabled={community.showWelcomeMessage}
      />
    </div>
  );
}