import NextAuth, { DefaultSession } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      username?: string | null
      isOnboarded: boolean
      role?: string
      firstName?: string | null
      lastName?: string | null
    } & DefaultSession["user"]
  }

  interface User {
    username?: string | null
    isOnboarded: boolean
    firstName?: string | null
    lastName?: string | null
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    verifyRequest: "/auth/verify",
    newUser: "/onboarding",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const { email, password } = credentialsSchema.parse(credentials)

          // Find user
          const user = await prisma.user.findUnique({
            where: { email },
          })

          // Constant-time check to mitigate user enumeration via timing attacks.
          // Si el user no existe o no tiene password (cuenta OAuth-only), aún corremos
          // bcrypt.compare contra un hash dummy para que el tiempo de respuesta no delate
          // la existencia o no del email.
          const FAKE_BCRYPT_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
          const hashToCheck = user?.password ?? FAKE_BCRYPT_HASH
          const isValidPassword = await bcrypt.compare(password, hashToCheck)

          if (!user || !user.password || !isValidPassword) {
            // No logueamos el email (PII / GDPR). Solo registramos el evento con userId si existe.
            console.warn("[auth] login_failed", {
              userId: user?.id ?? null,
              reason: !user ? "user_not_found" : !user.password ? "oauth_only_account" : "invalid_password",
            })
            return null
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
          }
        } catch (error) {
          console.error("[auth] login_error", {
            message: error instanceof Error ? error.message : "unknown",
          })
          return null
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers, ensure user exists in database
      if (account?.provider === "google" || account?.provider === "github") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        })

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
          })
        }
      }
      return true
    },
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id
        token.username = user.username
        token.isOnboarded = user.isOnboarded
        token.firstName = user.firstName
        token.lastName = user.lastName
      }

      // Update token on session update
      if (trigger === "update" && session) {
        token = { ...token, ...session }
      }

      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.username = token.username as string | null
        session.user.isOnboarded = token.isOnboarded as boolean
        session.user.firstName = token.firstName as string | null
        session.user.lastName = token.lastName as string | null
      }

      return session
    },
  },
  events: {
    async createUser({ user }) {
      // Log sin email (PII). Solo userId.
      console.log("[auth] user_created", { userId: user.id })
    },
    async signIn({ user }) {
      // Update last active timestamp
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastActiveAt: new Date(),
          },
        })
      } catch (err) {
        console.error("[auth] signin_event_error", {
          userId: user.id,
          message: err instanceof Error ? err.message : "unknown",
        })
      }
    },
  },
  trustHost: true, // Required for Vercel deployment
  debug: process.env.NODE_ENV === "development",
})