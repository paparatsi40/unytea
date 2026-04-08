import { NextRequest, NextResponse } from "next/server";
import { runSessionJobs } from "@/app/actions/session-jobs";

/**
 * Cron API Route for Session Jobs
 * 
 * This endpoint can be called by:
 * 1. Vercel Cron Jobs (configured in vercel.json)
 * 2. External schedulers (Upstash QStash, GitHub Actions, etc.)
 * 3. Manual invocation for testing
 * 
 * Expected to be called every hour for best results.
 */

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret from headers only (never from query params for security)
    const cronSecret = request.headers.get("x-cron-secret") ||
                       request.headers.get("authorization")?.replace("Bearer ", "");
    
    const expectedSecret = process.env.CRON_SECRET;
    
    if (expectedSecret && cronSecret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Run all session jobs
    const results = await runSessionJobs();

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error in cron session jobs:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}
