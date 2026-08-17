import { describe, it, expect, vi, beforeEach } from "vitest";
import { BCRYPT_COST } from "@/lib/auth-hashing";
import { NextRequest } from "next/server";

/**
 * Behavioural coverage of the credentials login, forgot-password and
 * reset-password flows.
 *
 * Written as the post-upgrade retest for H11 (`next-auth` 5.0.0-beta.31 →
 * beta.32, `@auth/core` 0.41.2 → 0.41.3, which carried three critical
 * advisories). The pre-existing auth tests assert on the *source text* of
 * lib/auth.ts; these exercise the code paths instead, so a future dependency
 * bump that changes behaviour fails here rather than in production.
 */

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("new-hashed-password"),
    compare: vi.fn(),
  },
}));

const mockRateLimitCheck = vi
  .fn()
  .mockResolvedValue({ success: true, remaining: 4, resetTime: Date.now() + 900_000 });
vi.mock("@/lib/rate-limit", () => ({
  rateLimiters: { auth: { check: (...args: unknown[]) => mockRateLimitCheck(...args) } },
  getIP: vi.fn().mockReturnValue("127.0.0.1"),
}));

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authorizeCredentials } from "@/lib/auth-credentials";
import { sendPasswordResetEmail } from "@/lib/email";
import { makeUser, makePasswordResetToken } from "../helpers/fixtures";

const dbUser = makeUser();

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimitCheck.mockResolvedValue({
    success: true,
    remaining: 4,
    resetTime: Date.now() + 900_000,
  });
});

describe("credentials login — authorizeCredentials", () => {
  it("returns the user on a correct email + password", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(dbUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await authorizeCredentials({
      email: "carlos@example.com",
      password: "correct-password",
    });

    expect(result).toMatchObject({ id: "user_1", email: "carlos@example.com", role: "USER" });
  });

  it("never returns the password hash to the session", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(dbUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await authorizeCredentials({
      email: "carlos@example.com",
      password: "correct-password",
    });

    expect(result).not.toHaveProperty("password");
  });

  it("returns null on a wrong password", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(dbUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const result = await authorizeCredentials({
      email: "carlos@example.com",
      password: "wrong-password",
    });

    expect(result).toBeNull();
  });

  it("returns null for an unknown account", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const result = await authorizeCredentials({
      email: "nobody@example.com",
      password: "any-password",
    });

    expect(result).toBeNull();
  });

  it("still runs bcrypt.compare for an unknown account (constant-time, anti-enumeration)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await authorizeCredentials({ email: "nobody@example.com", password: "any-password" });

    expect(bcrypt.compare).toHaveBeenCalledTimes(1);
    // Compared against the dummy digest, not against undefined — and at the
    // current cost. Pinning a literal here is what would let the decoy drift
    // behind real hashes and reopen the timing oracle it exists to close.
    expect(vi.mocked(bcrypt.compare).mock.calls[0][1]).toMatch(
      new RegExp(`^\\$2[aby]\\$${BCRYPT_COST}\\$`)
    );
  });

  it("still runs bcrypt.compare for an OAuth-only account with no password", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(makeUser({ password: null }));
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const result = await authorizeCredentials({
      email: "carlos@example.com",
      password: "any-password",
    });

    expect(result).toBeNull();
    expect(bcrypt.compare).toHaveBeenCalledTimes(1);
  });

  it("rejects a malformed email without touching the database", async () => {
    const result = await authorizeCredentials({ email: "not-an-email", password: "password123" });

    expect(result).toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a password shorter than 8 characters without touching the database", async () => {
    const result = await authorizeCredentials({ email: "carlos@example.com", password: "short" });

    expect(result).toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns null rather than throwing when the database fails", async () => {
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error("connection lost"));

    await expect(
      authorizeCredentials({ email: "carlos@example.com", password: "password123" })
    ).resolves.toBeNull();
  });
});

describe("POST /api/auth/forgot-password", () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    POST = (await import("@/app/api/auth/forgot-password/route")).POST;
  });

  const makeRequest = (body: Record<string, unknown>) =>
    new NextRequest("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });

  it("issues a reset token and email for a password account", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(dbUser);

    const res = await POST(makeRequest({ email: "carlos@example.com" }));

    expect(res.status).toBe(200);
    expect(prisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });

  it("invalidates any previously issued token for that address", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(dbUser);

    await POST(makeRequest({ email: "carlos@example.com" }));

    expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { email: "carlos@example.com" },
    });
  });

  it("returns the same generic body for an unknown address (no enumeration)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(dbUser);
    const known = await (await POST(makeRequest({ email: "carlos@example.com" }))).json();

    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const unknown = await (await POST(makeRequest({ email: "nobody@example.com" }))).json();

    expect(unknown).toEqual(known);
  });

  it("sends no email for an unknown address", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await POST(makeRequest({ email: "nobody@example.com" }));

    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it("sends no email for an OAuth-only account", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(makeUser({ password: null }));

    await POST(makeRequest({ email: "carlos@example.com" }));

    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("returns 429 when the auth rate limiter trips", async () => {
    mockRateLimitCheck.mockResolvedValue({ success: false, remaining: 0, resetTime: Date.now() });

    const res = await POST(makeRequest({ email: "carlos@example.com" }));

    expect(res.status).toBe(429);
  });
});

describe("POST /api/auth/reset-password", () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    POST = (await import("@/app/api/auth/reset-password/route")).POST;
  });

  const makeRequest = (body: Record<string, unknown>) =>
    new NextRequest("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });

  const validToken = makePasswordResetToken();

  it("resets the password for a valid, unexpired token", async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(validToken);

    const res = await POST(makeRequest({ token: validToken.token, password: "new-password-123" }));

    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { email: "carlos@example.com" },
      data: { password: "new-hashed-password" },
    });
  });

  it("stores a hash, never the plaintext password", async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(validToken);

    await POST(makeRequest({ token: validToken.token, password: "new-password-123" }));

    expect(bcrypt.hash).toHaveBeenCalledWith("new-password-123", expect.any(Number));
    const updateArg = vi.mocked(prisma.user.update).mock.calls[0][0] as {
      data: { password: string };
    };
    expect(updateArg.data.password).not.toBe("new-password-123");
  });

  it("burns every token for that address after a successful reset", async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(validToken);

    await POST(makeRequest({ token: validToken.token, password: "new-password-123" }));

    expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { email: "carlos@example.com" },
    });
  });

  it("rejects an unknown token", async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(null);

    const res = await POST(makeRequest({ token: "b".repeat(64), password: "new-password-123" }));

    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects an expired token and deletes it", async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(
      makePasswordResetToken({ expires: new Date(Date.now() - 1000) })
    );

    const res = await POST(makeRequest({ token: validToken.token, password: "new-password-123" }));

    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.passwordResetToken.delete).toHaveBeenCalledWith({ where: { id: "tok_1" } });
  });

  it("rejects a new password shorter than 8 characters", async () => {
    const res = await POST(makeRequest({ token: validToken.token, password: "short" }));

    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
