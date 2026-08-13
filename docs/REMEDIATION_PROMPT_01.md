# Unytea — Remediation Execution Prompt 01: the "NOW" block (seam-first)

You are a senior staff engineer executing the first remediation block on this repository. Full context lives in `docs/AUDIT_REPORT.md` and `docs/REMEDIATION_PLAN.md` — **read both before starting.** This prompt is the execution order; the plan is the detail.

## Standing directive (applies to every task, always)
**No shortcuts. No patches. Every fix removes the root cause, and every fix is protected by a test so it cannot regress.** Suppressing a warning, guarding a single function, capping a metric, or migrating "the risky ones first" does not count as done. If a proper fix is larger than expected, do the proper fix — do not substitute a workaround. If you believe a shortcut is genuinely warranted, stop and explain why rather than taking it silently.

## Context that sets the strategy
The product has **zero real users and no real data.** This is the cheapest, safest window to make structural changes — spend it on the changes that get more expensive or riskier later, against zero traffic. This block is ordered by that logic, not by raw severity.

## Global guardrails
- **Do not touch the live database.** `npm run build` runs `prisma migrate deploy` against the live Neon DB in `.env` — **never run `npm run build`; use `npx next build`** to verify builds. Do not run migrations, `prisma db push`, or `prisma migrate deploy` against any real `DATABASE_URL`.
- **Never print secret values** in output or commits. When handling `.env*` files, operate on names, not values.
- **You cannot rotate Stripe keys or edit Vercel** — those are Carlos's manual actions. Your C1 scope is repo hygiene + guardrail only (below).
- Work on a branch (e.g. `remediation/01-now-seam`). Commit in logical units with clear messages. Do not force-push. Leave the PR/merge to Carlos.
- After every task, `npm run type-check` must stay green and `npm run test` must pass. Do not proceed to the next task with a red baseline.

---

## Execute in this exact order

### 1 — C1: Stripe secret hygiene (repo side only)
Root cause: no guard against secret-shaped values in public variables. (Verified: the key is not in any bundle today, but it is live and in plaintext.)
- Delete `.env.local.backup-2026-05-12`.
- Remove the misnamed `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` entry from `.env.local` (and any other `.env*`). Do not "rename" it — remove it; it is referenced by zero code.
- Add a CI check (and ideally a pre-commit hook) that **fails on any `NEXT_PUBLIC_*` variable whose value matches a secret prefix** (`sk_`, `rk_`, `whsec_`, `re_`, or a Postgres/connection-string shape). Add it as a blocking job in `.github/workflows/`.
- Leave a note in the PR description reminding Carlos to (a) rotate all Stripe keys + webhook secret in the Stripe dashboard and (b) confirm the Vercel prod env — these are his actions, not yours.
**Acceptance:** backup file gone, public var gone, CI guard present and demonstrably failing on a planted `NEXT_PUBLIC_TEST=sk_live_x` (then removed).

### 2 — H11: dependency upgrades
Root cause: known-critical advisories in the auth chain and 9 in `next`.
- Run `npm audit fix` (NOT `--force`). Then `npm run type-check` + `npm run test` + `npx next build`.
- For advisories that require a major bump — the critical `@auth/core` ones likely need a `next-auth` upgrade — do it **deliberately and retest the auth flows** (signup, login, forgot/reset, session). Do not `--force` blindly.
- Record anything that cannot be resolved without breaking changes (e.g. the Excalidraw `dompurify`/`immutable`/`nanoid` chain) in the PR notes rather than forcing it.
**Acceptance:** `npm audit --omit=dev --audit-level=high` is clean or every remaining item is documented with a reason; all tests + build green.

### 3 — C2: build the authorization seam and the lint gate  ← the core of this block
Root cause #1: Server Actions have no enforced place for auth/authorization/validation/rate-limiting.
- Create `defineAction({ auth: 'public' | 'user' | 'member' | 'admin', input?: ZodSchema }, handler)` (name/location your call, but one canonical helper). It must, in one place: resolve identity from `auth()` server-side, enforce the auth level, validate `input` with Zod when provided, and attach the appropriate rate limiter from `lib/rate-limit.ts`. Build the missing `getActionIdentifier()` on `next/headers` so the limiter works without a `NextRequest`.
- Reuse `lib/authorization.ts` (`requireCommunityMember`, `requireCommunityRole`, etc.) for the `member`/`admin` levels — do not reimplement.
- Add an ESLint rule that **bans bare `export async function` in any `"use server"` file** — every export must go through `defineAction`. `auth: 'public'` is an explicit, reviewable opt-in.
- **Enable that ESLint rule as blocking only after task 4 completes** (turning it on mid-migration would red the build). Until then, keep it as a warning.
**Acceptance:** `defineAction` exists with unit tests for each auth level (anonymous caller rejected for `user`/`member`/`admin`; input validation rejects bad payloads; rate limiter engaged).

### 4 — C3 + H7 + M11: migrate ALL 224 actions through the seam, folding in signatures and dedup
Root cause #1 (applied) + #2 (duplication). **This is one pass, not three.** For every action in `app/actions/**` (and the 3 elsewhere):
- Route it through `defineAction` with the correct `auth` level and a Zod `input` schema (add `.max()` on every user-content string).
- **Remove any `userId`/`hostId` parameter** (SEC-05: `toggleReaction`, `startSession`, `endSession`, `upsertSessionNotes`, `updateParticipantRole`, and the rest) — read identity from `auth()` inside instead. TypeScript will locate every call site; update them.
- Where the action takes a resource ID (communityId, postId, channelId, buddy/goal/partnership IDs, recordingId…), enforce the ownership/membership rule via `lib/authorization.ts` — this closes SEC-02, SEC-08, SEC-09, SEC-12, SEC-15 as you go.
- **Collapse duplicates as you reach them** (ARCH-03): one `startSession`, one `endSession`, one LiveKit token issuer. Delete `session-core.ts`'s unauthenticated `createSessionOrSeries` and the losing token path. For LiveKit specifically (C3): the surviving issuer accepts only `sessionId`, resolves the room server-side (never `roomName` from the client), drops `role` from input, verifies ACTIVE membership + not `paywallLocked`, and derives `canPublish` from `SessionParticipation.role`; make `attendeeCount` idempotent.
- Public reads (`getPublicSessionsForSEO`, `verifyCertificate`, `loadMoreCommunitiesAction`) opt into `auth: 'public'` deliberately.
- **Build the authz regression harness (H9) as part of this task:** a table-driven test that enumerates every `"use server"` export and asserts each is either on an explicit public allowlist or rejects an anonymous caller. This test is what makes the seam self-enforcing.
- When every action is migrated, flip the ESLint rule from task 3 to blocking.
**Acceptance:** zero bare `export async function` in `"use server"` files; the enumeration test passes and fails if a new ungated action is added; `type-check` + `test` + `npx next build` all green.

### 5 — M17: correct the product's own claims
Root cause: docs and the in-app AI describe features that do not exist.
- Rewrite `README.md` against verified reality (remove tRPC, Socket.io, Zustand, Tiptap, PostHog, Cloudflare, gamification, achievements, "0ms latency", "96% production-ready", "OWASP Top 10 addressed", custom domains, white-label; fix "Next.js 14" → 16).
- Fix `lib/openai.ts:24-28` so the assistant stops telling customers that members earn points, the editor is TipTap, and achievement badges exist.
**Acceptance:** no claim in README or the AI system prompt describes a feature not present in the codebase.

---

## Not in this block (do not start)
The DB reseed + email normalization (needs Carlos's DB decision; never wipe a DB autonomously), the remaining trigger-gated authz items beyond what falls out of task 4, pagination (PERF-01), dashboard i18n, bundle work. Leave them.

## Hand back
A short report: what changed per task, the count of actions migrated and how many are now `public` vs gated (with the public allowlist), any advisory that could not be resolved without a breaking change, and the exact manual actions still owed by Carlos (Stripe rotation, Vercel env check). Do not mark the block done if type-check, test, or `npx next build` is red.
