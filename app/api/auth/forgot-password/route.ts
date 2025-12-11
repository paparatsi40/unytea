import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

// Generate a secure random token
function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success (security: don't reveal if email exists)
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account exists with that email, a reset link has been sent",
      });
    }

    // Generate reset token and expiry (1 hour from now)
    const resetToken = generateResetToken();
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Save token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Construct reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/reset-password?token=${resetToken}`;

    // Send email (using your email service)
    try {
      await sendPasswordResetEmail({
        to: user.email!,
        name: user.name || "User",
        resetUrl,
      });
    } catch (emailError) {
      console.error("Failed to send reset email:", emailError);
      // Continue anyway - don't expose email errors to user
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists with that email, a reset link has been sent",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

