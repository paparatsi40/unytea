# Unytea — Remediation Plan (Root-Cause, Criticality-Ordered)

**Standing directive for all work on this project: NO shortcuts. NO patches. Every fix addresses the root cause.**
Where the audit offered a fast workaround, this plan records it under *Rejected shortcut* and specifies the structural fix instead. Suppressing a warning, guarding one function, or capping a metric does not count as done.

**Source:** `docs/AUDIT_REPORT.md` (commit `a576985c`, branch `feat/positioning-fase-3`).
**Ordering:** strict severity, most-critical first. Findings that share a root cause are noted so the fix is built once, not repeated.
**Before any remediation is signed off:** reproduce the top security findings against a running staging instance. Every SEC item is derived from static reading of the Next.js Server Action model; none is runtime-confirmed yet.

---

## The three root causes behind most of this list

1. **No enforced middleware seam on Server Actions.** 224 actions, each free to skip auth. Drives SEC-02, SEC-05, SEC-08, SEC-09, SEC-12, SEC-13, SEC-14, SEC-15, SEC-19 and ARCH-07.
2. **Duplicated implementations.** Three `endSession`, two `startSession`, two LiveKit token paths, two sanitizers. One copy gets hardened, the other stays exploitable. Drives SEC-03, SEC-04, SEC-05, SEC-10-adjacent, ARCH-03.
3. **Privileged internals wrapped in `"use server"`.** Cron pipelines and webhook handlers exposed as public POST endpoints. Drives SEC-11 and the SEC-22 caveat.

Fixing these three at the root closes ~60% of the findings. The plan is ordered by criticality, but the work should be *sequenced* so the seam (C2) is built before the per-resource authorization policies (the High tier) are threaded through it.

---

# CRITICAL — launch-blocking

### C1 · Secret management is broken at the process level — `SEC-01`
**Problem.** A live Stripe secret key sits under `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in `.env.local`; a second live key + live webhook secret sit in `.env.local.backup-2026-05-12`, both plaintext on disk.
**Root cause.** No discipline or automated guard around secret naming and storage. (Verified mitigations: `.gitignore` covers all `.env*`; nothing ever entered git history. The exposure is disk + deployment config, not the repo.)
**Proper fix.**
1. Audit the Vercel project env for the same `NEXT_PUBLIC_STRIPE_*` → `sk_live_…` mapping. This is the gating unknown; the auditor had no dashboard access.
2. Confirm the key is not in a shipped bundle: search `.next/static/` for the key prefix. **Verified 2026-08-12 on the local build: `.next/static` contains zero `sk_live_` matches, source has zero references to `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and there is no `loadStripe`/publishable-key usage anywhere.** The key is therefore NOT currently exposed in any browser bundle. This downgrades the live-exposure scenario but not the mandate to rotate — a live secret in plaintext on disk is compromised regardless. Re-verify against any future build that starts referencing the variable.
3. **Rotate every Stripe key and the webhook secret regardless of the above.** A live secret in plaintext in two files on at least one machine is compromised by definition.
4. Delete `.env.local.backup-2026-05-12` and delete the misnamed `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` entry entirely.
5. Move secret storage to a managed secret store; establish a single documented naming convention; add a CI job that fails on any `NEXT_PUBLIC_*` whose value matches a secret prefix (`sk_`, `whsec_`, `rk_`, `re_`, connection strings).
**Rejected shortcut.** "Just rename the variable." That leaves a rotated-nothing live key on disk and no guard against recurrence.

### C2 · Server Actions have no authorization seam — `SEC-02` (root cause #1)
**Problem.** 63 of 224 actions have no auth check. Next.js exposes every `export async function` in a `"use server"` file as a public POST endpoint. Concrete live paths: unauthenticated bulk email/PII extraction from any community (`getCommunityMembers`, `getMemberProfile`, `memberSelect` includes `email`), unauthenticated read of any private channel history (`getChannelMessages`), unauthenticated writes into arbitrary communities (`createNotification`, `getOrCreateDefaultChannels`, `createSessionOrSeries`, buddy mutations).
**Root cause.** `lib/authorization.ts` is well-built and imported by 4 files of 343; the action layer has no place middleware can live.
**Proper fix — build the seam, migrate everything through it.**
1. Introduce `defineAction({ auth: 'public' | 'user' | 'member' | 'admin', input: ZodSchema }, handler)`. It resolves identity from `auth()` server-side, enforces the authorization level, validates input with Zod, and attaches a rate limiter — one place, every concern.
2. Add an ESLint rule that **bans bare `export async function` in any `"use server"` file.** Every export must go through `defineAction`. `auth: 'public'` is an explicit, reviewable opt-in, not a default.
3. Migrate **all 224 actions**, not a subset. Public reads (`getPublicSessionsForSEO`, `verifyCertificate`) opt into `'public'` deliberately.
**Rejected shortcut.** "Migrate the 30 highest-risk actions first." That is triage, not a fix — it leaves the lint gate meaningless and the other 194 as latent regressions. The gate only works if 100% pass through it.
*Note:* the seam enforces authentication and gives authorization a home; the per-resource authorization *rules* (the High tier below) still have to be written and threaded through it.

### C3 · LiveKit session access is forgeable, via two independent broken paths — `SEC-03`, `SEC-04`, `SEC-05` (LiveKit), `ARCH-03` (session/token dedup) (root cause #2)
**Problem.** `POST /api/livekit/token` grants `canPublish: true` for any client-supplied `roomName` to any authenticated (incl. free) account. `generateLiveKitToken` lets the caller pass their own `role` and `roomName`. Either path lets a free account join and broadcast in a paid private session. Same handler inflates `attendeeCount` with no dedup.
**Root cause.** Two token implementations with different, independently-broken role logic (root cause #2), and trust in client-supplied room/role.
**Proper fix.**
1. Collapse to **one** token issuer. Delete the other.
2. The issuer accepts only `sessionId`. Resolve the room server-side; never accept `roomName` from the client. Delete `role` and `roomName` from `TokenOptions`.
3. Verify the caller is an ACTIVE member of the session's community and the community is not `paywallLocked`. Derive `canPublish` from the caller's `SessionParticipation.role`, never from input.
4. Make `attendeeCount` idempotent per participant, or derive it from participation records.
**Rejected shortcut.** "Add a role check to the API route." Leaves the second path (`generateLiveKitToken`) exploitable — this is exactly the "fixed one copy" failure the dedup prevents.

### C4 · Cron pipelines and webhook logic are reachable as public actions — `SEC-11` (root cause #3)
**Problem.** `runSessionJobs`, `sendSessionReminders`, `runAutopilotDueJobs`, `generateSessionRecap`, etc. live in `"use server"` files, so the (correctly implemented) `CRON_SECRET` is irrelevant — anyone can POST them. `sendSessionReminders` → unbounded outbound email/push; `generateSessionRecap` → uncapped OpenAI spend.
**Root cause.** Privileged internal machinery placed behind the `"use server"` boundary (root cause #3).
**Proper fix.** Move every job body into plain modules under `lib/jobs/` with **no** `"use server"` directive. Cron routes and the webhook handler import from there. The `"use server"` boundary is for client-callable actions only — never for internal pipelines. Same treatment for `handleLiveKitWebhook` (it verifies its own signature, but it should not be an action).
**Rejected shortcut.** "Add a secret check inside the action." A privileged job should not be a public endpoint at all; guarding it is patching the symptom.

---

# HIGH — fix before launch

> Most of these are the *authorization policies* that ride on the C2 seam. C2 gives them a home; each still needs its rule written. They are not automatically closed by C2 alone.

### H1 · Real-time layer has no tenant boundary — `SEC-06`
`PUT /api/pusher` lets any authenticated user trigger any event on any channel (fabricated `message:new`, presence, typing across tenants). `POST /api/pusher` stubs out private-channel authorization (`_channelId` discarded; comment falsely claims validation). **Fix:** on `POST`, resolve `_channelId` → `Channel` → `communityId` and verify ACTIVE membership before `authorizeChannel`. On `PUT`, remove the free-form trigger; emit only from server code paths that already authorized the action. No stubbed check may ship with a comment asserting it passed.

### H2 · `POST /api/email/send` is an open transactional-email relay — `SEC-07`
Authenticates but never authorizes; no Zod, no rate limit. One free account → unlimited branded phishing from the verified Resend domain. **Fix:** Zod schema; verify the caller has the relationship they claim (community membership for invites, attendance for recaps); rate limiter keyed on user id.

### H3 · Any authenticated user can resolve/dismiss any moderation report — `SEC-09`
`resolveReport` and `getReports` carry a `// TODO: add permission check`. An abuser dismisses reports against themselves; the audit trail records them as resolver. **Fix:** `requireCommunityModerator(userId, report.communityId)` (platform queue: `requireAdmin`). Helpers already exist in `lib/authorization.ts`. Root cause = C2; rule written here.

### H4 · Stored XSS via unescaped JSON-LD on public pages — `SEC-10`
`JSON.stringify` into `dangerouslySetInnerHTML` does not escape `<` / `/`; a session title with `</script>…` breaks out. CSP does not save it (`script-src` includes `'unsafe-inline'`). 8 sites, all public-crawled. **Fix:** serialize with `<`/`>`/`&` escaped (or Next `<Script type="application/ld+json">`) at every site. **Delete the naive regex `sanitizeHtml` at `lib/validations.ts:164`** so the safe `lib/sanitize.ts` is the only one. **Rejected shortcut:** escaping only the session-title site — all 8 share the flaw.

### H5 · Unauthenticated AI actions allow direct OpenAI cost drain — `SEC-12`
`moderatePost`, `batchModeratePostsInCommunity`, `generateAISessionSummary`, etc. — no auth, no rate limit. The `ai` limiter in `lib/rate-limit.ts` is applied to zero call sites. **Fix:** authenticate + authorize (moderation is a moderator action) + `rateLimiters.ai`, via C2.

### H6 · Membership and paywall enforced in the UI, not the data layer — `SEC-08`
`layout.tsx:55` computes `isMember` and never uses it; `/chat` and `/members` are client components with no gate; `paywallLocked` is checked in 2 page files and 0 actions. **Fix:** move both the membership gate and the paywall gate into the data layer as part of the C2 seam. Page-level checks become UX, not the security boundary.

### H7 · Actions trust caller-supplied identity — `SEC-05`
10 actions take `userId`/`hostId` as arguments and treat them as authoritative (`toggleReaction`, `startSession` — whose ownership check is defeated by passing the public `mentorId` — `endSession`, `updateParticipantRole`, …). **Fix:** delete the identity parameter from every signature; read it from `auth()` inside. TypeScript locates every call site. Root cause = C2.

### H8 · 95 of 159 `findMany` calls are unbounded — `PERF-01`
Member directory, comments, channel members (polled every 5s), retention cohorts, dashboard scans, reactions — all fetch everything. Member search filters in JS over the full fetch. **Fix:** `take` + cursor pagination on every user-growth path; clamp caller-supplied `limit`; move member search into the SQL `where`. **Rejected shortcut:** a hardcoded `take: 1000` — that is a cap, not pagination; it silently truncates and still transfers 1000 rows.

### H9 · Zero authorization test coverage — `TEST-01`
169 tests / 12 files cover exactly the modules that are already correct. No test asserts any of 224 actions rejects an unauthorized caller. **Fix:** a table-driven test that enumerates every `"use server"` export and asserts each is on an explicit public allowlist or rejects an anonymous caller. This converts SEC-02 from a recurring audit into a build failure — the structural guarantee that C2 stays enforced.

### H10 · CI does not gate on build, E2E, lint, or dependency audit — `TEST-02`
`lint` and `format-check` are `continue-on-error`; there is no `build`, `e2e`, or `audit` job. A PR that breaks `next build` merges green. **Fix:** add `build`, `e2e`, and `npm audit --omit=dev --audit-level=high` jobs; make `lint` blocking. **Rejected shortcut:** `--max-warnings 183` to make lint pass today. That freezes 183 real warnings (see M-tier) as permanent. Fix the warnings, then make lint blocking at zero.

### H11 · Dependency vulnerabilities, including critical advisories in the auth library — `SEC-18`
24 vulns (2 critical, 9 high, 13 moderate). The criticals are in `@auth/core` ≤ 0.41.2 (homoglyph email bypass — compounds SEC-16; provider-unbound OAuth state cookies), reached via `next-auth` ≤ 5.0.0-beta.31. `next` carries 9 advisories incl. unauthenticated disclosure of internal Server Function endpoints (directly relevant to SEC-02). **Fix:** upgrade `next-auth`/`@auth/*` and `next` to patched versions and retest the auth flows properly; do not stay on a beta with known-critical advisories. Add the audit CI job (H10).

---

# MEDIUM — fix in the first hardening pass after the criticals

### M1 · Input validation absent from ~95% of mutations — `SEC-14`
Zod in 2 of 41 action files; 48 `z.string()` with no `.max()`; no length ceiling on content reaching Postgres `text`. **Fix:** schema-per-action via the C2 `input` parameter; `.max()` on every user-content string. (Positive: no `z.any()` anywhere.)

### M2 · Rate limiting covers ~2% of the surface — `SEC-13`
Solid module, applied at 6 of 52 routes and 0 of 224 actions; `getIP` needs a `NextRequest` an action doesn't have. **Fix:** add `getActionIdentifier()` on `headers()`, apply limiters inside the C2 seam so coverage is automatic. Emit a Sentry warning (not just `console.error`) when the limiter falls back to in-memory on Vercel.

### M3 · `getSignedRecordingUrl` authenticates but does not authorize — `SEC-15`
Selects `communityId`/`mentorId`, compares them to nothing; returns a permanent public URL. **Fix:** verify community membership; issue an actually-signed, expiring URL. `deleteRecording` already checks ownership correctly — match it.

### M4 · Upload authorization is authentication-only — `SEC-19`
Any authenticated user can use `communityBranding`; no per-community authz, no quota, no ownership record persisted (`onUploadComplete` only logs). **Fix:** per-community authorization in the middleware; persist a `File`/ownership row for attribution + GC; private documents behind signed access.

### M5 · Email case handling inconsistent — `SEC-16`
Signup stores verbatim; forgot-password looks up lowercased; login verbatim. → silent permanent reset failure and account splitting (Postgres unique index is case-sensitive). **Fix:** normalize to lowercase at every read/write boundary; one-off migration to collapse existing duplicates.

### M6 · Sentry ships PII by default — `SEC-17`
`sendDefaultPii: true` on all three runtimes forwards IPs/cookies/headers to US-hosted Sentry, contradicting the deliberate PII-stripping in `lib/auth.ts`. **Fix:** `sendDefaultPii: false`; attach only a pseudonymous `userId`; confirm DPA/EU residency if EU users are in scope.

### M7 · CSP and Permissions-Policy looser than necessary — `SEC-20`
Enforced CSP has `'unsafe-inline'` in `script-src`; `Permissions-Policy: camera=*, microphone=*`. A tightened Report-Only CSP already exists and violations are logged. **Fix:** review the `csp_violations` table, then **promote the Report-Only policy to enforced**; narrow camera/microphone to `self` + LiveKit origin.

### M8 · Multi-step writes are not transactional — `ARCH-04`
`$transaction` used 3 times in 224 actions; counters (`postCount`, `memberCount`) drift on any mid-write failure, and `memberCount` drives plan enforcement. **Fix (root-cause, not patch):** derive counts with Prisma `_count` at read time and **delete the denormalized counter columns**; the schema is indexed well enough to support it. Where a denormalized value must stay, wrap the entity+counter writes in `$transaction`. **Rejected shortcut:** only wrapping the two most obvious pairs in `$transaction` and leaving the denormalization that caused the drift.

### M9 · `prisma migrate deploy` runs inside the Vercel build — `ARCH-05`
Concurrent builds contend on the migration lock; preview deploys can migrate the production DB. Plus stray `.sql` files outside migration dirs that never run. **Fix:** move migrations to a deploy hook / dedicated CI job gated on the production branch; remove `migrate deploy` from `build`; delete/relocate the stray `.sql` files and the double-migration directory.

### M10 · The documented API layer (tRPC) does not exist — `ARCH-01`
4 tRPC packages installed, 0 routers/procedures. **Fix:** remove the packages; correct the README; the C2 wrapper is the middleware seam tRPC would have provided.

### M11 · Duplicated session lifecycle and sanitizer implementations — `ARCH-03` (remainder)
Beyond the LiveKit dedup in C3: three `endSession`, two `startSession`, unauthenticated `createSessionOrSeries` in `session-core.ts`, two sanitizers. **Fix:** collapse each concern to one implementation, then delete the unsafe copies. Harden only after collapsing, so hardening lands on the surviving copy.

### M12 · Front-end performance — `PERF-02`, `PERF-03`, `PERF-05`
5-second presence heartbeat via full serverless round-trips (`PERF-02`) → replace with Pusher presence channels (native, zero DB). 159 client components, 1 dynamic import, 1.77 MB chunk (`PERF-03`) → dynamic-import heavy libs (Framer Motion, Excalidraw already split), push work to server components. No client query cache (`PERF-05`, `@tanstack/react-query` installed unused) → adopt it or remove it and resolve slug→id in server components instead of client `fetch`.

### M13 · Dashboard is not internationalized — `PROD-01`
Keys at exact parity (1,982 × 3), but 72 dashboard files never call `t()` because `app/(dashboard)/` sits outside the `[locale]` segment. ES/FR customers get an English dashboard. **Fix:** resolve locale for the dashboard segment; thread `useTranslations`/`getTranslations` through the 72 files.

### M14 · One error boundary for the whole app — `PROD-03`
Only `global-error.tsx`; no per-segment `error.tsx`/`loading.tsx`. Any render error blanks the app. Combined with the `catch { console.error }` pattern, most failures never reach Sentry. **Fix:** per-segment `error.tsx` + `loading.tsx`; stop swallowing exceptions (see L2).

### M15 · Accessibility — `PROD-04`
260 `<button>` vs 25 `aria-label`; hand-rolled overlays in `components/live-session/` and `components/video-call/` bypass Radix's focus trapping; glassmorphism contrast unmeasured. **Fix:** label icon buttons; move custom overlays onto Radix or replicate focus management; measure contrast with axe against a running app.

### M16 · 183 lint warnings are real React correctness bugs — `TEST-03`
65 `react-hooks/todo`, 28 `exhaustive-deps`, 27 `set-state-in-effect`, incl. a stale-reference bug in the live-session data-channel handler (`EnhancedVideoCall.tsx:189`). **Fix:** resolve the warnings — these are stale-closure and render-loop defects, not style. (Positive: TS discipline is excellent — 4 total `any`/suppressions in the whole codebase.) **Rejected shortcut:** raising `--max-warnings`. That is the definition of a patch.

### M17 · The product and its in-app AI describe features that do not exist — `ARCH-01`/matrix
README claims tRPC, Socket.io, Zustand, Tiptap, PostHog, Cloudflare, gamification, achievements, "0ms latency", "96% production-ready", "OWASP Top 10 addressed", custom domains, white-label — none present. `lib/openai.ts:24-28` tells the assistant that members earn points, the editor is TipTap, and achievement badges exist, so it describes phantom features to paying customers. **Fix:** rewrite the README against verified reality and fix `lib/openai.ts` in the same pass. Reputational, low effort, do it early.

---

# LOW — polish and tech debt (still root-cause, no suppression)

- **L1 · bcrypt cost factor 10 — `SEC-21`.** Raise to 12; rehash on next successful login. (Auth positives verified: constant-time dummy hash, anti-enumeration, secure cookie flags, 256-bit reset tokens.)
- **L2 · Error handling loses all typing — `ARCH-07`.** 35 bare `throw new Error("string")`; `catch { console.error }` hides exceptions from Sentry. Throw the typed `UnauthorizedError`/`ForbiddenError` that already exist; let `lib/api-error-handler.ts` map them; capture in Sentry.
- **L3 · Debug instrumentation in a production write path — `ARCH-08`.** `createResource` does three redundant DB round-trips (incl. a raw `SELECT *`) purely to `console.log` full rows into Vercel logs on every call. Delete lines 425-460.
- **L4 · N+1 in top-poster analytics — `PERF-04`.** Per-item query inside a `map`; same pattern in user-controlled session-series generation. Batch with a single grouped query.
- **L5 · Dead weight — `ARCH-06`.** Remove 11 unused prod deps (incl. the tRPC set, `recharts`, `@tanstack/react-query` if not adopted per M12, `@hello-pangea/dnd`); wire up or delete `lib/audit-log.ts` (dead, 190 lines); remove root-level Python/PowerShell orphans, stray `prisma/migrations/*.sql`, and `src/` (move its one file to `lib/i18n/`). Keep `@excalidraw/excalidraw` — it is correctly code-split.
- **L6 · Socket.io claim — `ARCH-02`.** Not installed; commented-out corpses in `channels.ts`/`notifications.ts`. Remove the corpses; correct the claim (covered by M17).
- **L7 · `.env.example` is 14 vars short, 9 stale — `PROD-02`.** Notably missing `CRON_SECRET` (absence silently disables all cron) and the Upstash Redis vars (absence silently disables rate limiting). Sync it to actual `process.env` usage; remove orphan Clerk/PostHog/Cloudinary entries.

---

# Sequencing — adjusted for the current reality: ZERO real users

Criticality (the ordering above) does not change. **Sequencing** does. With no users and no real data:
- The *danger* of the security holes is currently near zero — there is no PII to extract, no paid session to hijack, no member to phish. Their severity ranking stands, but the clock on exploitation has not started.
- What is finite is the **cheap-to-break window**. Every structural change is cheapest and safest to make now, against zero traffic and disposable data. That window closes the moment the first real member who is not you joins a community.

So the sequencing principle is: **spend the zero-users window on the changes that get more expensive or more dangerous later — not on the ones that are merely dangerous to leave, because right now there is nobody behind them.**

### Do NOW — because it only gets more expensive later, and the discount is real today
1. **C1 — Stripe.** The one item whose blast radius is independent of user count: `sk_live_` moves real money with zero customers, and automated scanners find keys regardless of whether anyone is looking for Unytea. Rotate, delete the plaintext files, add the CI guard. (Live-bundle exposure already verified absent — see C1 — so this is now "rotate + hygiene," not "emergency.")
2. **H11 — `npm audit` upgrade.** A dependency-bump regression costs an afternoon now and a production incident later. Includes the 9 `next` and 2 critical `@auth/core` advisories.
3. **C2 seam + ESLint gate — build it NOW, even if the full 224-action migration trails.** This is the single most "expensive later" item on the entire plan: every action written during the sales-demo phase is another one to retrofit if the seam does not exist yet. Standing up `defineAction` + the lint gate now means every new action is born correct, and the existing migration proceeds against zero traffic. Deferring the seam is the one place where the "trigger, not date" logic backfires — you would be growing the exact debt this window exists to pay down.
4. **C3 + H7 + M11 — signatures and duplicates, done as one pass through the seam.** Removing `userId`/`hostId` params (SEC-05), collapsing the three `endSession` / two `startSession` / two LiveKit token paths, and deleting the unauthenticated `createSessionOrSeries` are cheapest now (TypeScript finds every call site; nothing in flight to break) **and should be done as part of routing each action through `defineAction`, not as a throwaway edit you redo when the seam lands.** One touch per file, in its final form.
5. **M17 — README + `lib/openai.ts`.** 20 minutes; stops the product and its own AI from describing phantom features.
6. **DB reseed, if the production database holds your own test communities.** The only moment you can wipe and reseed freely. Bake email lowercase-normalization (M5) into the seed so the account-split bug never has a chance to exist.

### Do on a TRIGGER, not a date — before the first real host with members who are not you
The remaining authorization policies: the rest of the unauthenticated actions, `POST /api/email/send`, `PUT /api/pusher`, moving crons out of `"use server"` (C4), H1–H6. During a 10–20 host sales phase you control who is inside and exposure stays ~zero. The trigger is "an unknown can create an account and enter the product," not "the first sales call."
- **Exception — pull forward the moment any public marketing starts: `POST /api/email/send` (H2).** Resend domain reputation is a shared asset; burning it before launch does real, lasting damage.
- *Note:* if C2's seam + gate are built in the NOW block, most of these get done anyway as the natural output of migrating all 224 actions through the gate — the gate will not let them ship as bare `auth: 'public'` lies. That is the argument for seam-now.

### Do NOT touch yet
The 95 unpaginated queries (PERF-01), test coverage beyond the authz harness (TEST-01 can wait for the seam), dashboard i18n (PROD-01), bundle work (PERF-03). None of it matters at current scale; all of it is cheap to defer without accruing risk.

*No fix on this list is complete until its root cause is gone and a test prevents its return — deferral by trigger is sequencing, not a patch.*
