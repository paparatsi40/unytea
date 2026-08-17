import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/normalize-email";
import type { UserRole } from "@prisma/client";

/**
 * Credentials-provider authorization, extracted from `lib/auth.ts` so the login
 * path is directly testable. `lib/auth.ts` calls `NextAuth({...})` at module
 * load, which makes the inline `authorize` callback unreachable from a unit
 * test; this module has no such side effect.
 *
 * Behaviour is unchanged from the inline version — see the constant-time note
 * on FAKE_BCRYPT_HASH below.
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
 * A valid bcrypt digest of a value no user can supply. When the account does not
 * exist, or exists but is OAuth-only, we still run `bcrypt.compare` against this
 * so the response time does not reveal which case occurred. Removing this
 * reintroduces user enumeration via timing.
 */
const FAKE_BCRYPT_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

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
