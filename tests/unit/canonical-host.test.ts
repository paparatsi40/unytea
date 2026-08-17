import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";

/**
 * The site answered on both `unytea.com` and `www.unytea.com`.
 *
 * Auth cookies carry the `__Host-` / `__Secure-` prefixes, and `__Host-` pins a
 * cookie to the exact host that set it — the prefix forbids a `Domain`
 * attribute entirely. A CSRF or session cookie written on one host is therefore
 * simply absent on the other. That is not hypothetical: it is one of the ways
 * logout broke in production, and it can break login or CSRF at random
 * depending on which host a visitor happens to land on.
 *
 * The cure is a single host. These tests hold both halves of it: the edge sends
 * `www` to the apex, and nothing the code emits points at `www` any more.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");

vi.mock("@/lib/auth", () => ({
  // proxy.ts calls auth() at module load to build its middleware.
  auth: (handler: unknown) => handler,
}));

// next-intl's middleware reaches for `next/server` through a path vitest cannot
// resolve. The canonical redirect returns before any of it runs, so a stub that
// records the pass-through is enough — and it doubles as proof that the
// redirect short-circuits before locale handling.
const intlCalls: string[] = [];
vi.mock("next-intl/middleware", () => ({
  default: () => (req: { url: string }) => {
    intlCalls.push(req.url);
    return new Response(null, { status: 200 });
  },
}));

function read(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

/** Source with comments stripped — they legitimately name the retired host. */
function code(relativePath: string): string {
  return read(relativePath)
    .replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
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

async function proxyFor(host: string, url: string) {
  const { default: proxy } = await import("@/proxy");
  const req = new NextRequest(url, { headers: { host } });
  return proxy(req);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("www redirects to the apex", () => {
  it("308s, so a POST keeps its method", async () => {
    const res = await proxyFor("www.unytea.com", "https://www.unytea.com/en/pricing");

    // 301 permits a client to rewrite the method to GET; 308 does not.
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://unytea.com/en/pricing");
  });

  it("preserves the path", async () => {
    const res = await proxyFor("www.unytea.com", "https://www.unytea.com/en/c/my-community/join");

    expect(res.headers.get("location")).toBe("https://unytea.com/en/c/my-community/join");
  });

  it("preserves the query string", async () => {
    const res = await proxyFor(
      "www.unytea.com",
      "https://www.unytea.com/en/c/x/join?plan=vip&ref=email"
    );

    // Dropping the query would silently lose the plan a visitor picked.
    expect(res.headers.get("location")).toBe("https://unytea.com/en/c/x/join?plan=vip&ref=email");
  });

  it("preserves the bare root", async () => {
    const res = await proxyFor("www.unytea.com", "https://www.unytea.com/");

    expect(res.headers.get("location")).toBe("https://unytea.com/");
  });

  it("matches the host case-insensitively", async () => {
    // Host headers are not case-normalized by every client.
    const res = await proxyFor("WWW.UNYTEA.COM", "https://www.unytea.com/en");

    expect(res.status).toBe(308);
  });
});

describe("no redirect loop, and no collateral damage", () => {
  it("the apex does not redirect", async () => {
    const res = await proxyFor("unytea.com", "https://unytea.com/en");

    // The condition that would loop.
    expect(res.status).not.toBe(308);
  });

  it("preview deploys are left alone", async () => {
    // Rewriting a preview's origin would fling its traffic at production.
    const res = await proxyFor(
      "unytea-git-branch-carlos.vercel.app",
      "https://unytea-git-branch-carlos.vercel.app/en"
    );

    expect(res.status).not.toBe(308);
  });

  it("localhost is left alone", async () => {
    const res = await proxyFor("localhost:3000", "http://localhost:3000/en");

    expect(res.status).not.toBe(308);
  });

  it("a lookalike host is not caught by a loose match", async () => {
    // `www.unytea.com.evil.test` must not be treated as ours.
    const res = await proxyFor("www.unytea.com.evil.test", "https://www.unytea.com.evil.test/en");

    expect(res.status).not.toBe(308);
  });

  it("never reaches the locale middleware for a www request", async () => {
    intlCalls.length = 0;
    await proxyFor("www.unytea.com", "https://www.unytea.com/en");

    // Proof the short-circuit is real, not just ordering in the source.
    expect(intlCalls).toEqual([]);
  });

  it("does reach it for the apex", async () => {
    intlCalls.length = 0;
    await proxyFor("unytea.com", "https://unytea.com/en");

    expect(intlCalls.length).toBeGreaterThan(0);
  });

  it("runs before auth and locale handling", () => {
    // Everything downstream reads cookies, and on the wrong host those cookies
    // do not exist — so the redirect has to be the first thing in the function.
    const proxySource = code("proxy.ts");
    const body = proxySource.slice(proxySource.indexOf("export default async function proxy"));
    expect(body.indexOf("canonicalHostRedirect")).toBeLessThan(body.indexOf("routeNeedsAuth"));
  });
});

describe("the canonical origin is one value", () => {
  it("resolves to the apex by default", async () => {
    const { SITE_URL, CANONICAL_HOST, siteUrl } = await import("@/lib/site-url");

    expect(SITE_URL).toBe("https://unytea.com");
    expect(CANONICAL_HOST).toBe("unytea.com");
    expect(siteUrl("/en/pricing")).toBe("https://unytea.com/en/pricing");
  });

  it("never emits a trailing slash", async () => {
    const { siteUrl } = await import("@/lib/site-url");

    // A canonical that differs from the served URL by a slash is not
    // self-referential — a bug this codebase has already paid for once.
    expect(siteUrl("")).toBe("https://unytea.com");
    expect(siteUrl("/")).toBe("https://unytea.com");
    expect(siteUrl("/en/")).toBe("https://unytea.com/en");
  });

  it("tolerates a path written without a leading slash", async () => {
    const { siteUrl } = await import("@/lib/site-url");
    expect(siteUrl("en/explore")).toBe("https://unytea.com/en/explore");
  });

  it("lets NEXT_PUBLIC_APP_URL win, because previews run on other origins", async () => {
    // This is the deploy-time lever, and the reason the code change alone is
    // not enough: with the variable still set to the www host, every canonical
    // the build emits is www, no matter what this module's fallback says.
    vi.resetModules();
    const previous = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://unytea-git-x.vercel.app";

    const { SITE_URL } = await import("@/lib/site-url");
    expect(SITE_URL).toBe("https://unytea-git-x.vercel.app");

    process.env.NEXT_PUBLIC_APP_URL = previous;
    vi.resetModules();
  });

  it("normalizes a configured origin with a trailing slash or a path", async () => {
    vi.resetModules();
    const previous = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://unytea.com/";

    const { SITE_URL } = await import("@/lib/site-url");
    expect(SITE_URL).toBe("https://unytea.com");

    process.env.NEXT_PUBLIC_APP_URL = previous;
    vi.resetModules();
  });
});

/**
 * The redirect only helps visitors who arrive on the wrong host. Anything the
 * code *emits* — canonicals, Open Graph, sitemap, share links — has to already
 * be the apex, or the inconsistency just moves somewhere quieter.
 */
describe("nothing in app code emits the www host", () => {
  const sources = [
    ...walk(path.join(REPO_ROOT, "app")),
    ...walk(path.join(REPO_ROOT, "components")),
    ...walk(path.join(REPO_ROOT, "lib")),
    path.join(REPO_ROOT, "proxy.ts"),
  ];

  it("finds the files it claims to scan", () => {
    expect(sources.length).toBeGreaterThan(200);
  });

  it("no executable line references www.unytea.com", () => {
    // lib/site-url.ts names the retired host on purpose — it is the constant
    // the redirect matches on — so it is the one allowed mention.
    const allowed = path.join(REPO_ROOT, "lib", "site-url.ts");

    const offenders = sources
      .filter((file) => file !== allowed)
      .filter((file) => {
        const stripped = fs
          .readFileSync(file, "utf8")
          .replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "")
          .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
        return stripped.includes("www.unytea.com");
      })
      .map((file) => path.relative(REPO_ROOT, file).split(path.sep).join("/"));

    expect(offenders).toEqual([]);
  });

  it("the SEO surfaces build on the shared origin", () => {
    for (const file of [
      "app/sitemap.ts",
      "app/robots.ts",
      "lib/seo/locale-metadata.ts",
      "app/og/route.tsx",
      "app/layout.tsx",
    ]) {
      expect(code(file), `${file} should import the shared origin`).toContain("@/lib/site-url");
    }
  });

  it("no file hardcodes the apex either, so the origin stays configurable", () => {
    // Previews and local dev run on other origins; NEXT_PUBLIC_APP_URL has to
    // be able to win. Only lib/site-url.ts holds the literal.
    const allowed = path.join(REPO_ROOT, "lib", "site-url.ts");

    const offenders = sources
      .filter((file) => file !== allowed)
      .filter((file) => {
        const stripped = fs
          .readFileSync(file, "utf8")
          .replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "")
          .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
        return /https:\/\/(www\.)?unytea\.com/.test(stripped);
      })
      .map((file) => path.relative(REPO_ROOT, file).split(path.sep).join("/"));

    expect(offenders).toEqual([]);
  });
});

describe("auth cookies stay pinned to the single host", () => {
  it("declares no Domain, so the cookie cannot straddle hosts", () => {
    // With one canonical host, a host-locked cookie is both simpler and
    // stricter than a Domain=.unytea.com cookie shared with every subdomain.
    const auth = code("lib/auth.ts");
    expect(auth).not.toMatch(/domain\s*:/i);
  });

  it("keeps the __Secure- prefix tied to the same decision as the flag", () => {
    const cookies = code("lib/auth-cookies.ts");
    expect(cookies).toContain("__Secure-");
    expect(cookies).toContain('new URL(url).protocol === "https:"');
  });
});
