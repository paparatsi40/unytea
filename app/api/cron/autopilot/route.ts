import { NextRequest, NextResponse } from "next/server";
import { runAutopilotDueJobs } from "@/app/actions/autopilot";

export async function GET(request: NextRequest) {
  try {
    const cronSecret = request.headers.get("x-cron-secret") || request.nextUrl.searchParams.get("secret");
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
