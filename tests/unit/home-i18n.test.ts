import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * The homepage hero and nav went through `t()`; its body did not.
 *
 * A lead reached in Spanish or French landed on a translated headline and then
 * scrolled into "Why most communities fail", "Live interaction", "Monetization
 * tools" — English, for the whole rest of the page. That reads worse than a
 * page written entirely in English, because it looks broken rather than
 * deliberate. And this is the surface every outreach message points at.
 *
 * These tests pin two things: the body renders from the catalog, and no new
 * English string can be pasted back in without the build noticing.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
const PAGE = path.join(REPO_ROOT, "app/[locale]/page.tsx");
const LOCALES = ["en", "es", "fr"] as const;

function source(): string {
  return fs
    .readFileSync(PAGE, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

/**
 * Words that are not copy and must never be translated: our own brand, the
 * competitors we name, the social networks we link to, and the first names in
 * the mocked chat of the hero demo. Anything else caught by the scanner is a
 * string that escaped the catalog.
 */
const NOT_COPY = new Set([
  "Unytea",
  "Skool",
  "Twitter",
  "GitHub",
  "LinkedIn",
  "Sarah M.",
  "Mike R.",
  "Lisa K.",
  "Mike:",
  "Sarah:",
  "Lisa:",
]);

function hardcodedStrings(): string[] {
  const src = source();
  const found: string[] = [];

  // Text sitting directly between JSX tags.
  for (const match of src.matchAll(/>\s*([A-Z][A-Za-z][^<>{}\n]{2,})\s*</g)) {
    found.push(match[1].trim());
  }

  // Copy passed as a literal prop rather than through t().
  for (const match of src.matchAll(
    /\b(title|description|alt|q|a|feature|features|label|placeholder|subtitle)="([^"]{4,})"/g
  )) {
    found.push(match[2].trim());
  }

  return found.filter((value) => !NOT_COPY.has(value)).sort();
}

describe("the homepage body renders from the catalog", () => {
  it("carries no hardcoded English", () => {
    expect(hardcodedStrings()).toEqual([]);
  });

  it("actually scans something — the regexes are not silently matching nothing", () => {
    // Without this, deleting the page would make the test above pass.
    const src = source();
    expect(src.length).toBeGreaterThan(20_000);
    expect((src.match(/\bt\(/g) ?? []).length).toBeGreaterThan(80);
  });
});

describe("every key the page reads exists in all three locales", () => {
  function catalog(locale: string): Record<string, unknown> {
    return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, `locales/${locale}.json`), "utf8"));
  }

  function lookup(root: Record<string, unknown>, dotted: string): unknown {
    return dotted
      .split(".")
      .reduce<unknown>(
        (node, part) =>
          node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined,
        root
      );
  }

  /** Literal `t("…")` calls; the template-literal ones are covered separately. */
  function literalKeys(): string[] {
    const src = source();
    const keys = new Set<string>();
    for (const match of src.matchAll(/\bt(?:\.rich|\.raw)?\("([^"]+)"\)/g)) {
      keys.add(match[1]);
    }
    for (const match of src.matchAll(/\bt(?:\.rich|\.raw)?\("([^"]+)",/g)) {
      keys.add(match[1]);
    }
    return [...keys];
  }

  /** The three `t(\`…\`)` loops, expanded by hand from the arrays they map. */
  const TEMPLATED = [
    ...["session", "recording", "summary", "discussion", "library", "growth"].flatMap((step) => [
      `howItWorks.${step}.title`,
      `howItWorks.${step}.description`,
    ]),
    ...["zoom", "kajabi", "facebook", "slack", "skool"].map((tool) => `replaceStack.${tool}`),
    ...["q1", "q2", "q3", "q4", "q5"].flatMap((n) => [
      `pricingFaq.${n}`,
      `pricingFaq.${n.replace("q", "a")}`,
    ]),
  ];

  it.each(LOCALES)("%s resolves every key", (locale) => {
    const root = catalog(locale);
    const missing: string[] = [];

    for (const key of [...literalKeys(), ...TEMPLATED]) {
      // The page binds `t` to "landing" and `tBilling` to "billing.pricing".
      const namespaced = key.startsWith("header") || key.startsWith("freeForMembers");
      const full = namespaced ? `billing.pricing.${key}` : `landing.${key}`;
      const value = lookup(root, full);
      if (value === undefined) missing.push(full);
    }

    expect(missing).toEqual([]);
  });

  it("finds a realistic number of keys", () => {
    expect(literalKeys().length).toBeGreaterThan(60);
  });
});

describe("the new copy is real translation, not English pasted three times", () => {
  const SECTIONS = [
    "bullets",
    "problem",
    "whyFail",
    "howItWorks",
    "featureGrid",
    "aiSection",
    "useCases",
    "comparison",
    "monetization",
    "pricingFaq",
    "replaceStack",
    "allInOne",
    "finalCta",
  ];

  function flatten(node: unknown, prefix = "", out: Record<string, string> = {}) {
    if (typeof node === "string") {
      out[prefix] = node;
    } else if (node && typeof node === "object") {
      for (const [key, value] of Object.entries(node)) {
        flatten(value, prefix ? `${prefix}.${key}` : key, out);
      }
    }
    return out;
  }

  function section(locale: string, name: string): Record<string, string> {
    const root = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, `locales/${locale}.json`), "utf8")
    );
    return flatten(root.landing[name]);
  }

  it.each(SECTIONS)("%s: es and fr differ from en", (name) => {
    const en = section("en", name);
    const es = section("es", name);
    const fr = section("fr", name);

    // Some values legitimately match across locales — "Cursos"/"Cours" do not,
    // but "Chat" and "Skool" do. Requiring most of the section to differ
    // catches a copy-paste of the English block without failing on those.
    const differingEs = Object.keys(en).filter((k) => en[k] !== es[k]).length;
    const differingFr = Object.keys(en).filter((k) => en[k] !== fr[k]).length;
    const total = Object.keys(en).length;

    expect(differingEs / total).toBeGreaterThan(0.6);
    expect(differingFr / total).toBeGreaterThan(0.6);
  });

  it.each(SECTIONS)("%s: no locale is missing a value", (name) => {
    for (const locale of LOCALES) {
      for (const [key, value] of Object.entries(section(locale, name))) {
        expect(value.trim(), `${locale}.landing.${name}.${key}`).not.toBe("");
      }
    }
  });
});
