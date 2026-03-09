import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

/**
 * Server-side: Require authentication and redirect if not authenticated
 * Use in Server Components and Server Actions
 */
export async function requireAuth() {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/auth/signin")
  }
  
  return session
}

/**
 * Server-side: Get current user or null
 * Use in Server Components and Server Actions
 */
export async function getCurrentUser() {
  const session = await auth()
  return session?.user ?? null
}

/**
 * Server-side: Get current user ID or null
 */
export async function getCurrentUserId() {
  const session = await auth()
  return session?.user?.id ?? null
}

/**
 * Server-side: Check if user is authenticated
 */
export async function isAuthenticated() {
  const session = await auth()
  return !!session?.user
}

/**
 * Server-side: Get full user data from database
 */
export async function getFullUser() {
  const session = await auth()
  
  if (!session?.user?.id) {
    return null
  }
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      memberships: {
        include: {
          community: true,
        },
      },
      ownedCommunities: true,
    },
  })
  
  return user
}

/**
 * Server-side: Require onboarded user
 */
export async function requireOnboarded() {
  const session = await requireAuth()
  
  if (!session.user.isOnboarded) {
    redirect("/onboarding")
  }
  
  return session
}

/**
 * Server-side: Check if user has an active subscription
 */
export async function hasActiveSubscription(userId?: string | null) {
  if (!userId) {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) return false;
    userId = currentUserId;
  }

  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: userId,
      status: {
        in: ["ACTIVE", "TRIALING"],
      },
      currentPeriodEnd: {
        gt: new Date(), // Not expired
      },
    },
  });

  return !!subscription;
}

/**
 * Server-side: Get user's subscription with plan details
 */
export async function getUserSubscription(userId?: string | null) {
  if (!userId) {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) return null;
    userId = currentUserId;
  }

  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: userId,
    },
    include: {
      plan: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return subscription;
}

/**
 * Server-side: Check if user can create more communities based on plan
 */
export async function canCreateCommunity(userId?: string | null) {
  if (!userId) {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) return false;
    userId = currentUserId;
  }

  // Count user's owned communities
  const ownedCommunities = await prisma.community.count({
    where: {
      ownerId: userId,
    },
  });

  // Get user's subscription
  const subscription = await getUserSubscription(userId);
  
  if (!subscription || subscription.status !== "ACTIVE") {
    // Free plan: max 1 community
    return ownedCommunities < 1;
  }

  // Check plan limits
  const planName = subscription.plan.name.toLowerCase();
  
  if (planName.includes("starter")) {
    return ownedCommunities < 1;
  } else if (planName.includes("pro")) {
    return ownedCommunities < 1;
  } else if (planName.includes("business")) {
    return ownedCommunities < 3;
  }

  return false;
}
export async function isMemberOfCommunity(communityId: string) {
  const userId = await getCurrentUserId()
  
  if (!userId) {
    return false
  }
  
  const member = await prisma.member.findUnique({
    where: {
      userId_communityId: {
        userId,
        communityId,
      },
    },
  })
  
  return !!member
}

/**
 * Check if user is owner of a community
 */
export async function isOwnerOfCommunity(communityId: string) {
  const userId = await getCurrentUserId()
  
  if (!userId) {
    return false
  }
  
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { ownerId: true },
  })
  
  return community?.ownerId === userId
}

/**
 * Get user's role in a community
 */
export async function getUserRoleInCommunity(communityId: string) {
  const userId = await getCurrentUserId()
  
  if (!userId) {
    return null
  }
  
  const member = await prisma.member.findUnique({
    where: {
      userId_communityId: {
        userId,
        communityId,
      },
    },
    select: { role: true },
  })
  
  return member?.role ?? null
}
