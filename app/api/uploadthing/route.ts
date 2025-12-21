import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";
import { NextRequest, NextResponse } from "next/server";

const { GET: originalGET, POST: originalPOST } = createRouteHandler({
  router: ourFileRouter,
  config: {
    logLevel: "Debug",
  },
});

export async function GET(req: NextRequest) {
  try {
    return await originalGET(req);
  } catch (error) {
    console.error("❌ UploadThing GET error:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "UploadThing GET failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    return await originalPOST(req);
  } catch (error) {
    console.error("❌ UploadThing POST error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack");
    return NextResponse.json(
      { error: "UploadThing POST failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
