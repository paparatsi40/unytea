# Unytea — Remediation Report

**Date:** 2026-08-13 (updated after the trigger block)
**Branches:** `remediation/01-now-seam` (merged into `main` at `b9817bfe`) and `remediation/02-trigger-block` (SEC-06/07/10; merges into `main` alongside this update).
**Companion:** `docs/AUDIT_REPORT.md` is the original audit and describes the **pre-remediation** state (commit `a576985c`). It is preserved as history and intentionally not rewritten. **This file is the current source of truth for security posture.**

---

## 1. Summary

The original audit found a product whose surface was built but whose **trust boundary was not**: 224 Server Actions reachable as unauthenticated public endpoints, no multi-tenant isolation at the data layer, plus a set of API-route and rendering vulnerabilities. Verdict: ~55% production-ready, dominated by Broken Access Control (OWASP A01).

Remediation, sequenced for a product with **zero real users** (spend the cheap-to-break window on the structural changes that get expensive later), proceeded in two blocks:

**The "now" block** — everything that could not wait even for a controlled launch:
1. **Stripe secret hygiene (SEC-01)** — a live key misfiled in a public var, rotated, Vercel verified clean, CI guard added.
2. **Dependency upgrades (SEC-18)** — 24 advisories (2 critical) → 0.
3. **The authorization seam (SEC-02)** — `defineAction`: one place applying identity, rate limiting, Zod validation, tenant authorization and the paywall gate, plus an ESLint rule banning bare `export async function` in `"use server"` files so nothing is born ungated.
4. **All 224 actions migrated** through the seam, with identity-parameter removals (SEC-05) and duplicate collapse (ARCH-03).
5. **LiveKit (SEC-03/04), cron (SEC-11), AI cost-drain (SEC-12)** fixed at the root.
6. **An independent verification pass** caught 11 further authorization-policy defects (two cross-tenant leaks) — all fixed with regression tests.
7. **Product decisions:** live-session creation is owner-only; certificates auto-issue on completion.

**The "trigger" block** — the last security items before the product meets a real member who is not the owner:
8. **Pusher (SEC-06)** — private-channel authorization was stubbed and a client could trigger any event on any channel. Now: channel access is proven (ACTIVE community membership for a `Channel`, participant check for a `Conversation`) before signing, and the free-form client trigger is deleted — realtime is emitted only from server code that already authorized the write. (Also fixed a latent bug: chat messages had never actually persisted.)
9. **Email relay (SEC-07)** — `POST /api/email/send` authenticated but never authorized, an open branded-mail relay. It had **zero callers**; the root-cause fix was deletion. The email templates remain as inert library functions; signup/reset mail is untouched.
10. **JSON-LD XSS (SEC-10)** — `JSON.stringify` into `dangerouslySetInnerHTML` didn't escape `<`, a stored XSS on public pages. A shared `jsonLdSafe` escaper now covers all 7 sites; the bypassable regex sanitizer in `lib/validations.ts` is deleted.

**Method throughout:** no shortcuts, no patches — every fix removed a root cause and shipped with a test verified failing against the unfixed code first (that discipline caught, among others, a `jsonLdSafe` that had silently shipped as a no-op). Final gates: `type-check` 0 · **738 tests** · `next build` exit 0 · `npm audit` 0 vulnerabilities · `lint` exit 0 · **0 bare server actions**.

**All security blocks are now closed. From a security standpoint the product is ready for a controlled first launch.** What remains is post-launch hardening and queued product work — neither blocks launch.

---

## 2. The authorization seam (the core architectural change)

Every Server Action passes through `defineAction(config, handler)`: identity from `auth()` (no action trusts a `userId` argument); rate limiting before validation/DB work; Zod validation; tenant authorization resolved server-side from the resource id via `lib/actions/resolvers.ts` (this is what closes IDOR); and the paywall gate. A second tier, `lib/actions/guards.ts`, answers "does this caller own **this row**?". Enforcement is guaranteed by the ESLint rule (no bare exports) and an enumeration harness that asserts every `"use server"` export is on an explicit public allowlist (12 actions, each justified) or rejects an anonymous caller — so the posture cannot silently regress.

---

## 3. Findings status (against the original audit)

Legend: **Fixed** · **Partial** (root closed, defined remainder deferred) · **Open — hardening** (post-launch) · **By-design**.

| ID | Finding | Status |
|----|---------|--------|
| SEC-01 | Live Stripe key in a public var | **Fixed** |
| SEC-02 | Unauthenticated actions / PII harvest | **Fixed** |
| SEC-03 | LiveKit token for any room | **Fixed** |
| SEC-04 | LiveKit self-assigned role | **Fixed** |
| SEC-05 | Actions trust `userId`/`hostId` args | **Fixed** |
| SEC-06 | Pusher cross-tenant auth / event injection | **Fixed** — channel access proven before signing; free-form trigger removed |
| SEC-07 | `POST /api/email/send` open relay | **Fixed** — dead endpoint removed |
| SEC-08 | Membership enforced in UI not data | **Fixed** |
| SEC-09 | Anyone resolves moderation reports | **Fixed** |
| SEC-10 | Stored XSS via JSON-LD | **Fixed** — `jsonLdSafe` at all 7 sites; naive sanitizer deleted |
| SEC-11 | Cron pipelines reachable as actions | **Fixed** |
| SEC-12 | Unauthenticated AI cost drain | **Fixed** |
| SEC-13 | Rate limiting ~2% coverage | **Fixed (action layer)** |
| SEC-14 | Input validation absent | **Fixed (action layer)** |
| SEC-15 | Recording URL authorizes weakly | **Partial** — tenant gate enforced; signed/expiring URL still a TODO |
| SEC-16 | Email case inconsistency | **Open — hardening** |
| SEC-17 | Sentry ships PII by default | **Open — hardening** |
| SEC-18 | Dependency vulns (2 critical) | **Fixed** |
| SEC-19 | Upload authorization is auth-only | **Open — hardening** |
| SEC-20 | CSP `unsafe-inline` / loose Permissions-Policy | **Open — hardening** (Report-Only CSP exists to promote) |
| SEC-21 | bcrypt cost 10 | **Open — hardening** |
| SEC-22 | Webhook verification | Already correct |
| ARCH-01 | tRPC layer doesn't exist | **Partial** — README fixed; unused packages remain |
| ARCH-02 | Socket.io claim | **Fixed** |
| ARCH-03 | Duplicated impls | **Fixed** (sessions/token); duplicate Pusher client also removed |
| ARCH-04 | Multi-step writes not transactional | **Open — hardening** |
| ARCH-05 | `prisma migrate deploy` in the build | **Open — hardening** |
| ARCH-06 | Unused deps / dead modules / orphans | **Open — hardening** (email templates now unused too) |
| ARCH-07 | Error handling loses typing | **Partial** |
| ARCH-08 | Debug instrumentation in a write path | **Open — hardening** |
| PERF-01 | Unbounded `findMany` | **Partial** — hot paths paginated |
| PERF-02/03/04/05 | Presence poll, bundle, N+1, no client cache | **Open — hardening** |
| TEST-01 | Zero authorization test coverage | **Fixed** — 738 tests, authz harness |
| TEST-02 | CI doesn't gate | **Partial** — secret-scan + lint blocking; build/e2e jobs to add |
| TEST-03 | Lint warnings (real React bugs) | **Open — hardening** |
| PROD-01…04 | i18n, `.env.example`, error boundaries, a11y | **Open — hardening** |

---

## 4. Verification-pass findings (not in the original audit)

An independent review of all 36 action files after the migration found 11 defects — all fixed with wrong-tenant/non-owner/non-partner regression tests. Highlights: `searchGlobal` searched private-community content; `getPublicSession` leaked private session notes to non-members; `createBuddyCheckIn` let any member write into another pair's partnership; `reorderCommunitySections` let an admin of A rewrite B's ordering. Also confirmed **safe**: direct messages are already restricted to host↔member pairs (a member cannot DM another member), and certificate completion cannot be forged.

---

## 5. Scorecard: audit → now

| Area | Audit | Now | Note |
|------|-------|-----|------|
| Security | D− | **A−** | Auth core + all trigger items closed and regression-guarded |
| Multi-tenancy / isolation | F | **A−** | Seam + resolvers + row guards + IDOR fixes, enforced by lint and a harness |
| Architecture | C | **B−** | Clean seam spine, dedup done; ARCH-04/05/06/08 remain |
| Performance | C− | **C** | Pagination on hot paths; broad sweep deferred |
| Testing | D | **B** | 738 tests, authz harness, structural checks |
| Product completeness | B− | **B** | README honest; certificates actually wired |
| Production readiness | D+ | **B** | Launch-ready security; hardening tier remains |

**Overall: ~55% → ~85%.** The security work that gated a real-user launch is complete and regression-guarded. The remaining ~15% is hardening (performance, i18n, accessibility, and lower-severity security items like Sentry PII, CSP promotion, bcrypt cost) plus product decisions — none of it blocks a controlled launch.

---

## 6. What remains

**Post-launch hardening** (medium/low tier): SEC-15 signed URLs, SEC-16, SEC-17, SEC-19, SEC-20, SEC-21, ARCH-04/05/06/07/08, PERF-01…05, TEST-02 (build/e2e CI), TEST-03, PROD-01…04. All tracked here; none blocks a controlled launch.

**Queued product/UX work** (separate from security):
- A member-to-member **anti-spam review of the community feed** — the one remaining lateral broadcast surface (posts/comments). DMs, sessions, notifications and the email relay are all closed.
- A **UX/usability pass** on the core journeys.

---

## 7. How this was validated

Every fix shipped with a test verified failing against the unfixed code first, and the authorization posture is enforced by an ESLint rule plus an enumeration harness so it fails the build if it regresses. Beyond the automated gates, this reviewer independently read the seam and a sample of migrated actions, ran the fan-out verification pass in §4, and personally re-read the two live trigger-block fixes (the Pusher authorization and the JSON-LD escaper) to confirm correctness. Two caveats kept visible: no finding was reproduced against a running staging instance (analysis is static + test-level), and the hardening tier in §6 is real, open work.
