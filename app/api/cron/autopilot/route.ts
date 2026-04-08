import { NextRequest, NextResponse } from "next/server";
import { runAutopilotDueJobs } from "@/app/actions/autopilot";

export async function GET(request: NextRequest) {
  try {
    // Only accept secret from headers (never query params for security)
    const cronSecret = request.headers.get("x-cron-secret") ||
      request.headers.get("authorization")?.replace("Bearer ", "");
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret && cronSecret !== expectedSecret) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const result = await runAutopilotDueJobs();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
