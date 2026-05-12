import { NextResponse } from "next/server";
import {
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/authorization";

/**
 * Centralized API error handler for route handlers.
 *
 * Maps typed errors from lib/authorization.ts to HTTP status codes:
 * - UnauthorizedError → 401
 * - ForbiddenError    → 403
 * - Everything else   → 500 (logged to console)
 *
 * Use in API route handlers:
 *   try {
 *     await requireAdmin();
 *     // ... handler logic ...
 *     return NextResponse.json(data);
 *   } catch (error) {
 *     return handleApiError(error);
 *   }
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json(
      { error: error.message },
      { status: 401 }
    );
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      { error: error.message },
      { status: 403 }
    );
  }

  // Unexpected error — log full details for debugging, return generic message
  console.error("[api-error-handler] Unexpected error:", error);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
