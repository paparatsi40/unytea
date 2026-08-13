import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * PROD-01 — the dashboard and onboarding rendered in English regardless of the
 * user's language.
 *
 * `app/(dashboard)`, `app/onboarding` and `app/auth` sit outside the `[locale]`
 * segment, so next-intl's `requestLocale` is undefined for them and every
 * server render fell back to "en". The dashboard papered over half of it by
 * reading `localStorage` in a client effect — which server components cannot
 * see — and `app/onboarding/layout.tsx` simply hardcoded `locale="en"` while
 * the wizard itself had `useTranslations` commented out.
 *
 * The fix is a single locale cookie, written from the browser (never as a
 * Set-Cookie header, which is what `localeCookie: false` exists to prevent) and
 * read by `src/i18n.ts` whenever the URL cannot answer.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");

const mockCookieGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mockCookieGet }),
}));

// Outside a React Server Component the real export throws on sight. It is an
// identity function in next-intl (dist/.../getRequestConfig.js), so standing in
// for it here calls the config we wrote, unchanged.
vi.mock("next-intl/server", () => ({
  getRequestConfig: (createConfig: unknown) => createConfig,
}));

/**
 * Structural assertions below read source files. Comments in those files
 * legitimately quote the very patterns being banned — "this used to hardcode
 * locale='en'" — so they are stripped before matching.
 */
function code(relativePath: string): string {
  return fs
    .readFileSync(path.join(REPO_ROOT, relativePath), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

import getConfig from "@/src/i18n";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  resolveLocale,
} from "@/lib/locale";

function cookieHolds(value: string | undefined) {
  mockCookieGet.mockImplementation((name: string) =>
    name === LOCALE_COOKIE && value !== undefined ? { value } : undefined
  );
}

/** Invoke the request config the way next-intl does. */
async function requestConfig(routeLocale: string | undefined) {
  return getConfig({
    requestLocale: Promise.resolve(routeLocale),
    locale: undefined,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  cookieHolds(undefined);
});

describe("locale resolution outside the [locale] segment", () => {
  it("falls back to the cookie when the URL has no locale", async () => {
    cookieHolds("es");

    const config = await requestConfig(undefined);

    // This is the whole bug: without the cookie read this was "en".
    expect(config.locale).toBe("es");
  });

  it("loads the messages for the cookie's locale, not the default", async () => {
    cookieHolds("fr");

    const config = await requestConfig(undefined);
    const messages = config.messages as Record<string, Record<string, string>>;

    expect(messages.onboarding.title).toBe("Bienvenue sur Unytea !");
  });

  it("falls back to the default locale when no cookie is set", async () => {
    const config = await requestConfig(undefined);
    expect(config.locale).toBe(DEFAULT_LOCALE);
  });

  it("ignores a cookie value that is not a locale we ship", async () => {
    // The cookie is client-controlled and its value reaches a dynamic import().
    cookieHolds("../../etc/passwd");

    const config = await requestConfig(undefined);

    expect(config.locale).toBe(DEFAULT_LOCALE);
  });
});

describe("locale resolution inside the [locale] segment", () => {
  it("uses the URL locale", async () => {
    const config = await requestConfig("es");
    expect(config.locale).toBe("es");
  });

  it("does not let a stale cookie override the address bar", async () => {
    cookieHolds("fr");

    const config = await requestConfig("es");

    expect(config.locale).toBe("es");
  });

  it("never touches cookies for a prefixed route", async () => {
    // Marketing pages are statically prerendered; reading cookies here would
    // opt every one of them into dynamic rendering and lose the CDN cache.
    await requestConfig("en");

    expect(mockCookieGet).not.toHaveBeenCalled();
  });

  it("falls back for an unsupported URL locale rather than importing it", async () => {
    const config = await requestConfig("de");
    expect(config.locale).toBe(DEFAULT_LOCALE);
  });
});

describe("resolveLocale", () => {
  it.each([...SUPPORTED_LOCALES])("accepts %s", (locale) => {
    expect(resolveLocale(locale)).toBe(locale);
  });

  it.each([undefined, null, "", "de", "en-US", 42, {}])("rejects %s", (value) => {
    expect(resolveLocale(value)).toBe(DEFAULT_LOCALE);
    expect(isSupportedLocale(value)).toBe(false);
  });
});

/**
 * The trees that have no locale in their URL must all resolve one, and none of
 * them may hardcode a language.
 */
describe("the locale-less trees resolve a locale", () => {
  const LAYOUTS = [
    "app/(dashboard)/dashboard/layout.tsx",
    "app/onboarding/layout.tsx",
    "app/auth/layout.tsx",
  ];

  it.each(LAYOUTS)("%s resolves the locale from the request", (layout) => {
    expect(code(layout)).toContain("getLocale()");
  });

  it.each(LAYOUTS)("%s does not hardcode a locale", (layout) => {
    // e.g. locale="en" — what onboarding and auth both used to do.
    expect(code(layout)).not.toMatch(/locale=["'](en|es|fr)["']/);
  });

  it("the dashboard layout no longer reads localStorage", () => {
    // A client-side read cannot localize the server components below it.
    const source = code("app/(dashboard)/dashboard/layout.tsx");
    expect(source).not.toContain("localStorage");
    expect(source).not.toContain('"use client"');
  });
});

describe("the language switcher persists the choice server-side", () => {
  it("writes the shared preference rather than localStorage alone", () => {
    // localStorage alone is invisible to the server, which is why the dashboard
    // stayed English no matter what the switcher said.
    const source = code("components/LanguageSelector.tsx");
    expect(source).toContain("storeLocalePreference");
    expect(source).not.toMatch(/localStorage\.setItem\(\s*["']locale["']/);
  });

  it("the [locale] tree records the URL locale for the trees that lack one", () => {
    expect(code("app/[locale]/layout.tsx")).toContain("LocalePreferenceSync");
  });
});

/**
 * The onboarding wizard is a user's first screen; it had every string inlined
 * in English with `useTranslations` commented out on line 69.
 */
describe("the onboarding wizard is translated", () => {
  const source = code("app/onboarding/page.tsx");

  it("calls useTranslations instead of commenting it out", () => {
    expect(source).toMatch(/^\s*const t = useTranslations\("onboarding"\);/m);
    expect(source).not.toMatch(/\/\/\s*const t = useTranslations/);
  });

  it.each([
    "Welcome to Unytea!",
    "What brings you here?",
    "Select your role...",
    "Choose Your Plan",
    "Most Popular",
    "Skip for now",
    "Start Free Trial",
    "Setting up...",
  ])("no longer hardcodes %j", (phrase) => {
    expect(source).not.toContain(phrase);
  });

  it("keeps prices out of the translation files", () => {
    // A translator must never be able to change what a user is charged. Since
    // the plan step moved out of onboarding there is no price here at all —
    // asserted on the wizard itself in tests/unit/onboarding-flow.test.ts.
    for (const locale of SUPPORTED_LOCALES) {
      const messages = JSON.parse(
        fs.readFileSync(path.join(REPO_ROOT, `locales/${locale}.json`), "utf8")
      );
      expect(JSON.stringify(messages.onboarding)).not.toMatch(/price_|\$49|\$149/);
    }
  });
});

/**
 * Adding keys to one locale and not the others is the usual way translations
 * rot: the missing locale silently renders the key path to the user.
 */
describe("the locale catalogs stay at exact parity", () => {
  function flatten(value: unknown, prefix = "", out: string[] = []): string[] {
    if (Array.isArray(value)) {
      // Length matters: a features list with one fewer entry in Spanish is a
      // parity break that a key-name comparison alone would miss.
      out.push(`${prefix}[${value.length}]`);
      return out;
    }
    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        flatten(child, prefix ? `${prefix}.${key}` : key, out);
      }
      return out;
    }
    out.push(prefix);
    return out;
  }

  const catalogs = Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [
      locale,
      flatten(JSON.parse(fs.readFileSync(path.join(REPO_ROOT, `locales/${locale}.json`), "utf8"))),
    ])
  );

  it("finds a catalog worth checking", () => {
    expect(catalogs.en.length).toBeGreaterThan(1500);
  });

  it.each(SUPPORTED_LOCALES.filter((l) => l !== "en"))("%s matches en exactly", (locale) => {
    const en = new Set(catalogs.en);
    const other = new Set(catalogs[locale]);

    expect({
      missing: catalogs.en.filter((k) => !other.has(k)),
      extra: catalogs[locale].filter((k) => !en.has(k)),
    }).toEqual({ missing: [], extra: [] });
  });

  it.each(SUPPORTED_LOCALES)("%s carries the keys the new UI renders", (locale) => {
    const messages = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, `locales/${locale}.json`), "utf8")
    );

    expect(messages.onboarding.steps["4"].categories.Business).toBeTruthy();
    expect(messages.onboarding.navigation.stepOf).toContain("{current}");
    expect(messages.dashboard.errorBoundary.retry).toBeTruthy();
    expect(messages.dashboard.home.nextStep.inviteMembers.cta).toBeTruthy();
    expect(messages.dashboard.home.analytics.noChange).toBeTruthy();
  });
});
