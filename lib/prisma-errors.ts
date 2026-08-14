import { Prisma } from "@prisma/client";

/**
 * Prisma's unique-constraint violation (P2002).
 *
 * Narrowed by code rather than by `instanceof`: a Prisma client instantiated in
 * a different module realm — which the generated client does under Next's
 * bundling — fails the instance check while still carrying the code.
 *
 * Shared because two call sites need exactly this test and they need it to mean
 * the same thing: `joinCommunity`, where a lost race is the same outcome as
 * "already a member", and the Stripe webhook, where a concurrent delivery of
 * the same event is the same outcome as "already processed". A second copy of
 * the check is a second chance to get the narrowing wrong.
 */
export function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError
    ? error.code === "P2002"
    : typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}
