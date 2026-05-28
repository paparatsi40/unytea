import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import crypto from "node:crypto";

/**
 * Authenticates a cron-job request by validating the CRON_SECRET.
 *
 * Authentication is via:
 * - `x-cron-secret` header, OR
 * - `Authorization: Bearer <CRON_SECRET>` header
 *
 * Returns a NextResponse if authentication fails (401 or 500).
 * Returns null if authentication succeeds — caller should proceed.
 *
 * Fail-closed: if CRON_SECRET env var is not configured, returns 500.
 * Uses constant-time comparison to mitigate timing attacks.
 */
export function verifyCronAuth(request: NextRequest): NextResponse | null {
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error("[cron-auth] CRON_SECRET is not configured — cron endpoints are unreachable");
    return NextResponse.json({ success: false, error: "Server misconfigured" }, { status: 500 });
  }

  const providedSecret =
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";

  // Constant-time comparison to mitigate timing attacks.
  // Check lengths first because timingSafeEqual throws on mismatched lengths.
  const expectedBuffer = Buffer.from(expectedSecret, "utf8");
  const providedBuffer = Buffer.from(providedSecret, "utf8");

  if (
    expectedBuffer.length !== providedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
