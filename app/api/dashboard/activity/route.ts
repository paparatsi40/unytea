import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get recent members joined
    const recentMembers = await prisma.member.findMany({
      where: {
        community: {
          ownerId: userId,
        },
        status: "ACTIVE",
      },
      orderBy: {
        joinedAt: "desc",
      },
      take: 3,
      include: {
        user: {
          select: {
            name: true,
          },
        },
        community: {
          select: {
            name: true,
          },
        },
      },
    });

    // Get recent posts
    const recentPosts = await prisma.post.findMany({
      where: {
        community: {
          ownerId: userId,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 3,
      include: {
        author: {
          select: {
            name: true,
          },
        },
        community: {
          select: {
            name: true,
          },
        },
      },
    });

    // Get recent course completions (enrollments with completedAt)
    const recentCompletions = await prisma.enrollment.findMany({
      where: {
        course: {
          community: {
            ownerId: userId,
          },
        },
        completedAt: {
          not: null,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 2,
      include: {
        course: {
          select: {
            title: true,
          },
        },
      },
    });

    // Get user names for completions
    const userIds = recentCompletions.map(c => c.userId);
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });
    const userMap = new Map(users.map(u => [u.id, u.name]));

    // Combine and format activities
    const activities = [
      ...recentMembers.map((member) => ({
        id: `member-${member.id}`,
        type: "member_joined" as const,
        description: `${member.user.name} joined ${member.community.name}`,
        time: formatTime(member.joinedAt),
      })),
      ...recentPosts.map((post) => ({
        id: `post-${post.id}`,
        type: "post_created" as const,
        description: `${post.author.name} posted in ${post.community.name}`,
        time: formatTime(post.createdAt),
      })),
      ...recentCompletions.map((enrollment) => ({
        id: `course-${enrollment.id}`,
        type: "course_completed" as const,
        description: `${userMap.get(enrollment.userId) || "Someone"} completed ${enrollment.course.title}`,
        time: formatTime(enrollment.updatedAt),
      })),
    ].sort((a, b) => {
      // Sort by time (most recent first)
      return new Date(b.time).getTime() - new Date(a.time).getTime();
    }).slice(0, 5);

    return NextResponse.json({ activities });
  } catch (error) {
    console.error("Error fetching dashboard activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}
