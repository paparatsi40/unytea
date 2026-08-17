import { describe, it, expect, vi, beforeEach } from "vitest";
import { SITE_URL } from "@/lib/site-url";
import { SUPPORTED_LOCALES } from "@/lib/seo/locale-metadata";
import { prisma } from "@/lib/prisma";

// `generateMetadata` on these pages runs in a request scope Next provides and
// vitest does not. Echoing the key back is enough: nothing here asserts on
// translated copy, only on url/images/siteName.
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
  setRequestLocale: () => {},
  getLocale: async () => "en",
  getMessages: async () => ({}),
}));

const getPublicSessionBySlug = vi.fn();
vi.mock("@/app/actions/public-sessions", () => ({
  getPublicSessionBySlug: (...args: unknown[]) => getPublicSessionBySlug(...args),
  getRelatedSessions: vi.fn(),
  getNextCommunitySession: vi.fn(),
  getRelatedCommunitiesHostingThisWeek: vi.fn(),
}));

import { generateMetadata as blogIndexMetadata } from "@/app/[locale]/blog/page";
import { generateMetadata as blogPostMetadata } from "@/app/[locale]/blog/[slug]/page";
import { generateMetadata as exploreMetadata } from "@/app/[locale]/explore/page";
import { generateMetadata as libraryMetadata } from "@/app/[locale]/library/page";
import { generateMetadata as communityMetadata } from "@/app/[locale]/community/[slug]/page";
import { generateMetadata as sessionMetadata } from "@/app/[locale]/s/[slug]/page";

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * The six pages people actually share.
 *
 * Each declared its own `openGraph` object, which in Next replaces the root
 * layout's entirely rather than merging into it — the same defect the homepage
 * had. Every one of them was missing some subset of `url`, `images`,
 * `siteName`, `locale` and `alternateLocale`.
 *
 * Two of them were worse than missing: `library`, `community/[slug]` and
 * `s/[slug]` pointed `images` at `${SITE_URL}/og-image.png`, which is not in
 * `public/`. A 404 as the preview image is worse than none, because the
 * scraper has nothing to fall back to.
 *
 * These tests assert the object each page's own `generateMetadata` returns, not
 * a reconstruction of it. The dynamic pages additionally have to agree with
 * their own canonical: og:url is the page's identity in the graph, and one
 * pointing at the homepage would attribute every share of a session or a
 * community to the homepage.
 */

const APEX = SITE_URL;

type OG = {
  url?: string;
  siteName?: string;
  title?: string;
  description?: string;
  type?: string;
  locale?: string;
  alternateLocale?: readonly string[];
  images?: ReadonlyArray<{ url: string }>;
};

function og(metadata: { openGraph?: unknown }): OG {
  return metadata.openGraph as OG;
}

/** Every migrated page must carry these, whatever else it overrides. */
function expectInheritedDefaults(value: OG) {
  expect(value.siteName).toBe("Unytea");
  expect(value.locale).toBe("en_US");
  expect(value.alternateLocale).toEqual(["es_ES", "fr_FR"]);
  expect(value.images?.length).toBeGreaterThan(0);
  expect(value.url?.startsWith(APEX)).toBe(true);
  // The retired host. Canonicalisation sent www to the apex; an og:url there
  // would advertise a URL that 308-redirects.
  expect(value.url).not.toContain("www.");
}

// ── static pages ───────────────────────────────────────────────────────────
describe("blog index", () => {
  it.each([...SUPPORTED_LOCALES])("%s: inherits the defaults", async (locale) => {
    const value = og(await blogIndexMetadata({ params: Promise.resolve({ locale }) }));

    expectInheritedDefaults(value);
    expect(value.url).toBe(`${APEX}/${locale}/blog`);
    expect(value.images?.[0].url).toBe("/og");
    expect(value.title).toBe("Blog | Unytea");
  });
});

describe("explore", () => {
  it.each([...SUPPORTED_LOCALES])("%s: inherits the defaults", async (locale) => {
    const value = og(await exploreMetadata({ params: Promise.resolve({ locale }) }));

    expectInheritedDefaults(value);
    expect(value.url).toBe(`${APEX}/${locale}/explore`);
    expect(value.images?.[0].url).toBe("/og");
  });
});

describe("library", () => {
  it.each([...SUPPORTED_LOCALES])("%s: inherits the defaults", async (locale) => {
    const value = og(await libraryMetadata({ params: Promise.resolve({ locale }) }));

    expectInheritedDefaults(value);
    expect(value.url).toBe(`${APEX}/${locale}/library`);
  });

  it("no longer advertises the og-image.png that does not exist", async () => {
    const metadata = await libraryMetadata({ params: Promise.resolve({ locale: "en" }) });

    expect(JSON.stringify(metadata)).not.toContain("og-image.png");
    expect(og(metadata).images?.[0].url).toBe("/og");
  });
});

// ── dynamic pages ──────────────────────────────────────────────────────────
describe("blog post", () => {
  const SLUG = "launch-community-that-converts";

  it.each([...SUPPORTED_LOCALES])("%s: og:url is the post, not the home", async (locale) => {
    const metadata = await blogPostMetadata({ params: Promise.resolve({ locale, slug: SLUG }) });
    const value = og(metadata);

    expect(value.url).toBe(`${APEX}/${locale}/blog/${SLUG}`);
    expect(value.url).not.toBe(APEX);
    expect(value.url).toBe(metadata.alternates?.canonical);
  });

  it("keeps its own cover image and article type", async () => {
    const value = og(
      await blogPostMetadata({ params: Promise.resolve({ locale: "en", slug: SLUG }) })
    );

    expect(value.type).toBe("article");
    // Its own cover, not the shared /og fallback.
    expect(value.images?.[0].url).not.toBe("/og");
    expect(value.images?.[0].url.startsWith("http")).toBe(true);
    expect(value.siteName).toBe("Unytea");
  });
});

describe("community preview", () => {
  function metadataFor(imageUrl: string | null) {
    vi.mocked(prisma.community.findUnique).mockResolvedValue({
      name: "Focus Club",
      description: "A community about deep work",
      imageUrl,
      owner: { name: "Ada", firstName: "Ada", lastName: "L" },
    } as never);

    return communityMetadata({ params: Promise.resolve({ locale: "es", slug: "focus" }) });
  }

  it("og:url is the community, not the home", async () => {
    const metadata = await metadataFor(null);
    const value = og(metadata);

    expect(value.url).toBe(`${APEX}/es/community/focus`);
    expect(value.url).not.toBe(APEX);
    expect(value.url).toBe(metadata.alternates?.canonical);
  });

  it("uses the community cover when it has one", async () => {
    const value = og(await metadataFor("https://utfs.io/f/cover.png"));

    expect(value.images?.[0].url).toBe("https://utfs.io/f/cover.png");
  });

  it("falls back to the /og card, not the missing file, when it has none", async () => {
    const metadata = await metadataFor(null);

    expect(og(metadata).images?.[0].url).toBe("/og");
    expect(JSON.stringify(metadata)).not.toContain("og-image.png");
  });

  it("inherits siteName and locale either way", async () => {
    expectInheritedDefaults(og(await metadataFor(null)));
    expectInheritedDefaults(og(await metadataFor("https://utfs.io/f/cover.png")));
  });
});

describe("public session page", () => {
  function metadataFor(overrides: { communityImage?: string | null; mentorImage?: string | null }) {
    getPublicSessionBySlug.mockResolvedValue({
      id: "s1",
      title: "Deep work, weekly",
      description: "A working session",
      status: "SCHEDULED",
      mentor: { name: "Ada", image: overrides.mentorImage ?? null },
      community: { id: "c1", name: "Focus Club", imageUrl: overrides.communityImage ?? null },
    });

    return sessionMetadata({ params: Promise.resolve({ locale: "en", slug: "deep-work" }) });
  }

  it("og:url is the session, not the home", async () => {
    const metadata = await metadataFor({});
    const value = og(metadata);

    // This page's canonical carries no locale prefix, so og:url must not
    // either — they have to be the same string.
    expect(value.url).toBe(`${APEX}/s/deep-work`);
    expect(value.url).not.toBe(APEX);
    expect(value.url).toBe(metadata.alternates?.canonical);
  });

  it("prefers the community cover, then the host avatar", async () => {
    expect(
      og(await metadataFor({ communityImage: "https://utfs.io/f/c.png" })).images?.[0].url
    ).toBe("https://utfs.io/f/c.png");
    expect(og(await metadataFor({ mentorImage: "https://utfs.io/f/m.png" })).images?.[0].url).toBe(
      "https://utfs.io/f/m.png"
    );
  });

  it("falls back to the /og card, not the missing file", async () => {
    const metadata = await metadataFor({});

    expect(og(metadata).images?.[0].url).toBe("/og");
    expect(JSON.stringify(metadata)).not.toContain("og-image.png");
  });

  it("inherits siteName and locale", async () => {
    expectInheritedDefaults(og(await metadataFor({})));
  });
});
