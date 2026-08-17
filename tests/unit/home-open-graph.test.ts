import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SITE_URL } from "@/lib/site-url";
import { baseOpenGraph, localizedOpenGraph } from "@/lib/seo/open-graph";
import { SUPPORTED_LOCALES } from "@/lib/seo/locale-metadata";

/**
 * Sharing the homepage produced a preview with no image and no URL.
 *
 * Next merges `metadata` per top-level field, not per leaf. `app/[locale]/page.tsx`
 * declared `openGraph: { title, description, type }`, which replaced the root
 * layout's object **entirely** — taking `images` (the /og card), `url`,
 * `siteName`, `locale` and `alternateLocale` with it. The homepage is the URL
 * most likely to be shared, so the one page that lost its social card was the
 * one that needed it.
 *
 * The same trap already bit `alternates` one field over, which is why
 * `localizedAlternates` exists. These tests assert the real thing: the metadata
 * object the page's own `generateMetadata` returns.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");

// The apex origin, read from the shared module rather than restated — a test
// carrying its own copy of the host is how the codebase ended up split between
// www and the apex before.
const APEX = SITE_URL;

async function homeMetadata(locale: string) {
  const { generateMetadata } = await import("@/app/[locale]/page");
  return generateMetadata({ params: Promise.resolve({ locale }) });
}

type OG = {
  url?: string;
  siteName?: string;
  title?: string;
  description?: string;
  locale?: string;
  alternateLocale?: readonly string[];
  images?: ReadonlyArray<{ url: string; width?: number; height?: number }>;
};

describe("homepage Open Graph", () => {
  it.each([...SUPPORTED_LOCALES])("%s: carries an og:image", async (locale) => {
    const og = (await homeMetadata(locale)).openGraph as OG;

    expect(og.images).toBeDefined();
    expect(og.images?.length).toBeGreaterThan(0);
    expect(og.images?.[0].url).toBe("/og");
    expect(og.images?.[0].width).toBe(1200);
    expect(og.images?.[0].height).toBe(630);
  });

  it.each([...SUPPORTED_LOCALES])("%s: carries an og:url on the apex", async (locale) => {
    const og = (await homeMetadata(locale)).openGraph as OG;

    expect(og.url).toBeDefined();
    expect(og.url?.startsWith(APEX)).toBe(true);
    // Not the retired host. The canonicalisation work sent www to the apex; an
    // og:url on www would advertise a URL that 308-redirects.
    expect(og.url).not.toContain("www.");
  });

  it.each([...SUPPORTED_LOCALES])("%s: og:url agrees with rel=canonical", async (locale) => {
    const metadata = await homeMetadata(locale);
    const og = metadata.openGraph as OG;

    // Two different self-URLs on one document is a contradiction a search
    // engine has to guess its way out of.
    expect(og.url).toBe(metadata.alternates?.canonical);
  });

  it.each([...SUPPORTED_LOCALES])("%s: keeps siteName and locale metadata", async (locale) => {
    const og = (await homeMetadata(locale)).openGraph as OG;

    expect(og.siteName).toBe("Unytea");
    expect(og.locale).toBe("en_US");
    expect(og.alternateLocale).toEqual(["es_ES", "fr_FR"]);
  });

  it("still uses the locale's own title and description", async () => {
    const en = (await homeMetadata("en")).openGraph as OG;
    const es = (await homeMetadata("es")).openGraph as OG;

    expect(en.title).toBeTruthy();
    expect(es.title).toBeTruthy();
    // Spreading the defaults must not flatten the per-locale copy.
    expect(en.title).not.toBe(es.title);
    expect(en.description).not.toBe(es.description);
  });
});

describe("shared Open Graph defaults", () => {
  it("points at the apex", () => {
    expect(baseOpenGraph.url).toBe(APEX);
  });

  it("gives each locale its own self-referential url", () => {
    expect(localizedOpenGraph("es").url).toBe(`${APEX}/es`);
    expect(localizedOpenGraph("fr", "/pricing").url).toBe(`${APEX}/fr/pricing`);
    // The homepage passes "", which must not become a trailing slash: /es/
    // 308-redirects to /es, and a self-URL pointing at a redirect is not one.
    expect(localizedOpenGraph("en", "/").url).toBe(`${APEX}/en`);
  });
});

/**
 * Every other page under `app/[locale]` declares `openGraph` the same bare way
 * the homepage did, so every one of them is also missing some subset of the
 * defaults. They are out of scope for this change, which was scoped to the root
 * layout and the homepage.
 *
 * Rather than pretend they are fine, they are listed. The guard below asserts
 * two things: the pages already migrated still spread the defaults, and this
 * list does not grow. A new page written the old way fails the build.
 */
const NOT_YET_MIGRATED = [
  "app/[locale]/blog/[slug]/page.tsx",
  "app/[locale]/blog/page.tsx",
  "app/[locale]/changelog/page.tsx",
  "app/[locale]/community/[slug]/page.tsx",
  "app/[locale]/contact/page.tsx",
  "app/[locale]/cookies/page.tsx",
  "app/[locale]/documentation/page.tsx",
  "app/[locale]/explore/page.tsx",
  "app/[locale]/library/page.tsx",
  "app/[locale]/privacy/page.tsx",
  "app/[locale]/s/[slug]/page.tsx",
  "app/[locale]/terms/page.tsx",
].map((p) => p.split("/").join(path.sep));

describe("openGraph is spread, not replaced", () => {
  // Structural guard. The defect was not a wrong value, it was an object
  // literal that replaced the defaults — so what has to be pinned is the shape
  // of the call, at every page that declares openGraph at all.
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

  function bareOpenGraphPages(): string[] {
    const offenders: string[] = [];

    for (const file of walk(path.join(REPO_ROOT, "app"))) {
      const source = code(fs.readFileSync(file, "utf8"));
      if (!/openGraph:\s*\{/.test(source)) continue;
      // Accept either the base object or the per-locale helper.
      if (!/openGraph:\s*\{\s*\.\.\.(baseOpenGraph|localizedOpenGraph\()/.test(source)) {
        offenders.push(path.relative(REPO_ROOT, file));
      }
    }

    return offenders.sort();
  }

  it("the root layout and the homepage spread the defaults", () => {
    const offenders = bareOpenGraphPages();

    expect(offenders).not.toContain(["app", "layout.tsx"].join(path.sep));
    expect(offenders).not.toContain(["app", "[locale]", "page.tsx"].join(path.sep));
  });

  it("no page beyond the known backlog writes a bare openGraph", () => {
    // A ratchet, not a clean bill of health: the list may shrink, never grow.
    expect(bareOpenGraphPages()).toEqual([...NOT_YET_MIGRATED].sort());
  });
});
