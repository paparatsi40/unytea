import { NextRequest, NextResponse } from "next/server";
import { CommunityCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-utils";

const LANGUAGE_PATTERN = /^[a-zA-Z-]{2,8}$/;
// Object.values(enum) returns only own enumerable string values, so the Set
// excludes prototype methods. `value in CommunityCategory` would have
// returned true for "hasOwnProperty" → Prisma error → 500.
const VALID_CATEGORIES = new Set<CommunityCategory>(
  Object.values(CommunityCategory) as CommunityCategory[]
);

function isCommunityCategory(value: unknown): value is CommunityCategory {
  return typeof value === "string" && VALID_CATEGORIES.has(value as CommunityCategory);
}

export async function GET(_request: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  try {
    // SECURITY: derive userId from session, never from query string.
    // Previously this route trusted `?userId=` from the URL, allowing any
    // caller to probe membership of any user in any community (IDOR).
    const sessionUserId = await getCurrentUserId();

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
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    // Membership lookup uses session-derived userId only.
    let membership = null;
    if (sessionUserId) {
      membership = await prisma.member.findUnique({
        where: {
          userId_communityId: {
            userId: sessionUserId,
            communityId: community.id,
          },
        },
        select: {
          role: true,
          status: true,
        },
      });
    }

    // Private community gate: only owner or ACTIVE member sees the resource.
    // Return 404 (not 403) so the existence of a private community is not
    // disclosed to unauthorized callers.
    if (community.isPrivate) {
      const isActiveMember = membership?.status === "ACTIVE";
      const isOwner = sessionUserId !== null && community.ownerId === sessionUserId;
      if (!isActiveMember && !isOwner) {
        return NextResponse.json({ error: "Community not found" }, { status: 404 });
      }
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
    return NextResponse.json({ error: "Failed to fetch community" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const community = await prisma.community.findUnique({
      where: { slug: params.slug },
      select: { id: true, ownerId: true },
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
      (membership?.status === "ACTIVE" && ["OWNER", "ADMIN"].includes(membership.role));

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

    // category / language / excludeFromExplore now live in top-level typed
    // columns (Commit 1 of feat/restore-explore PR). Pre-existing values
    // stored in the `settings` JSON are NOT touched here — they become dead
    // JSON. No backfill: hosts re-save settings to populate the typed columns.
    if (body.category !== undefined) {
      if (body.category === "" || body.category === null) {
        data.category = null;
      } else if (isCommunityCategory(body.category)) {
        data.category = body.category;
      } else {
        return NextResponse.json(
          { error: "Invalid category" },
          { status: 400 }
        );
      }
    }
    if (body.language !== undefined) {
      if (body.language === "" || body.language === null) {
        data.language = null;
      } else if (typeof body.language === "string" && LANGUAGE_PATTERN.test(body.language)) {
        data.language = body.language;
      } else {
        return NextResponse.json(
          { error: "Invalid language (expected ISO 639-1, 2-8 chars)" },
          { status: 400 }
        );
      }
    }
    if (body.excludeFromExplore !== undefined) {
      data.excludeFromExplore = Boolean(body.excludeFromExplore);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
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
        category: true,
        language: true,
        excludeFromExplore: true,
        settings: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, community: updated });
  } catch (error) {
    console.error("Error updating community:", error);
    return NextResponse.json({ error: "Failed to update community" }, { status: 500 });
  }
}
