import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      emailNotifications,
      pushNotifications,
      sessionReminders,
      sessionStarted,
      newPostNotifications,
      newMemberNotifications,
      newMessageNotifications,
    } = body;

    // Update user preferences
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        emailNotifications,
        pushNotifications,
        sessionReminders,
        sessionStarted,
        newPostNotifications,
        newMemberNotifications,
        newMessageNotifications,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}