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
    const res = await handlers.GET(req);
    if (!res.ok) {
      const body = await res.clone().text();
      console.error("[UploadThing] GET non-ok response:", res.status, body);
    }
    return res;
  } catch (error) {
    console.error("[UploadThing] GET error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("[UploadThing] POST start - slug:", req.nextUrl.searchParams.get("slug"));
    const res = await handlers.POST(req);
    if (!res.ok) {
      const body = await res.clone().text();
      console.error("[UploadThing] POST non-ok response:", res.status, body);
    }
    return res;
  } catch (error) {
    console.error("[UploadThing] POST error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
