import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * The codebase keeps a privacy posture it was not actually enforcing.
 *
 * `lib/jobs/session-jobs.ts` logs a userId and refuses to log the email beside
 * it, with a comment saying why. Meanwhile `createCommunity` printed
 * `userExists.email` to the production log on every community creation, and all
 * three Sentry configs ran with `sendDefaultPii: true`, which attaches IP
 * addresses, cookies and request headers to every event sent to a third party.
 *
 * `getResources` also carried eight debug `console.log` calls, one of which
 * existed only to report the result of an extra `prisma.resource.count()` —
 * a wasted query on every single call.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");

function code(relativePath: string): string {
  return fs
    .readFileSync(path.join(REPO_ROOT, relativePath), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const SENTRY_CONFIGS = [
  "sentry.server.config.ts",
  "sentry.edge.config.ts",
  "instrumentation-client.ts",
];

describe("Sentry", () => {
  it.each(SENTRY_CONFIGS)("%s does not ship PII by default", (file) => {
    const source = code(file);

    expect(source).toContain("sendDefaultPii: false");
    expect(source).not.toContain("sendDefaultPii: true");
  });
});

describe("debug instrumentation", () => {
  it("createCommunity does not log a user's email", () => {
    const source = code("app/actions/communities.ts");

    expect(source).not.toContain("userExists.email");
    expect(source).not.toContain("Creating community for user");
  });

  it("createCommunity no longer selects the email it stopped logging", () => {
    // The row is still fetched — `platformPlan` feeds the plan gate — but there
    // is no longer a reason to pull the address out of the database at all.
    const source = code("app/actions/communities.ts");
    const select = source.slice(
      source.indexOf("const userExists"),
      source.indexOf("if (!userExists)")
    );

    expect(select).toContain("platformPlan: true");
    expect(select).not.toContain("email: true");
  });

  it("getResources runs no extra count query for logging", () => {
    const source = code("app/actions/resources.ts");

    expect(source).not.toContain("ALL resources in community");
    expect(source).not.toContain("const allResources");
  });

  it("getResources carries no debug logging", () => {
    const source = code("app/actions/resources.ts");
    const debugLogs = source.match(/console\.log\(\s*"\[getResources\]/g) ?? [];

    expect(debugLogs).toEqual([]);
  });
});
