import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createClient();

    // Fetch owned communities
    const { data: ownedCommunities, error: ownedError } = await supabase
      .from("communities")
      .select("*")
      .eq("ownerId", session.user.id)
      .order("createdAt", { ascending: false });

    if (ownedError) {
      console.error("Error fetching owned communities:", ownedError);
    }

    // Fetch joined communities
    const { data: memberCommunities, error: memberError } = await supabase
      .from("community_members")
      .select(`
        community:communities(*)
      `)
      .eq("userId", session.user.id)
      .neq("communities.ownerId", session.user.id);

    if (memberError) {
      console.error("Error fetching joined communities:", memberError);
    }

    const joinedCommunities = memberCommunities?.map(m => m.community).filter(Boolean) || [];

    return NextResponse.json({
      success: true,
      ownedCommunities: ownedCommunities || [],
      joinedCommunities: joinedCommunities,
    });
  } catch (error) {
    console.error("Error in user-communities API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
