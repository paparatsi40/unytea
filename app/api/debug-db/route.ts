import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    DATABASE_URL_set: !!process.env.DATABASE_URL,
    DATABASE_URL_prefix: process.env.DATABASE_URL?.substring(0, 30) + "...",
    DIRECT_URL_set: !!process.env.DIRECT_URL,
  };

  // Test 1: Simple query
  try {
    const count = await prisma.community.count();
    results.communityCount = count;
    results.dbConnection = "OK";
  } catch (err: unknown) {
    const error = err as Error & { code?: string; meta?: unknown };
    results.dbConnection = "FAILED";
    results.errorName = error.name;
    results.errorMessage = error.message;
    results.errorCode = error.code;
    results.errorMeta = error.meta;
  }

  // Test 2: Prisma client version
  try {
    results.prismaVersion = (prisma as unknown as Record<string, unknown>)._engineConfig
      ? "engine configured"
      : "unknown";
  } catch {
    results.prismaVersion = "could not detect";
  }

  return NextResponse.json(results);
}
