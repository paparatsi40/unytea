import { describe, it, expect, vi, beforeEach } from "vitest";
import { BCRYPT_COST } from "@/lib/auth-hashing";
import { NextRequest } from "next/server";

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed-password"), compare: vi.fn() },
}));

const mockRateLimitCheck = vi
  .fn()
  .mockReturnValue({ success: true, remaining: 4, resetTime: Date.now() + 900000 });
/**
 * Every bucket resolves to the same tracked stub.
 *
 * The auth routes count in stages now — a cheap flood bucket before the body is
 * read, then the strict one only for requests that validated — so a mock that
 * named one limiter would leave the others undefined and the route would throw
 * rather than refuse. A proxy keeps this honest as more buckets appear, and
 * routing them all through one spy is what lets a test assert on the keys.
 *
 * `importOriginal` so the real `rateLimitedResponse` and `hashedKey` come
 * through: the shape of a 429 and the hashing of a recipient key are behaviour
 * worth exercising, not scaffolding worth faking.
 */
vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rate-limit")>();
  const bucket = { check: (...args: unknown[]) => mockRateLimitCheck(...args) };
  return {
    ...actual,
    rateLimiters: new Proxy({} as Record<string, typeof bucket>, { get: () => bucket }),
    getIP: vi.fn().mockReturnValue("127.0.0.1"),
  };
});
vi.mock("@/lib/email", () => ({ sendWelcomeEmail: vi.fn().mockResolvedValue(undefined) }));

import { prisma } from "@/lib/prisma";

describe("POST /api/auth/signup", () => {
  let POST: (req: NextRequest) => Promise<Response>;
  beforeEach(async () => {
    vi.clearAllMocks();
    mockRateLimitCheck.mockReturnValue({
      success: true,
      remaining: 4,
      resetTime: Date.now() + 900000,
    });
    const mod = await import("@/app/api/auth/signup/route");
    POST = mod.POST;
  });
  function makeRequest(body: Record<string, unknown>) {
    return new NextRequest("http://localhost:3000/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
  }
  it("should return 429 when rate limited", async () => {
    mockRateLimitCheck.mockReturnValue({
      success: false,
      remaining: 0,
      resetTime: Date.now() + 900000,
    });
    const res = await POST(
      makeRequest({ name: "Test", email: "test@example.com", password: "password123" })
    );
    expect(res.status).toBe(429);
  });
  it("should return 400 for invalid email", async () => {
    const res = await POST(
      makeRequest({ name: "Test", email: "not-an-email", password: "password123" })
    );
    expect(res.status).toBe(400);
  });
  it("should return 400 for short password", async () => {
    const res = await POST(
      makeRequest({ name: "Test", email: "test@example.com", password: "123" })
    );
    expect(res.status).toBe(400);
  });
  /**
   * These three used to assert the opposite: 201 for an existing address, a
   * hedged message, and byte-identical responses either way — the standard
   * shape for refusing to confirm an account exists.
   *
   * It was not buying that. The signup page read `response.ok` as success and
   * went straight on to `signIn("credentials", …)` with the password just
   * typed, which succeeds for a fresh address and fails for a taken one. Line
   * four handed back exactly the answer line one had withheld, so the address
   * was discoverable regardless — and what the actual owner of the account got
   * was a bare "sign-in error" on a signup form, with no hint that they already
   * had an account and no way to reach it.
   *
   * So the route says so now, and says which door to use. The disclosure is
   * bounded by the rate limiter above (5 per IP per 15 minutes), which is
   * checked before the lookup runs.
   */
  it("answers 409 for an address that is already registered", async () => {
    // Partial User stub — mockResolvedValue's typed signature wants the full
    // User shape but the route reads only what it selects, so cast to satisfy
    // TS.
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "existing-user",
      password: "$2a$12$storedhash",
      accounts: [],
    } as never);
    const res = await POST(
      makeRequest({ name: "Test", email: "existing@example.com", password: "password123" })
    );
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.code).toBe("EMAIL_IN_USE_PASSWORD");
  });
  it("names the provider when the account has no password of its own", async () => {
    // The case the old behaviour could never recover from: signing in with
    // credentials cannot work on a Google account, so "try again" was advice
    // that would fail forever.
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "existing-user",
      password: null,
      accounts: [{ provider: "google" }],
    } as never);
    const res = await POST(
      makeRequest({ name: "Test", email: "existing@example.com", password: "password123" })
    );
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("EMAIL_IN_USE_GOOGLE");
  });
  it("never puts the stored hash in the conflict response", async () => {
    // `password` is selected so its presence can be tested. It must not travel.
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "existing-user",
      password: "$2a$12$storedhash",
      accounts: [],
    } as never);
    const res = await POST(
      makeRequest({ name: "Test", email: "existing@example.com", password: "password123" })
    );
    expect(JSON.stringify(await res.json())).not.toContain("$2a$12$storedhash");
  });
  it("still refuses before the lookup when rate limited", async () => {
    // The bound on the disclosure above. If the limiter stopped running first,
    // the 409 would be a free enumeration oracle.
    mockRateLimitCheck.mockReturnValue({ success: false, remaining: 0, resetTime: Date.now() });
    const res = await POST(
      makeRequest({ name: "Test", email: "existing@example.com", password: "password123" })
    );
    expect(res.status).toBe(429);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
  it("should return 201 for a new user, and no user object", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "new",
      email: "new@example.com",
      name: "Test",
    } as never);
    const res = await POST(
      makeRequest({ name: "Test", email: "new@example.com", password: "password123" })
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.user).toBeUndefined();
    // The hedge is gone: it was the other half of a guard that no longer
    // exists, and keeping it would be coy about something the 409 above states
    // plainly.
    expect(JSON.stringify(data)).not.toContain("If this email is available");
  });
  it("should hash the password before storing", async () => {
    const bcrypt = await import("bcryptjs");
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({} as never);
    await POST(makeRequest({ name: "Test", email: "new@example.com", password: "mypassword123" }));
    expect(bcrypt.default.hash).toHaveBeenCalledWith("mypassword123", BCRYPT_COST);
  });
  it("answers an existing address differently from a new one, on purpose", async () => {
    // The inverse of what this asserted before. Identical responses were the
    // whole point of the old design and are now the bug: they left the person
    // who owns the account with nothing to act on, while the client's own
    // follow-up call gave the difference away anyway.
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "x",
      password: "$2a$12$hash",
      accounts: [],
    } as never);
    const r1 = await POST(makeRequest({ name: "A", email: "a@test.com", password: "password123" }));
    const d1 = await r1.json();

    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({} as never);
    const r2 = await POST(makeRequest({ name: "B", email: "b@test.com", password: "password123" }));
    const d2 = await r2.json();

    expect(r1.status).toBe(409);
    expect(r2.status).toBe(201);
    expect(d1.code).toBeTruthy();
    expect(d2.code).toBeUndefined();
  });
});
