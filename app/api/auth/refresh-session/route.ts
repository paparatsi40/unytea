import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // The session will be refreshed automatically in the next request
    // because we added the appRole fetch in the JWT callback
    return NextResponse.json({
      success: true,
      message: "Session refreshed. Please reload the page.",
      user: session.user,
    });
  } catch (error: any) {
    console.error("Error refreshing session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to refresh session" },
      { status: 500 }
    );
  }
}
