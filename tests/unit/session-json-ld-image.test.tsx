// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { render, cleanup } from "@testing-library/react";
import { SessionJsonLd } from "@/components/sessions/SessionJsonLd";
import { SITE_URL } from "@/lib/site-url";
import type { PublicSessionData } from "@/app/actions/public-sessions";

/**
 * `/og-image.png` does not exist in `public/`.
 *
 * It was the image fallback in four places: the `library`, `community/[slug]`
 * and `s/[slug]` Open Graph blocks, and here, in the Event JSON-LD every public
 * session page emits. A session with no community cover and a host with no
 * avatar handed Google a 404 as its structured-data image — worse than an
 * absent field, because a broken URL is something the crawler tries and fails
 * to fetch rather than something it skips.
 *
 * `/og` is the route that actually renders a card, and it is already what the
 * Open Graph defaults use, so the rich snippet and the social preview now agree
 * on the same image.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");

function makeSession(overrides: {
  communityImage?: string | null;
  hostImage?: string | null;
  recordingUrl?: string | null;
}): PublicSessionData {
  return {
    id: "s1",
    slug: "deep-work",
    title: "Deep work, weekly",
    description: "A working session",
    status: "SCHEDULED",
    visibility: "public",
    canWatchRecording: false,
    isMember: false,
    scheduledAt: new Date("2026-03-04T10:00:00Z"),
    duration: 60,
    attendeeCount: 4,
    host: { id: "h1", name: "Ada", image: overrides.hostImage ?? null, bio: null },
    community: {
      id: "c1",
      name: "Focus Club",
      slug: "focus",
      description: null,
      imageUrl: overrides.communityImage ?? null,
      memberCount: 10,
    },
    recording: overrides.recordingUrl
      ? { id: "r1", url: overrides.recordingUrl, status: "READY", durationSeconds: 3600 }
      : null,
    notes: null,
  } as PublicSessionData;
}

/** Every JSON-LD block the component emits, parsed. */
function jsonLdBlocks(session: PublicSessionData): Record<string, unknown>[] {
  const { container } = render(<SessionJsonLd session={session} />);
  return Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map((el) =>
    JSON.parse(el.innerHTML)
  );
}

function eventBlock(session: PublicSessionData): Record<string, unknown> {
  const block = jsonLdBlocks(session).find((b) => b["@type"] === "Event");
  expect(block).toBeDefined();
  return block!;
}

afterEach(() => {
  cleanup();
});

describe("session JSON-LD image", () => {
  it("falls back to /og, not to the file that does not exist", () => {
    const block = eventBlock(makeSession({}));

    expect(block.image).toBe(`${SITE_URL}/og`);
    expect(String(block.image)).not.toContain("og-image.png");
  });

  it("prefers the community cover", () => {
    const block = eventBlock(makeSession({ communityImage: "https://utfs.io/f/cover.png" }));

    expect(block.image).toBe("https://utfs.io/f/cover.png");
  });

  it("falls back to the host avatar before /og", () => {
    const block = eventBlock(makeSession({ hostImage: "https://utfs.io/f/ada.png" }));

    expect(block.image).toBe("https://utfs.io/f/ada.png");
  });

  it("never emits og-image.png in any block", () => {
    for (const session of [
      makeSession({}),
      makeSession({ communityImage: "https://utfs.io/f/cover.png" }),
      makeSession({ hostImage: "https://utfs.io/f/ada.png" }),
      makeSession({ recordingUrl: "https://utfs.io/f/rec.mp4" }),
    ]) {
      const rendered = JSON.stringify(jsonLdBlocks(session));
      expect(rendered).not.toContain("og-image.png");
      cleanup();
    }
  });

  it("gives the VideoObject a real thumbnail instead of null", () => {
    // `thumbnailUrl` had no fallback and serialised as a literal `null`, which
    // is invalid structured data rather than an omitted field.
    const blocks = jsonLdBlocks(makeSession({ recordingUrl: "https://utfs.io/f/rec.mp4" }));
    const video = blocks.find((b) => b["@type"] === "VideoObject");

    expect(video).toBeDefined();
    expect(video!.thumbnailUrl).toBe(`${SITE_URL}/og`);
  });
});

describe("og-image.png is gone from the codebase", () => {
  // The guard, not just the fix: the file is not in public/, so any executable
  // reference to it is a broken URL wherever it lands — Open Graph, JSON-LD or
  // anywhere else. Comments are stripped so the ones documenting the removal
  // do not match themselves.
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

  it("is not referenced by any executable line", () => {
    const offenders: string[] = [];

    for (const dir of ["app", "components", "lib"]) {
      for (const file of walk(path.join(REPO_ROOT, dir))) {
        if (code(fs.readFileSync(file, "utf8")).includes("og-image.png")) {
          offenders.push(path.relative(REPO_ROOT, file));
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("is still genuinely absent from public/, which is why this matters", () => {
    expect(fs.existsSync(path.join(REPO_ROOT, "public", "og-image.png"))).toBe(false);
  });
});
