import { NextRequest, NextResponse } from "next/server";
import { sendSessionReminders } from "@/app/actions/session-jobs";
import { verifyCronAuth } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  try {
    const results = await sendSessionReminders();
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error in cron reminders job:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
