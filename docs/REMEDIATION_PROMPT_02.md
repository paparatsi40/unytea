# Unytea — Remediation Prompt 02: authorization-policy fixes from the independent verification pass

Continue on branch `remediation/01-now-seam` (the seam migration is done; these are corrections to it — new commits on the same unpushed branch). Standing directive holds: **no shortcuts, no patches — every fix removes the root cause and is covered by a test.** Guardrails unchanged: never run `npm run build` (it hits the live DB) — use `npx next build`; never touch the live database; keep `npm run type-check`, `npm run test`, `npx next build` and `npm audit` green after each fix; do not push.

## Context
The 224/224 seam migration guarantees **authentication** (the H9 harness proves every gated action rejects an anonymous caller) and **tenant membership** (the `community` resolver + the seam's member/admin gate). It does **not** guarantee, and the harness does **not** test, per-action *policy correctness*: the right auth level, a resolver that resolves the resource actually being acted on, and a row-level ownership guard where a single member owns the row. An independent review of all 36 action files found the following holes in that layer. Each was verified by reading the code. Fix all of them, and for each add a targeted test that a **wrong-tenant / non-owner / non-partner** caller is rejected (this is the class the anonymous-only harness misses).

---

## HIGH

### H1 — `search.ts` · `searchGlobal` (posts branch ~76, courses branch ~111): cross-community content leak
The posts and courses queries filter only on `isPublished`/`deletedAt` with no privacy or membership scoping (`ctx` is discarded via `void ctx`). Any authenticated user can search the title and full content of posts, and titles/descriptions of courses, inside private/paid communities they are not a member of. The communities branch already does this correctly (`isPrivate: false`).
**Fix:** scope both the posts and the courses `where` to communities that are public OR where the caller is an active member — `community: { OR: [{ isPrivate: false }, { members: { some: { userId: ctx.userId, status: "ACTIVE" } } }] }`. Stop discarding `ctx`.
**Test:** a member of community A searching a term that matches a post and a course in private community B (where they are not a member) gets no B results; gets them once made an active member of B, and always gets public-community matches.

### H2 — `public-sessions.ts` · `getPublicSession` (~238) and its alias `getPublicSessionBySlug` (~326): private session notes leak
The recording URL is correctly gated (`url: canWatchRecording ? … : null`, line 235), but `notes` (full `content`, `summary`, `keyInsights`, `chapters`, `quotes`) is returned unconditionally for any COMPLETED session with notes, ignoring `canWatchRecording`. For a `visibility: "community"` (private/paid) session, a non-member gets a null video but the full written notes — the substantive paywalled content. The alias spreads the same object and re-leaks it.
**Fix:** gate `notes` behind the same `canWatchRecording` check — return `null` (or a redacted stub) for community-visibility sessions when `!canWatchRecording`. Fixing `getPublicSession` fixes the alias.
**Test:** a non-member (and an anonymous caller) fetching a `visibility: "community"` completed session gets both `recording.url === null` and `notes === null`; an active member gets both populated.

---

## MEDIUM

### M1 — `buddy.ts` · `createBuddyCheckIn` (~342): missing row guard
Gated `member` + `communityOfPartnership`, but unlike its siblings (`createBuddyGoal`, `completeBuddyGoal`, `endBuddyPartnership`, all of which call `assertBuddyPartner`) it never verifies the caller belongs to the partnership. Any member of the community can write check-ins (mood, notes) into another pair's partnership by passing its `partnershipId`.
**Fix:** `await assertBuddyPartner(ctx, partnershipId)` before creating the check-in.
**Test:** a community member who is not a partner in partnership P gets FORBIDDEN from `createBuddyCheckIn(P, …)`; a partner succeeds.

### M2 / M3 — `sessions.ts` · `createSession` (~74) and `createSessionOrSeries` (~625): unscoped writes into any tenant
Both are gated `auth: "user"` with no `community` resolver, yet they attach the session/series to a caller-supplied `communityId` and write a `SESSION_ANNOUNCEMENT`/feed post (and autopilot jobs) into that community. Any authenticated non-member can inject content into an arbitrary tenant's feed.
**Fix:** gate both with a `community` resolver on the supplied id (`community: ([data]) => communityById(data.communityId)`) so membership is enforced. **Decision for Carlos, flag it:** if session creation is meant to be host/owner/admin-only rather than any member, use `auth: "admin"` (roles OWNER/ADMIN, or a mentor role) instead of `member`. Default to `member` to close the cross-tenant hole; note the choice in the handback.
**Test:** a non-member of community C cannot create a session or series in C.

### M4 — `session-course.ts` · `createCourseFromSession` (~268): authoring below the authoring role
Gated `member` and guarded only by `session.mentorId === userId`, while the sibling authoring actions `createCourse` and `addSessionToCourse` require `auth: "admin"` + a course/community owner check. A member who merely hosts a session — not necessarily an OWNER/ADMIN — can publish a Course (with attacker-controlled title/isPaid/price) in the community's namespace.
**Fix:** raise to `auth: "admin"` with `community: ([sessionId]) => communityOfSession(sessionId)` (or add an explicit `session.community.ownerId === userId` / owner-admin check), matching `createCourse`.
**Test:** a session host who is not an OWNER/ADMIN of the community gets FORBIDDEN; an owner/admin succeeds.

### M5 — `community-builder.ts` · `reorderCommunitySections` (~373): cross-tenant integrity write
The seam confirms the caller is OWNER/ADMIN of the `communityId` arg, but the `$transaction` then updates every id in `sectionIds[]` with `where: { id }` — no `communityId` scoping. An admin of community A can pass A's id (to pass the gate) plus section ids owned by community B and silently rewrite B's section ordering.
**Fix:** scope each write to the tenant — `prisma.communitySection.updateMany({ where: { id, communityId }, data: { position: index } })` — or pre-fetch the ids and reject if any `section.communityId !== communityId`.
**Test:** an admin of A calling reorder with a `sectionId` belonging to B leaves B's sections unchanged (and/or errors).

---

## LOW

### L1 — `channels.ts` · `getOrCreateDefaultChannels` (~41): member can trigger writes
Gated `member` but it *creates* channel rows when a community has none. Channel provisioning is an admin/moderator operation; an ordinary member should not trigger it (e.g. re-creating defaults an admin removed). Bounded/idempotent, hence low.
**Fix:** split the read from the write — members read existing channels; only `auth: "admin"` (roles OWNER/ADMIN/MODERATOR, resolver `communityById`) may create them.
**Test:** an ordinary member cannot cause channel creation.

### L2 — `dashboard.ts` · `getCommunityActivity` (~534) and `getRecentMembers` (~632): missing ACTIVE filter
Both look up membership with `where: { userId }` and no `status: "ACTIVE"`, unlike every sibling read. A user with a PENDING (join-requested), REMOVED, or BANNED membership row still reads that community's recent activity and member roster.
**Fix:** add `status: "ACTIVE"` to the member `where` in both, matching the sibling reads.
**Test:** a user with a non-ACTIVE membership row does not receive that community's activity or roster.

### L3 — `public-sessions.ts` · `getNextCommunitySession` (~484): private schedule enumeration
Public, returns the next scheduled session (title, time) for any `communityId` with no privacy filter, while the sibling `getRelatedCommunitiesHostingThisWeek` filters `isPrivate: false`. An unauthenticated caller can enumerate a private community's upcoming session title and time.
**Fix:** restrict to public communities (`community.isPrivate === false`) or require membership.
**Test:** an anonymous call for a private community returns null.

---

## Minor tidy-up
`recording.ts` · `deleteRecording` (~250): the comment says "host or admin" but the code allows only the host (`recording.session.mentorId !== userId`). Align code to the intended policy by loading `recording.sessionId` and calling `assertSessionHost(ctx, recording.sessionId)` (which already permits host **or** community OWNER/ADMIN), matching `startCompositeRecording`.

## NOT a fix — a decision for Carlos (do NOT change behavior)
`certificates.ts` · `issueCertificate` (~16): a review flagged it as self-serve (the learner mints their own certificate, gated on `enrollment.userId === ctx.userId` + `progress === 100` + their own passed quiz attempts). On inspection this is a **defensible design**, not a clear vulnerability — the authority is the completion check, and the certificate only reflects a course the caller actually completed. Do **not** change it. Instead, in the handback: (a) confirm that `progress` and quiz-attempt writes elsewhere are scoped to `ctx.userId` (so completion cannot be forged), and (b) surface to Carlos the product question of whether issuance should require an instructor/automated path. His call.

## Out of scope here (already tracked)
`getSignedRecordingUrl` still returns an unsigned permanent URL — that is the "signed URL" half of SEC-15, a deferred medium (tenant isolation on it is already enforced by the member gate). Leave it for a later block.

## Hand back
Per finding: what changed, and the name of the regression test that now covers it. Confirm all four gates green. List the two items awaiting Carlos's decision (session-creation auth level M2/M3; certificate issuance policy).
