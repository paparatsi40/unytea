import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getLocale } from "next-intl/server"

/**
 * Server-side: Require authentication and redirect if not authenticated
 * Use in Server Components and Server Actions
 */
export async function requireAuth() {
  const session = await auth()
  
  if (!session?.user) {
    const locale = await getLocale()
    redirect(`/${locale}/auth/signin`)
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
    const locale = await getLocale()
    redirect(`/${locale}/onboarding`)
  }
  
  return session
}

/**
 * Check if user is member of a community
 */
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
