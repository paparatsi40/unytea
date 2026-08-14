import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { sessionCookieName, shouldUseSecureCookies } from "@/lib/auth-cookies";

// `logout` runs through the defineAction seam, which resolves a rate-limit
// identity from request headers. Same stubs the seam's own tests use.
const mockRateLimitCheck = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  rateLimiters: {
    api: { check: (...a: unknown[]) => mockRateLimitCheck(...a) },
    general: { check: (...a: unknown[]) => mockRateLimitCheck(...a) },
    create: { check: (...a: unknown[]) => mockRateLimitCheck(...a) },
    message: { check: (...a: unknown[]) => mockRateLimitCheck(...a) },
    ai: { check: (...a: unknown[]) => mockRateLimitCheck(...a) },
    auth: { check: (...a: unknown[]) => mockRateLimitCheck(...a) },
    cspReport: { check: (...a: unknown[]) => mockRateLimitCheck(...a) },
  },
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

/**
 * Logging out took two clicks.
 *
 * Captured against a running dev server, the two outcomes of
 * POST /api/auth/signout are indistinguishable to the client:
 *
 *   without the CSRF cookie          with the CSRF cookie
 *   ─────────────────────────────    ──────────────────────────────────────
 *   HTTP 200                         HTTP 200
 *   (no Set-Cookie)                  set-cookie: next-auth.session-token=;
 *                                      Max-Age=0; Path=/; HttpOnly
 *   {"url": ".../auth/signin         {"url": "https://www.unytea.com"}
 *      ?error=MissingCSRF"}
 *
 * `next-auth/react`'s signOut() does `window.location.href = data.url` without
 * looking at which of those it received, so a refused signout navigates exactly
 * like a successful one and the session token stays in the jar. The second
 * click succeeds because the GET to /api/auth/csrf during the first attempt
 * left the cookie behind.
 *
 * Why the cookie was missing: the app configured its session cookie's `secure`
 * flag and name prefix from NODE_ENV, while @auth/core derives every cookie it
 * names itself from `url.protocol === "https:"` on the auth URL, and the app's
 * config is merged on top. Where those disagree — an https auth URL with
 * NODE_ENV !== "production", i.e. local dev and preview deploys — the CSRF
 * cookie went out as `__Host-authjs.csrf-token; Secure` while the session
 * cookie went out plain, and a browser will not store a __Host- cookie over
 * http.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (![".next", "node_modules"].includes(entry.name)) walk(p, out);
    } else if (/\.tsx?$/.test(entry.name)) out.push(p);
  }
  return out;
}

describe("logout runs on the server, atomically", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimitCheck.mockResolvedValue({ success: true });
  });

  it("calls the server-side signOut exactly once, redirecting to the home page", async () => {
    const { signOut } = await import("@/lib/auth");
    const { logout } = await import("@/app/actions/auth");

    await logout();

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/" });
  });

  it("uses redirectTo, not the v4 callbackUrl option", async () => {
    // next-auth v5's server signOut takes `redirectTo`; a stray `callbackUrl`
    // is silently ignored and the redirect falls back to the current URL —
    // which is the dashboard, and is how you land back where you started.
    const { signOut } = await import("@/lib/auth");
    const { logout } = await import("@/app/actions/auth");

    await logout();

    const options = vi.mocked(signOut).mock.calls[0][0] as Record<string, unknown>;
    expect(options).not.toHaveProperty("callbackUrl");
    expect(options.redirectTo).toBe("/");
  });

  it("is reachable without a valid session, because that is when it is needed", async () => {
    // auth: "public". A user whose token has already expired still has cookies
    // to clear; requiring a session to end one fails closed exactly then.
    const { auth } = await import("@/lib/auth");
    const { signOut } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(null as never);
    const { logout } = await import("@/app/actions/auth");

    await logout();

    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("the seam re-throws Next's redirect instead of folding it into a failure", async () => {
    // signOut navigates by throwing NEXT_REDIRECT. If defineAction's catch
    // swallowed it, the logout would silently do nothing — the original bug in
    // a new costume.
    const { signOut } = await import("@/lib/auth");
    const redirectError = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT;replace;/;307;",
    });
    vi.mocked(signOut).mockRejectedValueOnce(redirectError);
    const { logout } = await import("@/app/actions/auth");

    await expect(logout()).rejects.toThrow("NEXT_REDIRECT");
  });

  it("is a server action", () => {
    const source = read("app/actions/auth.ts");
    expect(source.startsWith('"use server"')).toBe(true);
  });

  it("goes through the authorization seam like every other action", () => {
    const source = read("app/actions/auth.ts");
    expect(source).toContain("defineAction(");
    expect(source).toContain('auth: "public"');
  });

  it("does not swallow the redirect", () => {
    // signOut performs the navigation by throwing NEXT_REDIRECT. A try/catch
    // around it would turn a successful logout into a silent no-op.
    const body = read("app/actions/auth.ts").slice(
      read("app/actions/auth.ts").indexOf("export async function logout")
    );
    expect(body).not.toContain("catch");
  });
});

describe("no client-side signOut survives", () => {
  it("the control invokes the server action and never navigates itself", () => {
    const button = read("components/auth/LogoutButton.tsx");
    expect(button).toContain('import { logout } from "@/app/actions/auth"');
    // Navigating from the client is what let the browser move while the
    // session was still alive.
    expect(button).not.toContain("window.location");
    expect(button).not.toContain("router.push");
    expect(button).not.toContain("router.replace");
  });

  const sources = [
    ...walk(path.join(REPO_ROOT, "app")),
    ...walk(path.join(REPO_ROOT, "components")),
  ];

  it("finds the files it claims to scan", () => {
    expect(sources.length).toBeGreaterThan(200);
  });

  it("nothing imports signOut from next-auth/react", () => {
    // The client helper is the bug: it navigates on a 200 without checking
    // whether the 200 meant "signed out" or "refused".
    const offenders = sources
      .filter((file) =>
        /import\s*\{[^}]*\bsignOut\b[^}]*\}\s*from\s*["']next-auth\/react["']/.test(
          fs.readFileSync(file, "utf8")
        )
      )
      .map((file) => path.relative(REPO_ROOT, file).split(path.sep).join("/"));

    expect(offenders).toEqual([]);
  });

  it("both logout controls submit to the server action", () => {
    for (const file of [
      "components/dashboard/header.tsx",
      "app/(dashboard)/dashboard/settings/account/page.tsx",
    ]) {
      const source = read(file);
      expect(source, `${file} should render the shared control`).toContain(
        'import { LogoutButton } from "@/components/auth/LogoutButton"'
      );
      expect(source, `${file} should use it`).toContain("<LogoutButton");
      // The replacement comment quotes signOut() deliberately; scan code only.
      const withoutComments = source
        .replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "")
        .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
      expect(withoutComments, `${file} should not call signOut on the client`).not.toContain(
        "signOut("
      );
    }
  });
});

/**
 * The condition that made the CSRF cookie unstorable in the first place.
 *
 * The rule lives in lib/auth-cookies.ts — no NextAuth import — precisely so it
 * can be asserted directly instead of through a mock of the whole auth
 * instance.
 */
describe("auth cookie security is derived from one signal", () => {
  it.each([
    ["https://www.unytea.com", true],
    ["https://unytea.com", true],
    ["http://localhost:3000", false],
    ["http://127.0.0.1:3000", false],
  ])("%s → secure cookies: %s", (url, expected) => {
    expect(shouldUseSecureCookies({ NEXTAUTH_URL: url })).toBe(expected);
  });

  it("prefers AUTH_URL over NEXTAUTH_URL, as @auth/core does", () => {
    expect(
      shouldUseSecureCookies({ AUTH_URL: "http://localhost:3000", NEXTAUTH_URL: "https://x.com" })
    ).toBe(false);
  });

  it("defaults to secure when no auth URL is configured", () => {
    // Erring the other way would ship a session cookie without Secure.
    expect(shouldUseSecureCookies({})).toBe(true);
  });

  it("defaults to secure on an unparseable URL rather than silently downgrading", () => {
    expect(shouldUseSecureCookies({ NEXTAUTH_URL: "not a url" })).toBe(true);
  });

  it("prefixes the cookie name to match its own secure flag", () => {
    // A browser rejects the cookie outright if __Secure- and the flag disagree,
    // so both have to come from the same decision.
    expect(sessionCookieName({ NEXTAUTH_URL: "https://www.unytea.com" })).toBe(
      "__Secure-next-auth.session-token"
    );
    expect(sessionCookieName({ NEXTAUTH_URL: "http://localhost:3000" })).toBe(
      "next-auth.session-token"
    );
  });

  it("keeps the production cookie name unchanged, so live sessions survive", () => {
    // The fix must not log everyone out on deploy.
    expect(sessionCookieName({ NEXTAUTH_URL: "https://www.unytea.com" })).toBe(
      "__Secure-next-auth.session-token"
    );
  });

  it("matches the rule @auth/core applies to the cookies it names itself", () => {
    // @auth/core/lib/init.js:
    //   defaultCookies(config.useSecureCookies ?? url.protocol === "https:")
    expect(read("node_modules/@auth/core/lib/init.js")).toContain('url.protocol === "https:"');
    expect(read("lib/auth-cookies.ts")).toContain('new URL(url).protocol === "https:"');
  });

  it("lib/auth.ts no longer keys the decision off NODE_ENV", () => {
    const auth = read("lib/auth.ts");
    expect(auth).not.toMatch(/secure:\s*process\.env\.NODE_ENV === "production"/);
    expect(auth).toContain("secure: shouldUseSecureCookies()");
    expect(auth).toContain("name: sessionCookieName()");
  });
});

/**
 * After signing out there is no session, so the protected routes must refuse
 * and the home page must not bounce anyone back into the app.
 */
describe("with no session, the app behaves like signed out", () => {
  it("an unauthenticated request to a protected route is sent to sign-in", async () => {
    const proxy = read("proxy.ts");
    // The guard: protected route + no session → /auth/signin.
    expect(proxy).toContain("if (!isLoggedIn)");
    expect(proxy).toContain('NextResponse.redirect(new URL("/auth/signin", req.url))');
  });

  it("treats /dashboard as protected", () => {
    const proxy = read("proxy.ts");
    expect(proxy).toContain('path.startsWith("/dashboard")');
  });

  it("never redirects the home page to the dashboard", () => {
    // The signed-in → /dashboard redirect is scoped to /auth/* only. If it ever
    // covered "/", a user whose session had just been cleared would still be
    // bounced back on the way out, and the logout would look like it failed.
    const proxy = read("proxy.ts");
    const dashboardRedirects = [...proxy.matchAll(/redirect\(new URL\("\/dashboard"[^)]*\)\)/g)];
    expect(dashboardRedirects.length).toBeGreaterThan(0);

    for (const match of dashboardRedirects) {
      const preceding = proxy.slice(Math.max(0, match.index! - 400), match.index!);
      expect(preceding, "every /dashboard redirect must be gated on an auth route").toContain(
        "isAuthRoute"
      );
    }
  });

  it("no page redirects an authenticated visitor from the home page", () => {
    const home = read("app/[locale]/page.tsx");
    expect(home).not.toMatch(/redirect\(\s*["'`]\/dashboard/);
  });
});
