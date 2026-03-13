import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export default async function CommunitySessionsRedirect({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const { slug } = await params;

  // Find community by slug to get the ID
  const community = await prisma.community.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!community) {
    notFound();
  }

  // Redirect to the ID-based route
  redirect(`/dashboard/communities/${community.id}/sessions`);
}
