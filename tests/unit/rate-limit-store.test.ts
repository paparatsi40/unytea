import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { resolveUpstashCredentials, UPSTASH_URL_VARS, UPSTASH_TOKEN_VARS } from "@/lib/rate-limit";

/**
 * The limiter was counting in the wrong place, and said nothing about it.
 *
 * Vercel's Upstash integration writes its variables under the name of the
 * store, so connecting it produced `UPSTASH_REDIS_KV_REST_API_URL` and
 * `UPSTASH_REDIS_KV_REST_API_TOKEN`. `lib/rate-limit.ts` read
 * `UPSTASH_REDIS_REST_URL` / `_TOKEN`, which nothing had ever set. The two
 * names never met, so `useRedis` was false and every limiter fell back to the
 * in-memory store — a counter held per serverless instance and reset by every
 * cold start. With N warm instances the effective ceiling was N times the
 * configured one, and nothing on any dashboard would have shown it.
 *
 * The integration also injects a READ_ONLY token. Reading that one would be
 * worse than reading nothing: it authenticates, so the connection looks alive,
 * and then every `INCR` fails into the catch that falls back to memory. The
 * same bug, wearing a working connection as a disguise.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");

const KV_URL = "https://real-store.upstash.io";
const KV_TOKEN = "AX_write_token";
const READ_ONLY_TOKEN = "AX_read_only_token";

/** Exactly what Vercel's Upstash integration injects. */
const VERCEL_INTEGRATION_ENV = {
  UPSTASH_REDIS_KV_REST_API_URL: KV_URL,
  UPSTASH_REDIS_KV_REST_API_TOKEN: KV_TOKEN,
  UPSTASH_REDIS_KV_REST_API_READ_ONLY_TOKEN: READ_ONLY_TOKEN,
  UPSTASH_REDIS_KV_URL: "rediss://default:pw@real-store.upstash.io:6379",
  UPSTASH_REDIS_REDIS_URL: "rediss://default:pw@real-store.upstash.io:6379",
};

// ───────────────────────────────────────────────────────────────────────────
describe("resolving the Upstash credentials", () => {
  it("finds the names the Vercel integration actually writes", () => {
    // The whole fix. Before it, this environment resolved to nothing.
    const credentials = resolveUpstashCredentials(VERCEL_INTEGRATION_ENV);
    expect(credentials).toEqual({ url: KV_URL, token: KV_TOKEN });
  });

  it("still accepts the flat names, for a hand-configured environment", () => {
    expect(
      resolveUpstashCredentials({
        UPSTASH_REDIS_REST_URL: "https://manual.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "manual_token",
      })
    ).toEqual({ url: "https://manual.upstash.io", token: "manual_token" });
  });

  it("prefers the integration's names when both pairs are present", () => {
    expect(
      resolveUpstashCredentials({
        ...VERCEL_INTEGRATION_ENV,
        UPSTASH_REDIS_REST_URL: "https://stale.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "stale_token",
      })
    ).toEqual({ url: KV_URL, token: KV_TOKEN });
  });

  it("resolves nothing when the environment is empty", () => {
    expect(resolveUpstashCredentials({})).toBeNull();
  });

  it("resolves nothing when only the old, unset names are looked for", () => {
    // The production state this fixes: the integration is connected, and the
    // only names the code knew about are absent. If this ever passes with a
    // credential object again, the wiring has been undone.
    const onlyOldNames = {
      UPSTASH_REDIS_KV_URL: VERCEL_INTEGRATION_ENV.UPSTASH_REDIS_KV_URL,
      UPSTASH_REDIS_REDIS_URL: VERCEL_INTEGRATION_ENV.UPSTASH_REDIS_REDIS_URL,
    };
    expect(resolveUpstashCredentials(onlyOldNames)).toBeNull();
  });

  it("needs both halves, not one", () => {
    expect(resolveUpstashCredentials({ UPSTASH_REDIS_KV_REST_API_URL: KV_URL })).toBeNull();
    expect(resolveUpstashCredentials({ UPSTASH_REDIS_KV_REST_API_TOKEN: KV_TOKEN })).toBeNull();
  });

  it("treats a blank value as absent", () => {
    // A dashboard makes it easy to save an empty string, and a blank token
    // fails the request exactly like a missing one.
    expect(
      resolveUpstashCredentials({
        UPSTASH_REDIS_KV_REST_API_URL: KV_URL,
        UPSTASH_REDIS_KV_REST_API_TOKEN: "   ",
      })
    ).toBeNull();
  });

  it("trims what it returns", () => {
    expect(
      resolveUpstashCredentials({
        UPSTASH_REDIS_KV_REST_API_URL: `  ${KV_URL}  `,
        UPSTASH_REDIS_KV_REST_API_TOKEN: `\t${KV_TOKEN}\n`,
      })
    ).toEqual({ url: KV_URL, token: KV_TOKEN });
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("the read-only token is never used", () => {
  it("is not in the list of names the token is looked for under", () => {
    for (const name of UPSTASH_TOKEN_VARS) {
      expect(name, `${name} must not be a read-only variable`).not.toMatch(/READ_ONLY/);
    }
    for (const name of UPSTASH_URL_VARS) {
      expect(name).not.toMatch(/READ_ONLY/);
    }
  });

  it("does not connect on a read-only token alone", () => {
    // It would authenticate, so the connection would look alive — and then
    // every INCR would fail into the fallback, putting the counters back in
    // per-instance memory with no sign that anything was wrong.
    expect(
      resolveUpstashCredentials({
        UPSTASH_REDIS_KV_REST_API_URL: KV_URL,
        UPSTASH_REDIS_KV_REST_API_READ_ONLY_TOKEN: READ_ONLY_TOKEN,
      })
    ).toBeNull();
  });

  it("picks the write token when both are present, which is always", () => {
    // The integration injects both. This is the case that runs in production.
    const credentials = resolveUpstashCredentials(VERCEL_INTEGRATION_ENV);
    expect(credentials?.token).toBe(KV_TOKEN);
    expect(credentials?.token).not.toBe(READ_ONLY_TOKEN);
  });

  it("never mentions the read-only variable anywhere in the module", () => {
    const source = fs.readFileSync(path.join(REPO_ROOT, "lib/rate-limit.ts"), "utf8");
    // Prose explaining why it is excluded is fine; reading it is not.
    expect(source).not.toMatch(/env\[[^\]]*READ_ONLY/);
    expect(source).not.toMatch(/process\.env\.[A-Z_]*READ_ONLY/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("the store it settles on, and what it says about it", () => {
  const ORIGINAL = { ...process.env };
  let info: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    for (const name of [...UPSTASH_URL_VARS, ...UPSTASH_TOKEN_VARS]) delete process.env[name];
    info = vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    info.mockRestore();
    process.env = { ...ORIGINAL };
  });

  async function loadWith(env: Record<string, string>) {
    Object.assign(process.env, env);
    return import("@/lib/rate-limit");
  }

  it("chooses redis when the integration's variables are there", async () => {
    const mod = await loadWith({
      UPSTASH_REDIS_KV_REST_API_URL: KV_URL,
      UPSTASH_REDIS_KV_REST_API_TOKEN: KV_TOKEN,
    });
    expect(mod.RATE_LIMIT_STORE).toBe("redis");
  });

  it("falls back to memory with nothing configured", async () => {
    const mod = await loadWith({});
    expect(mod.RATE_LIMIT_STORE).toBe("memory");
  });

  it("falls back to memory on a read-only token", async () => {
    const mod = await loadWith({
      UPSTASH_REDIS_KV_REST_API_URL: KV_URL,
      UPSTASH_REDIS_KV_REST_API_READ_ONLY_TOKEN: READ_ONLY_TOKEN,
    });
    expect(mod.RATE_LIMIT_STORE).toBe("memory");
  });

  it("announces redis on load", async () => {
    await loadWith({
      UPSTASH_REDIS_KV_REST_API_URL: KV_URL,
      UPSTASH_REDIS_KV_REST_API_TOKEN: KV_TOKEN,
    });
    expect(info).toHaveBeenCalledTimes(1);
    expect(String(info.mock.calls[0][0])).toContain("[rate-limit] store=redis");
  });

  it("announces memory, and why, on load", async () => {
    await loadWith({});
    expect(info).toHaveBeenCalledTimes(1);
    const line = String(info.mock.calls[0][0]);
    expect(line).toContain("[rate-limit] store=memory");
    expect(line).toContain("reason=");
  });

  it("says it once, not once per limiter", async () => {
    // `fetch` is stubbed so the check below cannot reach out to the internet;
    // what it returns does not matter, only that the announcement does not
    // repeat.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => [{ result: 1 }, { result: 60 }],
      }))
    );
    const mod = await loadWith({
      UPSTASH_REDIS_KV_REST_API_URL: KV_URL,
      UPSTASH_REDIS_KV_REST_API_TOKEN: KV_TOKEN,
    });
    await mod.rateLimiters.auth.check("noisy:1");
    await mod.rateLimiters.api.check("noisy:2");
    expect(info).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("sends the write token to Upstash, not the read-only one", async () => {
    // The end of the wire: what actually goes out in the Authorization header.
    // The resolver could be right and this still be wrong.
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [{ result: 1 }, { result: 60 }],
    }));
    vi.stubGlobal("fetch", fetchMock);
    const mod = await loadWith(VERCEL_INTEGRATION_ENV);
    await mod.rateLimiters.auth.check("wire:1");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain(KV_URL);
    const authorization = (init.headers as Record<string, string>).Authorization;
    expect(authorization).toBe(`Bearer ${KV_TOKEN}`);
    expect(authorization).not.toContain(READ_ONLY_TOKEN);
    vi.unstubAllGlobals();
  });

  it("never puts the token or the URL in the log", async () => {
    await loadWith({
      UPSTASH_REDIS_KV_REST_API_URL: KV_URL,
      UPSTASH_REDIS_KV_REST_API_TOKEN: KV_TOKEN,
    });
    const line = (info.mock.calls as unknown[][]).map((call) => call.join(" ")).join(" ");
    expect(line).not.toContain(KV_TOKEN);
    expect(line).not.toContain(KV_URL);
    expect(line).not.toContain("upstash.io");
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("nothing about the limits themselves moved", () => {
  // This branch fixes where the counting happens, not how much is allowed.
  // Changing a ceiling here would be a security change hiding inside a wiring
  // fix — that work is F6 and is deliberately somewhere else.
  it("keeps every configured ceiling and window", async () => {
    const source = fs.readFileSync(path.join(REPO_ROOT, "lib/rate-limit.ts"), "utf8");
    const block = source.slice(source.indexOf("export const rateLimiters"));

    for (const [name, interval, tokens] of [
      ["auth", "15 * 60 * 1000", "5"],
      ["ai", "60 * 60 * 1000", "30"],
      ["api", "60 * 1000", "60"],
      ["create", "60 * 1000", "10"],
      ["message", "10 * 1000", "20"],
      ["general", "60 * 1000", "100"],
      ["cspReport", "60 * 1000", "10"],
    ] as const) {
      const entry = block.slice(block.indexOf(`${name}: rateLimit({`));
      expect(entry, `${name} interval`).toContain(`interval: ${interval}`);
      expect(entry, `${name} tokens`).toContain(`uniqueTokenPerInterval: ${tokens}`);
    }
  });
});
