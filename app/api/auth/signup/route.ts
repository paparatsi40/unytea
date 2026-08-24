import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { rateLimiters, getIP, rateLimitedResponse } from "@/lib/rate-limit";
import { sendWelcomeEmail } from "@/lib/email";
import { normalizeEmail } from "@/lib/normalize-email";
import { BCRYPT_COST } from "@/lib/auth-hashing";
import { signupConflictCode } from "@/lib/signup-conflict";

const signUpSchema = z.object({
  name: z.string().min(1, "Name is required"),
  // Trimmed before validation for the same reason as the login schema.
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * Signing up, in four stages, in this order for a reason.
 *
 * The single strict counter used to run first, before the body was even read,
 * so a mistyped email or a password that did not match its confirmation spent
 * one of five attempts. Five is not many when the mistakes are your own: a
 * person fumbling a form was locked out for a quarter of an hour, and five per
 * IP could not onboard a room — a workshop, a classroom, anything behind CGNAT
 * is one address, and the sixth person was turned away.
 *
 * Moving the counter after validation on its own would have left malformed
 * requests unlimited, and the seam every Server Action goes through
 * (`lib/actions/define-action.ts:181`) deliberately counts before validating
 * for exactly that reason. So there are two counters rather than one moved:
 *
 *   1. a cheap flood bucket, before anything is parsed — junk is still capped,
 *      at a ceiling no human types past;
 *   2. parse and validate — a 400 costs nothing;
 *   3. the strict bucket, only for requests that were actually well-formed;
 *   4. the expensive work: the lookup, the hash, the write, the mail.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getIP(request);

    // ── 1. Flood ────────────────────────────────────────────────────────
    // Before the body is read, so a stream of garbage is refused at its
    // cheapest point. 60/min is far above anything a person does with a form
    // and far below what a script wants.
    const flood = await rateLimiters.api.check(`signup-flood:${ip}`);
    if (!flood.success) {
      return rateLimitedResponse(flood);
    }

    // ── 2. Parse and validate ───────────────────────────────────────────
    // Both failures below are 400s and neither touches the strict bucket.
    // A malformed body used to fall through to the catch-all and answer 500,
    // which told the caller our server had broken rather than their request.
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Malformed request body", code: "SERVER_ERROR" },
        { status: 400 }
      );
    }

    const validatedData = signUpSchema.parse(body);
    const { name, password } = validatedData;
    // Normalized before the lookup and before the write, so the row this
    // creates is the same row every other path will find.
    const email = normalizeEmail(validatedData.email);

    // ── 3. The strict bucket ────────────────────────────────────────────
    // Only well-formed requests reach it, and it sits *before* the lookup on
    // purpose. The 409 below tells the caller whether an address is registered,
    // so the lookup is the thing that has to stay bounded — see
    // lib/signup-conflict.ts, where naming the provider was called a bounded
    // disclosure. This counter is the bound. At 20 an hour a person who
    // rediscovers their own account a few times still has plenty left.
    const attempt = await rateLimiters.signupAttempt.check(`signup:${ip}`);
    if (!attempt.success) {
      return rateLimitedResponse(attempt);
    }

    // ── 4. The expensive work ───────────────────────────────────────────
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
      // `password` for its presence only — the hash is read by
      // `signupConflictCode` and never leaves this function.
      select: {
        id: true,
        password: true,
        accounts: { select: { provider: true } },
      },
    });

    if (existingUser) {
      // This used to answer 201 with "if this email is available, an account
      // has been created", so as not to confirm the address was taken. The
      // client then called signIn() with the credentials just typed — which
      // succeeds for a new address and fails for a taken one, handing back the
      // answer the 201 had withheld. The protection was already gone; only the
      // user was still being kept in the dark, and what they saw was a bare
      // "sign-in error" on a signup form.
      //
      // So say it, and say which door to use. See lib/signup-conflict.ts for
      // why naming the provider is worth its cost.
      const code = signupConflictCode(existingUser);
      return NextResponse.json(
        { error: "An account already exists for this email address.", code },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);

    // Create user
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        isOnboarded: false,
      },
    });

    // Send welcome email (non-blocking)
    sendWelcomeEmail(email, { userName: name }).catch((err) => {
      console.warn("[signup] Welcome email failed:", err);
    });

    // The hedge this used to carry — "if this email is available, an account
    // has been created" — was the other half of the enumeration guard, and it
    // is now the only half left. Saying it while the branch above answers 409
    // would be a hedge about something already stated plainly.
    return NextResponse.json({ message: "Account created." }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const field = String(error.errors[0]?.path?.[0] ?? "");
      const code =
        field === "name"
          ? "VALIDATION_NAME"
          : field === "email"
            ? "VALIDATION_EMAIL"
            : field === "password"
              ? "VALIDATION_PASSWORD"
              : "SERVER_ERROR";
      return NextResponse.json({ error: error.errors[0].message, code }, { status: 400 });
    }

    console.error("[signup] Error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
