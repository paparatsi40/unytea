# Unytea — Full Product Audit

You are acting as a senior staff engineer hired to perform an independent, evidence-based audit of this repository (Unytea: a community platform, Skool competitor). Be skeptical, thorough, and concrete. This is a **read-only audit**: do NOT modify, fix, refactor, or format any code. Your only deliverable is a report.

## Ground rules

1. **Evidence over claims.** The README claims "96% production-ready", "0ms latency", "OWASP Top 10 addressed", "SQL injection impossible", etc. Treat every claim as unverified marketing until you confirm it in the code. A key section of your report is CLAIMED vs VERIFIED.
2. **Cite everything.** Every finding must include file path + line number(s) and a short code excerpt as evidence. No vague statements like "input validation could be improved."
3. **Never print secrets.** The repo contains real `.env` files (`.env`, `.env.local`, backups). Inspect them only to assess hygiene (what's committed, what's in `.gitignore`, key naming). In the report, redact all values (e.g. `STRIPE_SECRET_KEY=sk_live_***REDACTED***`). Flag any live/production credential you find as CRITICAL, but never reproduce it.
4. **Severity scale:** Critical (exploitable, data loss, money loss, blocks launch) / High (serious defect or gap, fix before launch) / Medium (fix soon after launch) / Low (polish, tech debt).
5. If a check can't be completed (e.g. no DATABASE_URL to run migrations), say so explicitly in the report — don't guess.

## Known stack (verify, don't assume)

Next.js 16 App Router, React 19, TypeScript strict, tRPC v11 RC, Prisma 5 + PostgreSQL, NextAuth v5 beta, Stripe, LiveKit, Uploadthing, Pusher (note: README says Socket.io — reconcile this), next-intl, Tailwind + shadcn/ui, Sentry, Resend, web-push, OpenAI SDK, svix, Vitest, Playwright, deployed on Vercel.

## Phase 0 — Baseline (run these first, record results)

```bash
npm run type-check
npm run lint
npm run test          # vitest
npm audit --omit=dev
npx playwright test --list   # inventory only; skip running E2E if no env is configured
```

Record pass/fail, error counts, and warning counts. Also record: total LOC by area, number of tRPC routers/procedures, number of API route handlers, number of Prisma models, test file count vs source file count.

## Phase 1 — Security (highest priority)

- **AuthN/AuthZ coverage:** Enumerate EVERY tRPC procedure and every `app/api/**/route.ts` handler. For each, classify: public / authenticated / role-checked (owner/admin/member). Produce a table. Flag every mutation or sensitive query missing an authorization check.
- **Multi-tenancy / IDOR:** This is a multi-community product. For each query/mutation that takes an ID (communityId, postId, messageId, channelId, buddyMatchId, userId…), verify the code confirms the caller belongs to that community / owns that resource. Attempt to identify concrete IDOR paths (e.g. "member of community A can delete messages in community B").
- **Input validation:** Verify Zod schemas exist on all tRPC inputs and all API route bodies/params. Flag `z.any()`, unvalidated `req.json()`, and unbounded strings on user content.
- **XSS:** Locate every use of `dangerouslySetInnerHTML` and Tiptap/rich-text rendering. Verify `sanitize-html` is actually applied server-side (not just client-side) on every path that stores or renders user HTML.
- **Rate limiting & abuse:** Is there ANY rate limiting on auth endpoints, message sending, invites, uploads, webhooks? README lists it as done under "Security" and as pending under "Critical" — determine the truth.
- **Webhooks:** Stripe, Uploadthing, svix, LiveKit — verify signature verification on every webhook handler, plus idempotency handling for Stripe events.
- **Secrets hygiene:** Check `.gitignore` coverage of all `.env*` variants; run `git log --diff-filter=A --name-only -- '*.env*'` and check whether any env file was ever committed to history. Check `NEXT_PUBLIC_` vars for anything that shouldn't be public.
- **Auth config:** NextAuth v5 beta — session strategy, cookie flags, CSRF posture, password hashing (bcryptjs rounds), account enumeration on login/register/reset flows.
- **Uploads:** Uploadthing config — file type/size restrictions, who can upload, are URLs guessable/public.
- **Headers/CSP:** Check `next.config.mjs`, `vercel.json`, `proxy.ts` for security headers, CSP, HTTPS enforcement.
- **Payments:** Can a user reach paid features without paying (client-side-only gating)? Is subscription state derived from Stripe webhooks or trust-the-client?

## Phase 2 — Architecture & code quality

- Map the actual structure. Note the coexistence of `app/`, `src/`, `components/`, `lib/`, `hooks/` at root — is there duplication or two competing organizations? Identify dead code and orphaned files (e.g. `generate_landing.py`, `check_translations.py`, `.ps1`/`.bat` scripts).
- tRPC router organization, error handling consistency (thrown strings vs TRPCError), transaction usage for multi-step writes.
- Prisma schema review: relations, missing indexes (especially FKs and hot query paths), cascade rules, use of `db push` vs migrations (note: `build` script runs `prisma migrate deploy` — are there actual migration files, and is running migrations inside the Vercel build step safe with multiple concurrent builds?).
- TypeScript quality: count of `any`/`as any`/`@ts-ignore`/`@ts-expect-error` with locations. Non-null assertions in risky spots.
- Real-time architecture: Pusher vs Socket.io vs LiveKit — what is actually used for what, and is there abandoned/duplicated infrastructure?
- Dependency risks: two DnD libraries (`@dnd-kit` AND `@hello-pangea/dnd`), tRPC pinned to an RC, NextAuth beta, unused heavyweight deps (Excalidraw? OpenAI? Lottie?). Check what's actually imported.

## Phase 3 — Performance & data access

- N+1 queries: inspect list-rendering procedures (feeds, member directory, leaderboard, chat history, notifications) for per-item queries and missing `include`/`select` optimization; flag `SELECT *`-style fetches of heavy relations.
- Missing pagination: any procedure returning unbounded lists (messages, members, notifications).
- Client/server component boundaries: oversized `"use client"` trees, heavy libs (Framer Motion, Recharts, Excalidraw, Lottie) loaded on initial routes without dynamic import.
- Run `ANALYZE=true npm run build` if the build succeeds without env secrets; otherwise note top-level bundle risks statically.
- Caching: React Query config, revalidation strategy, anything cache-sensitive rendered statically or vice versa.

## Phase 4 — Testing, CI & production readiness

- Actual test coverage: what do the Vitest and Playwright suites really cover vs the 17+ claimed features? List critical untested flows (auth, payments, permissions, buddy matching, real-time).
- `.github/` workflows: does CI exist, what does it gate?
- Error handling & observability: Sentry wiring (client/server/edge), error boundaries, unhandled promise patterns.
- i18n: compare `locales/` files for missing keys per language; hardcoded strings that bypass next-intl.
- Env/config: `.env.example` completeness vs actual `process.env` usage in code (find vars used but undocumented).
- Accessibility quick pass: keyboard traps in modals, missing labels on icon buttons, contrast on glassmorphism surfaces.

## Phase 5 — Product reality check

Build a feature matrix: for each of the README's 18 feature claims (chat, directory, gamification, buddy system, auditorium, notifications, real-time, achievements, sessions/video, analytics, LMS, settings…), state: **Verified complete / Partially implemented / Stub or missing**, with evidence. Conclude with your own production-readiness percentage and what "launchable" would minimally require.

## Deliverable

Write the report to **`docs/AUDIT_REPORT.md`** in **English**, structured as:

1. **Executive summary** — one page max: overall verdict, top 5 risks, your production-readiness score vs the claimed 96%.
2. **Scorecard** — table: area (Security / Architecture / Performance / Testing / Product completeness / Prod-readiness) × grade (A–F) × one-line justification.
3. **Findings** — numbered (SEC-01, ARCH-01, PERF-01, TEST-01, PROD-01…), each with: severity, file:line evidence, impact, concrete failure scenario, recommended fix, rough effort (S/M/L).
4. **Claimed vs Verified matrix** (Phase 5).
5. **Prioritized action plan** — the top 10 items in order, with effort estimates and what they unblock.
6. **Appendix** — Phase 0 raw results (type-check/lint/test/audit output summaries, counts).

Aim for depth over breadth in Security and Multi-tenancy — those findings matter most. Do not soften conclusions to be polite; the goal is an accurate picture before launch.
