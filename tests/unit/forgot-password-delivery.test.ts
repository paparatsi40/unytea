import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * Two silent failures on one route.
 *
 * `/api/auth/forgot-password` discarded the result of `sendPasswordResetEmail`.
 * `sendEmail` reports failure by returning `{ success: false }` rather than
 * throwing — a missing or wrong `RESEND_API_KEY`, an unverified sending domain,
 * a rejected address — so every one of those answered 200 "check your inbox"
 * over a delivery that had not happened. Nothing reached Resend, so nothing
 * appeared in Resend's log either, and the only trace was a `console.error` in
 * the platform logs.
 *
 * And one line earlier, `if (!user || !user.password) return genericResponse`
 * turned away an account created through Google on the same branch, and with
 * the same silence, as an address that does not exist. Someone who signs in
 * with a provider was told a mail was coming, was sent nothing, and had no
 * route to a password at all if they ever lost the provider.
 *
 * The enumeration guard survives both fixes: an address with no account still
 * gets the generic 200 and no send. What changed is what happens once we know
 * there *is* an account.
 */

const mockRateLimitCheck = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  rateLimiters: { auth: { check: (...a: unknown[]) => mockRateLimitCheck(...a) } },
  getIP: vi.fn().mockReturnValue("203.0.113.9"),
}));

const mail = vi.hoisted(() => ({
  reset: vi.fn(),
  set: vi.fn(),
}));
vi.mock("@/lib/email", () => ({
  sendPasswordResetEmail: mail.reset,
  sendSetPasswordEmail: mail.set,
}));

import { prisma } from "@/lib/prisma";

const WITH_PASSWORD = {
  id: "u1",
  name: "Ada",
  email: "ada@example.com",
  password: "$2a$12$storedhash",
};
const NO_PASSWORD = { id: "u2", name: "Bo", email: "bo@example.com", password: null };

describe("POST /api/auth/forgot-password", () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockRateLimitCheck.mockResolvedValue({ success: true, remaining: 4, resetTime: Date.now() });
    mail.reset.mockResolvedValue({ success: true, id: "re_1" });
    mail.set.mockResolvedValue({ success: true, id: "re_2" });
    vi.mocked(prisma.passwordResetToken.deleteMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.passwordResetToken.create).mockResolvedValue({} as never);
    POST = (await import("@/app/api/auth/forgot-password/route")).POST;
  });

  function request(email: unknown, cookie?: string) {
    return new NextRequest("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  describe("an address with no account", () => {
    beforeEach(() => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    });

    it("answers the generic 200", async () => {
      const res = await POST(request("nobody@example.com"));
      expect(res.status).toBe(200);
    });

    it("sends nothing at all", async () => {
      await POST(request("nobody@example.com"));
      expect(mail.reset).not.toHaveBeenCalled();
      expect(mail.set).not.toHaveBeenCalled();
    });

    it("does not mint a token for an address it has no account for", async () => {
      await POST(request("nobody@example.com"));
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe("an account that has a password", () => {
    beforeEach(() => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(WITH_PASSWORD as never);
    });

    it("sends the reset mail and answers 200", async () => {
      const res = await POST(request("ada@example.com"));
      expect(res.status).toBe(200);
      expect(mail.reset).toHaveBeenCalledTimes(1);
      expect(mail.set).not.toHaveBeenCalled();
    });

    it("answers 500 when the delivery reports failure", async () => {
      // The whole of the first fix. This used to be a 200.
      mail.reset.mockResolvedValue({ success: false, error: "API key is invalid" });
      const res = await POST(request("ada@example.com"));
      expect(res.status).toBe(500);
      expect((await res.json()).code).toBe("SERVER_ERROR");
    });

    it("leaves the token valid after a failed delivery, so a retry works", async () => {
      mail.reset.mockResolvedValue({ success: false, error: "nope" });
      await POST(request("ada@example.com"));
      expect(prisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
      // Only the pre-issue cleanup, never a rollback of the row just written.
      expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledTimes(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe("an account with no password of its own", () => {
    beforeEach(() => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(NO_PASSWORD as never);
    });

    it("sends a mail, where it used to send nothing", async () => {
      const res = await POST(request("bo@example.com"));
      expect(res.status).toBe(200);
      expect(mail.set).toHaveBeenCalledTimes(1);
    });

    it("sends the 'set' mail, not the 'reset' one", async () => {
      // "Reset your password" asks somebody to remember something that never
      // happened.
      await POST(request("bo@example.com"));
      expect(mail.reset).not.toHaveBeenCalled();
    });

    it("answers 500 when that delivery fails too", async () => {
      mail.set.mockResolvedValue({ success: false, error: "nope" });
      const res = await POST(request("bo@example.com"));
      expect(res.status).toBe(500);
      expect((await res.json()).code).toBe("SERVER_ERROR");
    });

    it("uses the same token mechanism as the reset path", async () => {
      // Not a parallel path: same table, same single-use cleanup, same expiry,
      // same destination. `/api/auth/reset-password` writes the column whether
      // or not one was there before.
      await POST(request("bo@example.com"));

      expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { email: NO_PASSWORD.email },
      });
      const written = vi.mocked(prisma.passwordResetToken.create).mock.calls[0][0] as {
        data: { email: string; token: string; expires: Date };
      };
      expect(written.data.email).toBe(NO_PASSWORD.email);
      // 32 random bytes, hex — the same mint as the reset path.
      expect(written.data.token).toMatch(/^[0-9a-f]{64}$/);
      const ttl = written.data.expires.getTime() - Date.now();
      expect(ttl).toBeGreaterThan(59 * 60 * 1000);
      expect(ttl).toBeLessThanOrEqual(60 * 60 * 1000);

      const link = mail.set.mock.calls[0][1].resetLink as string;
      expect(link).toContain("/auth/reset-password?token=");
      expect(link).toContain(written.data.token);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe("what the mail is told", () => {
    it("takes the locale from the cookie the rest of the app reads", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(WITH_PASSWORD as never);
      await POST(request("ada@example.com", "NEXT_LOCALE=fr"));
      expect(mail.reset.mock.calls[0][1].locale).toBe("fr");
    });

    it("falls back to the default locale when the cookie is absent or junk", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(WITH_PASSWORD as never);
      await POST(request("ada@example.com"));
      expect(mail.reset.mock.calls[0][1].locale).toBe("en");

      vi.clearAllMocks();
      mockRateLimitCheck.mockResolvedValue({ success: true });
      mail.reset.mockResolvedValue({ success: true });
      vi.mocked(prisma.user.findUnique).mockResolvedValue(WITH_PASSWORD as never);
      await POST(request("ada@example.com", "NEXT_LOCALE=klingon"));
      expect(mail.reset.mock.calls[0][1].locale).toBe("en");
    });

    it("hands the name over without inventing one", async () => {
      // The English "there" used to be baked in here, which would have been
      // English inside a French email the moment this was localized.
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...WITH_PASSWORD,
        name: null,
      } as never);
      await POST(request("ada@example.com"));
      expect(mail.reset.mock.calls[0][1].userName).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe("the guards that were already there", () => {
    it("still answers 429 when rate limited, and looks nothing up", async () => {
      mockRateLimitCheck.mockResolvedValue({ success: false });
      const res = await POST(request("ada@example.com"));
      expect(res.status).toBe(429);
      expect((await res.json()).code).toBe("RATE_LIMITED");
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("uses a bucket of its own, not the signup one", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      await POST(request("ada@example.com"));
      expect(mockRateLimitCheck).toHaveBeenCalledWith("forgot:203.0.113.9");
    });

    it("still answers 400 with no email", async () => {
      const res = await POST(request(undefined));
      expect(res.status).toBe(400);
      expect((await res.json()).code).toBe("EMAIL_REQUIRED");
    });
  });
});
