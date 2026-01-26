import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Valid layout types
const VALID_LAYOUT_TYPES = [
  'MODERN_GRID',
  'CLASSIC_FORUM',
  'ACADEMY',
  'DASHBOARD',
  'MINIMALIST',
  'SOCIAL_HUB'
] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Await params first (Next.js 15+)
    const { slug } = await params;
    
    console.log('[BRANDING] 🎨 Received branding update request for slug:', slug);
    
    const session = await auth();
    if (!session?.user?.id) {
      console.log('[BRANDING] ❌ Unauthorized - no session');
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log('[BRANDING] ✅ User authenticated:', session.user.id);

    // Check if user is the community owner
    const community = await prisma.community.findUnique({
      where: { slug: slug },
      select: { id: true, ownerId: true, name: true },
    });

    if (!community) {
      console.log('[BRANDING] ❌ Community not found:', slug);
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    console.log('[BRANDING] ✅ Community found:', community.name, '(', community.id, ')');

    if (community.ownerId !== session.user.id) {
      console.log('[BRANDING] ❌ Permission denied - user is not owner');
      return NextResponse.json(
        { error: "You don't have permission to update this community" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { imageUrl, coverImageUrl, primaryColor, secondaryColor, accentColor, layoutType } = body;

    console.log('[BRANDING] 📝 Update request:', { 
      hasImageUrl: !!imageUrl,
      hasCoverImageUrl: !!coverImageUrl,
      layoutType, 
      colors: { primaryColor, secondaryColor, accentColor } 
    });

    // Build update object with only provided fields
    const updateData: any = {};
    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl;
      console.log('[BRANDING] 🖼️ Updating logo:', imageUrl);
    }
    if (coverImageUrl !== undefined) {
      updateData.coverImageUrl = coverImageUrl;
      console.log('[BRANDING] 🌄 Updating cover:', coverImageUrl);
    }
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
    if (accentColor !== undefined) updateData.accentColor = accentColor;
    
    // Validate layoutType if provided
    if (layoutType !== undefined) {
      if (!VALID_LAYOUT_TYPES.includes(layoutType)) {
        console.error('[BRANDING] ❌ Invalid layoutType:', layoutType);
        return NextResponse.json(
          { error: `Invalid layout type. Must be one of: ${VALID_LAYOUT_TYPES.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.layoutType = layoutType;
    }

    // Update community
    const updatedCommunity = await prisma.community.update({
      where: { id: community.id },
      data: updateData,
    });

    console.log('[BRANDING] ✅ Update successful!', { 
      id: updatedCommunity.id, 
      layoutType: updatedCommunity.layoutType,
      hasLogo: !!updatedCommunity.imageUrl,
      hasCover: !!updatedCommunity.coverImageUrl
    });

    return NextResponse.json({ 
      success: true,
      community: updatedCommunity 
    });
  } catch (error) {
    console.error("[BRANDING] ❌ Error updating community branding:", error);
    console.error("[BRANDING] ❌ Error stack:", error instanceof Error ? error.stack : "No stack");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update community branding" },
      { status: 500 }
    );
  }
}
