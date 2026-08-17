import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/normalize-email";
import { BCRYPT_COST, FAKE_BCRYPT_HASH } from "@/lib/auth-hashing";
import type { UserRole } from "@prisma/client";

/**
 * Credentials-provider authorization, extracted from `lib/auth.ts` so the login
 * path is directly testable. `lib/auth.ts` calls `NextAuth({...})` at module
 * load, which makes the inline `authorize` callback unreachable from a unit
 * test; this module has no such side effect.
 *
 * The cost and the constant-time decoy both come from `lib/auth-hashing.ts`,
 * which is also where the reason they have to move together is written down.
 */

export const credentialsSchema = z.object({
  // `.trim()` before `.email()`: a pasted address with a trailing space is not
  // a valid email to Zod, so without this the request was rejected as bad
  // credentials before normalization could do anything about it.
  email: z.string().trim().email(),
  password: z.string().min(8),
});

export interface AuthorizedUser {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  username: string | null;
  isOnboarded: boolean;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
}

/**
 * Move a password onto the current cost, in the background, after the user has
 * already proved they know it.
 *
 * bcrypt records its cost in the digest, so an old hash keeps verifying
 * forever at the cost it was written with. A successful login is the only
 * moment the plaintext is available to re-hash — so it is the only moment this
 * can happen, and taking it means old hashes climb on their own instead of
 * needing a migration nobody can write.
 *
 * Never blocking, and never able to fail a login: the user typed the right
 * password, and a database write that did not work is not their problem. The
 * next login will simply try again.
 */
async function upgradePasswordCostInBackground(
  userId: string,
  storedHash: string,
  plaintext: string
): Promise<void> {
  let currentCost: number;
  try {
    currentCost = bcrypt.getRounds(storedHash);
  } catch {
    // Not a digest we can read the cost from. Leave it alone rather than
    // rewrite something we do not understand.
    return;
  }

  if (currentCost >= BCRYPT_COST) return;

  try {
    const upgraded = await bcrypt.hash(plaintext, BCRYPT_COST);
    await prisma.user.update({ where: { id: userId }, data: { password: upgraded } });
    console.info("[auth] password_cost_upgraded", { userId, from: currentCost, to: BCRYPT_COST });
  } catch (error) {
    // Swallowed on purpose. Logged without the email or the password.
    console.error("[auth] password_cost_upgrade_failed", {
      userId,
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function authorizeCredentials(credentials: unknown): Promise<AuthorizedUser | null> {
  try {
    const { email, password } = credentialsSchema.parse(credentials);

    // Normalized so a mixed-case login finds the row sign-up wrote.
    const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });

    const hashToCheck = user?.password ?? FAKE_BCRYPT_HASH;
    const isValidPassword = await bcrypt.compare(password, hashToCheck);

    if (!user || !user.password || !isValidPassword) {
      // Never log the email (PII / GDPR). Only the event and a userId if known.
      console.warn("[auth] login_failed", {
        userId: user?.id ?? null,
        reason: !user
          ? "user_not_found"
          : !user.password
            ? "oauth_only_account"
            : "invalid_password",
      });
      return null;
    }

    // The password is correct and still in hand, which is the only window in
    // which its cost can be raised. Awaited so a failure cannot surface as an
    // unhandled rejection, but it cannot fail the login — see the helper.
    await upgradePasswordCostInBackground(user.id, user.password, password);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      username: user.username,
      isOnboarded: user.isOnboarded,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  } catch (error) {
    console.error("[auth] login_error", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}
