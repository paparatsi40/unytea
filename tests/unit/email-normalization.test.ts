import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { normalizeEmail, normalizeEmailOrNull } from "@/lib/normalize-email";
import { authorizeCredentials } from "@/lib/auth-credentials";

/**
 * Three paths disagreed about what an email address is.
 *
 * Sign-up stored it exactly as typed and looked it up the same way, `authorize`
 * looked it up the same way, and only forgot-password lowercased. So an account
 * created as `Carlos@X.com` could never be found by a password reset — silently,
 * because that endpoint returns the same message whether or not an account
 * exists. The same mismatch made `allowDangerousEmailAccountLinking` on Google
 * a no-op: Google sends the address lowercased, `getUserByEmail` compared bytes,
 * nothing matched, and a second account was created — the exact outcome that
 * flag exists to prevent.
 *
 * These tests pin the canonical form, the paths that produce it, and — most
 * importantly — that no User-by-email operation is left un-normalized, because
 * one that is puts the whole thing back.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");

const bcrypt = vi.hoisted(() => ({ compare: vi.fn(), hash: vi.fn() }));
vi.mock("bcryptjs", () => ({ default: bcrypt, ...bcrypt }));

beforeEach(() => {
  vi.clearAllMocks();
});

// ───────────────────────────────────────────────────────────────────────────
describe("normalizeEmail", () => {
  it("lowercases", () => {
    expect(normalizeEmail("Carlos@X.com")).toBe("carlos@x.com");
    expect(normalizeEmail("CARLOS@X.COM")).toBe("carlos@x.com");
  });

  it("trims", () => {
    expect(normalizeEmail("  carlos@x.com  ")).toBe("carlos@x.com");
    expect(normalizeEmail("\tcarlos@x.com\n")).toBe("carlos@x.com");
  });

  it("does both at once", () => {
    expect(normalizeEmail("  Carlos@X.Com \n")).toBe("carlos@x.com");
  });

  it("is idempotent", () => {
    const once = normalizeEmail("  Carlos@X.com ");
    expect(normalizeEmail(once)).toBe(once);
  });

  it("leaves plus-addressing and dots alone", () => {
    // These can be genuinely different mailboxes; only case is safe to fold.
    expect(normalizeEmail("A+Tag@X.com")).toBe("a+tag@x.com");
    expect(normalizeEmail("First.Last@X.com")).toBe("first.last@x.com");
  });

  it("collapses the variants that used to be separate accounts", () => {
    const variants = ["Carlos@X.com", "carlos@x.com", "CARLOS@X.COM", " Carlos@X.com "];
    expect(new Set(variants.map(normalizeEmail)).size).toBe(1);
  });
});

describe("normalizeEmailOrNull", () => {
  it("handles the nullable values Prisma and OAuth profiles return", () => {
    expect(normalizeEmailOrNull(null)).toBeNull();
    expect(normalizeEmailOrNull(undefined)).toBeNull();
    expect(normalizeEmailOrNull("   ")).toBeNull();
    expect(normalizeEmailOrNull(" Carlos@X.com ")).toBe("carlos@x.com");
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("credentials login", () => {
  it("finds the account whatever case was typed", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "u1",
      email: "carlos@x.com",
      password: "hashed",
      name: "Carlos",
      username: null,
      isOnboarded: true,
      firstName: null,
      lastName: null,
      image: null,
      role: "USER",
    } as never);
    bcrypt.compare.mockResolvedValue(true);

    await authorizeCredentials({ email: "Carlos@X.com", password: "correct-horse" });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: "carlos@x.com" } });
  });

  it("normalizes surrounding whitespace too", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);

    await authorizeCredentials({ email: "  carlos@x.com  ", password: "correct-horse" });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: "carlos@x.com" } });
  });

  it("resolves every casing to the same lookup", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);

    for (const typed of ["Carlos@X.com", "carlos@x.com", "CARLOS@X.COM"]) {
      await authorizeCredentials({ email: typed, password: "correct-horse" });
    }

    const looked = vi
      .mocked(prisma.user.findUnique)
      .mock.calls.map((c) => (c[0] as { where: { email: string } }).where.email);
    expect(new Set(looked)).toEqual(new Set(["carlos@x.com"]));
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("every User-by-email operation is normalized", () => {
  function code(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  }

  function walk(dir: string, out: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (![".next", "node_modules"].includes(entry.name)) walk(p, out);
      } else if (/\.tsx?$/.test(entry.name)) {
        out.push(p);
      }
    }
    return out;
  }

  /**
   * An expression is acceptable in `where: { email: … }` when it is already
   * canonical. Three ways it can be:
   *
   *   - it goes through the helper;
   *   - it is a value read back out of the database (`user.email`,
   *     `resetToken.email`), which the migration and the write paths have
   *     already normalized;
   *   - it is the `{ email }` shorthand, which is only safe if the local
   *     binding was itself produced by the helper — checked separately, per
   *     file, below.
   *
   * Anything else is a raw user-supplied string reaching a lookup, which is the
   * bug this whole change exists to remove.
   */
  const THROUGH_HELPER = /^normalizeEmail(OrNull)?\(/;
  const READ_FROM_DB = /^(user|resetToken|existingUser|account)\.email$/;

  function offendingEmailLookups(): string[] {
    const offenders: string[] = [];

    for (const dir of ["app", "lib"]) {
      for (const file of walk(path.join(REPO_ROOT, dir))) {
        const source = code(fs.readFileSync(file, "utf8"));
        // Only files that query users by email; a `where: { email }` on the
        // token table is keyed off a value already taken from `users`.
        if (!/prisma\.user\./.test(source)) continue;

        // For the `{ email }` shorthand to be safe, the file's `email` binding
        // has to come from the helper.
        const bindingIsNormalized = /(const|let)\s+email\s*=\s*normalizeEmail(OrNull)?\(/.test(
          source
        );

        for (const match of source.matchAll(/where:\s*\{\s*email(:\s*([^}\n]*))?/g)) {
          const expression = (match[2] ?? "").trim();
          const relative = path.relative(REPO_ROOT, file);

          if (expression === "") {
            // Shorthand.
            if (!bindingIsNormalized) {
              offenders.push(`${relative} → { email } with an un-normalized binding`);
            }
            continue;
          }

          if (THROUGH_HELPER.test(expression) || READ_FROM_DB.test(expression)) continue;

          offenders.push(`${relative} → ${expression}`);
        }
      }
    }

    return offenders.sort();
  }

  it("no lookup passes a raw address", () => {
    expect(offendingEmailLookups()).toEqual([]);
  });

  it("the auth paths all import the helper", () => {
    // A file that touches users by email and does not know about the helper is
    // either a new bug or a file that needs adding to this list on purpose.
    for (const file of [
      "app/api/auth/signup/route.ts",
      "app/api/auth/forgot-password/route.ts",
      "app/api/auth/reset-password/route.ts",
      "lib/auth-credentials.ts",
      "lib/auth.ts",
    ]) {
      expect(code(fs.readFileSync(path.join(REPO_ROOT, file), "utf8"))).toContain("normalizeEmail");
    }
  });

  it("signup writes the normalized address, not the typed one", () => {
    const source = code(
      fs.readFileSync(path.join(REPO_ROOT, "app/api/auth/signup/route.ts"), "utf8")
    );

    expect(source).toContain("normalizeEmail(validatedData.email)");
    // The old shape destructured `email` straight out of the validated body and
    // wrote it unchanged.
    expect(source).not.toMatch(/const \{ name, email, password \} = validatedData;/);
  });

  it("forgot-password uses the helper rather than its own copy of the rule", () => {
    const source = code(
      fs.readFileSync(path.join(REPO_ROOT, "app/api/auth/forgot-password/route.ts"), "utf8")
    );

    expect(source).not.toContain("toLowerCase().trim()");
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("the NextAuth adapter normalizes identity", () => {
  const source = fs.readFileSync(path.join(REPO_ROOT, "lib/auth.ts"), "utf8");

  it("wraps PrismaAdapter instead of passing it through", () => {
    // `getUserByEmail` is what @auth/core calls to resolve
    // allowDangerousEmailAccountLinking, and the stock adapter compares bytes.
    expect(source).toContain("normalizedEmailAdapter(PrismaAdapter(prisma)");
    expect(source).not.toMatch(/adapter:\s*PrismaAdapter\(prisma\) as any,/);
  });

  it("normalizes both halves of the adapter contract", () => {
    const wrapper = source.slice(
      source.indexOf("function normalizedEmailAdapter"),
      source.indexOf("export const { handlers")
    );

    expect(wrapper).toContain("createUser");
    expect(wrapper).toContain("getUserByEmail");
    expect(wrapper.match(/normalizeEmail\(/g)?.length).toBeGreaterThanOrEqual(2);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("the data migration", () => {
  const MIGRATION = path.join(
    REPO_ROOT,
    "prisma/migrations/20260817120000_normalize_user_email_case/migration.sql"
  );

  const sql = fs.readFileSync(MIGRATION, "utf8");

  it("aborts before touching rows when duplicates exist", () => {
    // users.email is UNIQUE, so lowercasing a collision would fail on the index
    // with an error naming neither the rows nor the fix. The guard has to come
    // first, and it has to raise.
    const guardEnds = sql.indexOf("UPDATE users");
    const guard = sql.slice(0, guardEnds);

    expect(guard).toContain("RAISE EXCEPTION");
    expect(guard).toMatch(/HAVING count\(\*\) > 1/);
    expect(guard).toContain("detect-duplicate-emails.sql");
  });

  it("rewrites only the rows that differ", () => {
    expect(sql).toMatch(
      /UPDATE users\s+SET email = lower\(btrim\(email\)\)\s+WHERE email <> lower\(btrim\(email\)\)/
    );
  });

  it("normalizes in-flight password reset tokens too", () => {
    expect(sql).toContain("UPDATE password_reset_tokens");
  });

  it("does not create the unique index — that is a separate decision", () => {
    // The functional unique index takes a lock and cannot run inside the
    // transaction Prisma wraps migrations in. It is prepared in prisma/sql/.
    expect(sql).not.toContain("CREATE UNIQUE INDEX");
  });
});

describe("the prepared DB guarantee is not auto-applied", () => {
  it("lives outside prisma/migrations so migrate deploy ignores it", () => {
    const prepared = path.join(REPO_ROOT, "prisma/sql/optional-unique-lower-email-index.sql");

    expect(fs.existsSync(prepared)).toBe(true);
    expect(fs.readFileSync(prepared, "utf8")).toContain("CREATE UNIQUE INDEX CONCURRENTLY");

    // Nothing under prisma/migrations may create it, or "prepared" would be a
    // lie the moment someone pushes.
    const migrationDirs = fs
      .readdirSync(path.join(REPO_ROOT, "prisma/migrations"), { withFileTypes: true })
      .filter((e) => e.isDirectory());

    for (const dir of migrationDirs) {
      const file = path.join(REPO_ROOT, "prisma/migrations", dir.name, "migration.sql");
      if (!fs.existsSync(file)) continue;
      expect(fs.readFileSync(file, "utf8")).not.toContain("users_email_lower_key");
    }
  });
});
