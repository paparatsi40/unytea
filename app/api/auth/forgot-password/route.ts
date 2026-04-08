import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendPasswordResetEmail } from "@/lib/email"
import { randomBytes } from "crypto"
import { rateLimiters, getIP } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const ip = getIP(request)
    const { success: rateLimitOk } = rateLimiters.auth.check(`forgot:${ip}`)
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      )
    }

    const { email } = await request.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    // Always return success to prevent email enumeration
    const genericResponse = NextResponse.json({
      message: "If an account with that email exists, we've sent a password reset link.",
    })

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, name: true, email: true, password: true },
    })

    // Only send reset for users with passwords (not OAuth-only)
    if (!user || !user.password) {
      return genericResponse
    }

    // Delete existing tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email: user.email },
    })

    // Generate token (expires in 1 hour)
    const token = randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        email: user.email,
        token,
        expires,
      },
    })

    // Send email
    const appUrl = process.env.NEXTAUTH_URL || "https://unytea.com"
    const resetLink = `${appUrl}/auth/reset-password?token=${token}`

    await sendPasswordResetEmail(user.email, {
      userName: user.name || "there",
      resetLink,
    })

    return genericResponse
  } catch (error) {
    console.error("[forgot-password] Error:", error)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
