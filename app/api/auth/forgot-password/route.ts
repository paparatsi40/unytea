import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail, sendSetPasswordEmail } from "@/lib/email";
import { normalizeEmail } from "@/lib/normalize-email";
import { randomBytes } from "crypto";
import { rateLimiters, getIP } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/site-url";
import { LOCALE_COOKIE, resolveLocale } from "@/lib/locale";

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const ip = getIP(request);
    const { success: rateLimitOk } = await rateLimiters.auth.check(`forgot:${ip}`);
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later.", code: "RATE_LIMITED" },
        { status: 429 }
      );
    }

    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required", code: "EMAIL_REQUIRED" },
        { status: 400 }
      );
    }

    // Always return success to prevent email enumeration
    const genericResponse = NextResponse.json({
      message: "If an account with that email exists, we've sent a password reset link.",
    });

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizeEmail(email) },
      select: { id: true, name: true, email: true, password: true },
    });

    // No account: the same 200, and nothing sent. This is the enumeration
    // guard and it is the only branch that still needs one — the response is
    // identical whichever way the rest of this goes.
    if (!user) {
      return genericResponse;
    }

    // An account with no password used to be turned away here, on the same
    // line and with the same silence as an address that does not exist. That
    // was wrong in both directions: it told someone who signs in with Google
    // that a mail was on its way, and it left them with no route to a password
    // at all if they ever lost the provider. They get a mail now — one that
    // says "set", because "reset" would be asking them to remember something
    // that never happened. Same token, same expiry, same single use; only the
    // words differ. `/api/auth/reset-password` writes the column whether or
    // not one was there before.
    const isFirstPassword = !user.password;

    // Delete existing tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email: user.email },
    });

    // Generate token (expires in 1 hour)
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        email: user.email,
        token,
        expires,
      },
    });

    // Send email
    const appUrl = SITE_URL;
    const resetLink = `${appUrl}/auth/reset-password?token=${token}`;
    // Same source the rest of the non-`[locale]` tree reads (see src/i18n.ts).
    const locale = resolveLocale(request.cookies.get(LOCALE_COOKIE)?.value);

    const send = isFirstPassword ? sendSetPasswordEmail : sendPasswordResetEmail;
    const delivery = await send(user.email, {
      userName: user.name,
      resetLink,
      locale,
    });

    // `sendEmail` reports failure by returning, not by throwing — a missing or
    // wrong RESEND_API_KEY, an unverified sending domain, a rejected address.
    // This return value used to be discarded, so every one of those answered
    // 200 "check your inbox" and left no trace anywhere the user could see.
    // The token row above is left in place deliberately: it stays valid for its
    // hour, so a retry that reaches Resend still works.
    if (!delivery.success) {
      console.error("[forgot-password] Delivery failed:", delivery.error);
      return NextResponse.json(
        { error: "Something went wrong. Please try again.", code: "SERVER_ERROR" },
        { status: 500 }
      );
    }

    return genericResponse;
  } catch (error) {
    console.error("[forgot-password] Error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again.", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
