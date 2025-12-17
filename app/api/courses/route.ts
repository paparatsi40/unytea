import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, slug, description, imageUrl, isPaid, price, currency, communityId } = body;

    // Validate required fields
    if (!title || !slug || !communityId) {
      return NextResponse.json(
        { error: "Title, slug, and communityId are required" },
        { status: 400 }
      );
    }

    // Verify user is the owner of the community
    const community = await prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community || community.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "You must be the community owner to create courses" },
        { status: 403 }
      );
    }

    // Check if slug already exists in this community
    const existingCourse = await prisma.course.findFirst({
      where: {
        communityId,
        slug,
      },
    });

    if (existingCourse) {
      return NextResponse.json(
        { error: "A course with this slug already exists in this community" },
        { status: 400 }
      );
    }

    // Create the course
    const course = await prisma.course.create({
      data: {
        title,
        slug,
        description: description || null,
        imageUrl: imageUrl || null,
        isPaid: isPaid || false,
        price: isPaid ? parseFloat(price) : 0,
        currency: currency || "USD",
        communityId,
        isPublished: false, // Start as draft
      },
    });

    return NextResponse.json(
      { success: true, course },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating course:", error);
    return NextResponse.json(
      { error: "Failed to create course" },
      { status: 500 }
    );
  }
}
