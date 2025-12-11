import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin, isAdmin } from "@/lib/admin-utils";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if current user is admin
    const currentUserIsAdmin = await isAdmin(session.user.id);

    if (!currentUserIsAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { error: "User ID and role are required" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ["SUPER_ADMIN", "ADMIN", "MODERATOR", "USER"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // Only SUPER_ADMIN can create other SUPER_ADMINs
    if (role === "SUPER_ADMIN") {
      const currentUserIsSuperAdmin = await isSuperAdmin(session.user.id);
      
      if (!currentUserIsSuperAdmin) {
        return NextResponse.json(
          { error: "Only Super Admins can promote users to Super Admin" },
          { status: 403 }
        );
      }
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        appRole: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Don't allow users to demote themselves
    if (userId === session.user.id && role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 403 }
      );
    }

    // Update role
    await prisma.user.update({
      where: { id: userId },
      data: { appRole: role },
    });

    return NextResponse.json({
      success: true,
      message: `User role updated to ${role}`,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        previousRole: targetUser.appRole || "USER",
        newRole: role,
      },
    });
  } catch (error: any) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
