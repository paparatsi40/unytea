import { describe, it, expect } from "vitest";
import { buildDefaultLandingLayout } from "@/lib/community-landing-template";

describe("buildDefaultLandingLayout", () => {
  it("returns 7 sections in expected order", () => {
    const layout = buildDefaultLandingLayout({
      name: "Test Community",
      slug: "test",
    });
    expect(layout.sections).toHaveLength(7);
    expect(layout.sections.map((s) => s.type)).toEqual([
      "hero",
      "stats",
      "upcomingSessions",
      "postsFeed",
      "membershipTiers",
      "ownerBio",
      "cta",
    ]);
  });

  it("each section has a unique id", () => {
    const layout = buildDefaultLandingLayout({ name: "X", slug: "x" });
    const ids = layout.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(7);
  });

  it("Hero section pulls from community fields", () => {
    const layout = buildDefaultLandingLayout({
      name: "Morning Stretch",
      slug: "morning-stretch",
      description: "Daily yoga",
      coverImageUrl: "https://example.com/cover.jpg",
    });
    const hero = layout.sections.find((s) => s.type === "hero");
    expect(hero?.props.title).toBe("Morning Stretch");
    expect(hero?.props.subtitle).toBe("Daily yoga");
    expect(hero?.props.imageUrl).toBe("https://example.com/cover.jpg");
    expect(hero?.props.ctaUrl).toBe("/c/morning-stretch/join");
  });

  it("OwnerBio section pulls from community.owner relation", () => {
    const layout = buildDefaultLandingLayout({
      name: "X",
      slug: "x",
      ownerTitle: "Yoga teacher",
      ownerBio: "I love yoga.",
      owner: {
        name: "Maya Rodriguez",
        image: "https://example.com/avatar.jpg",
      },
    });
    const ownerBio = layout.sections.find((s) => s.type === "ownerBio");
    expect(ownerBio?.props.name).toBe("Maya Rodriguez");
    expect(ownerBio?.props.role).toBe("Yoga teacher");
    expect(ownerBio?.props.bio).toBe("I love yoga.");
    expect(ownerBio?.props.imageUrl).toBe("https://example.com/avatar.jpg");
  });

  it("handles null/missing community fields gracefully", () => {
    const layout = buildDefaultLandingLayout({});
    expect(layout.sections).toHaveLength(7);
    // FIX-I4: generic labels persist as empty strings; the section render-time
    // t() fallback localizes them. Community-specific fields default to "" too
    // when absent. ctaUrl stays a safe placeholder when there's no slug.
    const hero = layout.sections.find((s) => s.type === "hero");
    expect(hero?.props.title).toBe("");
    expect(hero?.props.ctaLabel).toBe("");
    expect(hero?.props.ctaUrl).toBe("#"); // no slug → safe placeholder

    const cta = layout.sections.find((s) => s.type === "cta");
    expect(cta?.props.title).toBe("");
    expect(cta?.props.subtitle).toBe("");
    expect(cta?.props.ctaLabel).toBe("");
  });

  it("uses /c/{slug}/join for both Hero CTA and final CTA section", () => {
    const layout = buildDefaultLandingLayout({
      name: "X",
      slug: "test-slug",
    });
    const hero = layout.sections.find((s) => s.type === "hero");
    const cta = layout.sections.find((s) => s.type === "cta");
    expect(hero?.props.ctaUrl).toBe("/c/test-slug/join");
    expect(cta?.props.ctaUrl).toBe("/c/test-slug/join");
  });

  it("UpcomingSessions/PostsFeed/MembershipTiers have sensible default props", () => {
    const layout = buildDefaultLandingLayout({ name: "X", slug: "x" });

    const upcoming = layout.sections.find((s) => s.type === "upcomingSessions");
    expect(upcoming?.props.limit).toBe(5);

    const posts = layout.sections.find((s) => s.type === "postsFeed");
    expect(posts?.props.limit).toBe(5);

    const tiers = layout.sections.find((s) => s.type === "membershipTiers");
    expect(tiers?.props.title).toBeTruthy();
  });
});
