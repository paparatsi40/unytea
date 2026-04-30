import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    // Get community
    const community = await prisma.community.findUnique({
      where: { slug: params.slug },
      include: {
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
      image: community.imageUrl,
      coverImage: community.coverImageUrl,
      _count: {
        members: community._count.members,
        posts: community._count.posts,
        courses: community._count.courses,
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
      // Also return just the data for simple queries
      id: community.id,
      name: community.name,
      slug: community.slug,
      landingLayout: community.landingLayout,
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
  { params }: { params: { slug: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const community = await prisma.community.findUnique({
      where: { slug: params.slug },
      select: { id: true, ownerId: true, settings: true },
    });

    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    // Permission: owner or active OWNER/ADMIN member.
    const membership = await prisma.member.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId: community.id,
        },
      },
      select: { role: true, status: true },
    });

    const canEdit =
      community.ownerId === userId ||
      (membership?.status === "ACTIVE" &&
        ["OWNER", "ADMIN"].includes(membership.role));

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));

    // Whitelist what can be updated through this endpoint.
    const data: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim().length > 0) {
      data.name = body.name.trim();
    }
    if (typeof body.description === "string") {
      data.description = body.description;
    }
    if (typeof body.isPrivate === "boolean") {
      data.isPrivate = body.isPrivate;
    }
    if (typeof body.requireApproval === "boolean") {
      data.requireApproval = body.requireApproval;
    }

    // category + language live inside the settings JSON. Merge, don't overwrite.
    const hasCategoryUpdate = typeof body.category === "string";
    const hasLanguageUpdate = typeof body.language === "string";
    if (hasCategoryUpdate || hasLanguageUpdate) {
      const currentSettings =
        community.settings && typeof community.settings === "object"
          ? (community.settings as Record<string, unknown>)
          : {};
      const nextSettings = { ...currentSettings };
      if (hasCategoryUpdate) {
        const trimmed = (body.category as string).trim();
        if (trimmed.length > 0) {
          nextSettings.category = trimmed;
        } else {
          delete nextSettings.category;
        }
      }
      if (hasLanguageUpdate) {
        const trimmed = (body.language as string).trim();
        if (trimmed.length > 0) {
          nextSettings.language = trimmed;
        } else {
          delete nextSettings.language;
        }
      }
      data.settings = nextSettings;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const updated = await prisma.community.update({
      where: { id: community.id },
      data: data as any,
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        isPrivate: true,
        requireApproval: true,
        settings: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, community: updated });
  } catch (error) {
    console.error("Error updating community:", error);
    return NextResponse.json(
      { error: "Failed to update community" },
      { status: 500 }
    );
  }
}
