import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const handlers = createRouteHandler({
  router: ourFileRouter,
});

export async function GET(req: NextRequest) {
  try {
    return await handlers.GET(req);
  } catch (error: any) {
    console.error("[UploadThing GET] Full error:", JSON.stringify({
      message: error?.message,
      name: error?.name,
      cause: error?.cause ? String(error.cause) : undefined,
      stack: error?.stack?.split("\n").slice(0, 5),
    }));
    return NextResponse.json({
      error: error?.message || "Unknown",
      name: error?.name,
      cause: error?.cause ? String(error.cause) : undefined,
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    return await handlers.POST(req);
  } catch (error: any) {
    // Log everything we can about this error
    const errorInfo = {
      message: error?.message,
      name: error?.name,
      cause: error?.cause ? String(error.cause) : undefined,
      stack: error?.stack?.split("\n").slice(0, 8),
      keys: error ? Object.keys(error) : [],
      raw: String(error),
    };
    console.error("[UploadThing POST] Full error:", JSON.stringify(errorInfo, null, 2));

    return NextResponse.json({
      uploadthingError: errorInfo,
    }, { status: 500 });
  }
}
