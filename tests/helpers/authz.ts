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
 * The seam's paywall check selects only `{ paywallLocked, ownerId }`. This
 * fixture mirrors that projection rather than inventing the ~40 columns the
 * query never reads, so the cast is narrowing a partial select to the delegate's
 * declared return type — not papering over a missing required field.
 */
export function makeCommunityRow(
  overrides: Partial<Pick<Community, "paywallLocked" | "ownerId">> = {}
): Community {
  return { paywallLocked: false, ownerId: "user_1", ...overrides } as Community;
}
