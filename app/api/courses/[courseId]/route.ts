import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH - Archive/Unarchive course
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await params;
    const body = await req.json();
    const { action } = body; // "archive" or "unarchive"

    // Get course and verify ownership
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        community: {
          select: { ownerId: true },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Check if user is community owner
    if (course.community.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update archive status
    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: {
        isArchived: action === "archive",
      },
    });

    return NextResponse.json({
      success: true,
      course: updatedCourse,
      message: action === "archive" ? "Course archived successfully" : "Course unarchived successfully",
    });
  } catch (error) {
    console.error("Error updating course:", error);
    return NextResponse.json(
      { error: "Failed to update course" },
      { status: 500 }
    );
  }
}

// DELETE - Delete course permanently
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await params;

    // Get course and verify ownership
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        community: {
          select: { ownerId: true },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Check if user is community owner
    if (course.community.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if there are active enrollments
    if (course._count.enrollments > 0) {
      return NextResponse.json(
        { 
          error: "Cannot delete course with active enrollments. Archive it instead.",
          hasEnrollments: true,
        },
        { status: 400 }
      );
    }

    // Delete course permanently
    await prisma.course.delete({
      where: { id: courseId },
    });

    return NextResponse.json({
      success: true,
      message: "Course deleted permanently",
    });
  } catch (error) {
    console.error("Error deleting course:", error);
    return NextResponse.json(
      { error: "Failed to delete course" },
      { status: 500 }
    );
  }
}