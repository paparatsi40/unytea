import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { joinCommunity } from "@/app/actions/communities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar } from "lucide-react";

function formatHostName(owner: {
  name: string | null;
  firstName: string | null;
  lastName: string | null;
}) {
  const fullName = [owner.firstName, owner.lastName].filter(Boolean).join(" ").trim();
  return fullName || owner.name || "Unytea Host";
}

function formatSchedule(date: Date | null) {
  if (!date) return "No upcoming session announced";
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function CommunityPublicPreviewPage({
  params,
}: {
  params: { locale: string; slug: string };
}) {
  const { slug, locale } = params;

  const community = await prisma.community.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      isPaid: true,
      owner: {
        select: {
          name: true,
          firstName: true,
          lastName: true,
        },
      },
      _count: {
        select: {
          members: true,
        },
      },
      sessions: {
        where: {
          status: "SCHEDULED",
          scheduledAt: { gt: new Date() },
        },
        orderBy: { scheduledAt: "asc" },
        take: 1,
        select: {
          id: true,
          title: true,
          scheduledAt: true,
        },
      },
      posts: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          author: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!community) {
    notFound();
  }

  const currentCommunity = community;
  const session = await auth();
  const userId = session?.user?.id;
  let membershipStatus: "ACTIVE" | "PENDING" | null = null;

  if (userId) {
    const membership = await prisma.member.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId: currentCommunity.id,
        },
      },
      select: {
        status: true,
      },
    });

    if (membership?.status === "ACTIVE") membershipStatus = "ACTIVE";
    if (membership?.status === "PENDING") membershipStatus = "PENDING";
  }

  async function handleJoin() {
    "use server";

    const joiner = await auth();
    if (!joiner?.user?.id) {
      redirect(`/auth/signin?callbackUrl=/${locale}/community/${slug}`);
    }

    const result = await joinCommunity(currentCommunity.id);
    if (result.success) {
      redirect(`/dashboard/c/${currentCommunity.slug}`);
    }

    redirect(`/${locale}/community/${currentCommunity.slug}`);
  }

  const nextSession = currentCommunity.sessions[0] ?? null;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-8 space-y-3">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">{currentCommunity.name}</h1>
            <Badge variant="outline">{currentCommunity.isPaid ? "Paid" : "Free"}</Badge>
          </div>
          <p className="text-muted-foreground">
            {currentCommunity.description || "Community preview page"}
          </p>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Host</p>
            <p className="mt-1 font-medium text-foreground">{formatHostName(currentCommunity.owner)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Members</p>
            <p className="mt-1 flex items-center gap-2 font-medium text-foreground">
              <Users className="h-4 w-4" />
              {currentCommunity._count.members}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Next session</p>
            <p className="mt-1 flex items-center gap-2 font-medium text-foreground">
              <Calendar className="h-4 w-4" />
              {formatSchedule(nextSession?.scheduledAt ?? null)}
            </p>
            {nextSession && <p className="mt-1 text-xs text-muted-foreground">{nextSession.title}</p>}
          </div>
        </div>

        <section className="mb-8 rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold text-foreground">Discussion preview</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Public teaser only. Full feed and recordings unlock after joining.
          </p>

          <div className="mt-4 space-y-3">
            {currentCommunity.posts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No public discussion preview yet.</p>
            ) : (
              currentCommunity.posts.map((post) => (
                <div key={post.id} className="rounded-lg border border-border p-3">
                  <p className="font-medium text-foreground">
                    {post.title || post.content.slice(0, 80) || "Untitled discussion"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    by {post.author.name || "Member"}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-primary/30 bg-primary/5 p-5">
          <h2 className="text-lg font-semibold text-foreground">Join this community</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Access full feed, recordings, and member-only discussions.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            {membershipStatus === "ACTIVE" ? (
              <Link href={`/dashboard/c/${currentCommunity.slug}`}>
                <Button>Go to community</Button>
              </Link>
            ) : membershipStatus === "PENDING" ? (
              <Button disabled>Request pending approval</Button>
            ) : userId ? (
              <form action={handleJoin}>
                <Button type="submit">Join now</Button>
              </form>
            ) : (
              <Link href={`/auth/signin?callbackUrl=/${locale}/community/${currentCommunity.slug}`}>
                <Button>Sign in to join</Button>
              </Link>
            )}
            <Link href={`/${locale}/explore`}>
              <Button variant="outline">Back to explore</Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
