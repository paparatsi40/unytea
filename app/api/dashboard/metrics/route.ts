import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

    // Get communities count
    const communities = await prisma.community.count({
      where: { ownerId: userId },
    });

    // Get total members across all user's communities
    const memberships = await prisma.member.findMany({
      where: {
        community: {
          ownerId: userId,
        },
        status: "ACTIVE",
      },
      select: {
        userId: true,
      },
      distinct: ["userId"],
    });
    const members = memberships.length;

    // Get revenue from community memberships (simplified)
    // Look for subscriptions to communities owned by this user
    const communityPlans = await prisma.subscriptionPlan.findMany({
      where: {
        community: {
          ownerId: userId,
        },
      },
      select: {
        id: true,
        price: true,
      },
    });

    const planIds = communityPlans.map(p => p.id);
    
    const subscriptions = await prisma.subscription.findMany({
      where: {
        planId: {
          in: planIds,
        },
        status: "ACTIVE",
      },
      select: {
        planId: true,
      },
    });

    const revenue = subscriptions.reduce((total, sub) => {
      const plan = communityPlans.find(p => p.id === sub.planId);
      return total + (plan?.price || 0);
    }, 0);

    // Calculate engagement rate (posts + comments in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentPosts = await prisma.post.count({
      where: {
        community: {
          ownerId: userId,
        },
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    const recentComments = await prisma.comment.count({
      where: {
        post: {
          community: {
            ownerId: userId,
          },
        },
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Calculate engagement as percentage (posts + comments / members * 10)
    const engagement = members > 0 
      ? Math.min(Math.round(((recentPosts + recentComments) / members) * 10), 100)
      : 0;

    return NextResponse.json({
      communities,
      members,
      revenue: Math.round(revenue),
      engagement,
    });
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
