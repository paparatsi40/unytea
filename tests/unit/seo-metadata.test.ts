import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { localizedAlternates, SUPPORTED_LOCALES } from "@/lib/seo/locale-metadata";
import { SITE_URL } from "@/lib/site-url";

/**
 * Two Lighthouse SEO failures on the marketing site.
 *
 * 1. "Document does not have a valid rel=canonical — points to another hreflang
 *    location." The homepage passed `path: ""` to `localizedAlternates`, which
 *    normalized it to `"/"` and emitted `https://www.unytea.com/en/` (the host
 *    has since been canonicalized to the apex). That URL
 *    is not the page: `trailingSlash` is off, so `/en/` 308-redirects to `/en`.
 *    Every hreflang carried the same slash, so the canonical resolved to one of
 *    the alternates rather than to this document. Sub-pages such as
 *    `/en/cookies` were unaffected, which is why it hid everywhere except the
 *    homepage. The homepage also had no `x-default` at all: a page's
 *    `alternates` replaces the root layout's wholesale, and the root's
 *    x-default went with it.
 *
 * 2. "Links do not have descriptive text — /en/cookies, text 'Learn more'."
 */

const REPO_ROOT = path.resolve(__dirname, "../..");
// Read from the shared origin rather than restated: the host was canonicalized
// to the apex, and a test carrying its own copy of it is how the codebase ended
// up split between www and the apex in the first place.
const BASE = SITE_URL;

function read(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

type Alternates = {
  canonical: string;
  languages: Record<string, string>;
};

function alternates(pagePath: string, locale: string): Alternates {
  return localizedAlternates({ path: pagePath, locale }).alternates as Alternates;
}

describe("the homepage canonical is self-referential", () => {
  it.each(SUPPORTED_LOCALES)(
    "%s canonicalizes to its own URL, with no trailing slash",
    (locale) => {
      // The whole bug: this used to be `${BASE}/${locale}/`.
      expect(alternates("", locale).canonical).toBe(`${BASE}/${locale}`);
    }
  );

  it.each(SUPPORTED_LOCALES)("%s canonical matches its own hreflang entry exactly", (locale) => {
    const { canonical, languages } = alternates("", locale);

    // Lighthouse compares the canonical against the hreflang set; if it equals
    // a *different* locale's entry, or a near-miss of its own, the audit fails.
    expect(canonical).toBe(languages[locale]);
    for (const other of SUPPORTED_LOCALES.filter((l) => l !== locale)) {
      expect(canonical).not.toBe(languages[other]);
    }
  });

  it.each(SUPPORTED_LOCALES)("%s advertises every locale plus x-default", (locale) => {
    const { languages } = alternates("", locale);

    expect(Object.keys(languages).sort()).toEqual(["en", "es", "fr", "x-default"]);
    expect(languages.en).toBe(`${BASE}/en`);
    expect(languages.es).toBe(`${BASE}/es`);
    expect(languages.fr).toBe(`${BASE}/fr`);
    // x-default is the page shown to a language we do not serve.
    expect(languages["x-default"]).toBe(`${BASE}/en`);
  });

  it("no emitted URL ends in a slash", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const { canonical, languages } = alternates("", locale);
      for (const url of [canonical, ...Object.values(languages)]) {
        expect(url, `${url} would redirect`).not.toMatch(/\/$/);
      }
    }
  });
});

describe("sub-pages keep working", () => {
  it.each(SUPPORTED_LOCALES)("%s /cookies still canonicalizes to itself", (locale) => {
    const { canonical, languages } = alternates("/cookies", locale);

    expect(canonical).toBe(`${BASE}/${locale}/cookies`);
    expect(languages["x-default"]).toBe(`${BASE}/en/cookies`);
  });

  it("tolerates a path written with a trailing slash", () => {
    // Normalization is the fix, so it has to hold however the caller writes it.
    expect(alternates("/blog/", "es").canonical).toBe(`${BASE}/es/blog`);
  });

  it("tolerates a path written without a leading slash", () => {
    expect(alternates("explore", "fr").canonical).toBe(`${BASE}/fr/explore`);
  });

  it("treats a bare slash as the homepage", () => {
    expect(alternates("/", "en").canonical).toBe(`${BASE}/en`);
  });

  it("falls back to the default locale for an unsupported one", () => {
    // The locale comes from a URL segment and cannot be trusted to be ours.
    expect(alternates("", "de").canonical).toBe(`${BASE}/en`);
  });
});

/**
 * The helper is only useful if the pages actually call it — and the page-level
 * canonical has to be the one that survives, not the root layout's global "/".
 */
describe("the localized pages use the helper", () => {
  it("the homepage spreads its own alternates", () => {
    const page = read("app/[locale]/page.tsx");
    expect(page).toContain('localizedAlternates({ path: "", locale })');
  });

  it("the root layout still declares a global canonical for unprefixed routes", () => {
    // Removing it would leave app/auth, app/onboarding and friends with none;
    // Next.js lets the page-level object replace it wherever a page sets one.
    expect(read("app/layout.tsx")).toContain('canonical: "/"');
  });

  it("every localized page with metadata declares alternates", () => {
    const pages = fs
      .readdirSync(path.join(REPO_ROOT, "app/[locale]"), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => `app/[locale]/${e.name}/page.tsx`)
      .filter((p) => fs.existsSync(path.join(REPO_ROOT, p)))
      .concat("app/[locale]/page.tsx");

    const missing = pages.filter((p) => {
      const src = read(p);
      return src.includes("generateMetadata") && !src.includes("localizedAlternates");
    });

    expect(missing).toEqual([]);
  });
});

/**
 * Lighthouse flags anchors whose text is a generic phrase — the link tells a
 * screen reader user, and a crawler, nothing about where it goes.
 */
describe("the cookie banner link describes its destination", () => {
  const banner = read("components/gdpr/CookieConsent.tsx");

  const GENERIC = ["Learn more", "Saber más", "En savoir plus", "Click here", "Read more", "More"];

  it.each(GENERIC)("no locale uses %j as the whole link text", (phrase) => {
    expect(banner).not.toMatch(new RegExp(`learnMore:\\s*"${phrase}"`));
  });

  it.each(["en", "es", "fr"])("%s says what the link is about", (locale) => {
    const block = banner.slice(banner.indexOf(`  ${locale}: {`));
    const value = /learnMore:\s*"([^"]+)"/.exec(block)?.[1];

    expect(value, `${locale} learnMore`).toBeTruthy();
    // "cookie" in all three languages happens to share the stem.
    expect(value!.toLowerCase()).toContain("cookie");
    expect(value!.split(/\s+/).length).toBeGreaterThan(3);
  });

  it("still points at the localized cookie policy", () => {
    // Descriptive text must not come at the cost of the destination.
    expect(banner).toContain("href={`/${locale}/cookies`}");
  });

  it("keeps its translations in-file, and says why", () => {
    // The banner mounts in app/layout.tsx, outside NextIntlClientProvider, so
    // useTranslations would throw. The three copies here ARE its catalog.
    expect(banner).toContain("OUTSIDE the NextIntlClientProvider");
    for (const locale of ["en", "es", "fr"]) {
      expect(banner).toContain(`  ${locale}: {`);
    }
  });
});
