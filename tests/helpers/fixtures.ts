import type { PasswordResetToken, User } from "@prisma/client";

/**
 * Fully-populated fixtures for the Prisma scalar shapes tests assert against.
 *
 * Every field is spelled out rather than cast, so adding a required column to
 * the schema surfaces here as a type error instead of being silently masked.
 * Relations are omitted — Prisma's scalar payload type does not include them
 * unless the query selects them.
 *
 * Add new fixtures here the same way: enumerated, not cast.
 */

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user_1",
    name: "Carlos",
    email: "carlos@example.com",
    emailVerified: null,
    password: "$2a$10$storedhashvaluefortestingpurposesonly",
    image: null,
    username: "carlos",
    firstName: "Carlos",
    lastName: "Alfaro",
    bio: null,
    tagline: null,
    skills: [],
    interests: [],
    website: null,
    location: null,
    timezone: "UTC",
    availabilityStatus: "AVAILABLE",
    isOnboarded: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    lastActiveAt: null,
    stripeConnectAccountId: null,
    deletedAt: null,
    platformPlan: "START",
    role: "USER",
    ...overrides,
  };
}

export function makePasswordResetToken(
  overrides: Partial<PasswordResetToken> = {}
): PasswordResetToken {
  return {
    id: "tok_1",
    email: "carlos@example.com",
    token: "a".repeat(64),
    expires: new Date(Date.now() + 60 * 60 * 1000),
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}
