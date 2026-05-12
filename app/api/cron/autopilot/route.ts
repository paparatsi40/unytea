import { NextRequest, NextResponse } from "next/server";
import { runAutopilotDueJobs } from "@/app/actions/autopilot";
import { verifyCronAuth } from "@/lib/cron-auth";

/**
 * ⚠️ DORMANT ENDPOINT
 *
 * As of 2026-05-12, this endpoint is NOT wired to any scheduler:
 * - NOT in vercel.json (no Vercel cron schedule)
 * - NOT documented as externally invoked
 *
 * The security check is in place (verifyCronAuth) so any invocation
 * requires CRON_SECRET. If you want this endpoint to run on a schedule,
 * add it to vercel.json or wire to an external scheduler (Upstash QStash, etc).
 *
 * Last known intent: run autopilot due jobs (auto_promote, auto_engage, etc).
 * See: app/actions/autopilot.ts
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  try {
    const result = await runAutopilotDueJobs();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
