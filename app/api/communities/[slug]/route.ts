import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth();
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId") || session?.user?.id;

    // Get community by slug
    const community = await prisma.community.findUnique({
      where: { slug: slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        coverImageUrl: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
        layoutType: true,
        isPrivate: true,
        isPaid: true,
        requireApproval: true,
        membershipPrice: true,
        memberCount: true,
        postCount: true,
        landingLayout: true,
        ownerId: true,
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            members: true,
            posts: true,
            courses: true,
          },
        },
      },
    });

    if (!community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    // Transform to match expected format
    const communityData = {
      ...community,
      _count: {
        members: community._count.members || community.memberCount,
        posts: community._count.posts || community.postCount,
        courses: community._count.courses || 0,
      },
    };

    // If userId provided, check membership
    let membership = null;
    if (userId) {
      membership = await prisma.member.findUnique({
        where: {
          userId_communityId: {
            userId,
            communityId: community.id,
          },
        },
        select: {
          role: true,
          status: true,
        },
      });
    }

    return NextResponse.json({ 
      community: communityData, 
      membership,
    });
  } catch (error) {
    console.error("Error fetching community:", error);
    return NextResponse.json(
      { error: "Failed to fetch community" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get community to verify ownership
    const community = await prisma.community.findUnique({
      where: { slug: slug },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    // Check if user is the owner
    if (community.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the owner can update community settings" },
        { status: 403 }
      );
    }

    // Parse update data
    const body = await request.json();
    const { name, description, slug: newSlug, isPrivate, requireApproval } = body;

    // Build update object
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (newSlug !== undefined) {
      // Validate slug is unique
      const existingCommunity = await prisma.community.findUnique({
        where: { slug: newSlug },
      });
      
      if (existingCommunity && existingCommunity.id !== community.id) {
        return NextResponse.json(
          { error: "Slug already in use" },
          { status: 400 }
        );
      }
      
      updateData.slug = newSlug;
    }
    if (isPrivate !== undefined) updateData.isPrivate = isPrivate;
    if (requireApproval !== undefined) updateData.requireApproval = requireApproval;

    // Update community
    const updatedCommunity = await prisma.community.update({
      where: { id: community.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      community: updatedCommunity,
    });
  } catch (error) {
    console.error("Error updating community:", error);
    return NextResponse.json(
      { error: "Failed to update community" },
      { status: 500 }
    );
  }
}
