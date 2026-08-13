import type { Community, Member } from "@prisma/client";

/**
 * Fixtures for the authorization seam's two lookups.
 */

/** Full `Member` row — every column enumerated, as `requireCommunityMember` returns the whole record. */
export function makeMemberRow(overrides: Partial<Member> = {}): Member {
  return {
    id: "member_1",
    role: "MEMBER",
    customRole: null,
    permissions: null,
    status: "ACTIVE",
    joinedAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    userId: "user_1",
    communityId: "community_1",
    welcomeMessageSeen: false,
    ...overrides,
  };
}

/**
 * Covers the two narrow projections the action layer takes of a community: the
 * seam's paywall check (`{ paywallLocked, ownerId }`) and the `communityById`
 * resolver (`{ id }`). Mirrors those rather than inventing the ~40 columns the
 * queries never read, so the cast narrows a partial select to the delegate's
 * declared return type rather than papering over a missing required field.
 */
export function makeCommunityRow(
  overrides: Partial<Pick<Community, "id" | "slug" | "paywallLocked" | "ownerId">> = {}
): Community {
  return {
    id: "community_1",
    slug: "test-community",
    paywallLocked: false,
    ownerId: "user_1",
    ...overrides,
  } as Community;
}
