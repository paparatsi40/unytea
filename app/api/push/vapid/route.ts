import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Return the VAPID public key for client-side subscription
export async function GET() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!vapidPublicKey) {
    return NextResponse.json(
      { error: "VAPID key not configured" },
      { status: 503 }
    );
  }

  return NextResponse.json({ publicKey: vapidPublicKey });
}
