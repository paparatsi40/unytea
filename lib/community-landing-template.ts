import { randomUUID } from "crypto";
import type { LandingLayout, SectionInstance } from "@/components/section-builder/types";

interface CommunityForTemplate {
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
  ownerTitle?: string | null;
  ownerBio?: string | null;
  owner?: {
    name?: string | null;
    image?: string | null;
  } | null;
}

/**
 * Generates the default Patreon-style landing layout for a community.
 *
 * Section order optimized for the emerging-creator persona (PD V1 §2):
 * 1. Hero — visual identity + immediate "Join" CTA
 * 2. Stats — social proof (member avatars + activity)
 * 3. UpcomingSessions — Unytea's live-first differentiator
 * 4. PostsFeed — community is alive (recent posts)
 * 5. MembershipTiers — monetization (only renders if community has plans)
 * 6. OwnerBio — extended context about the host
 * 7. CTA — final conversion push
 *
 * Designed for communities pre-launch or just starting. Empty states in
 * each section (no sessions yet, no posts, no tiers) degrade gracefully —
 * the host's bare community still looks polished.
 *
 * NOTE: callers persist the returned `.sections` array directly into the
 * community.landingLayout Json column (the column stores a bare
 * SectionInstance[], not the LandingLayout wrapper — see the public page
 * and the landing PATCH route, both of which treat it as an array).
 */
export function buildDefaultLandingLayout(community: CommunityForTemplate): LandingLayout {
  const joinUrl = community.slug ? `/c/${community.slug}/join` : "#";

  const sections: SectionInstance[] = [
    {
      id: randomUUID(),
      type: "hero",
      props: {
        title: community.name ?? "Welcome to our community",
        subtitle: community.description ?? "",
        imageUrl: community.coverImageUrl ?? "",
        ctaLabel: "Join community",
        ctaUrl: joinUrl,
        alignment: "left",
      },
    },
    {
      id: randomUUID(),
      type: "stats",
      props: {
        title: "Community",
      },
    },
    {
      id: randomUUID(),
      type: "upcomingSessions",
      props: {
        title: "Upcoming sessions",
        limit: 5,
      },
    },
    {
      id: randomUUID(),
      type: "postsFeed",
      props: {
        title: "Latest from the community",
        limit: 5,
      },
    },
    {
      id: randomUUID(),
      type: "membershipTiers",
      props: {
        title: "Become a member",
      },
    },
    {
      id: randomUUID(),
      type: "ownerBio",
      props: {
        title: "About the host",
        name: community.owner?.name ?? "",
        role: community.ownerTitle ?? "",
        bio: community.ownerBio ?? "",
        imageUrl: community.owner?.image ?? "",
        link1Label: "",
        link1Url: "",
        link2Label: "",
        link2Url: "",
      },
    },
    {
      id: randomUUID(),
      type: "cta",
      props: {
        title: "Ready to join?",
        subtitle: "Be part of a community that meets live.",
        ctaLabel: "Join community",
        ctaUrl: joinUrl,
      },
    },
  ];

  return { sections };
}
