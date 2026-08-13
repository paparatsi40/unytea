#!/usr/bin/env node
/**
 * Guard against secret-shaped values in publicly-exposed environment variables.
 *
 * Next.js inlines every `NEXT_PUBLIC_*` variable into the client JavaScript
 * bundle at build time. A secret placed under such a name is published to every
 * visitor's browser. This happened once (a live Stripe secret key was stored as
 * NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY); this guard exists so it cannot happen again.
 *
 * Checks two surfaces:
 *   1. Every `.env*` file in the repository working tree.
 *   2. The live process environment (catches a misconfigured CI/Vercel variable).
 *
 * Usage:
 *   node scripts/check-public-env.mjs            # exit 1 on any violation
 *
 * Never prints a secret value — only the variable name and the pattern matched.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Variable-name substrings that must never appear on a public variable. */
export const FORBIDDEN_NAME_PATTERNS = [
  { pattern: "SECRET", label: "name contains SECRET" },
  { pattern: "PRIVATE_KEY", label: "name contains PRIVATE_KEY" },
  { pattern: "PASSWORD", label: "name contains PASSWORD" },
];

/**
 * Value prefixes that identify a credential. Anchored to the start of the value
 * so that legitimate publishable keys (`pk_live_…`) never collide with secret
 * keys (`sk_live_…`).
 */
export const FORBIDDEN_VALUE_PREFIXES = [
  { pattern: "sk_", label: "Stripe/OpenAI secret key (sk_)" },
  { pattern: "sk-", label: "OpenAI secret key (sk-)" },
  { pattern: "rk_", label: "Stripe restricted key (rk_)" },
  { pattern: "whsec_", label: "Stripe webhook secret (whsec_)" },
  { pattern: "re_", label: "Resend API key (re_)" },
  { pattern: "shpat_", label: "Shopify access token (shpat_)" },
  { pattern: "ghp_", label: "GitHub personal access token (ghp_)" },
  { pattern: "gho_", label: "GitHub OAuth token (gho_)" },
  { pattern: "ghs_", label: "GitHub server token (ghs_)" },
  { pattern: "github_pat_", label: "GitHub fine-grained PAT (github_pat_)" },
  { pattern: "xoxb-", label: "Slack bot token (xoxb-)" },
  { pattern: "AKIA", label: "AWS access key id (AKIA)" },
];

/** Substrings that identify a credential anywhere inside the value. */
export const FORBIDDEN_VALUE_SUBSTRINGS = [
  { pattern: "postgresql://", label: "PostgreSQL connection string" },
  { pattern: "postgres://", label: "PostgreSQL connection string" },
  { pattern: "mysql://", label: "MySQL connection string" },
  { pattern: "mongodb+srv://", label: "MongoDB connection string" },
  { pattern: "mongodb://", label: "MongoDB connection string" },
  { pattern: "rediss://", label: "Redis connection string" },
  { pattern: "redis://", label: "Redis connection string" },
  { pattern: "-----BEGIN", label: "PEM private key block" },
];

/**
 * Parse a dotenv-format string into { name, value } entries.
 * Handles `export ` prefixes, `#` comments, blank lines, and single/double quotes.
 */
export function parseEnvFile(contents) {
  const entries = [];
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const withoutExport = line.startsWith("export ") ? line.slice("export ".length) : line;
    const eq = withoutExport.indexOf("=");
    if (eq === -1) continue;
    const name = withoutExport.slice(0, eq).trim();
    let value = withoutExport.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    entries.push({ name, value });
  }
  return entries;
}

/**
 * Given { name, value } entries, return violations for public variables that
 * carry secret-shaped names or values. Non-public variables are ignored — this
 * guard is specifically about the client-bundle exposure surface.
 *
 * @returns Array<{ name, reason }> — never includes the offending value.
 */
export function findViolations(entries) {
  const violations = [];
  for (const { name, value } of entries) {
    if (!name.startsWith("NEXT_PUBLIC_")) continue;

    for (const { pattern, label } of FORBIDDEN_NAME_PATTERNS) {
      if (name.includes(pattern)) violations.push({ name, reason: label });
    }

    if (typeof value !== "string" || value.length === 0) continue;

    for (const { pattern, label } of FORBIDDEN_VALUE_PREFIXES) {
      if (value.startsWith(pattern)) violations.push({ name, reason: `value looks like a ${label}` });
    }
    for (const { pattern, label } of FORBIDDEN_VALUE_SUBSTRINGS) {
      if (value.includes(pattern)) violations.push({ name, reason: `value contains a ${label}` });
    }
  }
  return violations;
}

/** Collect every `.env*` file in `dir` (non-recursive; env files live at the root). */
export function listEnvFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.startsWith(".env"))
    .map((e) => path.join(dir, e.name))
    .sort();
}

function main() {
  const root = process.cwd();
  const problems = [];

  for (const file of listEnvFiles(root)) {
    const entries = parseEnvFile(fs.readFileSync(file, "utf8"));
    for (const v of findViolations(entries)) {
      problems.push(`${path.relative(root, file)}: ${v.name} — ${v.reason}`);
    }
  }

  const processEntries = Object.entries(process.env).map(([name, value]) => ({ name, value }));
  for (const v of findViolations(processEntries)) {
    problems.push(`process.env: ${v.name} — ${v.reason}`);
  }

  if (problems.length > 0) {
    console.error("\n✖ Secret-shaped value found in a NEXT_PUBLIC_* variable.\n");
    console.error(
      "  NEXT_PUBLIC_* values are inlined into the browser bundle at build time.\n" +
        "  Anything listed below is published to every visitor.\n"
    );
    for (const p of problems) console.error(`  - ${p}`);
    console.error(
      "\n  Fix: move the value to a non-public variable name, and rotate the credential —\n" +
        "  assume it is compromised.\n"
    );
    process.exit(1);
  }

  console.log("✓ No secret-shaped values in NEXT_PUBLIC_* variables.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
