import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const handlers = createRouteHandler({
  router: ourFileRouter,
});

export async function GET(req: NextRequest) {
  try {
    console.log("[UploadThing Route] GET request:", req.url);
    console.log("[UploadThing Route] UPLOADTHING_SECRET exists:", !!process.env.UPLOADTHING_SECRET);
    console.log("[UploadThing Route] UPLOADTHING_SECRET prefix:", process.env.UPLOADTHING_SECRET?.substring(0, 6));
    console.log("[UploadThing Route] UPLOADTHING_APP_ID exists:", !!process.env.UPLOADTHING_APP_ID);
    return await handlers.GET(req);
  } catch (error) {
    console.error("[UploadThing Route] GET error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("[UploadThing Route] POST request:", req.url);
    console.log("[UploadThing Route] UPLOADTHING_SECRET exists:", !!process.env.UPLOADTHING_SECRET);
    console.log("[UploadThing Route] UPLOADTHING_SECRET prefix:", process.env.UPLOADTHING_SECRET?.substring(0, 6));
    console.log("[UploadThing Route] UPLOADTHING_APP_ID exists:", !!process.env.UPLOADTHING_APP_ID);
    return await handlers.POST(req);
  } catch (error) {
    console.error("[UploadThing Route] POST error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
