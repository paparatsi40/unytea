import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const secret = process.env.UPLOADTHING_SECRET;
  const appId = process.env.UPLOADTHING_APP_ID;

  return NextResponse.json({
    auth: {
      hasSession: !!session,
      userId: session?.user?.id ? session.user.id.substring(0, 8) + "..." : null,
    },
    env: {
      UPLOADTHING_SECRET_exists: !!secret,
      UPLOADTHING_SECRET_length: secret?.length ?? 0,
      UPLOADTHING_SECRET_prefix: secret?.substring(0, 6) ?? "MISSING",
      UPLOADTHING_APP_ID_exists: !!appId,
      UPLOADTHING_APP_ID_value: appId ?? "MISSING",
    },
  });
}
