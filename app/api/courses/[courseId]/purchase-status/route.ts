import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Check if user has purchased a course
 * GET /api/courses/[courseId]/purchase-status
 */
export async function GET(
  _req: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { courseId } = params;

    // Get course info
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        isPaid: true,
        price: true,
        communityId: true,
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // If course is free, user has access
    if (!course.isPaid || !course.price) {
      return NextResponse.json({
        hasAccess: true,
        isFree: true,
        purchaseStatus: null,
      });
    }

    // Check if user is member of the community
    const membership = await prisma.member.findFirst({
      where: {
        userId,
        communityId: course.communityId,
        status: "ACTIVE",
      },
    });

    // Check if user has purchased the course
    const purchase = await prisma.coursePurchase.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    const hasAccess = purchase?.status === "completed" || !!membership;

    return NextResponse.json({
      hasAccess,
      isFree: false,
      purchaseStatus: purchase?.status || null,
      price: course.price,
      isCommunityMember: !!membership,
    });
  } catch (error: any) {
    console.error("Error checking course purchase status:", error);
    return NextResponse.json(
      { error: "Failed to check purchase status" },
      { status: 500 }
    );
  }
}
