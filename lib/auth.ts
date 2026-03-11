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
      allowDangerousEmailAccountLinking: true,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
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

          if (!user || !user.password) {
            return null
          }

          // Verify password
          const isValidPassword = await bcrypt.compare(password, user.password)

          if (!isValidPassword) {
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
        } catch {
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
      // Log user creation
      console.log(`✅ New user created: ${user.email}`)
    },
    async signIn({ user }) {
      // Update last active timestamp
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          lastActiveAt: new Date(),
          // Don't mark as onboarded here - let the onboarding page do it
        },
      })
    },
  },
  trustHost: true, // Required for Vercel deployment
  debug: process.env.NODE_ENV === "development",
})