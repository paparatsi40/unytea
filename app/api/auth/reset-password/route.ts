import { NextRequest, NextResponse } from "next/server";
import { normalizeEmail } from "@/lib/normalize-email";
import { BCRYPT_COST } from "@/lib/auth-hashing";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const resetSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = resetSchema.parse(body);

    // Find valid token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return NextResponse.json(
        {
          error: "Invalid or expired reset link. Please request a new one.",
          code: "RESET_LINK_INVALID",
        },
        { status: 400 }
      );
    }

    // Check expiration
    if (resetToken.expires < new Date()) {
      // Clean up expired token
      await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
      return NextResponse.json(
        {
          error: "This reset link has expired. Please request a new one.",
          code: "RESET_LINK_EXPIRED",
        },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);

    // Update user password
    await prisma.user.update({
      // A token issued before this normalization landed still carries the old
      // casing, so it has to be normalized here too or an in-flight reset would
      // stop resolving the moment the data migration runs.
      where: { email: normalizeEmail(resetToken.email) },
      data: { password: hashedPassword },
    });

    // Delete all tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email: resetToken.email },
    });

    return NextResponse.json({
      message: "Password reset successfully. You can now sign in.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error("[reset-password] Error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again.", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
