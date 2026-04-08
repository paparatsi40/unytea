import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { rateLimiters, getIP } from "@/lib/rate-limit"
import { sendWelcomeEmail } from "@/lib/email"

const signUpSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limit signup attempts
    const ip = getIP(request)
    const { success: rateLimitOk } = rateLimiters.auth.check(`signup:${ip}`)
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      )
    }

    const body = await request.json()

    // Validate input
    const validatedData = signUpSchema.parse(body)
    const { name, email, password } = validatedData

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      // Return generic success to prevent email enumeration
      return NextResponse.json(
        { message: "If this email is available, an account has been created. Please check your email." },
        { status: 201 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        isOnboarded: false,
      },
    })

    // Send welcome email (non-blocking)
    sendWelcomeEmail(email, { userName: name }).catch((err) => {
      console.warn("[signup] Welcome email failed:", err)
    })

    return NextResponse.json(
      { message: "If this email is available, an account has been created. Please check your email." },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("[signup] Error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
