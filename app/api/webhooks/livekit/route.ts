import { NextRequest, NextResponse } from "next/server";
import { handleLiveKitWebhook } from "@/app/actions/webhooks";

/**
 * POST /api/webhooks/livekit
 * 
 * Receives webhooks from LiveKit Cloud
 * Must be publicly accessible (not protected by auth)
 */
export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authorization = request.headers.get("authorization") || "";
    
    // Get raw body
    const body = await request.text();
    
    // Process webhook
    const result = await handleLiveKitWebhook(body, authorization);
    
    if (!result.success) {
      console.error("[Webhook] Failed:", result.message);
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    console.error("[Webhook] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/livekit
 * 
 * Health check endpoint for webhook URL validation
 */
export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    service: "livekit-webhook-handler",
    timestamp: new Date().toISOString(),
  });
}
