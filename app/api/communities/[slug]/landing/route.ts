import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-utils";
import { handleApiError } from "@/lib/api-error-handler";
import { z } from "zod";

export const dynamic = "force-dynamic";

// SectionInstance.props is typed as Record<string, any> in
// components/section-builder/types.ts — specific shapes are not statically
// discoverable. We apply a lax schema that prevents payload bombs / SQL
// injection without requiring a refactor of the section components.
//
// Constraints enforced:
// - section type must be one of the 10 known SectionType literals
// - section id is a non-empty string ≤ 200 chars
// - props is a record of primitives or arrays of primitives, with each
//   string value capped at 5000 chars (enough for rich text in a section)
// - top-level array capped at 50 sections per landing
const sectionTypeSchema = z.enum([
  "hero",
  "features",
  "cta",
  "testimonials",
  "faq",
  "stats",
  "ownerBio",
  "gallery",
  "pricing",
  "video",
]);

const propValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string().max(5000),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(propValueSchema).max(50),
    z.record(propValueSchema),
  ])
);

const sectionInstanceSchema = z.object({
  id: z.string().min(1).max(200),
  type: sectionTypeSchema,
  props: z.record(propValueSchema),
});

const landingPatchSchema = z.object({
  landingLayout: z.array(sectionInstanceSchema).max(50),
});

export async function GET(_request: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  try {
    const community = await prisma.community.findUnique({
      where: { slug: params.slug },
      select: {
        id: true,
        slug: true,
        name: true,
        landingLayout: true,
      },
    });

    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      community,
      landingLayout: Array.isArray(community.landingLayout) ? community.landingLayout : [],
    });
  } catch (error) {
    console.error("Error fetching community landing layout:", error);
    return NextResponse.json({ error: "Failed to fetch landing layout" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = landingPatchSchema.parse(body);

    const community = await prisma.community.findUnique({
      where: { slug: params.slug },
      select: { id: true, ownerId: true },
    });

    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

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
        ["OWNER", "ADMIN", "MODERATOR"].includes(membership.role));

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.community.update({
      where: { id: community.id },
      data: {
        // Zod validated this is JSON-serializable; Prisma's InputJsonValue
        // needs an explicit cast because zod's recursive schema infers `unknown`.
        landingLayout: data.landingLayout as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        slug: true,
        landingLayout: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, community: updated });
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
