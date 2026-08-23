import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { rateLimiters, getIP } from "@/lib/rate-limit";
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

export async function POST(request: NextRequest) {
  try {
    // Rate limit signup attempts
    const ip = getIP(request);
    const { success: rateLimitOk } = await rateLimiters.auth.check(`signup:${ip}`);
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later.", code: "RATE_LIMITED" },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Validate input
    const validatedData = signUpSchema.parse(body);
    const { name, password } = validatedData;
    // Normalized before the lookup and before the write, so the row this
    // creates is the same row every other path will find.
    const email = normalizeEmail(validatedData.email);

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
