# Unytea — Remediation Report

**Date:** 2026-08-13
**Branch:** `remediation/01-now-seam` (29 commits, not yet pushed/merged at time of writing)
**Companion:** `docs/AUDIT_REPORT.md` is the original audit and describes the **pre-remediation** state (commit `a576985c`). It is preserved as a historical record and is intentionally not rewritten. **This file is the current source of truth for security posture.** Where the two disagree, this one is newer.

---

## 1. Summary

The original audit found a substantially built product whose **trust boundary was not built**: 224 Server Actions, most of them reachable as unauthenticated public endpoints, with a well-designed authorization module (`lib/authorization.ts`) that almost nothing used. Its verdict was ~55% production-ready, dominated by Broken Access Control (OWASP A01) across the action layer and no multi-tenant isolation at the data layer.

This remediation closed that failure class. The work was sequenced deliberately for a product with **zero real users** — spend the cheap-to-break window on the structural changes that get expensive later, not on the ones that are merely dangerous to leave (there was no one behind them yet).

What landed, in order:

1. **Stripe secret hygiene (SEC-01).** A live `sk_live_` key was misfiled in a public variable in production. Rotated by the owner, Vercel production verified clean, plaintext backups removed, and a CI guard added that fails on any `NEXT_PUBLIC_*` holding a secret-shaped value.
2. **Dependency upgrades (SEC-18).** 24 advisories (2 critical in the auth chain) → **0**, resolved with real upgrades and scoped overrides, not `--force`.
3. **The authorization seam (SEC-02 root cause).** `defineAction` — one place that applies identity, rate limiting, Zod validation, tenant authorization and the paywall gate — plus an ESLint rule that bans a bare `export async function` in any `"use server"` file, so `auth: "public"` is a reviewable opt-in and no action can be born ungated.
4. **All 224 actions migrated through the seam**, folding in the identity-parameter removals (SEC-05) and the collapse of duplicated implementations (ARCH-03). Dead/duplicate modules deleted.
5. **LiveKit (SEC-03/04), cron pipelines (SEC-11), and the AI cost-drain paths (SEC-12)** fixed at the root — one server-derived token issuer, job bodies moved out of `"use server"`, AI actions authorized and rate-limited.
6. **An independent verification pass** (this reviewer, fanned out across all 36 action files) found **11 further authorization-policy defects** the migration had not caught — including two cross-tenant data leaks — all since fixed with regression tests.
7. **Two product decisions** resolved: live-session creation is now **owner-only**; course certificates now **auto-issue on completion** (they previously had zero callers and were never issued).

**Method throughout:** no shortcuts, no patches — every fix removed a root cause and shipped with a test that was verified failing against the unfixed code first. Final gates on the branch: `type-check` 0 errors · **695 tests** in 23 files · `next build` exit 0 · `npm audit --omit=dev` 0 vulnerabilities · `lint` exit 0 · **0 bare server actions**.

---

## 2. The authorization seam (the core architectural change)

Every Server Action now passes through `defineAction(config, handler)`:

- **Identity** resolved from `auth()` server-side — no action trusts a `userId`/`hostId` argument (this was SEC-05).
- **Rate limiting** before validation and any DB work, keyed on the user id (authenticated) or IP (anonymous — user-agent was removed from the key so it can't be rotated for fresh buckets).
- **Input validation** via a Zod tuple matching the action's arguments.
- **Tenant authorization**: for `member`/`admin`, the caller must be an ACTIVE member (or hold the required role) of the community the action resolves to — resolved server-side from the resource id via `lib/actions/resolvers.ts`, which is what closes IDOR.
- **Paywall gate** folded in, so payment-locked content is enforced at the data layer, not just in page components (SEC-08).

A second tier, `lib/actions/guards.ts`, answers the narrower "does this caller own **this row**?" (`assertSessionHost`, `assertPostAuthor(OrModerator)`, `assertBuddyPartner`, `assertCommunityOwner`) — the question tenant-membership alone cannot. Guards run **above** each handler's try/catch, after a systemic defect was found where a guard's typed `ForbiddenError` was being swallowed into a generic failure (the block still happened; the error semantics were wrong).

Enforcement is guaranteed two ways: the **ESLint rule** (no bare exports) and a **table-driven test harness** (`action-authz.test.ts`) that enumerates every `"use server"` export and asserts each is on an explicit public allowlist or rejects an anonymous caller — so this posture cannot silently regress.

**Public allowlist:** 12 actions, each carrying a documented justification in the harness (discovery/SEO/public-page reads and the certificate verifier). This is now the surface to scrutinize when adding public actions.

---

## 3. Findings status (against the original audit)

Legend: **Fixed** · **Partial** (root closed, a defined remainder deferred) · **Open — trigger** (do before the first real member who is not the owner) · **Open — hardening** (post-launch) · **Decision/By-design**.

| ID | Finding | Status |
|----|---------|--------|
| SEC-01 | Live Stripe key in a public var | **Fixed** — rotated, Vercel clean, CI guard |
| SEC-02 | 63/224 unauthenticated actions, PII harvest | **Fixed** — seam + full migration; member email dropped from directory |
| SEC-03 | LiveKit token for any room | **Fixed** — single server-derived issuer |
| SEC-04 | LiveKit self-assigned role | **Fixed** |
| SEC-05 | Actions trust `userId`/`hostId` args | **Fixed** — identity from `auth()` |
| SEC-06 | Pusher cross-tenant event injection / stubbed private-channel auth | **Open — trigger** |
| SEC-07 | `POST /api/email/send` open relay | **Open — trigger** (pull forward if any public marketing starts) |
| SEC-08 | Membership enforced in UI not data | **Fixed** — paywall + membership in the seam |
| SEC-09 | Anyone resolves moderation reports | **Fixed** — admin/moderator-gated |
| SEC-10 | Stored XSS via unescaped JSON-LD | **Open — trigger** |
| SEC-11 | Cron pipelines reachable as actions | **Fixed** — moved to `lib/jobs/` |
| SEC-12 | Unauthenticated AI cost drain | **Fixed** — authorized + rate-limited |
| SEC-13 | Rate limiting ~2% coverage | **Fixed (action layer)** — every action limited via the seam; API-route coverage from the audit unchanged where already present |
| SEC-14 | Input validation absent | **Fixed (action layer)** — Zod per action |
| SEC-15 | Recording URL authorizes weakly | **Partial** — tenant gate enforced; signed/expiring URL still a TODO |
| SEC-16 | Email case inconsistency | **Open — hardening** |
| SEC-17 | Sentry ships PII by default | **Open — hardening** |
| SEC-18 | 24 dependency vulns (2 critical) | **Fixed** — audit clean |
| SEC-19 | Upload authorization is auth-only | **Open — hardening** |
| SEC-20 | CSP `unsafe-inline` / loose Permissions-Policy | **Open — hardening** (a tightened Report-Only CSP already exists to promote) |
| SEC-21 | bcrypt cost 10 | **Open — hardening** |
| SEC-22 | Webhook verification | Was already correct (no action needed) |
| ARCH-01 | tRPC layer doesn't exist | **Partial** — README corrected; unused packages still installed (see ARCH-06) |
| ARCH-02 | Socket.io claim | **Fixed** — README corrected |
| ARCH-03 | Duplicated session/token/sanitizer impls | **Fixed (sessions/token)** — one each; `session-core.ts` deleted. Naive sanitizer removal rides with SEC-10 |
| ARCH-04 | Multi-step writes not transactional | **Open — hardening** |
| ARCH-05 | `prisma migrate deploy` in the Vercel build | **Open — hardening** |
| ARCH-06 | Unused deps / dead modules / orphans | **Open — hardening** |
| ARCH-07 | Error handling loses typing | **Partial** — seam maps typed errors; guard-swallow fixed; broad `throw new Error` cleanup remains |
| ARCH-08 | Debug instrumentation in a write path | **Open — hardening** |
| PERF-01 | 95 unbounded `findMany` | **Partial** — pagination added on migrated hot paths (members, recordings, comments); full sweep deferred |
| PERF-02/03/04/05 | Presence poll, bundle, N+1, no client cache | **Open — hardening** |
| TEST-01 | Zero authorization test coverage | **Fixed** — H9 harness + policy suites; 695 tests total |
| TEST-02 | CI doesn't gate | **Partial** — secret-scan job added, lint made blocking; build/e2e/audit jobs still to add |
| TEST-03 | 183 lint warnings (real React bugs) | **Open — hardening** |
| PROD-01 | Dashboard not internationalized | **Open — hardening** |
| PROD-02 | `.env.example` incomplete | **Open — hardening** |
| PROD-03 | One error boundary | **Open — hardening** |
| PROD-04 | Accessibility | **Open — hardening** |

---

## 4. Verification-pass findings (not in the original audit)

An independent review of all 36 action files after the migration found defects the seam guaranteed *authentication* for but could not guarantee *policy correctness* on. All fixed, each with a wrong-tenant/non-owner/non-partner regression test.

| Finding | Severity | Fix |
|---------|----------|-----|
| `searchGlobal` searched post bodies & course text inside private communities the caller hadn't joined | **High** | Scoped posts & courses to public-or-member communities |
| `getPublicSession` returned full private session **notes** to non-members (video was gated, notes were not) | **High** | Notes gated by the same rule as the recording |
| `createBuddyCheckIn` let any member write into another pair's partnership | Medium | `assertBuddyPartner` added |
| `createSession`/`createSessionOrSeries` wrote into any tenant's feed with no membership check | Medium | Community resolver + required `communityId` (later → owner-only) |
| `createCourseFromSession` let a non-admin host publish a course | Medium | Raised to admin |
| `reorderCommunitySections` let an admin of A rewrite B's ordering | Medium | Writes scoped to `{ id, communityId }` |
| `getOrCreateDefaultChannels` let a member trigger channel creation | Low | Split read (member) from create (admin) |
| `getCommunityActivity`/`getRecentMembers` missing `status: ACTIVE` filter | Low | Filter added |
| `getNextCommunitySession` leaked a private community's next session | Low | Public-community filter |
| `deleteRecording` comment/code mismatch | Tidy | Uses `assertSessionHost` (host-or-admin) |

Also confirmed **safe** on inspection: **direct messages are already restricted to host↔member pairs** (a member cannot DM another member), and certificate completion cannot be forged (progress and quiz attempts are all scoped to the caller).

---

## 5. Product decisions made during remediation

- **Live-session creation → owner-only.** `createSession`/`createSessionOrSeries` require the community `OWNER` (widening to `ADMIN` is a one-word change). Both the personal and the community-scoped create surfaces are now owner-gated and consistent. Rationale: a session broadcasts to the whole community feed and spawns jobs — restricting it to the host prevents in-community self-promotion, matching the same intent already enforced on direct messages.
- **Certificates → auto-issue on completion.** Issuance moved out of a client-callable action into an idempotent server path triggered when enrollment progress reaches 100. (The old self-serve action had never been wired up — no certificate had ever been issued.)
- **Standalone (community-less) sessions removed.** The nullable-community path bypassed the tenant gate and fed nothing real; `communityId` is now required.

---

## 6. Scorecard: audit → now

| Area | Audit | Now | Note |
|------|-------|-----|------|
| Security | D− | **B+** | Auth core fixed & tested; SEC-06/07/10 remain before first real user |
| Multi-tenancy / isolation | F | **A−** | Seam + resolvers + row guards + IDOR fixes, enforced by lint and a harness |
| Architecture | C | **B−** | Clean seam spine, dedup done; ARCH-04/05/06/08 remain |
| Performance | C− | **C** | Pagination on hot paths; broad sweep deferred |
| Testing | D | **B** | 695 tests, authz harness, structural checks, CI lint blocking |
| Product completeness | B− | **B** | README honest; certificates actually wired |
| Production readiness | D+ | **C+** | Gated now by 3 known items + hardening, not by the auth core |

**Overall: ~55% → ~78%.** The number moved because the dominant risk class — broken access control and multi-tenant isolation — is closed and regression-guarded. It is not higher because three specific security items (below) remain before the product should meet strangers, and a hardening tier remains for after.

---

## 7. What remains open

**Before the first real member who is not the owner (the "trigger" block):**
- **SEC-06** — Pusher: `PUT /api/pusher` lets any authenticated user inject events into any community's channel; the private-channel authorizer is stubbed. Cross-tenant real-time injection.
- **SEC-07** — `POST /api/email/send` is an open, unauthenticated-in-effect relay from the verified Resend domain. **Pull this one forward if any public marketing starts**, independent of user count — domain reputation is a shared asset.
- **SEC-10** — Stored XSS via unescaped JSON-LD on public pages; delete the naive `sanitizeHtml` in `lib/validations.ts` in the same pass.

These three are API-route / rendering issues, so the seam did not cover them; they are their own small block.

**Post-launch hardening** (the medium/low tier): SEC-15 signed URLs, SEC-16, SEC-17, SEC-19, SEC-20, SEC-21, ARCH-04/05/06/07/08, PERF-01…05, TEST-02 (build/e2e CI), TEST-03, PROD-01…04. None blocks a small, controlled launch; all are tracked here.

**Queued product/UX work** (separate from security): a member-to-member anti-spam review of the **community feed** (the one remaining lateral broadcast surface — posts/comments; DMs, sessions and notifications are already closed), and a UX/usability pass on the core journeys.

---

## 8. How this was validated

Every fix shipped with a test verified failing against the unfixed code first. The authorization posture is enforced by an ESLint rule and an enumeration harness, so it fails the build if it regresses. Beyond Claude Code's own gates, this reviewer independently read the seam and a sample of migrated actions at each stage, and ran the fan-out verification pass in §4 rather than trusting the migration's self-report. Two caveats worth keeping visible: no finding was reproduced against a running staging instance (all analysis is static + test-level), and the three trigger-block items above are real and still open.
