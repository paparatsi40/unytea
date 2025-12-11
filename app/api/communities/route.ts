import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-utils";

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      console.log("✗ No userId found - user not authenticated");
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { name, description, imageUrl, coverImageUrl, isPrivate, requireApproval } = body;

    console.log("Creating community:", { name, userId });

    if (!name || name.length < 3) {
      return NextResponse.json(
        { error: "Name must be at least 3 characters" },
        { status: 400 }
      );
    }

    // Generate unique slug
    let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const existingCommunity = await prisma.community.findUnique({
      where: { slug },
    });

    if (existingCommunity) {
      slug = `${slug}-${Date.now()}`;
    }

    console.log("✓ Creating with slug:", slug);

    // Create community
    const community = await prisma.community.create({
      data: {
        name,
        slug,
        description: description || null,
        ownerId: userId,
        imageUrl: imageUrl || null,
        coverImageUrl: coverImageUrl || null,
        isPrivate: isPrivate || false,
        requireApproval: requireApproval || false,
      },
    });

    console.log("✓ Community created:", community.id);

    // Add creator as admin member
    await prisma.member.create({
      data: {
        userId: userId,
        communityId: community.id,
        role: "OWNER",
        status: "ACTIVE", 
      },
    });

    console.log("✓ Member created successfully");

    return NextResponse.json({ success: true, community }, { status: 201 });
  } catch (error) {
    console.error("Error creating community:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    console.log("🔍 API: Fetching communities for user:", userId);

    // Get all communities where user is a member
    const memberships = await prisma.member.findMany({
      where: {
        userId: userId,
        status: "ACTIVE",
      },
      include: {
        community: {
          include: {
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                image: true,
              },
            },
            _count: {
              select: {
                members: true,
                posts: true,
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: "desc",
      },
    });

    console.log("✓ API: Found memberships:", memberships.length);

    const communities = memberships.map((m) => ({
      ...m.community,
      role: m.role,
    }));

    return NextResponse.json(communities);
  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch communities" },
      { status: 500 }
    );
  }
}
