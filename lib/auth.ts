import NextAuth, { DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { authorizeCredentials } from "@/lib/auth-credentials";
import type { UserRole } from "@prisma/client";
import { sessionCookieName, shouldUseSecureCookies } from "@/lib/auth-cookies";
import { oauthCredentials } from "@/lib/auth-providers";

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username?: string | null;
      isOnboarded: boolean;
      firstName?: string | null;
      lastName?: string | null;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    username?: string | null;
    isOnboarded: boolean;
    firstName?: string | null;
    lastName?: string | null;
    role?: UserRole;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    username?: string | null;
    isOnboarded?: boolean;
    firstName?: string | null;
    lastName?: string | null;
    role?: UserRole;
  }
}

const googleCredentials = oauthCredentials("google");
const githubCredentials = oauthCredentials("github");

export const { handlers, auth, signIn, signOut } = NextAuth({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- NextAuth v5 (beta) and @auth/prisma-adapter ship slightly divergent Adapter interfaces; PrismaAdapter's return type does not structurally match the Adapter type NextAuth expects at this boundary. Cast is required until both packages stabilize on a shared @auth/core version.
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      // Keyed on the auth URL's protocol, which is the same signal @auth/core
      // uses for every cookie it names itself:
      //   defaultCookies(config.useSecureCookies ?? url.protocol === "https:")
      //
      // This block previously keyed on NODE_ENV instead, and the app's config
      // is merged ON TOP of @auth/core's defaults — so the two halves decided
      // "are we secure?" from different inputs and could disagree. Wherever
      // they did (local dev and Vercel preview deploys, where the auth URL is
      // https but NODE_ENV is not "production"), the CSRF cookie went out as
      // `__Host-authjs.csrf-token; Secure` while the session cookie went out
      // plain. A browser refuses to store a __Host-/Secure cookie over http, so
      // the next POST to /api/auth/signout arrived with no CSRF cookie and was
      // refused — with HTTP 200 and no Set-Cookie, which is why the failure was
      // invisible. See app/actions/auth.ts for the full capture.
      //
      // Production is unaffected: the auth URL is https there, so the name is
      // still `__Secure-next-auth.session-token` and existing sessions stay
      // valid. Local development needs NEXTAUTH_URL to be the URL actually
      // being served (http://localhost:3000), not the production one.
      name: sessionCookieName(),
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: shouldUseSecureCookies(),
      },
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    verifyRequest: "/auth/verify",
    newUser: "/onboarding",
  },
  // An OAuth provider is registered only when both of its env vars are present.
  // An unconfigured provider therefore does not exist at all: no entry in
  // /api/auth/providers, no callback route, and — because the sign-in and
  // sign-up pages derive their buttons from the same `lib/auth-providers.ts` —
  // no button offering it. Credentials is unconditional; email and password are
  // always available.
  //
  // The credentials come back already validated, which is why there are no `!`
  // assertions here. Those assertions were the reason a missing variable
  // travelled all the way to the OAuth handshake before failing.
  providers: [
    ...(googleCredentials
      ? [
          Google({
            ...googleCredentials,
            // Someone who signed up with email and password and later clicks
            // "Continue with Google" on the same address used to hit
            // OAuthAccountNotLinked: NextAuth refuses by default to attach an
            // OAuth account to an existing user, because for a provider that
            // does not verify email ownership, anyone who can claim an address
            // at that provider could take over the account.
            //
            // Google does verify ownership, so the address in the profile is
            // proof the person controls the mailbox — the same proof a password
            // reset would rely on. Linking on it is the standard configuration
            // for this provider.
            //
            // Deliberately scoped to Google alone. It must not be copied to
            // GitHub or to any provider added later without first establishing
            // that the provider verifies email ownership.
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(githubCredentials ? [GitHub(githubCredentials)] : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // Delegates to lib/auth-credentials.ts so the login path is unit-testable
      // without initialising NextAuth. Behaviour is identical.
      authorize: authorizeCredentials,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers, ensure user exists in database
      if (account?.provider === "google" || account?.provider === "github") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });

        if (!existingUser) {
          // Create user if doesn't exist - will go through onboarding
          await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name,
              image: user.image,
              emailVerified: new Date(),
              isOnboarded: false, // Let user go through onboarding
            },
          });
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.isOnboarded = user.isOnboarded;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.role = user.role;
      }

      // Update token on session update
      if (trigger === "update" && session) {
        token = { ...token, ...session };
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string | null;
        session.user.isOnboarded = token.isOnboarded as boolean;
        session.user.firstName = token.firstName as string | null;
        session.user.lastName = token.lastName as string | null;
        session.user.role = (token.role ?? "USER") as UserRole;
      }

      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Log sin email (PII). Solo userId.
      console.log("[auth] user_created", { userId: user.id });
    },
    async signIn({ user }) {
      // Update last active timestamp
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastActiveAt: new Date(),
          },
        });
      } catch (err) {
        console.error("[auth] signin_event_error", {
          userId: user.id,
          message: err instanceof Error ? err.message : "unknown",
        });
      }
    },
  },
  // trustHost: true tells NextAuth to trust the X-Forwarded-Host header
  // sent by the reverse proxy (Vercel edge) instead of validating against
  // AUTH_URL. Required for Vercel preview deploys (*.vercel.app) where
  // the actual host differs from production AUTH_URL=www.unytea.com.
  //
  // Safety: Vercel sets X-Forwarded-Host server-side at the edge, not from
  // client input — attackers cannot forge this header in incoming requests.
  // This is the official NextAuth recommendation for Vercel deployments.
  //
  // Equivalent to AUTH_TRUST_HOST=true env var, but explicit code config
  // takes precedence over env and is preferred for visibility in PRs.
  trustHost: true,
  debug: process.env.NODE_ENV === "development",
});
