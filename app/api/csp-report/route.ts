import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimiters, getIP } from "@/lib/rate-limit";

// Storage caps. Attackers can control parts of the CSP report payload (the URLs
// they trigger violations against), so bound the columns we persist.
const MAX_DIRECTIVE_LEN = 200;
const MAX_BLOCKED_URI_LEN = 2000;
const MAX_DOCUMENT_URI_LEN = 2000;
const MAX_SOURCE_FILE_LEN = 2000;
const MAX_USER_AGENT_LEN = 500;

function clip(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  return value.length > max ? value.slice(0, max) : value;
}

function asInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }
  return null;
}

/**
 * POST /api/csp-report
 *
 * Receives CSP violation reports declared via `report-uri` in next.config.mjs.
 * Accepts both formats browsers send:
 *   - application/csp-report  (legacy, the format real-world browsers still use today)
 *   - application/reports+json (modern Reporting API, sent as an array of report objects)
 *
 * The response is always 204 No Content. Failure paths return 204 too — browsers
 * don't retry CSP reports, and a non-204 response leaks information about the
 * server's state to anyone who can hit this endpoint.
 */
export async function POST(request: NextRequest) {
  try {
    // Per-IP rate limit. A single misbehaving browser extension can fire dozens
    // of violations per page load; we still want a representative sample but not
    // unbounded ingestion.
    const ip = getIP(request);
    const limit = await rateLimiters.cspReport.check(`csp-report:${ip}`);
    if (!limit.success) {
      return new NextResponse(null, { status: 204 });
    }

    const contentType = request.headers.get("content-type") ?? "";

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new NextResponse(null, { status: 204 });
    }

    // Extract the actual violation record from whatever envelope the browser used.
    let report: Record<string, unknown> | null = null;
    if (contentType.includes("application/csp-report")) {
      // { "csp-report": { ... } }
      const wrapped = (body as { "csp-report"?: unknown })?.["csp-report"];
      report = wrapped && typeof wrapped === "object" ? (wrapped as Record<string, unknown>) : null;
    } else if (contentType.includes("application/reports+json")) {
      // [{ "type": "csp-violation", "body": { ... } }, ...]
      const first = Array.isArray(body) ? (body[0] as { body?: unknown } | undefined) : undefined;
      report =
        first && typeof first.body === "object" && first.body !== null
          ? (first.body as Record<string, unknown>)
          : null;
    } else if (body && typeof body === "object") {
      // Some clients send plain application/json — accept either envelope.
      const maybeWrapped = (body as { "csp-report"?: unknown })["csp-report"];
      report = maybeWrapped && typeof maybeWrapped === "object"
        ? (maybeWrapped as Record<string, unknown>)
        : (body as Record<string, unknown>);
    }

    if (!report) {
      return new NextResponse(null, { status: 204 });
    }

    // Legacy keys use dashes; Reporting API keys are camelCase. Accept both.
    const directive = clip(report["violated-directive"] ?? report["effective-directive"] ?? report.effectiveDirective, MAX_DIRECTIVE_LEN) ?? "unknown";
    const blockedUri = clip(report["blocked-uri"] ?? report.blockedURL, MAX_BLOCKED_URI_LEN) ?? "";
    const documentUri = clip(report["document-uri"] ?? report.documentURL, MAX_DOCUMENT_URI_LEN);
    const sourceFile = clip(report["source-file"] ?? report.sourceFile, MAX_SOURCE_FILE_LEN);
    const lineNumber = asInt(report["line-number"] ?? report.lineNumber);
    const columnNumber = asInt(report["column-number"] ?? report.columnNumber);
    const userAgent = clip(request.headers.get("user-agent"), MAX_USER_AGENT_LEN);

    // Reporting API supplies `disposition: "enforce" | "reporting"`. Legacy CSP
    // reports don't, in which case default to "enforce" (the conservative choice
    // — we'd rather over-attribute than mis-attribute Report-Only violations).
    const disposition = typeof report.disposition === "string" ? report.disposition : "enforce";
    const mode = disposition === "reporting" ? "report-only" : "enforce";

    await prisma.cspViolation.create({
      data: {
        directive,
        blockedUri,
        documentUri,
        sourceFile,
        lineNumber,
        columnNumber,
        userAgent,
        mode,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    // Silent on failure. Browsers don't retry CSP reports, and surfacing the
    // error to the caller would let an attacker probe the system state.
    console.error("[csp-report] Failed to record violation:", error);
    return new NextResponse(null, { status: 204 });
  }
}
