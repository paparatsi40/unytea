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
 * behind it.
 *
 * Anonymous callers are keyed on IP **only**. `lib/rate-limit.ts`'s
 * `getIdentifier` mixes in the user-agent, and this function originally copied
 * that — but the user-agent is an attacker-controlled request header, so a
 * script that randomises it gets a fresh bucket on every call and the limit on
 * public actions is unenforceable. The user-agent adds no security value: it
 * cannot be trusted to distinguish clients, and the only thing it reliably
 * separates is a well-behaved browser from an attacker who varies it.
 *
 * The trade-off is that distinct clients behind one NAT now share a bucket.
 * That is the correct direction to err for unauthenticated traffic: the limit
 * is a flood control, and any real user can sign in to get their own bucket.
 */
export async function getActionIdentifier(userId: string | null): Promise<string> {
  if (userId) return `user:${userId}`;

  const headerList = await headers();

  const forwardedFor = headerList.get("x-forwarded-for");
  const ip = forwardedFor
    ? forwardedFor.split(",")[0].trim()
    : (headerList.get("x-real-ip")?.trim() ?? "unknown");

  return `anon:${ip}`;
}
