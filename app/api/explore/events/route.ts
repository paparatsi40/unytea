import { NextResponse } from "next/server";

type ExploreEventName =
  | "community_card_impression"
  | "community_card_click"
  | "community_join_click"
  | "community_join_success";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      eventName?: ExploreEventName;
      communityId?: string;
      communitySlug?: string;
      source?: string;
      rank?: number;
      sort?: string;
      locale?: string;
      metadata?: Record<string, unknown>;
    };

    if (!body.eventName || !body.communityId) {
      return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
    }

    console.info("[ExploreEvent]", {
      at: new Date().toISOString(),
      ...body,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Explore event tracking error", error);
    return NextResponse.json({ success: false, error: "Failed to track event" }, { status: 500 });
  }
}
