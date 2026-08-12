import { headers } from "next/headers";

/**
 * Rate-limit identity for a Server Action.
 *
 * `lib/rate-limit.ts` ships `getIP`/`getIdentifier`, but both take a
 * `NextRequest` — which a Server Action never has. That mismatch is why the
 * rate limiter was applied to 0 of 224 actions. This reads the same headers via
 * `next/headers` instead, so the seam can rate-limit every action.
 *
 * Authenticated callers are keyed on their user id: an attacker cannot dodge the
 * limit by rotating IPs, and a shared corporate NAT does not throttle everyone
 * behind it. Anonymous callers fall back to IP + user-agent, matching the
 * behaviour of `getIdentifier`.
 */
export async function getActionIdentifier(userId: string | null): Promise<string> {
  if (userId) return `user:${userId}`;

  const headerList = await headers();

  const forwardedFor = headerList.get("x-forwarded-for");
  const ip = forwardedFor
    ? forwardedFor.split(",")[0].trim()
    : (headerList.get("x-real-ip")?.trim() ?? "unknown");

  const userAgent = headerList.get("user-agent") ?? "unknown";

  return `anon:${ip}:${userAgent}`;
}
