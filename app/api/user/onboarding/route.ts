import { NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
export const dynamic = 'force-dynamic';






export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { fullName, role, goals, interests, skills } = body

    // Update user with onboarding data
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: fullName || undefined,
        role: role || undefined,
        bio: goals || undefined,
        interests: interests || [],
        skills: skills || [],
        isOnboarded: true,
      },
    })

    return NextResponse.json(
      { message: "Onboarding completed successfully" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Onboarding error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
