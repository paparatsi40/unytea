# Unytea — Independent Production Readiness Audit

**Auditor role:** Senior staff engineer, independent review
**Date of audit:** 2026-08-12
**Commit / branch:** `a576985c` on `feat/positioning-fase-3`
**Scope:** Full repository, read-only. No code was modified.
**Method:** Static analysis of every `app/actions/**` server action, every `app/api/**/route.ts` handler, the Prisma schema, build/CI config, and dependency tree; plus a clean baseline run of type-check, lint, unit tests, `npm audit`, a Playwright inventory, and a full `next build`.

---

## 1. Executive Summary

Unytea is a substantially built product. 224 server actions, 52 API route handlers, 49 Prisma models, 26 migrations, ~70,000 lines of application TypeScript, three fully-translated locales at exact key parity, a correctly implemented Stripe webhook with idempotency, and a clean `tsc --noEmit`. The engineering quality of individual, recently-touched files is genuinely high — several of them carry precise comments documenting security fixes that were made deliberately and correctly.

That quality is not evenly distributed, and the gap is where the risk lives. **The application has two backends grown at different times: a small, well-guarded set of API routes, and a large, largely unguarded set of Server Actions.** Authorization was implemented properly in `lib/authorization.ts` — and then imported by exactly 4 files out of 343. Meanwhile, 63 of 224 Server Actions perform no authentication check whatsoever, and Next.js exposes every one of them as an unauthenticated public POST endpoint. Several of them read or mutate other tenants' data.

The README's claim of **96% production-ready** is not supportable. It also misdescribes the architecture in ways that matter: it names tRPC as the API layer (zero tRPC code exists; four tRPC packages are installed and unused) and Socket.io as the real-time layer (not installed; the code is commented out and Pusher is used instead). The security section claims "OWASP Top 10 addressed" — the single most common OWASP category, A01 Broken Access Control, is the dominant defect class in this codebase.

**My assessment: ~55% production-ready.** The product surface is close to complete; the trust boundary is not. This is fixable in weeks, not months, because the primitives already exist — they just have to be applied.

### Top 5 risks

| # | Risk | Severity |
|---|---|---|
| 1 | **A live Stripe secret key (`sk_live_…`) is stored under the variable name `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`** in `.env.local`, and a second live secret key plus live webhook secret sit in `.env.local.backup-2026-05-12`. `NEXT_PUBLIC_*` values are inlined into the browser bundle at build time. (SEC-01) | Critical |
| 2 | **Unauthenticated bulk PII extraction.** `getCommunityMembers(communityId)` and `getMemberProfile(userId)` are Server Actions with no auth check that return `email`, `name`, `bio`, `location`, and `lastActiveAt` for any member of any community, private or paid. (SEC-02) | Critical |
| 3 | **Any logged-in user can mint a publish-capable LiveKit token for any room name they choose** via `POST /api/livekit/token`, and can self-assign the `host` role via `generateLiveKitToken`. Paid private video sessions are joinable and hijackable by any free account. (SEC-03, SEC-04) | Critical |
| 4 | **63 Server Actions have no authentication**, including mutations that create sessions, write chat channels, fabricate notifications for arbitrary users, and run the cron job pipeline — bypassing `CRON_SECRET` entirely. (SEC-02, SEC-11) | Critical |
| 5 | **Membership is enforced in the UI layer, not the data layer.** `app/(dashboard)/dashboard/c/[slug]/layout.tsx:55` computes `isMember` and never acts on it; the `/chat` and `/members` pages are client components with no gate at all. (SEC-08) | High |

### Score vs. claim

| | Claimed | Verified |
|---|---|---|
| Production readiness | **96%** | **~55%** |
| Rationale | — | Feature surface is ~80% real. Security and multi-tenant isolation are ~30%. Testing of the authorization layer is 0%. Weighted for a paid, multi-tenant, PII-holding product, security dominates. |

---

## 2. Scorecard

| Area | Grade | One-line justification |
|---|---|---|
| **Security** | **D−** | Excellent primitives (`lib/authorization.ts`, cron auth, Stripe webhook, anti-enumeration) that are almost never applied; 63 unauthenticated Server Actions; a live secret key in a `NEXT_PUBLIC_` variable. |
| **Multi-tenancy / isolation** | **F** | No tenant boundary is enforced at the data layer. Chat history, member directories with emails, recordings, and analytics of arbitrary communities are reachable by ID. |
| **Architecture** | **C** | Clean App Router structure, strict TS, good Prisma modelling — undermined by three duplicate implementations of session start/end, two LiveKit token paths, two sanitizers, one dead authorization module, and 11 unused packages including the entire claimed API layer. |
| **Performance** | **C−** | 95 of 159 `findMany` calls are unbounded; 159 client components with exactly 1 dynamic import; a 1.77 MB JS chunk; no client-side query cache (React Query installed, never imported). |
| **Testing** | **D** | 169 unit tests across 12 files for 343 source files. Zero tests cover authorization on any of the 224 Server Actions. CI has no build job and no E2E; lint and format are `continue-on-error`. |
| **Product completeness** | **B−** | Most claimed features exist and work. Gamification/leaderboard/achievements — three README claims — have been removed from the product entirely. Recharts-based "advanced dashboards" are hand-rolled divs. |
| **Production readiness** | **D+** | Build is green, type-check is clean, i18n is at parity, Sentry is wired on all three runtimes. Blocked by the security findings, not by the feature set. |

---

## 3. Findings

Severity scale: **Critical** (exploitable / data loss / money loss / blocks launch) · **High** (serious gap, fix before launch) · **Medium** (fix soon after launch) · **Low** (polish / tech debt).
Effort: **S** ≤ 1 day · **M** 2–5 days · **L** > 1 week.

> **A note on Server Action reachability, which underpins most SEC findings.**
> In the Next.js App Router, every exported `async function` in a file marked `"use server"` is compiled into a publicly addressable endpoint with a stable action ID. It is invoked by POSTing to *any* route in the application with a `Next-Action: <id>` header and the arguments as the body. Consequently: (a) middleware route protection on `/dashboard` does **not** protect these functions, because the attacker POSTs to `/` instead; (b) the fact that a function is only *called* from an authenticated UI is irrelevant to whether it is *reachable*; (c) every argument, including any `userId` parameter, is fully attacker-controlled. All findings below assume this model, which is a property of the framework, not an assumption about this codebase.

---

### SEC-01 — Live Stripe secret key stored in a `NEXT_PUBLIC_` variable; second live key in a plaintext backup

**Severity: Critical** · **Effort: S (rotate) / S (fix mapping)**

**Evidence** (values redacted, never reproduced):

```
.env.local
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="sk_live_***REDACTED***"     ← a SECRET key in a PUBLIC variable
  STRIPE_SECRET_KEY="sk_test_***REDACTED***"

.env.local.backup-2026-05-12
  STRIPE_SECRET_KEY="sk_live_***REDACTED***"
  STRIPE_WEBHOOK_SECRET="whsec_W***REDACTED***"
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="sk_live_***REDACTED***"
```

The two files also contain a live Neon PostgreSQL connection string (`@ep-purple-surf-af2c0vns…neon.tech`), `NEXTAUTH_SECRET`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `VAPID_PRIVATE_KEY`, Pusher secrets, and R2 credentials.

**Impact.** Next.js inlines every `NEXT_PUBLIC_*` environment variable into the client JavaScript bundle at build time. Any build performed with this `.env.local` present publishes a live Stripe secret key to every visitor's browser. A live Stripe secret key permits arbitrary charges, refunds, payout redirection, and full customer-data export.

**Failure scenario.** A developer runs `npm run build` locally, or the same variable mapping exists in the Vercel project. The key appears in `.next/static/chunks/*.js`, is served to every visitor, and is scraped by a commodity secret-scanner within hours of the site being indexed.

**Mitigating facts I verified.** `.gitignore` (lines 42–47, 66, 69, 73) covers `.env`, `.env*.local`, `.env.local.backup-*`, `.env.production`, and `.env.sentry-build-plugin`. `git log --diff-filter=A --name-only -- '*.env*'` returns only `.env.example` (commit `795194d1`). **No secret has ever been committed to git history.** This is a local-disk and deployment-configuration exposure, not a repository leak.

**What I could not verify.** Whether the Vercel project's environment carries the same `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY → sk_live_…` mapping. I have no access to the Vercel dashboard. **This must be checked manually before anything else in this report.** Note that `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is referenced by zero lines of application code (`@stripe/stripe-js` is installed but never imported), so the variable is currently unused — which is why the misplacement has gone unnoticed.

**Fix.** (1) Inspect the Vercel env for this mapping immediately. (2) Roll all Stripe keys and the webhook secret regardless of the outcome — they exist in plaintext in two files on at least one developer machine. (3) Delete `.env.local.backup-2026-05-12`. (4) Delete the unused `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` entry rather than correcting it. (5) Add a pre-commit / CI check that fails on any `NEXT_PUBLIC_*` variable whose value matches a known secret prefix (`sk_`, `whsec_`, `rk_`, `re_`).

---

### SEC-02 — 63 Server Actions perform no authentication check; several expose or mutate other tenants' data

**Severity: Critical** · **Effort: L**

Of 224 exported Server Actions across 41 files, **63 contain no call to `auth()`, `getCurrentUserId()`, `requireUserId()`, `requireAuth()` or `requireAdmin()`**. A subset are legitimately public reads (`getPublicSessionsForSEO`, `verifyCertificate`, `loadMoreCommunitiesAction`). The following are not.

**2a. Unauthenticated bulk PII extraction — the highest-impact instance.**

`app/actions/members.ts:35`
```ts
export async function getCommunityMembers(
  communityId: string,
  filters?: { search?: string; status?: string; sortBy?: "recent" | "name" }
) {
  try {
    const where: Prisma.MemberWhereInput = { communityId, status: "ACTIVE" as MemberStatus };
    const members = await prisma.member.findMany({ where, select: memberSelect, /* no take */ });
```
and the projection it uses, `app/actions/members.ts:9–30`:
```ts
const memberSelect = {
  id: true, role: true, status: true, joinedAt: true,
  user: { select: {
    id: true, name: true,
    email: true,                       // ← line 18
    image: true, username: true, bio: true, tagline: true,
    skills: true, interests: true, availabilityStatus: true,
    location: true, lastActiveAt: true,
  } },
};
```
`app/actions/members.ts:85` — `getMemberProfile(userId, communityId?)` — likewise has no auth check and also selects `email: true` (line 92).

**Failure scenario.** An unauthenticated attacker obtains a `communityId` (they are returned by the public `/explore` listing and the public community landing pages), POSTs the `getCommunityMembers` action, and receives the full membership roster of a private, paid community — every member's email address, real name, location, bio, and last-active timestamp, unpaginated. Repeat across all communities. This is a GDPR Article 33 reportable personal-data breach and a ready-made spam/phishing list targeted at a paying audience.

**2b. Unauthenticated read of private chat history.**

`app/actions/channels.ts:70`
```ts
export async function getChannelMessages(channelId: string, limit = 50) {
  const messages = await prisma.channelMessage.findMany({
    where: { channelId },
    include: { author: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,          // caller-controlled, unclamped
  });
```
No authentication, no membership check, and `limit` is caller-supplied with no upper bound. Anyone with a `channelId` reads the entire message history of any community's channel and can request all of it in one call.

**2c. Unauthenticated writes into arbitrary communities.**

`app/actions/channels.ts:11` — `getOrCreateDefaultChannels(communityId)` creates four `Channel` rows in any community, unauthenticated.
`app/actions/session-core.ts:168` — `createSessionOrSeries(input)` takes `communityId` and `hostId` directly from the caller and creates `MentorSession` rows (and up to 8 recurring instances) with no auth check whatsoever.
`app/actions/notifications.ts:11` — `createNotification({ userId, type, title, message, data })`, no auth: an attacker writes arbitrary notification text to any user's notification centre. Combined with the notification link field, this is an in-product phishing channel with perfect provenance.
`app/actions/reactions.ts:11` — see SEC-05.
`app/actions/buddy.ts:246 / :274 / :330` — `createBuddyGoal`, `completeBuddyGoal(goalId)`, `endBuddyPartnership(partnershipId)`: no auth, no ownership check. Any partnership can be terminated by ID.
`app/actions/buddy-enhanced.ts:239` — `updateGoalProgress(goalId, progress)`: same.

**2d. Unauthenticated reads of tenant-scoped data.**
`app/actions/comments.ts:52` (`getPostComments`), `app/actions/certificates.ts:117` (`getCertificate` returns the full row by ID), `app/actions/recording.ts:191` (`listRecordings(communityId)`), `app/actions/session-core.ts:726` (`getSessionEvents`), `app/actions/sessionNotes.ts:150`, `app/actions/community-builder.ts:382`, `app/actions/channels.ts:266/:299`, `app/actions/members.ts:196`.

**Root cause, and why the fix is tractable.** `lib/authorization.ts` is a well-designed 405-line module providing `requireUserId`, `requireCommunityMember`, `requireCommunityRole`, `requireCommunityAdmin/Moderator/Owner`, `requireResourceOwner`, a `Permissions` map, and typed `UnauthorizedError` / `ForbiddenError`. It is imported by **four files in the entire repository**: `app/api/communities/route.ts`, `app/api/reports/route.ts`, `app/api/user/onboarding/route.ts`, and `lib/api-error-handler.ts`. Not one Server Action uses it. The security design exists; it was simply never wired into the layer that carries the traffic.

**Fix.** Introduce a wrapper — `defineAction({ auth: "public" | "user" | "member" | "admin", input: ZodSchema }, handler)` — and require every export in `app/actions/**` to go through it, enforced by an ESLint rule that bans bare `export async function` in `"use server"` files. Make `auth: "public"` an explicit, reviewable opt-in. This converts an ongoing 224-item audit problem into a one-time migration plus a lint gate.

---

### SEC-03 — `POST /api/livekit/token` issues a publish-capable token for any room name the caller supplies

**Severity: Critical** · **Effort: S**

`app/api/livekit/token/route.ts:22, 54–60`
```ts
const roomName = typeof body.roomName === "string" ? body.roomName.trim() : "";
// ...no lookup of whether this room exists, belongs to a session,
//    or whether the caller is a member of that session's community...
token.addGrant({
  roomJoin: true,
  room: roomName,
  canPublish: true,     // unconditional
  canSubscribe: true,
  canPublishData: true,
});
```
The only gate is `session?.user?.id` (line 12) — any authenticated account, including a free one created seconds earlier.

**Failure scenario.** An attacker signs up for a free account, reads a room name from the public session page or simply enumerates `session-<id>`, and POSTs it here. They receive a 2-hour token with publish rights and join a paying customer's private live session with camera, microphone, screen share, and data-channel access. There is no server-side eviction path.

**Secondary defect in the same handler (lines 88–91).** Every token request runs `attendeeCount: { increment: 1 }` on the session, with no dedup. Refreshing the page inflates the host's attendance metric indefinitely — the metric that `getCommunityAttendanceMetrics` and the host analytics dashboard report on.

**Fix.** Resolve the room from a `sessionId` server-side (never accept `roomName` from the client), verify the caller is an ACTIVE member of that session's community and that the community is not `paywallLocked`, and derive `canPublish` from the caller's `SessionParticipation.role` rather than granting it unconditionally.

---

### SEC-04 — `generateLiveKitToken` lets the caller choose their own role and target room

**Severity: Critical** · **Effort: S**

`app/actions/livekit.ts:64`
```ts
let role = options.role || ParticipationRole.listener;   // ← options comes from the client
// line 67: if (session.mentorId === userId) role = ParticipationRole.host;
// line 81: if (existingParticipation)     role = existingParticipation.role;
```
`app/actions/livekit.ts:89`
```ts
const roomName = options.roomName || session.videoRoomName || `session-${session.id}`;
```
`app/actions/livekit.ts:92`
```ts
const canPublish = role === ParticipationRole.host || role === ParticipationRole.speaker;
```

The role assigned at line 64 is only overwritten if the caller is the mentor (line 67) or already has a participation record (line 81). **A user with neither — i.e. any authenticated non-participant — keeps the role they passed in.** Passing `{ sessionId, role: "host" }` yields `canPublish: true`. Passing `roomName` additionally redirects the grant to an arbitrary room in the LiveKit project.

This is a second, independent path to the same outcome as SEC-03, implemented differently, in a different layer. See ARCH-04.

**Fix.** Delete `role` and `roomName` from `TokenOptions`. Derive both server-side. Then delete one of the two token paths.

---

### SEC-05 — Server Actions that accept the caller's identity as a parameter

**Severity: High** · **Effort: M**

Ten Server Actions take `userId` / `hostId` as an argument and treat it as authoritative. Because Server Action arguments are attacker-controlled, every authorization decision made against these values is void.

`app/actions/reactions.ts:11` — no auth at all, and the client literally hands over its own claimed identity:
```ts
export async function toggleReaction(userId: string, postId: string, reactionType: ReactionType) {
  const existingReaction = await prisma.reaction.findFirst({ where: { userId, postId, type: reactionType } });
```
called from `components/community/PostReactions.tsx:121`:
```ts
const result = await toggleReaction(user.id, postId, type);
```

`app/actions/session-core.ts:425` — the most instructive case, because the ownership check is present and still useless:
```ts
export async function startSession(sessionId: string, userId: string) {
  const session = await prisma.mentorSession.findUnique({ where: { id: sessionId } });
  if (!session) return { success: false, error: "Session not found" };
  if (session.mentorId !== userId) {                                    // line 434
    return { success: false, error: "Only the host can start the session" };
  }
```
The attacker reads `mentorId` from the public session page and passes it as `userId`. The check passes.

Same pattern: `session-core.ts:496` (`endSession`), `session-core.ts:651` (`upsertSessionNotes` — writes `lastEditedBy` from the parameter), `livekit.ts:291` (`updateParticipantRole(sessionId, userId, newRole)` — promote any participant to host).

**Fix.** Remove the identity parameter from every one of these signatures and read it from `auth()` inside the function. This is mechanical and safe; TypeScript will locate every call site.

---

### SEC-06 — Pusher endpoints allow cross-tenant event injection and unrestricted private-channel subscription

**Severity: High** · **Effort: S**

`app/api/pusher/route.ts:48–63` (`PUT`) — any authenticated user can publish any event to any channel:
```ts
const body = await req.json();
const { channel, event, data } = body;      // all attacker-controlled
await pusher.trigger(channel, event, { ...data, senderId: session.user.id, ... });
```
No allowlist of channels, no membership check, no schema validation. An attacker injects fabricated `message:new` events into another community's chat, or fabricated presence/typing events, at will.

`app/api/pusher/route.ts:27–33` (`POST`, private-channel authorization) — the check that would prevent this is explicitly stubbed out:
```ts
const match = channel.match(/^private-channel-(\w+)$/);
if (!match) return NextResponse.json({ error: "Invalid channel" }, { status: 400 });

const _channelId = match[1];
void _channelId; // Intentionally unused - channel ID validated
```
The trailing comment asserts a validation that does not occur. `_channelId` is discarded; every authenticated user is authorized for every `private-channel-*`. Combined with SEC-02b, real-time chat in private communities has no confidentiality boundary at all.

**Fix.** On `POST`, resolve `_channelId` → `Channel` → `communityId` and verify ACTIVE membership before calling `authorizeChannel`. On `PUT`, replace the free-form trigger with a small set of named, server-validated event emitters — or remove the endpoint and emit only from server-side code paths that have already authorized the action.

---

### SEC-07 — `POST /api/email/send` is an open transactional-email relay

**Severity: High** · **Effort: S**

`app/api/email/send/route.ts:9` states the intended policy:
```
 * Requires authentication. Only admins/hosts can send invite/recap emails.
```
Lines 13–16 implement the first sentence. Nothing implements the second:
```ts
const session = await auth();
if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const body = await request.json();
const { type, to, data } = body;      // `to` and all template fields attacker-controlled
```
There is no Zod schema, no rate limit, and no verification that the caller has any relationship to the community named in `data.communityName` or the `data.joinLink` they supply.

**Failure scenario.** An attacker creates one free account and drives an unlimited volume of `community-invite` emails to arbitrary recipients, each rendered in Unytea's real template, sent from Unytea's verified Resend domain, naming any community and pointing `joinLink` at any URL. Result: a highly credible phishing campaign attributed to Unytea, followed by domain reputation damage and probable Resend account suspension.

**Fix.** Add a Zod schema; validate `to` against a relationship the caller actually has (community membership for invites, session attendance for recaps); attach `rateLimiters.create` keyed on `user:${session.user.id}`.

---

### SEC-08 — Community membership is enforced in the UI, not the data layer

**Severity: High** · **Effort: M**

`app/(dashboard)/dashboard/c/[slug]/layout.tsx:55–62`
```ts
const isMember  = membership?.status === "ACTIVE";
const isOwner   = membership?.role === "OWNER" || community.ownerId === session?.user?.id;
const isPending = membership?.status === "PENDING";

// Paywall gate: non-owner viewers see the locked screen.
if (community.paywallLocked && !isOwner) {
  return <PaywallLockedView ... />;
}
```
`isMember` is computed, passed to `<PremiumCommunityHeader>` as a prop that changes which buttons render, and **never used to deny access**. The only server-side gate in the layout is `paywallLocked`.

Enforcement in the child pages is inconsistent:

- `app/(dashboard)/dashboard/c/[slug]/feed/page.tsx:36–38` — **correct.** Server component; `if (community.members.length === 0) redirect('/dashboard/communities')`.
- `app/(dashboard)/dashboard/c/[slug]/chat/page.tsx:1` — **`"use client"`, no gate.** Fetches the community by slug, calls `getOrCreateDefaultChannels(data.id)` (itself unauthenticated, SEC-02c), and renders the full chat.
- `app/(dashboard)/dashboard/c/[slug]/members/page.tsx:1` — **`"use client"`, no gate.** Renders `<MemberDirectory communityId={...} />`, which is backed by the unauthenticated `getCommunityMembers` (SEC-02a).

**Failure scenario.** Any authenticated user navigates to `/dashboard/c/<any-slug>/chat` or `/members` and gets the full experience of a community they never joined and never paid for.

The same structural point applies to `paywallLocked`: it is checked in two page files (`layout.tsx:62`, `app/[locale]/c/[slug]/page.tsx:167`) and in zero Server Actions. Content in a payment-locked community remains fully readable through direct action invocation.

**Fix.** Move both the membership and the paywall gate into the data layer, as part of the SEC-02 wrapper. Page-level checks then become a UX nicety rather than the security boundary.

---

### SEC-09 — Any authenticated user can resolve or dismiss any moderation report

**Severity: High** · **Effort: S**

`app/actions/reports.ts:159–194`
```ts
export async function resolveReport(reportId: string, resolution: string, status: "RESOLVED" | "DISMISSED") {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "You must be authenticated" };

  // TODO: Add permission check to ensure user is admin/moderator     ← line 174
  // const user = await prisma.user.findUnique({ where: { id: userId }, include: { ... } })
  // if (!isAdmin) throw new Error('Unauthorized');

  const report = await prisma.report.update({
    where: { id: reportId },
    data: { status: status as ReportStatus, resolution, resolvedBy: userId, resolvedAt: new Date() },
  });
```
The identical TODO appears at `app/actions/reports.ts:129` inside `getReports`, meaning the moderation queue is also readable by any authenticated user.

**Failure scenario.** A bad actor whose content is reported enumerates report IDs and dismisses every report against themselves, permanently. The moderation system is defeated by its own users, and the audit trail records the abuser as the resolver.

**Fix.** `await requireAdmin()` for the platform queue, or `requireCommunityModerator(userId, report.communityId)` for per-community moderation. The helpers already exist in `lib/authorization.ts`.

---

### SEC-10 — Stored XSS through unescaped JSON-LD on public pages

**Severity: High** · **Effort: S**

`components/sessions/SessionJsonLd.tsx:13–17, 105–108`
```ts
const eventData = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: session.title,                              // ← host-controlled
  description: session.description || `Join ${session.host.name} for an interactive session`,
  ...
};
// ...
<script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventData) }} />
```
`JSON.stringify` escapes quotes and backslashes; it does **not** escape `<` or `/`. A `session.title` containing `</script><script>…</script>` terminates the JSON-LD block and opens an attacker-controlled script block. The same pattern carries `session.community.name` and `session.host.name` (lines 37, 43, 89, 97), and appears again at `app/[locale]/blog/[slug]/page.tsx:113` and `app/layout.tsx:173–184`.

**Failure scenario.** A host — anyone can create a community and a session — sets a session title containing the breakout payload. The public session page `/{locale}/s/[slug]` is crawled and shared. Every visitor, including authenticated users arriving from the in-app link, executes the payload with a valid session cookie. Note that the enforced CSP (`next.config.mjs:76`) includes `'unsafe-inline'` in `script-src`, so CSP does not mitigate this.

**Related.** `lib/sanitize.ts` is a correct, well-documented `sanitize-html` wrapper — and is imported by exactly one file, `app/actions/community-builder.ts:7`. Separately, `lib/validations.ts:164` defines a second, naive regex-based `sanitizeHtml()` that is trivially bypassable (`<scr<script>ipt>`); it is currently unused, but it is a loaded footgun sitting next to the real one.

**Fix.** Replace every JSON-LD injection with a serializer that escapes `<`, `>` and `&` (`JSON.stringify(x).replace(/</g, '\\u003c')`), or use Next's `<Script type="application/ld+json">`. Delete `lib/validations.ts:164`.

---

### SEC-11 — Cron-only job pipelines are reachable as Server Actions, bypassing `CRON_SECRET`

**Severity: High** · **Effort: S**

`lib/cron-auth.ts` is correct: fail-closed when `CRON_SECRET` is unset, constant-time comparison, accepts either header form. `app/api/cron/sessions/route.ts:17` uses it properly.

But the work it protects lives in a `"use server"` file:
```ts
// app/api/cron/sessions/route.ts:2
import { runSessionJobs } from "@/app/actions/session-jobs";
```
```ts
// app/actions/session-jobs.ts:1
"use server";
// :401
export async function runSessionJobs() { ... }        // no auth
// :23  autoPostUpcomingSessions   :122 ensureFutureSessions
// :245 sendSessionReminders       :431 generateSessionRecap
// :557 endSession                 :634 shareSessionRecap
```
Every one is independently invocable as a Server Action with no secret. `app/actions/autopilot.ts:181` (`runAutopilotDueJobs`) and `:432` (`getAutopilotOverview`) are in the same position.

**Failure scenario.** An attacker repeatedly invokes `sendSessionReminders()` — every upcoming session's attendees receive duplicate reminder emails and push notifications on every call. Unbounded outbound email, spam complaints, Resend suspension. `generateSessionRecap` additionally calls OpenAI (see SEC-12).

**Fix.** Move job bodies into plain modules under `lib/jobs/` with no `"use server"` directive, and have the cron routes import from there. The `"use server"` boundary must never wrap privileged internal machinery.

---

### SEC-12 — Unauthenticated AI actions permit direct OpenAI cost drain

**Severity: High** · **Effort: S**

`app/actions/ai-moderation.ts:16` (`moderatePost`), `:83` (`moderateComment`), `:142` (`batchModeratePostsInCommunity(communitySlug)`), `:175` (`getModerationStats`), `app/actions/ai-content.ts:10` (`generateCommunityFAQs`), `app/actions/session-ai.ts:147` (`generateAISessionSummary`) — all `"use server"`, all with no authentication and no rate limit.

`lib/rate-limit.ts:178` defines an `ai` limiter (30 requests/hour). It is applied to **zero** call sites; the entire `rateLimiters` object is used in only six API routes (`forgot-password`, `signup`, `communities` POST, `csp-report`, `reports` POST, `search`).

**Failure scenario.** `batchModeratePostsInCommunity(slug)` iterates a community's posts and calls OpenAI for each. An unauthenticated attacker loops it against the largest public community. Billing is uncapped and the account is drained before anyone notices.

**Fix.** Authenticate, authorize (moderation is a moderator action), and attach `rateLimiters.ai`.

---

### SEC-13 — Rate limiting exists but covers ~2% of the attack surface

**Severity: Medium** · **Effort: M**

The README lists rate limiting as **done** under "🔒 Security" and as **pending** under "🔐 CRITICAL FOR PRODUCTION". **Neither is accurate; the truth is "built, barely deployed."**

`lib/rate-limit.ts` is a solid implementation: Upstash Redis with an in-memory dev fallback, seven preconfigured limiters, IP extraction adapted for Next 16's removal of `NextRequest.ip`. Applied at 6 of 52 API handlers. Applied at **0 of 224 Server Actions** — and Server Actions are where essentially all mutations live.

Structurally, `rateLimit()` returns a checker keyed on a string but `getIP`/`getIdentifier` take a `NextRequest`, which a Server Action does not have. The module cannot be used from an action without a helper that reads `headers()` from `next/headers`. That helper does not exist, which explains the coverage gap.

Note also `lib/rate-limit.ts:133–137`: on a Redis error the limiter falls back to the per-instance in-memory store. On Vercel's serverless fleet this is effectively no limit at all. Acceptable as a degradation mode, but it should emit a Sentry warning rather than only `console.error`.

**Fix.** Add `getActionIdentifier()` built on `headers()`, and apply limiters inside the SEC-02 wrapper so coverage is automatic rather than per-call-site.

---

### SEC-14 — Input validation is absent from 95% of the mutation surface

**Severity: Medium** · **Effort: M**

Zod is imported by **2 of 41** Server Action files (`community-builder.ts`, `resources.ts`). The remaining 39 files — 200+ actions — accept raw arguments with only ad-hoc `if (!x)` guards. `app/actions/session-core.ts:104` (`validateCreateInput`) is representative: hand-rolled, throws bare `Error` strings, checks presence but not length or range.

Positive findings: **no `z.any()` or `z.unknown()` anywhere**, and no unvalidated `req.json()` on a route that lacks a schema *and* a mutation. API routes are noticeably better than actions here — `signup`, `reset-password`, `communities`, `reports`, `user/onboarding`, and `communities/[slug]/landing` all parse with Zod.

Unbounded strings: 48 `z.string()` declarations carry no `.max()`. Combined with `content: content.trim()` writes in `channels.ts:113` and `posts.ts`, there is no length ceiling on user content reaching PostgreSQL `text` columns.

**Fix.** Schema-per-action via the SEC-02 wrapper's `input` parameter. Add `.max()` to every user-content string.

---

### SEC-15 — `getSignedRecordingUrl` authenticates but does not authorize

**Severity: Medium** · **Effort: S**

`app/actions/recording.ts:342–372`
```ts
const userId = await getCurrentUserId();
if (!userId) return { success: false, error: "Authentication required" };

const recording = await prisma.recording.findUnique({
  where: { id: recordingId },
  include: { session: { select: { communityId: true, mentorId: true } } },
});
if (!recording || !recording.url) return { success: false, error: "Recording not found" };

// TODO: Implement signed URL generation
// For now, return the direct URL if it's public
return { success: true, url: recording.url };
```
`communityId` and `mentorId` are selected and never compared to anything. Any authenticated user retrieves the recording URL for any session, and the URL is a permanent public object URL rather than a signed one — so it remains valid after sharing, and after the user leaves the community.

Contrast `deleteRecording` (`recording.ts:254`), which does check `recording.session.mentorId !== userId` correctly. The inconsistency is the story of this codebase.

---

### SEC-16 — Email case handling is inconsistent between signup and password reset

**Severity: Medium** · **Effort: S**

`app/api/auth/signup/route.ts:52–58` stores the email exactly as submitted:
```ts
await prisma.user.create({ data: { name, email, password: hashedPassword, isOnboarded: false } });
```
`app/api/auth/forgot-password/route.ts:31–34` looks it up lowercased:
```ts
const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
```
`lib/auth.ts:96` (credentials login) looks it up verbatim.

**Failure scenarios.** (a) A user who signs up as `Carlos@Example.com` can log in, but password reset silently no-ops for them forever — `forgot-password` returns the generic success message by design (line 26), so the failure is invisible to both the user and support. (b) `Carlos@Example.com` and `carlos@example.com` become two distinct accounts, since the Prisma unique index on `email` is case-sensitive in PostgreSQL. (c) Combined, this is a path to unintended account splitting on a platform where email is the identity key.

**Fix.** Normalize to lowercase at every write and read boundary; add a one-off migration to collapse existing duplicates.

---

### SEC-17 — Sentry ships PII by default, contradicting the codebase's own privacy stance

**Severity: Medium** · **Effort: S**

`sentry.server.config.ts:15`, `sentry.edge.config.ts:15`, `instrumentation-client.ts:19` all set:
```ts
sendDefaultPii: true,
```
This sends IP addresses, user identifiers, cookies, and request headers to a US-hosted Sentry instance (`o4511311397060608.ingest.us.sentry.io`).

This directly contradicts deliberate work elsewhere. `lib/auth.ts:109–117`:
```ts
// No logueamos el email (PII / GDPR). Solo registramos el evento con userId si existe.
console.warn("[auth] login_failed", { userId: user?.id ?? null, reason: ... });
```
Someone took care to strip emails from auth logs, then enabled blanket PII forwarding to a third-party US processor. For an EU-facing product with a GDPR privacy policy and a granular cookie-consent banner (both present under `app/[locale]/privacy` and `app/[locale]/cookies`), this is a compliance inconsistency that a DPA review will flag.

**Fix.** Set `sendDefaultPii: false` and attach only a pseudonymous `userId` via `Sentry.setUser({ id })`. Confirm a Sentry DPA and EU data residency if EU users are in scope.

---

### SEC-18 — 24 dependency vulnerabilities in production dependencies, including 2 critical

**Severity: Medium** · **Effort: S**

`npm audit --omit=dev` → **24 vulnerabilities (13 moderate, 9 high, 2 critical)**.

The critical ones are in the authentication library itself:
```
@auth/core  <=0.41.2   Severity: critical
  - getToken() throws an uncaught exception on malformed Bearer authorization headers
  - Email normalizer validates the address before Unicode normalization → homoglyph @ bypass
  - OAuth state, nonce, and PKCE check cookies are not bound to the provider that created them
  → reachable via next-auth <=5.0.0-beta.31 and @auth/prisma-adapter
```
The homoglyph advisory compounds SEC-16. Also high: `next` (9 advisories including SSRF in rewrites and unauthenticated disclosure of internal Server Function endpoints — directly relevant to SEC-02), `postcss`, `sharp`, `form-data`, `brace-expansion`. Moderate: `sanitize-html` (incomplete URI scheme validation allowing `javascript:` through `action`/`formaction`/`data`/`poster`/`background` — relevant to SEC-10's remediation), `dompurify` (transitively, via Excalidraw).

`npm audit fix` resolves all of these except the Excalidraw chain, which requires a major downgrade.

**Fix.** Run `npm audit fix`, retest, and add `npm audit --omit=dev --audit-level=high` as a CI job.

---

### SEC-19 — Upload authorization is authentication-only

**Severity: Medium** · **Effort: S**

`app/api/uploadthing/core.ts` — all four routers (`imageUploader` 4 MB×5, `communityBranding` 8 MB×1, `documentUploader` 32 MB PDF×3, `mediaUploader` 32 MB video) use the identical middleware:
```ts
.middleware(async () => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");
  return { userId };
})
```
Type and size limits are correctly set. But there is no per-community authorization — any authenticated user may use `communityBranding` — no per-user quota, and no rate limit. `onUploadComplete` only `console.log`s; no `File`/ownership record is persisted, so uploads cannot later be attributed, quota'd, or garbage-collected. Resulting URLs are public and unguessable-by-obscurity only (`utfs.io/...`), which is acceptable for avatars but not for private community documents.

---

### SEC-20 — CSP and Permissions-Policy are looser than necessary

**Severity: Low–Medium** · **Effort: S**

`next.config.mjs:76` (enforced):
```
script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://*.vercel.app ...
connect-src 'self' https: ws: wss: ...
img-src 'self' data: blob: https:
```
`'unsafe-inline'` in `script-src` removes CSP as a defence against SEC-10. `connect-src https: ws: wss:` permits exfiltration to any host.

To the team's credit this is *knowingly* staged: lines 89–114 define a properly tightened `Content-Security-Policy-Report-Only` with explicit allowlists and `'wasm-unsafe-eval'`, `app/api/csp-report/route.ts` persists violations to a `CspViolation` table with its own rate limiter, and the plan is documented inline. **This is exactly the right way to tighten a CSP** — the finding is simply that the promotion to enforced has not happened. Check the `csp_violations` table and promote.

`next.config.mjs:165`:
```
Permissions-Policy: camera=*, microphone=*, autoplay=*
```
`*` grants camera and microphone to all origins including cross-origin iframes. `self` plus the LiveKit origin is sufficient.

Correctly present: HSTS with `preload` (line 145), `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `poweredByHeader: false`.

---

### SEC-21 — bcrypt cost factor 10

**Severity: Low** · **Effort: S**

`app/api/auth/signup/route.ts:49` and `app/api/auth/reset-password/route.ts:39` both use `bcrypt.hash(password, 10)`. 12 is the current baseline recommendation. Raise it and rehash on next successful login.

**Positive findings in the same area, which are genuinely well done:**
- `lib/auth.ts:104–106` — a constant-time dummy-hash comparison to prevent user enumeration by timing on login.
- `app/api/auth/signup/route.ts:37–46` and `forgot-password/route.ts:26–28` — identical generic responses whether or not the account exists.
- `lib/auth.ts:52–69` — JWT sessions, `httpOnly`, `sameSite: lax`, `secure` in production, `__Secure-` cookie prefix in production.
- `app/api/auth/forgot-password/route.ts:47–48` — 32 random bytes, 1-hour expiry, prior tokens deleted, all tokens invalidated after use.
- `lib/auth.ts:228` — `trustHost: true` with an accurate comment explaining why it is safe on Vercel.

Password reset has no rate limiter, but with a 256-bit token that is a CPU-DoS concern rather than a brute-force one. Low.

---

### SEC-22 — Webhook verification: fully correct (no finding)

Recorded because the prompt asks for verification, and the answer is positive.

- **Stripe** — `app/api/stripe/webhook/route.ts:114` uses `stripe.webhooks.constructEvent(payload, signature, webhookSecret)` on the raw body via `request.text()`, returns 400 on failure. **Idempotency is implemented correctly**: lines 121–131 check `ProcessedStripeEvent` *before* the handler runs and persist *after* it succeeds, with an inline comment explaining that the previous ordering caused Stripe retries to be dropped. This is better than most production Stripe integrations.
- **LiveKit** — `app/actions/webhooks.ts:21` constructs a `WebhookReceiver` with the API key/secret and returns a typed `{ reason: "signature" }` failure. `app/api/webhooks/livekit/route.ts` delegates to it.
- **Uploadthing** — signature handling is internal to `createRouteHandler`.
- **svix** — installed but never imported. Nothing to verify.

The one caveat: `handleLiveKitWebhook` lives in a `"use server"` file and is therefore also invocable as a Server Action — but it verifies the signature itself, so this is a structural smell rather than a vulnerability. See SEC-11.

**Subscription state is derived from webhooks, not from the client** (`setCommunitiesPaywallLocked`, `mapStripeStatusToPaywall`), and plan limits are enforced server-side in `app/actions/communities.ts:54`, `app/actions/courses.ts:45/:214`, `app/api/communities/route.ts:45`, and `app/api/communities/[slug]/payments/route.ts:236`. **Payment gating is architecturally sound.** Its weakness is not trust-the-client — it is that the gate is only checked in page components (SEC-08), so gated *content* remains reachable through the action layer even though gated *purchases* cannot be forged.

---

### ARCH-01 — The documented API layer does not exist

**Severity: Medium** · **Effort: S**

`package.json:53–56` installs `@trpc/client`, `@trpc/next`, `@trpc/react-query`, `@trpc/server`, all pinned to `11.0.0-rc.628`. A repository-wide search for `trpc`, `initTRPC`, `createTRPCRouter`, `publicProcedure`, or `protectedProcedure` across every `.ts`/`.tsx`/`.mjs`/`.json` file excluding `node_modules` returns **only those four `package.json` lines**. There are zero routers and zero procedures.

The README (line 241) states **"API: tRPC (type-safe)"**. The actual API layer is 224 Server Actions plus 52 route handlers. The audit brief inherited this claim and asked for a tRPC procedure table; there is none to produce.

This matters beyond tidiness: the audit brief's whole framing — "enumerate every tRPC procedure, classify public/authenticated/role-checked" — assumed a layer with a natural place to hang middleware. Server Actions have no such place by default, which is precisely why SEC-02 happened.

**Fix.** Remove the four packages. Correct the README. Add the `defineAction` wrapper from SEC-02 as the middleware seam tRPC would have provided.

---

### ARCH-02 — The documented real-time layer does not exist either

**Severity: Low** · **Effort: S**

README lines 99–106 claim "Real-time WebSockets ✅ 100% — Socket.io server complete, 5 custom React hooks, 0ms latency, 90% server load reduction". `socket.io` and `socket.io-client` are **not in `package.json`**. The remaining traces are commented-out corpses:

```ts
// app/actions/channels.ts:132
// WebSocket events disabled - using Pusher for real-time updates
// const io = getSocketInstance();
// if (io) { io.to(`channel:${channelId}`).emit("message:new", message); }
```
Same at `channels.ts:175` and `notifications.ts:30`. Real-time is Pusher (`pusher` in 3 files, `pusher-js` in 1) plus LiveKit data channels.

"0ms latency" appears four times in the README and is not a meaningful claim about any network system.

---

### ARCH-03 — Three implementations of session lifecycle; two of LiveKit tokens; two of HTML sanitization

**Severity: Medium** · **Effort: M**

| Concern | Implementations |
|---|---|
| `createSessionOrSeries` | `app/actions/sessions.ts:624` (authenticated) **and** `app/actions/session-core.ts:168` (no auth). `components/sessions/CreateSessionDialog.tsx:5` imports the safe one; the unsafe one remains publicly invocable. |
| `endSession` | `app/actions/sessions.ts:356`, `app/actions/session-core.ts:496`, `app/actions/session-jobs.ts:557` — three, with different auth postures. |
| `startSession` | `app/actions/sessions.ts:316` and `app/actions/session-core.ts:425` (SEC-05). |
| LiveKit token | `app/actions/livekit.ts:36` (SEC-04) and `app/api/livekit/token/route.ts` (SEC-03) — different role logic, both broken, differently. |
| Recording start | `app/actions/recording.ts:35` / `:301` and `app/actions/webhooks.ts:725`. |
| HTML sanitization | `lib/sanitize.ts:75` (correct, 1 caller) and `lib/validations.ts:164` (naive regex, 0 callers). |

Duplication is the direct cause of the "one path is fixed, the other isn't" pattern that produced SEC-03/SEC-04 and SEC-05.

**Fix.** Collapse each concern to one implementation before hardening it, or the hardening will be applied to the wrong copy.

---

### ARCH-04 — Multi-step writes are not transactional

**Severity: Medium** · **Effort: M**

`prisma.$transaction` appears **3 times** in the entire codebase (`app/actions/communities.ts:77`, `:387`, `app/actions/community-builder.ts:356`) against 224 actions containing many multi-write sequences.

`app/actions/posts.ts:120–133` (`deletePost`):
```ts
await prisma.post.delete({ where: { id: postId } });
await prisma.community.update({           // separate statement
  where: { id: post.communityId },
  data: { postCount: { decrement: 1 } },
});
```
`app/api/stripe/webhook/route.ts:212–219`:
```ts
await prisma.member.create({ data: { userId, communityId, role: "MEMBER", status: "ACTIVE" } });
await prisma.community.update({ where: { id: communityId }, data: { memberCount: { increment: 1 } } });
```

**Failure scenario.** A serverless timeout or DB blip between the two statements permanently desynchronizes `postCount` / `memberCount` from reality. In the Stripe path this happens on a payment event: the member exists but `memberCount` under-reports, and `memberCount` is what `getLimitsForPlan` compares against for plan enforcement (`app/actions/communities.ts:247`). Denormalized counters drift, and plan limits drift with them.

**Fix.** Wrap counter-plus-entity writes in `$transaction`. Better: derive counts with `_count` at read time and delete the denormalized columns, which the schema already indexes well enough to support.

---

### ARCH-05 — `prisma migrate deploy` runs inside the Vercel build step

**Severity: Medium** · **Effort: S**

`package.json:7`
```json
"build": "prisma generate && prisma migrate deploy && next build"
```
Concurrent Vercel builds (two pushes in quick succession, or a production build overlapping a preview build) each attempt `migrate deploy` against the same database. Prisma takes an advisory lock, so the second build blocks rather than corrupting — but it can time out and fail a deploy, and a migration that fails mid-way leaves `_prisma_migrations` in a failed state that blocks all subsequent deploys until manually resolved. Preview deployments pointed at the production `DATABASE_URL` will also apply migrations from unmerged branches.

Migration hygiene is also imperfect:
- Three stray files sit at the top level of `prisma/migrations/`, outside any migration directory and therefore never applied by Prisma: `full_schema.sql` (81 KB), `add_resource_library.sql`, `check_resource_library.sql`.
- `prisma/migrations/202503130116_add_community_id_to_mentor_session/` contains **two** `.sql` files — `migration.sql` and `create_mentor_sessions_table.sql`. Prisma applies only `migration.sql`; the second has never run anywhere. Its directory timestamp is also 12 digits rather than the standard 14.

**Fix.** Move migrations to a deploy hook or a separate CI job gated on the production branch. Delete or relocate the stray `.sql` files.

---

### ARCH-06 — Eleven unused production dependencies; one dead module; assorted orphan files

**Severity: Low** · **Effort: S**

Zero imports anywhere in `app/`, `components/`, `lib/`, `hooks/`, `src/`, `tests/`:

`@trpc/server`, `@trpc/client`, `@trpc/next`, `@trpc/react-query`, `@hello-pangea/dnd`, `recharts`, `@tanstack/react-query`, `@stripe/stripe-js`, `superjson`, `date-fns-tz`, `react-day-picker`, `lottie-react`, `react-confetti`, `svix`.

Two of these are load-bearing for README claims: **`recharts`** (README line 169: "Charts & graphs (Recharts)" — `components/analytics/AnalyticsCharts.tsx` is hand-rolled divs and Lucide icons) and the tRPC set (ARCH-01). **`@tanstack/react-query`** being unused is a performance finding in its own right (PERF-05).

Two DnD libraries are installed; only `@dnd-kit/core` is used, in 1 file. `@hello-pangea/dnd` is pure dead weight.

**Correction to a likely assumption:** `@excalidraw/excalidraw` **is** used — `components/sessions/SessionWhiteboard.tsx:26` loads it via `next/dynamic`, and `public/excalidraw-assets/` (3.1 MB) is its asset bundle. It is correctly code-split. Keep it.

**Dead code.** `lib/audit-log.ts` (190 lines, a complete audit-logging module with typed actions including `ACHIEVEMENT_UNLOCK`) has **zero callers**. The README lists "Audit logging" under security.

**Orphan files at repo root.** `generate_landing.py` (268 lines), `check_translations.py` (9 lines), `clean-restart.ps1`, `reset-postgres-password.ps1`, `restart-clean.bat`, `Dockerfile.dev` + `docker-compose.yml` (unused; deployment is Vercel). `scripts/` holds `build-step7.txt`, `lint-output.txt`, and three `.cjs` lint-inventory scripts. `docs/archive/` holds ~40 historical "X_COMPLETE.md" documents including `CLERK_SETUP.md` and `CLERK_TO_NEXTAUTH_CHECKLIST.md` from a migration that finished — while `.env` still carries five orphan `NEXT_PUBLIC_CLERK_*` / `CLERK_SECRET_KEY` entries.

**On the `app/` + `src/` + `components/` + `lib/` + `hooks/` coexistence the brief flags:** this is **not** two competing organizations. `src/` contains exactly one file, `src/i18n.ts`, which exists only because `next.config.mjs:5` passes `"./src/i18n.ts"` to `createNextIntlPlugin`. Root-level `components/`, `lib/`, `hooks/` with `@/*` → `./*` in `tsconfig.json` is a coherent and common Next.js layout. Move `src/i18n.ts` to `lib/i18n/request.ts` and delete `src/`; there is no duplication to untangle.

---

### ARCH-07 — Error handling is consistent in shape but loses all typing

**Severity: Low** · **Effort: M**

Server Actions almost universally return `{ success: false, error: string }` and swallow the underlying exception with `console.error`. `lib/authorization.ts` defines `UnauthorizedError` and `ForbiddenError` and `lib/api-error-handler.ts` maps them to 401/403 — but since no Server Action throws them, callers cannot distinguish "not found" from "forbidden" from "database down". 35 bare `throw new Error("string")` calls remain across `app/actions/`, mostly in `session-core.ts`'s hand-rolled validator.

Consequence for the UI: every failure renders the same generic toast, and Sentry never sees the swallowed exceptions because `console.error` is not captured.

---

### ARCH-08 — Debug instrumentation left in a production write path

**Severity: Low–Medium** · **Effort: S**

`app/actions/resources.ts:434–460`, inside `createResource`:
```ts
console.log("[createResource] VERIFICATION - Resource found in DB:", verifyResource ? "YES" : "NO");
// ...
// RAW SQL VERIFICATION: Check directly in database
const rawResult = await prisma.$queryRaw`SELECT * FROM resources WHERE id = ${resource.id}`;
console.log("[createResource] RAW SQL VERIFICATION - Result:", JSON.stringify(rawResult, null, 2));
// ...
const countResources = await prisma.resource.count({ where: { communityId: access.community.id } });
console.log("[createResource] VERIFICATION - Total resources in community after creation:", countResources);
```

Every resource creation performs three redundant verification round-trips to the database — a `findUnique`, a raw `SELECT *`, and a `count` — purely to `console.log` the results. The raw query is safely parameterized (it is a tagged template), so this is not an injection risk, but the full row including all user-supplied content is serialized into the Vercel function logs on every call.

**Fix.** Delete lines 425–460. This was clearly a debugging session that was never cleaned up.

---

### PERF-01 — 95 of 159 `findMany` calls have no `take`

**Severity: High** · **Effort: M**

Unbounded queries on user-growth paths:

| Location | Query | Risk |
|---|---|---|
| `app/actions/members.ts:50` | all ACTIVE members with 12 user fields | member directory; O(community size) with no page |
| `app/actions/comments.ts:54` | all comments on a post | O(thread length) |
| `app/actions/channels.ts:271`, `:301` | all `channelMember` rows | presence + typing indicator, polled every 5 s (see PERF-02) |
| `app/actions/analytics.ts:733`, `:750`, `:797`, `:806`, `:817` | full `member` / `post` / `comment` / `sessionParticipation` scans | `getRetentionCohorts` |
| `app/actions/dashboard.ts:22`, `:116`, `:502`, `:595`, `:637`, `:718`, `:831`, `:1298`, `:1527` | repeated unbounded `member` / `community` scans | the dashboard home page |
| `app/actions/reactions.ts:54` | every reaction on a post, each with a joined user | rendered per post in the feed |

`app/actions/members.ts:57–70` compounds this by fetching every row and then filtering **in JavaScript**:
```ts
let filteredMembers = members;
if (filters?.search) {
  filteredMembers = filteredMembers.filter((m) => m.user.name?.toLowerCase().includes(searchLower) || ...);
}
```
Search over a 5,000-member community transfers all 5,000 rows to the Node process on every keystroke-triggered call.

**Mitigating fact.** The Prisma schema is genuinely well-indexed — **120 `@@index` declarations, 20 `@@unique`, and `onDelete` on 66 of 68 relations** (the two without are `Post.channel` at `schema.prisma:286` and `Resource.category` at `:1258`, both optional, so `SetNull` semantics are probably intended). The queries will use indexes; they will simply return everything the index points at.

---

### PERF-02 — 5-second presence heartbeat against unbounded queries

**Severity: Medium** · **Effort: S**

`app/(dashboard)/dashboard/c/[slug]/chat/page.tsx:35–50`
```ts
useEffect(() => {
  if (activeChannelId) {
    updateChannelPresence(activeChannelId, true);
    const heartbeat = setInterval(() => { updateChannelPresence(activeChannelId, true); }, 5000);
```
Every open chat tab issues a Server Action round-trip — a full serverless invocation plus a Prisma `upsert` — every 5 seconds, with no rate limit (SEC-13) and no `visibilitychange` pause for backgrounded tabs. At 200 concurrent chat users that is 40 function invocations and 40 DB writes per second purely for presence, on a product whose real-time layer (Pusher) already has native presence channels that would cost zero.

---

### PERF-03 — 159 client components, one dynamic import, a 1.77 MB chunk

**Severity: Medium** · **Effort: M**

- `"use client"` in **159** of 343 source files.
- `next/dynamic` appears in **exactly one** file (`components/sessions/SessionWhiteboard.tsx`, correctly wrapping Excalidraw).
- Built output: `.next/static` is **13 MB**; the largest chunk is **1.77 MB** (`08lwgjwo3q00k.js`, contains Excalidraw), followed by 722 KB, 616 KB, 572 KB, 547 KB, and 519 KB.
- `framer-motion` is statically imported in 12 components, including `app/(dashboard)/dashboard/c/[slug]/library/page.tsx` and `[resourceId]/page.tsx`, so it lands in the initial bundle for those routes.
- `optimizePackageImports` (`next.config.mjs:50–56`) correctly lists `lucide-react`, `date-fns`, `framer-motion`, and `@livekit/components-react`, which helps but does not code-split route-level payloads.

The public marketing route `app/[locale]/page.tsx` is clean — server component, Next `<Image>`, `next-intl/server`, with only small client islands (`HeaderAuthCTA`, `DemoVideoTrigger`, `FeatureCard`). The weight is concentrated in the dashboard and session routes.

**Note on the brief's request to run `ANALYZE=true npm run build`:** I did not run the analyzer, because `npm run analyze` invokes `next build --webpack` and the `build` script's `prisma migrate deploy` would target the live Neon database in `.env`. I ran `npx next build` instead — **it completed successfully (exit 0) with no database access** — and measured chunk sizes directly from `.next/static/chunks`. Route-level First Load JS was not emitted in the Next 16 build output captured.

---

### PERF-04 — N+1 in top-poster analytics

**Severity: Low** · **Effort: S**

`app/actions/analytics.ts:161`
```ts
topPosters.map(async (poster) => {
```
A per-item query inside a `map`, following an unbounded `post.findMany` at line 179. One query per top poster. Small in absolute terms, but it is the pattern to watch: `app/actions/sessions.ts:755` does the same inside session-series generation, where the item count is user-controlled via `generateCount`.

---

### PERF-05 — No client-side query cache

**Severity: Medium** · **Effort: M**

`@tanstack/react-query` is a declared dependency with zero imports. Client components fetch either through raw `fetch("/api/...")` in `useEffect` (e.g. `chat/page.tsx:56`, `members/page.tsx:22`) or by calling Server Actions directly. There is no deduplication, no stale-while-revalidate, no cache invalidation strategy beyond `revalidatePath`, and no request cancellation.

Concretely: `chat/page.tsx` and `members/page.tsx` both `fetch('/api/communities/${slug}')` on mount purely to translate a slug into an ID — a round-trip that a server component would have resolved for free.

The server-side cache story is better: `lib/cache-invalidation.ts` provides `revalidateLocalizedPath` and is used consistently across actions.

---

### TEST-01 — Zero test coverage of the authorization layer

**Severity: High** · **Effort: M**

**Baseline: 169 tests across 12 files, all passing, in 3.67 s.** The suite is good where it exists — `tests/unit/stripe-webhook.test.ts`, `webhook-paywall.test.ts`, `subscription-state.test.ts`, `cron-security.test.ts`, `auth-security.test.ts`, `rate-limit.test.ts`, and `sanitize.test.ts` cover exactly the modules I found to be *correct*. That correlation is not a coincidence, and it is the strongest argument in this report for what to do next.

What is untested:
- **All 224 Server Actions.** No test asserts that any action rejects an unauthorized caller. `vitest.config.ts:16` *includes* `app/actions/**/*.ts` in the coverage config, so the gap is visible in every coverage report.
- Buddy system (a headline differentiator), courses/LMS, quizzes, certificates, real-time/Pusher, LiveKit token issuance, uploads, notifications, search, the community builder.
- 343 source files against 12 unit test files.

**E2E: 30 tests = 10 specs × 3 browsers**, all smoke-level — page loads, form fields render, unauthenticated `/dashboard` redirects, 404s, back/forward navigation. No test authenticates. No test exercises a multi-tenant boundary, a payment, or a session.

**The single highest-value test to write, given everything above:** a table-driven test that enumerates every export of every `"use server"` file and asserts each is either on an explicit public allowlist or rejects an anonymous caller. That one test file converts SEC-02 from a recurring regression into a build failure.

---

### TEST-02 — CI does not gate on build, E2E, lint, or formatting

**Severity: High** · **Effort: S**

`.github/workflows/ci.yml` defines four jobs:

| Job | Blocking? |
|---|---|
| `test` (vitest) | ✅ yes |
| `type-check` | ✅ yes |
| `lint` | ❌ `continue-on-error: true` |
| `format-check` | ❌ `continue-on-error: true` |

There is **no build job**, **no E2E job**, and **no dependency-audit job**. A PR that breaks `next build` merges green and fails at deploy.

The `lint` job's `continue-on-error` carries this comment:
```yaml
# TODO: quitar continue-on-error cuando se modernice la config de ESLint
# (hoy emite "Invalid Options: useEslintrc, extensions").
```
That justification is stale. `npm run lint` currently exits with **0 errors and 183 warnings** — no invalid-options failure. The flag can be removed today by setting `--max-warnings` to the current count and ratcheting down.

`type-check`'s history is instructive and to the team's credit: its `continue-on-error` was removed with a comment explaining why, and `tsc --noEmit` now passes clean. Do the same for `lint`.

---

### TEST-03 — 183 lint warnings, concentrated in React correctness rules

**Severity: Medium** · **Effort: M**

| Count | Rule | What it means |
|---|---|---|
| 65 | `react-hooks/todo` | React Compiler could not analyze the component |
| 28 | `react-hooks/exhaustive-deps` | stale-closure bugs |
| 27 | `react-hooks/set-state-in-effect` | cascading render loops |
| 26 | `react-hooks/immutability` | use-before-declare in hooks |
| 14 | `@typescript-eslint/no-unused-vars` | dead code |
| 10 | `@next/next/no-html-link-for-pages` | full page reloads instead of client nav |
| 5 | `react-hooks/purity` | side effects during render |

These are not style nits. `components/video-call/EnhancedVideoCall.tsx:189` accesses `handleMarkAnswered` before declaration inside a data-channel message handler — a real stale-reference bug in the live-session path. `components/visual-builder/VisualBuilder.tsx:123` sets state directly in an effect body.

**Counterweight — TypeScript discipline is excellent.** Across `app/`, `components/`, `lib/`, `hooks/`, and `types/` there are **4 total occurrences** of `: any`, `as any`, `@ts-ignore`, or `@ts-expect-error`, and each of the two suppressions carries a specific justification (`VideoRoom.tsx:35` for `webkitAudioContext`, `FileUpload.tsx:79` for UploadThing generics). `tsconfig.json` enables `strict`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, and `noFallthroughCasesInSwitch`. `tsc --noEmit` passes with zero errors. This is well above average and should be stated plainly.

---

### PROD-01 — i18n keys are at exact parity; UI coverage is not

**Severity: Medium** · **Effort: M**

`locales/en.json`, `es.json`, `fr.json` each contain **exactly 1,982 keys with zero divergence in either direction**. That is unusually disciplined and deserves saying.

The gap is in adoption: **117 of 220 `.tsx` files** call `useTranslations`/`getTranslations`. **72 files under `app/(dashboard)/` and `components/` do not**, including `dashboard/page.tsx`, `dashboard/analytics/page.tsx`, `dashboard/courses/page.tsx`, `dashboard/sessions/page.tsx`, `dashboard/notifications/page.tsx`, `dashboard/recordings/page.tsx`, `dashboard/library/page.tsx`, `dashboard/calendar/page.tsx`, and `dashboard/layout.tsx`.

Structural cause: `app/(dashboard)/` sits outside the `[locale]` segment, so there is no server-side locale to resolve. A Spanish or French customer gets a fully translated marketing site, signup, and community landing page — then an English dashboard.

---

### PROD-02 — `.env.example` is 14 variables short and 9 variables stale

**Severity: Low** · **Effort: S**

**Used in code, absent from `.env.example`** (a fresh clone will fail or silently degrade):
`LIVEKIT_URL`, `PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID`, `NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID`, `AUTO_START_RECORDING`, `PLAYWRIGHT_BASE_URL` (plus build-time `ANALYZE`, `CI`, `NODE_ENV`, `NEXT_RUNTIME`, which are legitimately implicit).

Also absent and **security-relevant**: `CRON_SECRET` (without it, `lib/cron-auth.ts:21` fails closed and *all* cron endpoints return 500 — silently disabling session reminders in a fresh deployment) and `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (without them, rate limiting silently degrades to per-instance memory, i.e. nothing on Vercel).

**In `.env.example`, unused in code:** `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` (README line 256 claims PostHog analytics; it is not installed), `UPLOADTHING_SECRET`, `UPLOADTHING_APP_ID` (superseded by `UPLOADTHING_TOKEN`), `NEXT_PUBLIC_APP_NAME`, `DIRECT_URL`. `.env` additionally carries five orphan Clerk variables and three Cloudinary variables from abandoned integrations.

---

### PROD-03 — One error boundary for the entire application

**Severity: Medium** · **Effort: S**

`app/global-error.tsx` is the only error boundary. There is no `error.tsx` at any route-segment level and no `not-found.tsx` outside the framework default. Any unhandled render error in any dashboard route blanks the whole application rather than the failing segment.

`loading.tsx` is likewise absent, so every dynamic route (the overwhelming majority — the build marks 60+ routes `ƒ Dynamic`) blocks on its server data with no streamed fallback.

Sentry itself is wired correctly across all three runtimes (`instrumentation.ts` dispatching on `NEXT_RUNTIME`, `onRequestError = Sentry.captureRequestError`, `onRouterTransitionStart`, sensible `ignoreErrors`/`denyUrls`, `tracesSampleRate: 0.1`). But see SEC-17, and note that the pervasive `try { … } catch { console.error(…) }` pattern in Server Actions means most application failures never reach Sentry at all.

---

### PROD-04 — Accessibility

**Severity: Medium** · **Effort: M**

A quick pass only; a proper audit needs axe against a running app.

- **260** `<button>` elements against **25** `aria-label` attributes across `app/` and `components/`. Given the density of icon-only Lucide buttons in the chat, session, and video-call UIs, most are unlabelled for screen readers.
- Modals are built on Radix (`@radix-ui/react-dialog`), which handles focus trapping and Escape correctly — so the brief's keyboard-trap concern is largely mitigated by the component library. The exceptions to check are the hand-rolled overlays in `components/live-session/` and `components/video-call/`, which do not use Radix.
- Glassmorphism contrast (README line 129, `tailwind.config.ts`) is a real risk on translucent surfaces over photographic backgrounds; it needs measurement rather than inspection.
- `react-hooks/set-state-in-effect` warnings in `VisualBuilder.tsx` can cause focus loss during cascading renders.

---

## 4. Claimed vs. Verified Matrix

| # | README claim | Status | Evidence |
|---|---|---|---|
| 1 | **Live Chat** — channels, real-time, deletion, typing, presence — *100%* | **Partially implemented** | Works via Pusher. `channels.ts:97` `sendChannelMessage` authenticates but never checks membership → any user posts to any community. `getChannelMessages:70` is fully unauthenticated (SEC-02b). Presence via 5 s polling, not push (PERF-02). |
| 2 | **Member Directory** — grid, search, filter, sort — *100%* | **Complete but unsafe** | `components/members/MemberDirectory.tsx` + `members.ts:35`. Search filters in JS over an unbounded fetch; no auth; leaks `email` (SEC-02a). |
| 3 | **Gamification / Leaderboard** — points, levels 1–50, weekly/monthly/all-time, podium, XP, streaks — *100%* | **Removed from the product** | No `points`/`level`/`xp` field on `User`. No leaderboard component or route. The only surviving `points` fields are `Quiz.points` (`schema.prisma:741`) and `QuizAttempt.pointsEarned` (`:760`). `schema.prisma:1344` still carries an orphan `// GAMIFICATION - DAILY ACTIVITY & STREAKS` header above the `PushSubscription` model. |
| 4 | **Buddy System** — matching, goals, check-ins, timeline — *100%* 🌟 | **Implemented, unprotected** | Full schema (`BuddyPartnership`, `BuddyCheckIn`, `BuddyGoal`) + `buddy.ts` + `buddy-enhanced.ts` + `/dashboard/c/[slug]/buddy`. But `createBuddyGoal:246`, `completeBuddyGoal:274`, `endBuddyPartnership:330`, `updateGoalProgress:239` all have zero auth. Zero tests. |
| 5 | **Auditorium View** — visual presence, dynamic sizing, real-time — *100%* 🌟 | **Verified** | `components/auditorium/AuditoriumSpace.tsx` + `MemberAvatar.tsx`, mounted from `chat/page.tsx` behind a view toggle. |
| 6 | **Notifications** — center, real-time, read/unread, 10 types — *100%* | **Complete but forgeable** | `Notification` model, `NotificationCenter.tsx`, `/dashboard/notifications`, web-push via `lib/push.ts`. `createNotification:11` has no auth → arbitrary notifications to arbitrary users (SEC-02c). |
| 7 | **Real-time WebSockets** — Socket.io server, 5 hooks, 0ms, 90% load reduction — *100%* | **False as described** | Socket.io not installed. Pusher + LiveKit data channels are the real implementation. Commented-out corpses at `channels.ts:132/:175`, `notifications.ts:30`. "0ms latency" is not a coherent claim. (ARCH-02) |
| 8 | **Mobile Optimization** — *95%* | **Plausible** | Responsive Tailwind throughout; `hooks/use-mobile.ts`; PWA manifest, service worker, offline route, install prompt. Playwright runs a `mobile-chrome` project. Not measured on a device. |
| 9 | **Performance Optimization** — *95%* | **Overstated** | Good: image formats, `optimizePackageImports`, `compress`, immutable asset caching, 120 DB indexes. Bad: 95 unbounded queries, 1 dynamic import, 1.77 MB chunk, no client cache. (PERF-01/03/05) |
| 10 | **UI/UX Polish** — micro-animations, error boundaries, glass morphism — *95%* | **Partially verified** | Framer Motion in 12 components; glassmorphism present. "Error boundaries" = one `global-error.tsx` (PROD-03). |
| 11 | **Existing Features** — dashboard, communities CRUD, DMs, settings, posts/feed, NextAuth, roles | **Verified** | 45 dashboard routes; `MemberRole` enum OWNER/ADMIN/MODERATOR/MEMBER honoured in `posts.ts`, `courses.ts`, `resources.ts`. DMs are the best-guarded area in the codebase — `messages.ts:496–501`, `:198`, and `:325` all verify conversation participation correctly. |
| 12 | **Achievements** — 26 defined, pending unlock logic — *50%* | **Not present** | No `Achievement` model, no achievements UI, no unlock logic. Residue only: `NotificationType.ACHIEVEMENT` (`schema.prisma:1165`), an icon in `NotificationItem.tsx:54`, `lib/push.ts:157`, and `lib/audit-log.ts:183` — itself dead code. |
| 13 | **Sessions / Video** — planned, 4–6 h | **Shipped, and far beyond the claim** | The largest subsystem in the product: LiveKit video/audio, recurring series, RSVP, recordings, whiteboard, polls, reactions, notes, feedback, AI recaps, public SEO pages, autopilot. ~17 actions in `sessions.ts` alone. **Also the most security-exposed** (SEC-03, SEC-04, SEC-05, SEC-11). |
| 14 | **Analytics** — planned, Recharts, export, date filters | **Shipped without Recharts** | `analytics.ts` (7 actions) + `analytics-extended.ts` (3) + `/dashboard/analytics` + `AnalyticsCharts.tsx`. Charts are hand-rolled divs; `recharts` has zero imports. No export, no date-range filter. Queries do full-table scans (PERF-01). |
| 15 | **Courses / LMS** — planned, 15–20 h | **Shipped** | `Course`, `Module`, `Lesson`, `Enrollment`, `CoursePurchase`, `LessonProgress`, `Quiz`, `QuizQuestion`, `QuizAttempt`, `Certificate` models; 14 course actions; Stripe course checkout; certificate issuance + public verification. `createQuiz:21` and `addQuizQuestion:56` accept any `lessonId` from any authenticated user without checking course ownership. No TipTap (README line 237) — `@tiptap/*` is not installed. |
| 16 | **Advanced Settings** — planned, 2–3 h | **Shipped** | Eight settings routes: profile, account, notifications, privacy, appearance, billing, integrations, index. `settings.ts` with 6 actions including `deleteAccount`. |
| 17 | **Security Audit** — *CRITICAL*, 2–3 h | **Genuinely started, ~35% complete** | Delivered: rate-limit module, `lib/authorization.ts`, cron auth, security headers + staged CSP, anti-enumeration, `sanitize-html`, an IDOR fix in `api/communities/[slug]` documented at line 21, Stripe idempotency. Not delivered: applying any of it to the 224-action Server Action layer. **"OWASP A01 Broken Access Control" is the dominant defect class here, so "OWASP Top 10 addressed" (README line 371) is not supportable.** "SQL injection impossible (Prisma ORM)" is **fair and verified** — zero `$queryRawUnsafe`/`$executeRawUnsafe`, and the single `$queryRaw` in the codebase (`app/actions/resources.ts:446`) is a tagged template, which Prisma parameterizes. See ARCH-08 for a separate problem with that line. "CSRF protection" is inherited from NextAuth + Next's Server Action origin checks. "HTTPS only" is verified via HSTS with `preload`. |
| 18 | **Testing** — *CRITICAL*, 2–3 h | **~20% complete** | 169 unit tests / 12 files / 343 source files; 30 E2E smoke tests. Zero authorization coverage (TEST-01). |

**Other README claims checked:**
- "Next.js 14" (badge, line 8 and line 230) — actually **Next.js 16.2.6** with React 19.2.
- "State: Zustand" (line 235) — not installed.
- "Rich Text: Tiptap" (line 237) — not installed. `lib/sanitize.ts:6` and `lib/openai.ts:26` both still reference it.
- "Monitoring: Sentry" — **verified**, correctly wired on all three runtimes.
- "Analytics: PostHog" (line 256) — not installed. `@vercel/analytics` and `@vercel/speed-insights` are.
- "CDN: Cloudflare" — no evidence; deployment is Vercel (`vercel.json`, `.vercel/`).
- "Custom Domain: Full custom domains" (line 28) — no domain-mapping model, route, or middleware host resolution exists.
- "White Label: Premium tier" (line 32) — no white-label flag in `SubscriptionPlan` or `lib/plans.ts`.
- "Lighthouse 95+, LCP < 1.5s" (lines 361–365) — not measured; not achievable on dashboard routes at current bundle weight.
- **The in-product AI assistant is trained on the same inaccuracies.** `lib/openai.ts:24–28` tells the model that "Members earn points through engagement", that the editor is "TipTap", and that "achievement badges are available". The assistant will confidently describe features that do not exist to paying customers.

---

## 5. Prioritized Action Plan

Ordered by risk-reduction per unit of effort. Items 1–5 are launch blockers.

| # | Action | Effort | Unblocks |
|---|---|---|---|
| **1** | **Secrets triage.** Check the Vercel env for `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → `sk_live_…`. Roll every Stripe key and the webhook secret regardless. Delete `.env.local.backup-2026-05-12` and the unused `NEXT_PUBLIC_STRIPE_*` entry. Add a CI check banning secret-shaped values in `NEXT_PUBLIC_*`. | **S** | Removes the only finding with unbounded financial blast radius. Do this before reading further. (SEC-01) |
| **2** | **Build the `defineAction` wrapper** — `{ auth, input }` → handler — and add an ESLint rule banning bare `export async function` in `"use server"` files. Migrate the ~30 highest-risk actions first: `members.ts`, `channels.ts`, `reactions.ts`, `notifications.ts`, `session-core.ts`, `buddy.ts`, `reports.ts`, `recording.ts`, the AI actions. | **L** (M for the first 30) | Closes SEC-02, SEC-05, SEC-09, SEC-12, SEC-15 structurally, and gives SEC-13 and SEC-14 a single place to live. This is the one change the rest of the plan depends on. |
| **3** | **Fix LiveKit token issuance.** Delete `roomName` and `role` from both entry points; derive the room from `sessionId` and the role from `SessionParticipation`; verify community membership and `paywallLocked`. Then delete one of the two implementations. | **S** | SEC-03, SEC-04, and half of ARCH-03. Protects the paid live-session product. |
| **4** | **Move cron job bodies out of `"use server"`** into `lib/jobs/`, and lock down the Pusher and email endpoints (`PUT /api/pusher`, `POST /api/pusher`, `POST /api/email/send`). | **S** | SEC-06, SEC-07, SEC-11. Stops unauthenticated outbound email and cross-tenant real-time injection. |
| **5** | **Escape all JSON-LD**, delete `lib/validations.ts:164`, and run `npm audit fix`. | **S** | SEC-10, SEC-18. Closes the only stored-XSS path and the two critical `@auth/core` advisories. |
| **6** | **Write the authorization test harness**: enumerate every `"use server"` export and assert each is on an explicit public allowlist or rejects an anonymous caller. Add `build`, `e2e`, and `npm audit` jobs to CI, and remove `continue-on-error` from `lint` with `--max-warnings 183` ratcheting down. | **M** | TEST-01, TEST-02. Converts every finding above into a regression test, so this audit does not need repeating. |
| **7** | **Pagination and query bounds.** Add `take` + cursor to `getCommunityMembers`, `getPostComments`, `getChannelMessages` (clamp the caller's `limit`), `getPostReactions`, and the `dashboard.ts` / `analytics.ts` scans. Move member search into the SQL `where`. Replace the 5 s presence poll with Pusher presence channels. | **M** | PERF-01, PERF-02. Required before any community exceeds a few hundred members. |
| **8** | **Rewrite the README against reality.** Remove tRPC, Socket.io, Zustand, Tiptap, PostHog, Cloudflare, gamification, achievements, "0ms latency", "96% production-ready", "OWASP Top 10 addressed", custom domains, and white-label. Fix `lib/openai.ts:24–28` in the same pass so the in-product AI stops describing features that do not exist. | **S** | Removes the risk of shipping marketing claims that a customer, a security researcher, or an acquirer can falsify in five minutes. |
| **9** | **Deduplicate.** Collapse three `endSession`s and two `startSession`s to one each; delete `session-core.ts`'s unauthenticated `createSessionOrSeries`; delete `lib/audit-log.ts` or wire it up; remove the 11 unused packages, the root-level Python/PowerShell orphans, the stray `prisma/migrations/*.sql` files, and `src/`. Move `prisma migrate deploy` out of the build script. | **M** | ARCH-03, ARCH-05, ARCH-06. Prevents the next "we fixed the other copy" incident. |
| **10** | **Production hardening pass.** Promote the Report-Only CSP after reviewing `csp_violations`; narrow `Permissions-Policy`; set `sendDefaultPii: false`; raise bcrypt to 12; normalize email case with a dedupe migration; add per-segment `error.tsx` and `loading.tsx`; add `$transaction` around counter writes; complete `.env.example`. | **M** | SEC-16, SEC-17, SEC-20, SEC-21, ARCH-04, PROD-02, PROD-03. |

**Minimum bar for "launchable" as a paid, multi-tenant, PII-holding product: items 1–6.** I estimate 3–4 weeks for one engineer, or ~2 weeks for two working in parallel (one on the action wrapper migration, one on LiveKit/Pusher/email/cron/CI). Items 7–10 can follow launch, with item 7 becoming urgent at the first community over ~500 members.

Deferring items 2 and 3 past launch is not a schedule trade-off. It means shipping a product where a free account reads any private community's member emails and joins any paid live session.

---

## 6. Appendix — Phase 0 Raw Results

### Baseline commands

| Command | Result |
|---|---|
| `npm run type-check` (`tsc --noEmit`) | ✅ **PASS** — 0 errors, no output |
| `npm run lint` (`eslint .`) | ⚠️ **183 problems — 0 errors, 183 warnings** |
| `npm run test` (`vitest run`) | ✅ **PASS** — 12 files, 169 tests, 0 failures, 3.67 s |
| `npm audit --omit=dev` | ❌ **24 vulnerabilities — 2 critical, 9 high, 13 moderate** |
| `npx playwright test --list` | ℹ️ **30 tests in 3 files** (10 specs × chromium / firefox / mobile-chrome). Not executed — no configured environment. |
| `npx next build` | ✅ **PASS** (exit 0). Used instead of `npm run build`, whose `prisma migrate deploy` step targets the live database. |

### Lint warnings by rule

```
 65  react-hooks/todo
 28  react-hooks/exhaustive-deps
 27  react-hooks/set-state-in-effect
 26  react-hooks/immutability
 14  @typescript-eslint/no-unused-vars
 10  @next/next/no-html-link-for-pages
  5  react-hooks/purity
  4  react-hooks/invariant
  2  react-hooks/memo-dependencies
  1  react-hooks/no-deriving-state-in-effects
  1  react-hooks/error-boundaries
  1  react-hooks/capitalized-calls
  1  @typescript-eslint/no-require-imports
```

### `npm audit --omit=dev` by package

| Package | Severity | Note |
|---|---|---|
| `@auth/core` ≤ 0.41.2 | **critical** | 3 advisories; reached via `next-auth` ≤ 5.0.0-beta.31 and `@auth/prisma-adapter` |
| `next` ≤ 16.3.0-preview.10 | high | 9 advisories incl. SSRF via rewrites, unauthenticated disclosure of internal Server Function endpoints |
| `postcss` ≤ 8.5.22 | high | 2 path-traversal advisories |
| `sharp` < 0.35.0 | high | inherited libvips CVEs |
| `form-data` 4.0.0–4.0.5 | high | CRLF injection |
| `brace-expansion` 3.0.0–5.0.8 | high | 3 DoS advisories |
| `immutable` ≤ 4.3.8 | high | via Excalidraw |
| `sanitize-html` ≤ 2.17.4 | moderate | incomplete URI-scheme validation |
| `dompurify` ≤ 3.4.12 | moderate | 5 advisories, via Excalidraw |
| `nanoid` | moderate | 3 advisories |
| `@opentelemetry/core` < 2.8.0 | moderate | unbounded memory in W3C Baggage |

`npm audit fix` resolves all except the `@excalidraw/excalidraw` chain (`nanoid`, `immutable`, `dompurify`), which needs a major downgrade to 0.17.6.

### Codebase inventory

| Metric | Value |
|---|---|
| Source files (`app` + `components` + `lib` + `hooks`, `.ts`/`.tsx`) | **343** |
| Lines — `app/` | 40,406 (184 files) |
| Lines — `components/` | 24,577 (126 files) |
| Lines — `lib/` | 4,165 (28 files) |
| Lines — `hooks/` | 638 (5 files) |
| Lines — `tests/` | 2,894 (17 files) |
| Lines — `prisma/` | 1,651 (2 files) |
| Lines — `locales/` | 8,277 (3 files) |
| **tRPC routers / procedures** | **0 / 0** (4 packages installed, unused) |
| Server Action files (`"use server"`) | 41 in `app/actions/` + 3 elsewhere |
| **Exported Server Actions** | **224** |
| — with no authentication check | **63** |
| — accepting caller identity as a parameter | **10** |
| — importing Zod | 2 files of 41 |
| API route files / handlers | 43 / **52** |
| — with an authentication check | 35 of 52 (of the 17 without: 6 are cron/webhook endpoints with their own secret or signature verification, 8 are intentionally public) |
| — with a rate limiter | 6 of 52 |
| Prisma models / enums | **49 / 25** |
| Prisma `@@index` / `@@unique` / `onDelete` | 120 / 20 / 66 of 68 relations |
| Migrations | 26 directories (+ 3 stray `.sql` files) |
| `prisma.$transaction` call sites | **3** |
| `findMany` calls / without `take` | 159 / **95 (60%)** |
| `"use client"` files | **159** |
| `next/dynamic` call sites | **1** |
| `dangerouslySetInnerHTML` sites | 8 (all JSON-LD; all unescaped) |
| `sanitizeHTML` call sites | **1** |
| `any` / `as any` / `@ts-ignore` / `@ts-expect-error` | **4** total |
| i18n keys (en / es / fr) | 1,982 / 1,982 / 1,982 — **exact parity** |
| `.tsx` files using `t()` | 117 of 220 |
| `<button>` elements / `aria-label` attributes | 260 / 25 |
| Unit tests / files | 169 / 12 |
| E2E tests / spec files | 30 / 3 |
| Built `.next/static` | 13 MB; largest chunk **1.77 MB** |
| Routes in build output | 60+ dynamic, ~20 static/SSG |

### Environment file hygiene

| File | Tracked in git? | Ever committed? | Contents |
|---|---|---|---|
| `.env.example` | ✅ yes | ✅ (`795194d1`) | Placeholders only — correct |
| `.env` | ❌ no | ❌ never | Live Neon `DATABASE_URL`; `sk_test_` Stripe; 5 orphan Clerk vars; 3 Cloudinary vars |
| `.env.local` | ❌ no | ❌ never | Live Neon DB; `NEXTAUTH_SECRET`; **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=sk_live_***REDACTED***`**; `sk_test_` secret key; VAPID private key; Pusher + R2 + Resend + OpenAI |
| `.env.local.backup-2026-05-12` | ❌ no | ❌ never | Same, plus **`STRIPE_SECRET_KEY=sk_live_***REDACTED***`** and **`STRIPE_WEBHOOK_SECRET=whsec_***REDACTED***`** |
| `.env.sentry-build-plugin` | ❌ no | ❌ never | `SENTRY_AUTH_TOKEN` |

`.gitignore` correctly covers `.env`, `.env*.local`, `.env.local.backup-*`, `.env.production`, and `.env.sentry-build-plugin`.
`git log --diff-filter=A --name-only -- '*.env*'` → **only `.env.example`**. No secret has ever entered git history.

### Checks that could not be completed

| Check | Reason |
|---|---|
| Vercel production environment variable mapping | No dashboard access. **This is the gating unknown for SEC-01 and must be verified manually.** |
| Playwright E2E execution | Requires a running app with a seeded database; no test environment configured. Inventoried only. |
| `ANALYZE=true npm run build` | `npm run build` runs `prisma migrate deploy` against the live Neon database in `.env`. Substituted `npx next build` (succeeded) plus direct measurement of `.next/static/chunks`. |
| Migration/schema drift verification | No `DATABASE_URL` I was willing to connect to. Drift between `schema.prisma` and the 26 migration files was not verified. |
| Runtime penetration testing of Server Actions | Out of scope for a static audit. All SEC findings are derived from code reading and the documented Next.js Server Action invocation model; **none has been confirmed against a running instance.** They should be reproduced against staging before remediation is signed off. |
| Lighthouse / Core Web Vitals | Requires a deployed instance. |
| Accessibility (axe) | Requires a running app; only a static heuristic pass was performed. |

---

*End of report. Findings are ordered by severity within each section and every one carries a file:line citation. No source file was modified during this audit.*
