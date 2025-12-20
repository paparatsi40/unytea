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
    console.log("📤 UploadThing GET request");
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
    console.log("📤 UploadThing POST request");
    console.log("📋 Environment check:");
    console.log("  - UPLOADTHING_SECRET:", process.env.UPLOADTHING_SECRET ? "✅ Set" : "❌ Missing");
    console.log("  - UPLOADTHING_APP_ID:", process.env.UPLOADTHING_APP_ID ? "✅ Set" : "❌ Missing");
    console.log("  - UPLOADTHING_TOKEN:", process.env.UPLOADTHING_TOKEN ? "✅ Set" : "❌ Missing");
    
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
