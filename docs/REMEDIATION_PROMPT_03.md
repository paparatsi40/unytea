# Unytea — Remediation Prompt 03: two product-decision changes

Continue on branch `remediation/01-now-seam`. Standing directive holds: **no shortcuts, no patches — every change removes the root cause and is covered by a test.** Guardrails unchanged: never run `npm run build` (it hits the live DB) — use `npx next build`; never touch the live database; keep `npm run type-check`, `npm run test`, `npx next build` and `npm audit` green after each change; work on the branch, do not push.

These implement Carlos's decisions on the two items you surfaced from Prompt 02.

## 1. Session creation → owner/admin, and close the unscoped standalone path
`createSession` (~74) and `createSessionOrSeries` (~625) are currently `member`-gated. Raise both to `auth: "admin"` (roles OWNER/ADMIN) with `community: ([data]) => communityById(data.communityId)`.

**Before finalizing, verify intent — do not silently break a legitimate flow.** Check the call sites and UI that invoke these two actions to confirm sessions are created by community owners/admins, not self-hosted by ordinary members. If any real flow expects a non-admin member to create or host their own session, STOP and report back with the specific call site, and propose adding a dedicated `MENTOR`/`HOST` `MemberRole` gated via `roles` instead of forcing admin. Product intent outranks the mechanical change.

**Standalone path:** `communityId` is nullable, so a session with no community bypasses the membership/authorization gate entirely. Unless there is a real standalone-session feature in the UI (check), require a `communityId` (reject null) so no session escapes the tenant gate. If a genuine standalone feature exists, report it and leave that path for a separate decision rather than removing it.

**Tests:** a non-admin ACTIVE member cannot create a session or series in a community; an OWNER/ADMIN can; a null/absent `communityId` is rejected (or, if the standalone feature is real, that path is documented and covered separately).

## 2. Certificate issuance → automatic on completion
Replace self-serve issuance with an automatic, idempotent post-completion path. When an enrollment's `progress` reaches 100 (in the completion / progress-recompute path — `markLessonComplete` and wherever progress is recomputed), issue the certificate server-side, reusing the existing "already issued" check for idempotency.

The client-callable self-serve `issueCertificate` should no longer be the trigger: either make issuance an internal function called by the completion path (not a bare `"use server"` export), or keep a thin action that only reads/returns an already-issued certificate. The invariant must hold: no path may issue a certificate for an enrollment that is not the caller's own or not complete.

**Tests:** completing the final lesson of a course auto-issues exactly one certificate for that learner; re-running the completion path creates no duplicate; no client action is required to obtain it.

## Hand back
Per change: what changed and the test covering it; all four gates green. For item 1, state whether admin-gating was applied as-is, or whether a member-host flow was found that needs the MENTOR-role path — plus the standalone-path finding. After this lands, the branch closes the "now" block and is ready to merge.
