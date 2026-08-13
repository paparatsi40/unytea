# Unytea — Remediation Prompt 04: session creation → owner-only

Continue on branch `remediation/01-now-seam`. Standing directive holds: **no shortcuts, no patches — root-cause only, every change covered by a test.** Guardrails unchanged: never run `npm run build` (it hits the live DB) — use `npx next build`; never touch the live database; keep `npm run type-check`, `npm run test`, `npx next build` and `npm audit` green after each change; work on the branch, do not push.

Decision from Carlos: **only the community owner (the host / creator) may create and host live sessions.** Not any member. Implement it as the real boundary (server) and align the UI so no non-owner is offered a control that would fail.

## 1. Server gate (the security boundary)
`createSession` and `createSessionOrSeries` in `app/actions/sessions.ts`: set `auth: "admin"` with `roles: ["OWNER"]` and `community: ([data]) => communityById(data.communityId)`. Owner-only via the seam — do not hand-roll the check. (Admins are intentionally excluded per Carlos; leaving a one-line widening to `["OWNER","ADMIN"]` possible later.)
Keep `communityId` required (already done in prompt 03) so there is no ungated path.

## 2. UI gate (so the control matches the boundary)
`app/(dashboard)/dashboard/sessions/page.tsx` currently resolves a "primary community" as owner-OR-active-member and renders `<CreateSessionDialog>` at three mount points with no role check, so a non-owner member is shown a create control that will now fail server-side. Fix the UX to match: resolve whether the viewer is the OWNER of that community, pass a `canCreateSessions` (= isOwner) prop to `SessionsPageClient`, and render all three `CreateSessionDialog` mounts (header, empty-state CTA, per-session edit/new) only when `canCreateSessions` is true. Mirror the pattern already used at `app/(dashboard)/dashboard/communities/[communityId]/sessions/page.tsx` (`canCreateSessions = isOwner`). A non-owner should see their sessions (read) but no create/host control.

## 3. Confirm consistency
The community-scoped sessions page is already `isOwner`-gated — after this change both creation surfaces are owner-only and consistent. Confirm there is no third mount of `CreateSessionDialog` (or other caller of the two actions) elsewhere that would bypass the UI gate; if there is, gate it the same way and report it.

## Tests
- A non-owner ACTIVE member (and a MEMBER/ADMIN/MODERATOR that is not OWNER) cannot create a session or series — the action returns FORBIDDEN and no row is written.
- The community OWNER can create a session and a series.
- Update the existing "an ACTIVE member can still create a session" case from prompt 03 to reflect the new owner-only rule (it should now assert a non-owner is refused and the owner succeeds), so the policy is a deliberate, tested edit — not a silent change.

## Hand back
What changed (both files), the test names covering the server gate, confirmation that the three `/dashboard/sessions` create mounts render only for owners and that no other `CreateSessionDialog` mount bypasses it, and all four gates green. After this lands, the "now" block is closed and the branch is ready to merge.
