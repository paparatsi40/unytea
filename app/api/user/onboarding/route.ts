import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/authorization";
import { handleApiError } from "@/lib/api-error-handler";

export const dynamic = "force-dynamic";

// Note: the `role` field here is a job title / role description (used in the
// composed bio), NOT the Prisma User.role platform-level field added in
// Phase 2c.2. The handler intentionally does not write User.role.
const onboardingSchema = z.object({
  fullName: z.string().trim().max(100).optional(),
  role: z.string().trim().max(100).optional(),
  goals: z.string().trim().max(500).optional(),
  interests: z.array(z.string().trim().max(50)).max(20).optional(),
  skills: z.array(z.string().trim().max(50)).max(20).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();

    const body = await request.json();
    const data = onboardingSchema.parse(body);

    const { fullName, role, goals, interests, skills } = data;

    // Compose bio from role + goals (preserves prior business logic)
    const bio = role ? `${role}${goals ? " — " + goals : ""}` : goals || undefined;

    await prisma.user.update({
      where: { id: userId },
      data: {
        name: fullName || undefined,
        bio,
        interests: interests || [],
        skills: skills || [],
        isOnboarded: true,
      },
    });

    return NextResponse.json({ message: "Onboarding completed successfully" }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}
