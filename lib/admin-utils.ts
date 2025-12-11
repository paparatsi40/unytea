/**
 * Admin Utilities
 * 
 * Helper functions to check and enforce admin permissions
 */

import { prisma } from "./prisma";
import { auth } from "./auth";

export type AppRole = "SUPER_ADMIN" | "ADMIN" | "MODERATOR" | "USER";

/**
 * Check if user is Super Admin
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { appRole: true },
  });

  return user?.appRole === "SUPER_ADMIN";
}

/**
 * Check if user is Admin (SUPER_ADMIN or ADMIN)
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { appRole: true },
  });

  return user?.appRole === "SUPER_ADMIN" || user?.appRole === "ADMIN";
}

/**
 * Check if user is Moderator or higher
 */
export async function isModerator(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { appRole: true },
  });

  return (
    user?.appRole === "SUPER_ADMIN" ||
    user?.appRole === "ADMIN" ||
    user?.appRole === "MODERATOR"
  );
}

/**
 * Get current user's app role
 */
export async function getCurrentUserRole(): Promise<AppRole | null> {
  const session = await auth();
  
  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { appRole: true },
  });

  return (user?.appRole as AppRole) || "USER";
}

/**
 * Check if current user is admin
 */
export async function currentUserIsAdmin(): Promise<boolean> {
  const session = await auth();
  
  if (!session?.user?.id) {
    return false;
  }

  return await isAdmin(session.user.id);
}

/**
 * Require admin permission (throws error if not admin)
 */
export async function requireAdmin(): Promise<void> {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized - Please sign in");
  }

  const isAdminUser = await isAdmin(session.user.id);
  
  if (!isAdminUser) {
    throw new Error("Forbidden - Admin access required");
  }
}

/**
 * Require super admin permission (throws error if not super admin)
 */
export async function requireSuperAdmin(): Promise<void> {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized - Please sign in");
  }

  const isSuperAdminUser = await isSuperAdmin(session.user.id);
  
  if (!isSuperAdminUser) {
    throw new Error("Forbidden - Super Admin access required");
  }
}

/**
 * Set user as Super Admin (use with caution!)
 */
export async function setSuperAdmin(email: string): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { email },
      data: { appRole: "SUPER_ADMIN" },
    });
    
    console.log(`✅ User ${email} is now a SUPER_ADMIN`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to set Super Admin for ${email}:`, error);
    return false;
  }
}
