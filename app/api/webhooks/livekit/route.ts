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
      if (result.reason === "signature") {
        // Log with non-sensitive request metadata. Body and signature header
        // intentionally NOT logged — would aid attack reconnaissance.
        console.warn(
          `[livekit-webhook] Signature verification failed (user-agent=${
            request.headers.get("user-agent") ?? "unknown"
          }, content-length=${request.headers.get("content-length") ?? "unknown"})`
        );
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // config and processing are already logged at console.error inside
      // handleLiveKitWebhook. Both map to 500: config asks the operator to
      // fix env vars, processing is usually transient and worth a retry.
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    console.error("[Webhook] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
