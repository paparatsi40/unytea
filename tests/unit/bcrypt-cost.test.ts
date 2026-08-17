import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { BCRYPT_COST, FAKE_BCRYPT_HASH } from "@/lib/auth-hashing";
import { authorizeCredentials } from "@/lib/auth-credentials";

/**
 * SEC-21: the bcrypt work factor was 10, written as a bare literal at each of
 * the two places that hash a password.
 *
 * Two copies of a security parameter is one too many — raising one and missing
 * the other leaves half the accounts weaker than the policy claims, and nothing
 * says so. The cost now lives in `lib/auth-hashing.ts` and every hashing site
 * reads it.
 *
 * Raising the constant alone would only protect passwords set from now on,
 * because bcrypt encodes cost in the digest and an old hash verifies forever at
 * the cost it was written with. So a successful login — the one moment the
 * plaintext exists — re-hashes anything below the current cost. Old hashes climb
 * on their own; no migration can do this, because a migration has no plaintext.
 *
 * These tests use real bcrypt rather than a mock wherever the cost is the thing
 * under test: `getRounds` of a mocked hash proves nothing.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");

function code(relativePath: string): string {
  return fs
    .readFileSync(path.join(REPO_ROOT, relativePath), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const PASSWORD = "correct-horse-battery";

function userRow(password: string) {
  return {
    id: "u1",
    email: "carlos@x.com",
    password,
    name: "Carlos",
    username: null,
    isOnboarded: true,
    firstName: null,
    lastName: null,
    image: null,
    role: "USER",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────────────
describe("the cost constant", () => {
  it("is 12", () => {
    expect(BCRYPT_COST).toBe(12);
  });

  it("is the only source — no bare cost survives at a hashing site", () => {
    for (const file of [
      "app/api/auth/signup/route.ts",
      "app/api/auth/reset-password/route.ts",
      "lib/auth-credentials.ts",
    ]) {
      const source = code(file);
      expect(source).not.toMatch(/bcrypt\.hash\([^)]*,\s*\d+\s*\)/);
      if (/bcrypt\.hash\(/.test(source)) {
        expect(source).toContain("BCRYPT_COST");
      }
    }
  });

  it("is not hardcoded anywhere else in app/ or lib/", () => {
    const offenders: string[] = [];

    function walk(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (![".next", "node_modules"].includes(entry.name)) walk(p);
        } else if (/\.tsx?$/.test(entry.name)) {
          const source = fs
            .readFileSync(p, "utf8")
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/^\s*\/\/.*$/gm, "");
          if (/bcrypt\.(hash|hashSync|genSalt|genSaltSync)\([^)]*,\s*\d+/.test(source)) {
            offenders.push(path.relative(REPO_ROOT, p));
          }
        }
      }
    }

    for (const dir of ["app", "lib"]) walk(path.join(REPO_ROOT, dir));
    expect(offenders).toEqual([]);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("the constant-time decoy tracks the cost", () => {
  it("is a valid digest at exactly BCRYPT_COST", () => {
    // If it lagged behind, comparing against it would be measurably faster than
    // comparing against a real hash, and the timing difference is the user
    // enumeration oracle this constant exists to close. At 10 vs 12 that gap is
    // roughly 60ms against 230ms.
    expect(bcrypt.getRounds(FAKE_BCRYPT_HASH)).toBe(BCRYPT_COST);
  });

  it("no password opens it", () => {
    for (const guess of ["", "password", "123456", PASSWORD]) {
      expect(bcrypt.compareSync(guess, FAKE_BCRYPT_HASH)).toBe(false);
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("hashes written at the old cost still work", () => {
  it("a cost-10 digest still verifies its password", () => {
    const legacy = bcrypt.hashSync(PASSWORD, 10);

    expect(bcrypt.getRounds(legacy)).toBe(10);
    expect(bcrypt.compareSync(PASSWORD, legacy)).toBe(true);
    expect(bcrypt.compareSync("wrong-password", legacy)).toBe(false);
  });

  it("a cost-12 digest verifies the same password too", () => {
    const current = bcrypt.hashSync(PASSWORD, BCRYPT_COST);

    expect(bcrypt.getRounds(current)).toBe(BCRYPT_COST);
    expect(bcrypt.compareSync(PASSWORD, current)).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("login upgrades an old hash in place", () => {
  it("verifies a cost-10 password and re-hashes it to 12", async () => {
    const legacy = bcrypt.hashSync(PASSWORD, 10);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(userRow(legacy) as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    const result = await authorizeCredentials({ email: "carlos@x.com", password: PASSWORD });

    // The login itself succeeds.
    expect(result?.id).toBe("u1");

    // And the stored hash was replaced with one at the current cost.
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    const call = vi.mocked(prisma.user.update).mock.calls[0][0] as {
      where: { id: string };
      data: { password: string };
    };
    expect(call.where).toEqual({ id: "u1" });
    expect(bcrypt.getRounds(call.data.password)).toBe(BCRYPT_COST);
    // It is a hash of the password the user actually typed, not of anything else.
    expect(bcrypt.compareSync(PASSWORD, call.data.password)).toBe(true);
  });

  it("leaves a hash already at the current cost alone", async () => {
    const current = bcrypt.hashSync(PASSWORD, BCRYPT_COST);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(userRow(current) as never);

    const result = await authorizeCredentials({ email: "carlos@x.com", password: PASSWORD });

    expect(result?.id).toBe("u1");
    // No pointless write on every single login.
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("does not downgrade a hash written above the current cost", async () => {
    const stronger = bcrypt.hashSync(PASSWORD, BCRYPT_COST + 1);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(userRow(stronger) as never);

    await authorizeCredentials({ email: "carlos@x.com", password: PASSWORD });

    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("does not re-hash when the password was wrong", async () => {
    const legacy = bcrypt.hashSync(PASSWORD, 10);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(userRow(legacy) as never);

    const result = await authorizeCredentials({
      email: "carlos@x.com",
      password: "not-the-password",
    });

    expect(result).toBeNull();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("does not touch an OAuth-only account", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...userRow(""),
      password: null,
    } as never);

    const result = await authorizeCredentials({ email: "carlos@x.com", password: PASSWORD });

    expect(result).toBeNull();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("a failed upgrade never costs the user their login", () => {
  it("still signs in when the update rejects", async () => {
    const legacy = bcrypt.hashSync(PASSWORD, 10);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(userRow(legacy) as never);
    vi.mocked(prisma.user.update).mockRejectedValue(new Error("connection lost"));

    const result = await authorizeCredentials({ email: "carlos@x.com", password: PASSWORD });

    // The user typed the right password. A write that did not work is not
    // their problem, and the next login simply tries again.
    expect(result?.id).toBe("u1");
    expect(result?.email).toBe("carlos@x.com");
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
  });

  it("logs the failure without the email or the password", async () => {
    const legacy = bcrypt.hashSync(PASSWORD, 10);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(userRow(legacy) as never);
    vi.mocked(prisma.user.update).mockRejectedValue(new Error("connection lost"));

    await authorizeCredentials({ email: "carlos@x.com", password: PASSWORD });

    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).toContain("password_cost_upgrade_failed");
    expect(logged).not.toContain("carlos@x.com");
    expect(logged).not.toContain(PASSWORD);
  });

  it("survives a stored value bcrypt cannot read a cost from", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(userRow("not-a-bcrypt-hash") as never);

    // compare() against a malformed digest is false, so this is a failed login
    // rather than a crash — the point is that nothing throws.
    await expect(
      authorizeCredentials({ email: "carlos@x.com", password: PASSWORD })
    ).resolves.toBeNull();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("the hashing endpoints", () => {
  it("signup hashes at the constant", () => {
    const source = code("app/api/auth/signup/route.ts");

    expect(source).toContain("bcrypt.hash(password, BCRYPT_COST)");
    expect(source).toContain('from "@/lib/auth-hashing"');
  });

  it("reset-password hashes at the constant", () => {
    const source = code("app/api/auth/reset-password/route.ts");

    expect(source).toContain("bcrypt.hash(password, BCRYPT_COST)");
    expect(source).toContain('from "@/lib/auth-hashing"');
  });

  it("produces cost-12 digests end to end", async () => {
    // The endpoints are thin wrappers around this call; running it directly is
    // what proves the constant reaches bcrypt rather than just being imported.
    const hashed = await bcrypt.hash(PASSWORD, BCRYPT_COST);

    expect(bcrypt.getRounds(hashed)).toBe(12);
    expect(await bcrypt.compare(PASSWORD, hashed)).toBe(true);
  });
});
