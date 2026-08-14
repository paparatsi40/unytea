import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import type { Member, MemberRole } from "@prisma/client";

import { auth } from "@/lib/auth";
import {
  ForbiddenError,
  UnauthorizedError,
  requireCommunityMember,
  requireCommunityRole,
} from "@/lib/authorization";
import { rateLimiters } from "@/lib/rate-limit";

import { actionFailure, type ActionFailure } from "./errors";
import { isPaywallBlocked } from "./paywall";
import { getActionIdentifier } from "./identity";

/**
 * The authorization seam for Server Actions.
 *
 * Next.js compiles every exported async function in a `"use server"` file into a
 * publicly addressable POST endpoint. Middleware does not protect them: a caller
 * POSTs to any route with a `Next-Action` header, so route-level protection on
 * `/dashboard` is irrelevant. Before this seam existed, 63 of 224 actions had no
 * authentication at all and every argument — including `userId` parameters —
 * was attacker-controlled.
 *
 * `defineAction` is the single place where identity, authorization, input
 * validation and rate limiting are applied. The companion ESLint rule
 * (`unytea/no-bare-server-action`) makes it the *only* way to export an action,
 * so `auth: "public"` becomes a deliberate, reviewable opt-in rather than the
 * silent default.
 *
 * ## Authorization levels
 * - `public` — no identity required. `ctx.userId` may be null.
 * - `user`   — an authenticated session. `ctx.userId` is non-null.
 * - `member` — authenticated **and** an ACTIVE member of the resolved community.
 *              Also enforces the paywall gate unless `allowPaywallLocked`.
 * - `admin`  — with a `community` resolver: a community role (default
 *              OWNER/ADMIN, widen via `roles`). Without one: the platform-level
 *              `UserRole.ADMIN`.
 *
 * ## Why positional `args` rather than a single input object
 * 65 of the 224 actions take two or more positional parameters. A tuple of Zod
 * schemas validates those signatures exactly as strictly as a single object
 * would, while keeping the migration diff focused on the security change instead
 * of a mechanical rewrite of hundreds of call sites. Validation coverage is
 * identical either way; only ergonomics differ. Actions with a single object
 * parameter simply pass a one-element tuple.
 *
 * @example
 * export const deletePost = defineAction(
 *   {
 *     name: "deletePost",
 *     auth: "member",
 *     args: [z.string().min(1)],
 *     community: async ([postId]) =>
 *       (await prisma.post.findUnique({ where: { id: postId }, select: { communityId: true } }))
 *         ?.communityId ?? null,
 *     rateLimit: "create",
 *   },
 *   async (ctx, postId) => {
 *     // ctx.userId is a string; ctx.member is this caller's membership row.
 *   }
 * );
 */

export type AuthLevel = "public" | "user" | "member" | "admin";

export type RateLimiterName = keyof typeof rateLimiters;

/** Context handed to a `public` action — identity may be absent. */
export interface PublicActionContext {
  userId: string | null;
  communityId: string | null;
  member: Member | null;
}

/** Context handed to a gated action — identity is guaranteed. */
export interface AuthedActionContext {
  userId: string;
  communityId: string | null;
  member: Member | null;
}

type ContextFor<TAuth extends AuthLevel> = TAuth extends "public"
  ? PublicActionContext
  : AuthedActionContext;

type MaybePromise<T> = T | Promise<T>;

type SchemaTuple = readonly z.ZodTypeAny[];

/** Maps a tuple of Zod schemas to the tuple of values they parse to. */
type InferTuple<T extends SchemaTuple> = {
  -readonly [K in keyof T]: z.infer<T[K]>;
};

/**
 * Lets callers omit trailing arguments whose schema accepts `undefined`.
 *
 * Zod tuples are fixed-length, so `[z.string(), z.string().optional()]` infers
 * `[string, string | undefined]` and TypeScript would demand both arguments.
 * This produces a union of the progressively shorter tuples, which TypeScript
 * accepts as a rest-parameter list. The handler still receives the full tuple —
 * the seam pads omitted arguments with `undefined` before parsing.
 */
type WithOptionalTail<T extends readonly unknown[]> = T extends readonly [...infer Head, infer Last]
  ? undefined extends Last
    ? T | WithOptionalTail<Head>
    : T
  : T;

export interface ActionConfig<TSchemas extends SchemaTuple, TAuth extends AuthLevel> {
  /**
   * Stable identifier, used for rate-limit bucketing and error reporting.
   * Must equal the exported symbol name — `tests/unit/action-authz.test.ts`
   * asserts this so a copy-paste cannot silently share another action's bucket.
   */
  name: string;
  auth: TAuth;
  /** Positional argument schemas. Use `[]` for an action that takes none. */
  args: TSchemas;
  /**
   * Resolves the community this call is scoped to, from the validated
   * arguments. Required for `member`, and for a community-scoped `admin`.
   * Return `null` when the underlying resource does not exist — the seam turns
   * that into NOT_FOUND without leaking whether it exists to a non-member.
   */
  community?: (args: InferTuple<TSchemas>) => MaybePromise<string | null>;
  /** Community roles accepted by `admin`. Defaults to OWNER + ADMIN. */
  roles?: MemberRole[];
  /** Named limiter from lib/rate-limit.ts, or `false` to opt out (rare). */
  rateLimit?: RateLimiterName | false;
  /**
   * Allow the call through when the community is `paywallLocked`. Only for
   * actions an owner needs in order to fix their billing.
   */
  allowPaywallLocked?: boolean;
  /**
   * Let a platform-level `UserRole.ADMIN` bypass the community gate.
   *
   * Needed for cross-tenant moderation: a `Report` has no `communityId`, and
   * USER/MESSAGE reports have no community at all, so they resolve to `null`.
   * Without this, platform staff could not action them.
   */
  allowPlatformAdmin?: boolean;
}

const DEFAULT_ADMIN_ROLES: MemberRole[] = ["OWNER", "ADMIN"];

function defaultRateLimiter(authLevel: AuthLevel): RateLimiterName {
  return authLevel === "public" ? "api" : "general";
}

export function defineAction<const TSchemas extends SchemaTuple, TAuth extends AuthLevel, TResult>(
  config: ActionConfig<TSchemas, TAuth>,
  handler: (ctx: ContextFor<TAuth>, ...args: InferTuple<TSchemas>) => Promise<TResult>
): (...args: WithOptionalTail<InferTuple<TSchemas>>) => Promise<TResult | ActionFailure> {
  if (config.auth === "member" && !config.community) {
    // A configuration error, not a runtime one — fail at module load rather than
    // silently degrading `member` to `user`.
    throw new Error(
      `defineAction("${config.name}"): auth "member" requires a \`community\` resolver.`
    );
  }

  return async (
    ...rawArgs: WithOptionalTail<InferTuple<TSchemas>>
  ): Promise<TResult | ActionFailure> => {
    try {
      // ── 1. Identity ────────────────────────────────────────────────────
      const session = await auth();
      const userId = session?.user?.id ?? null;

      if (config.auth !== "public" && !userId) {
        return actionFailure("UNAUTHORIZED", "You must be signed in to do this.");
      }

      // ── 2. Rate limit ──────────────────────────────────────────────────
      // Before validation and before any database work, so a flood of malformed
      // or unauthorized calls is the cheapest path through the seam.
      if (config.rateLimit !== false) {
        const limiterName = config.rateLimit ?? defaultRateLimiter(config.auth);
        const identifier = await getActionIdentifier(userId);
        const { success } = await rateLimiters[limiterName].check(
          `action:${config.name}:${identifier}`
        );
        if (!success) {
          return actionFailure("RATE_LIMITED", "Too many requests. Please slow down.");
        }
      }

      // ── 3. Input validation ────────────────────────────────────────────
      // Zod tuples are fixed-length, so pad omitted trailing arguments with
      // `undefined` before parsing. Optional schema members then accept the
      // shorter call, while required ones still reject it.
      const padded =
        rawArgs.length < config.args.length
          ? [...rawArgs, ...Array(config.args.length - rawArgs.length).fill(undefined)]
          : rawArgs;
      const parsed = z
        .tuple(config.args as unknown as [z.ZodTypeAny, ...z.ZodTypeAny[]])
        .safeParse(padded);
      if (!parsed.success) {
        const issues: Record<string, string[]> = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path.join(".") || "_";
          (issues[key] ??= []).push(issue.message);
        }
        return actionFailure("VALIDATION", "Invalid input.", issues);
      }
      const args = parsed.data as InferTuple<TSchemas>;

      // ── 4. Authorization ───────────────────────────────────────────────
      let communityId: string | null = null;
      let member: Member | null = null;

      // Platform staff bypass the community gate where the action opts in.
      const isPlatformAdmin = config.allowPlatformAdmin === true && session?.user?.role === "ADMIN";

      if (config.community) {
        communityId = await config.community(args);
        if (!communityId && !isPlatformAdmin) {
          return actionFailure("NOT_FOUND", "Not found.");
        }
      }

      if (isPlatformAdmin) {
        // Authorized as platform staff — skip the community role and paywall
        // checks, which are about tenant membership rather than staff access.
      } else if (config.auth === "member" || (config.auth === "admin" && config.community)) {
        // `userId` is non-null here: checked in step 1 for every non-public level.
        const roles = config.auth === "admin" ? (config.roles ?? DEFAULT_ADMIN_ROLES) : undefined;
        member = roles
          ? await requireCommunityRole(userId as string, communityId as string, roles)
          : await requireCommunityMember(userId as string, communityId as string);

        if (
          !config.allowPaywallLocked &&
          (await isPaywallBlocked(communityId as string, userId as string))
        ) {
          return actionFailure("PAYWALL_LOCKED", "This community is temporarily unavailable.");
        }
      } else if (config.auth === "admin") {
        if (session?.user?.role !== "ADMIN") {
          throw new ForbiddenError("Forbidden - Admin access required");
        }
      }

      // ── 5. Handler ─────────────────────────────────────────────────────
      const ctx = { userId, communityId, member } as ContextFor<TAuth>;
      return await handler(ctx, ...args);
    } catch (error) {
      // Next signals redirect() and notFound() by THROWING a sentinel error.
      // Catching it here would turn a navigation into an INTERNAL failure and
      // leave the caller sitting where it was — silently, since the shape looks
      // like any other handled error. Re-throw so the framework can act on it.
      if (isNextControlFlow(error)) {
        throw error;
      }
      if (error instanceof UnauthorizedError) {
        return actionFailure("UNAUTHORIZED", error.message);
      }
      if (error instanceof ForbiddenError) {
        return actionFailure("FORBIDDEN", error.message);
      }
      // Everything else is unexpected. Report it rather than swallowing it into
      // a console.error the way the pre-seam actions did, then return the shape
      // callers already handle.
      Sentry.captureException(error, { tags: { action: config.name } });
      console.error(`[action:${config.name}] unexpected error`, error);
      return actionFailure("INTERNAL", "Something went wrong. Please try again.");
    }
  };
}

/**
 * Is this one of Next's control-flow signals rather than a real failure?
 *
 * `redirect()` and `notFound()` communicate by throwing an error whose `digest`
 * starts with a known marker. Matched on the digest rather than by importing
 * Next's `isRedirectError`, which lives in an internal path that has moved
 * between releases.
 */
function isNextControlFlow(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND")
  );
}
