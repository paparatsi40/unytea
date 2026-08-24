import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * F6: the counter that punished people for their own typing.
 *
 * One strict bucket ran before the body was even read, so a mistyped address, a
 * password that did not match its confirmation, or a malformed body each spent
 * one of five attempts per IP per fifteen minutes. Five is not many when the
 * mistakes are your own — and five per *IP* cannot onboard a room, because a
 * workshop, a classroom or anything behind CGNAT is one address and the sixth
 * person was told to come back later.
 *
 * Moving the counter after validation on its own would have left malformed
 * requests unlimited, which is precisely what `lib/actions/define-action.ts:181`
 * counts before validating to avoid. So there are two counters now, not one
 * moved: a cheap flood bucket first, then the strict one for requests that were
 * actually well-formed.
 *
 * Forgot-password gets a third, counted per recipient — see the group at the
 * bottom for why the per-IP one cannot do that job.
 */

const limiter = vi.hoisted(() => ({
  /** Every check, in order: which bucket and with what key. */
  seen: [] as { bucket: string; key: string }[],
  /** Bucket name → whether it should allow. Absent means allow. */
  allow: new Map<string, boolean>(),
  resetInMs: 10 * 60 * 1000,
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rate-limit")>();
  return {
    ...actual,
    getIP: () => "203.0.113.9",
    // Every bucket name resolves; the name is recorded rather than faked away,
    // which is what lets these tests assert *which* counter ran and in what
    // order. `rateLimitedResponse` and `hashedKey` come through for real.
    rateLimiters: new Proxy({} as Record<string, { check: (key: string) => unknown }>, {
      get: (_target, bucket: string) => ({
        check: async (key: string) => {
          limiter.seen.push({ bucket, key });
          const success = limiter.allow.get(bucket) ?? true;
          return { success, remaining: success ? 4 : 0, resetTime: Date.now() + limiter.resetInMs };
        },
      }),
    }),
  };
});

vi.mock("@/lib/email", () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: vi.fn().mockResolvedValue({ success: true }),
  sendSetPasswordEmail: vi.fn().mockResolvedValue({ success: true }),
}));

import { prisma } from "@/lib/prisma";

const buckets = () => limiter.seen.map((c) => c.bucket);
const keyFor = (bucket: string) => limiter.seen.find((c) => c.bucket === bucket)?.key;

function post(path: string, body: unknown, raw?: string) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: "POST",
    body: raw ?? JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  limiter.seen.length = 0;
  limiter.allow.clear();
  limiter.resetInMs = 10 * 60 * 1000;
  vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.user.create).mockResolvedValue({ id: "new" } as never);
  vi.mocked(prisma.passwordResetToken.deleteMany).mockResolvedValue({ count: 0 } as never);
  vi.mocked(prisma.passwordResetToken.create).mockResolvedValue({} as never);
});

async function signup(body: unknown, raw?: string) {
  const { POST } = await import("@/app/api/auth/signup/route");
  return POST(post("/api/auth/signup", body, raw));
}

async function forgot(body: unknown, raw?: string) {
  const { POST } = await import("@/app/api/auth/forgot-password/route");
  return POST(post("/api/auth/forgot-password", body, raw));
}

const VALID_SIGNUP = { name: "Ada", email: "ada@example.com", password: "password123" };

// ───────────────────────────────────────────────────────────────────────────
describe("FACET 1 · a request the user got wrong costs them nothing", () => {
  it("signup: an invalid address is a 400 and never reaches the strict bucket", async () => {
    const res = await signup({ ...VALID_SIGNUP, email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(buckets()).toContain("api");
    expect(buckets()).not.toContain("signupAttempt");
  });

  it("signup: a short password is a 400 and never reaches the strict bucket", async () => {
    const res = await signup({ ...VALID_SIGNUP, password: "123" });
    expect(res.status).toBe(400);
    expect(buckets()).not.toContain("signupAttempt");
  });

  it("signup: a malformed body is a 400, not a 500, and costs nothing", async () => {
    // It used to fall through to the catch-all and answer 500, telling the
    // caller our server had broken rather than their request.
    const res = await signup(undefined, "{ not json");
    expect(res.status).toBe(400);
    expect(buckets()).not.toContain("signupAttempt");
  });

  it("forgot-password: a missing address is a 400 and costs nothing", async () => {
    const res = await forgot({});
    expect(res.status).toBe(400);
    expect(buckets()).toContain("api");
    expect(buckets()).not.toContain("passwordReset");
    expect(buckets()).not.toContain("passwordResetRecipient");
  });

  it("forgot-password: a malformed body is a 400 and costs nothing", async () => {
    const res = await forgot(undefined, "]]not json[[");
    expect(res.status).toBe(400);
    expect(buckets()).not.toContain("passwordReset");
  });

  it("a well-formed request does still spend the strict bucket", async () => {
    // The other half. If nothing ever reached it, this would be a removal of
    // rate limiting rather than a reordering of it.
    await signup(VALID_SIGNUP);
    expect(buckets()).toContain("signupAttempt");
    expect(keyFor("signupAttempt")).toBe("signup:203.0.113.9");
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("FACET 1 · the flood bucket still holds the line", () => {
  it("signup checks it before reading the body at all", async () => {
    await signup(VALID_SIGNUP);
    expect(buckets()[0]).toBe("api");
    expect(keyFor("api")).toBe("signup-flood:203.0.113.9");
  });

  it("forgot-password checks it before reading the body at all", async () => {
    await forgot({ email: "ada@example.com" });
    expect(buckets()[0]).toBe("api");
    expect(keyFor("api")).toBe("forgot-flood:203.0.113.9");
  });

  it("refuses a burst of malformed requests, which is the point of it", async () => {
    // Without this bucket, "validation errors are free" would mean unlimited
    // garbage. This is the ceiling that makes the reordering safe.
    limiter.allow.set("api", false);
    const res = await signup(undefined, "{ not json");
    expect(res.status).toBe(429);
    expect(buckets()).toEqual(["api"]);
  });

  it("uses its own key, so signup and forgot-password do not share a bucket", async () => {
    await signup(VALID_SIGNUP);
    const signupKey = keyFor("api");
    limiter.seen.length = 0;
    await forgot({ email: "ada@example.com" });
    expect(keyFor("api")).not.toBe(signupKey);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("FACET 2E · the bucket that protects the person being mailed", () => {
  it("is checked, per recipient, on every well-formed request", async () => {
    await forgot({ email: "victim@example.com" });
    expect(buckets()).toContain("passwordResetRecipient");
  });

  it("keys on a hash, never on the address", async () => {
    // Redis keys are readable from any dashboard, any SCAN, any support
    // console. The bucket has to be exact; the address does not have to be in
    // it.
    await forgot({ email: "victim@example.com" });
    const key = keyFor("passwordResetRecipient")!;
    expect(key).toMatch(/^forgot-to:[0-9a-f]{32}$/);
    expect(key).not.toContain("victim");
    expect(key).not.toContain("example.com");
  });

  it("treats one mailbox as one bucket whatever the casing", async () => {
    // Otherwise the limit is bypassed by pressing shift.
    await forgot({ email: "Victim@Example.COM" });
    const upper = keyFor("passwordResetRecipient");
    limiter.seen.length = 0;
    await forgot({ email: "  victim@example.com " });
    expect(keyFor("passwordResetRecipient")).toBe(upper);
  });

  it("refuses without ever looking the account up", async () => {
    // This is what keeps it from being an enumeration oracle: it answers the
    // same at the same count whether or not the address is registered, because
    // at that point we have not asked.
    limiter.allow.set("passwordResetRecipient", false);
    const res = await forgot({ email: "victim@example.com" });
    expect(res.status).toBe(429);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("comes after the per-IP bucket, not before", async () => {
    // Someone spraying random addresses from one place should trip their own
    // ceiling and never write a recipient bucket for any of the addresses.
    await forgot({ email: "victim@example.com" });
    const order = buckets();
    expect(order.indexOf("passwordReset")).toBeLessThan(order.indexOf("passwordResetRecipient"));
  });

  it("and the per-IP bucket alone stops the spray", async () => {
    limiter.allow.set("passwordReset", false);
    const res = await forgot({ email: "victim@example.com" });
    expect(res.status).toBe(429);
    expect(buckets()).not.toContain("passwordResetRecipient");
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("every refusal says when to come back", () => {
  it.each([
    ["signup", "api"],
    ["signup", "signupAttempt"],
    ["forgot", "passwordReset"],
    ["forgot", "passwordResetRecipient"],
  ])("%s / %s answers 429 with a Retry-After", async (route, bucket) => {
    limiter.allow.set(bucket, false);
    limiter.resetInMs = 7 * 60 * 1000 + 1000; // 7m01s → 8 minutes, rounded up

    const res =
      route === "signup" ? await signup(VALID_SIGNUP) : await forgot({ email: "a@example.com" });

    expect(res.status).toBe(429);
    const header = Number(res.headers.get("Retry-After"));
    const body = (await res.json()) as { code: string; retryAfterSeconds: number };

    expect(body.code).toBe("RATE_LIMITED");
    expect(header).toBe(body.retryAfterSeconds);
    // The window was 7m01s, so the answer is 421 seconds, give or take the
    // millisecond this test took.
    expect(header).toBeGreaterThan(415);
    expect(header).toBeLessThanOrEqual(421);
  });
});
