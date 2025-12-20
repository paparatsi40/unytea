import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const signUpSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    console.log("📝 Signup attempt for:", body.email)
    
    // Validate input
    const validatedData = signUpSchema.parse(body)
    const { name, email, password } = validatedData

    console.log("✅ Input validated successfully")

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      console.log("⚠️ User already exists:", email)
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      )
    }

    console.log("✅ User doesn't exist, creating new user...")

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    console.log("✅ Password hashed successfully")

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        isOnboarded: true, // Skip onboarding for now
      },
    })

    console.log("✅ User created successfully:", user.email)

    return NextResponse.json(
      { 
        message: "User created successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Validation error:", error.errors)
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("❌ Signup error details:", error)
    console.error("Error message:", (error as Error).message)
    console.error("Error stack:", (error as Error).stack)
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}
