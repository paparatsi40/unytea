# SPRINT_3_PLAN.md

**Status**: Active sprint plan. Created 2026-05-16. Living document — updated as Sprint 3 progresses.

**Inputs:**

- [PRODUCT_DECISIONS_V1.md](./PRODUCT_DECISIONS_V1.md) — canonical product decisions
- [SECTION_5_AUDIT.md](./SECTION_5_AUDIT.md) — code-vs-PD V1 §5 delta audit
- [CONTEXT_BRIEFING.md](./CONTEXT_BRIEFING.md) — operational state at sprint start
- [SPRINT_1_CLOSURE.md](./SPRINT_1_CLOSURE.md) — historical precedent

**Sprint start commit**: `e251eb11` (2026-05-15)

---

## Purpose

Sprint 3 is primarily a **de-featurization sprint** plus operational closure of Sprint 2 pending items.

The SECTION_5_AUDIT discovery (2026-05-15) revealed substantial doc-vs-code delta. Four strategic decisions were made on 2026-05-16; this plan executes those decisions.

**This sprint is NOT for new feature work** beyond what was already planned (Phase 4c, 4d). New feature work resumes in Sprint 4 on top of the cleaned-up foundation.

---

## Section 5 alignment decisions (2026-05-16)

All 4 strategic calls were made in a single working session. Pattern: **strict alignment with PD V1**. No revisions to PD V1 §5 required.

### Cat A — Engagement Extraction → **A1 (full removal)**

Remove the entire Skool-style gamification stack:

- **Schema columns to drop:**
  - `User.points`, `User.level`, `User.currentStreak`, `User.longestStreak`, `User.lastStreakDate`
  - `Member.points`, `Member.level`
  - `ChannelMember.isOnline`, `isTyping`, `lastSeenAt`, `lastTypingAt` + `@@index([isOnline])`
- **Schema tables to drop:**
  - `Achievement`
  - `UserAchievement`
  - `DailyActivity`
- **Routes to remove:**
  - `/dashboard/c/[slug]/leaderboard`
  - `/dashboard/achievements`
  - `/api/user/gamification-stats`
- **Components to remove:**
  - `components/gamification/Leaderboard.tsx`
  - `components/gamification/PointsGuide.tsx`
  - `components/gamification/GamificationWidget.tsx`
  - `components/dashboard/GamificationWidget.tsx`
  - `components/achievements/AchievementGridCard.tsx`
- **Server actions to remove or modify:**
  - `app/actions/gamification.ts` — remove entirely
  - `app/actions/achievements.ts` — remove entirely
  - `app/actions/live-gamification.ts` — remove entirely
  - `app/actions/quizzes.ts:255-272` — strip XP awarding logic, keep quiz completion tracking as utility
  - `app/actions/dashboard.ts:1873` — remove `getMemberLeaderboard`
  - `app/actions/analytics-extended.ts:398` — remove streak-based leaderboard
- **Library to remove:**
  - `lib/streaks.ts`
  - `lib/achievements-data.ts`
- **UI copy to remove:**
  - `app/(dashboard)/dashboard/page.tsx:1015-1057` — streak coercion block ("🔥 streak alive", "Host this week to keep the streak")
- **Settings to remove:**
  - `app/(dashboard)/dashboard/settings/notifications/page.tsx` — `notifyOnAchievement` preference
  - `app/(dashboard)/dashboard/settings/privacy/page.tsx` — `showAchievements` toggle

**What stays:**

- Course progress (% complete) — utility tracking, not gamification
- Member join-date — historical, not ranking
- Quiz completion (binary) — tracking without XP

### Cat E — Marketplace Cannibalization → **E1 (full removal)**

Remove all cross-community discovery surface:

- **Routes to remove:**
  - `app/[locale]/explore/page.tsx`
  - `app/(dashboard)/dashboard/communities/explore/page.tsx`
- **API to remove:**
  - `exploreCommunities` query in `app/api/communities/route.ts:287` (and any helpers it calls)
- **Navigation cleanup:**
  - "Explore" sidebar item in primary nav

**Discovery replacement model:**

- Direct link from host to prospect (host shares URL via their channels)
- Member dashboard shows only communities user has joined
- Each community gets its own SEO-friendly public landing (host opts in)
- `unytea.com/` becomes pure platform marketing (no community marketplace)

### Cat B — Member-to-Member DMs → **B1 (strict)**

Restrict DM authorization to host→member only:

- **Auth gate update:**
  - `app/actions/messages.ts:18` — `canUsersDirectMessage` returns `true` IFF requester is host of a community AND target is member of that community
  - `lib/authorization.ts:354` — `canSendMessage` updated to match
- **UI cleanup:**
  - Remove "Message" button from member cards visible to non-host viewers
  - Keep "Message" button in host's member management views
  - Members' inbox shows only DMs received from their community host(s)
- **Schema unchanged:**
  - `DirectMessage` + `Conversation` models stay — still needed for host→member

**What stays:**

- Host can initiate DM with any member of their community
- Member can reply to host's DM
- Host can have ongoing 1:1 conversation with any member

**What's blocked:**

- Member→Member direct messages (any direction)
- Member→Host DMs initiated by member (host initiates only)

### Cat F — AIChatWidget → **F1 (full removal)**

Remove the AI chat widget entirely:

- **Components to remove:**
  - `components/ai/AIChatWidget.tsx`
  - `components/ai/AIWidgetProvider.tsx`
- **Mount point cleanup:**
  - `components/community/CommunityLayoutClient.tsx:118` — remove `<AIChatWidget />` mount
- **API to remove:**
  - `app/api/ai/chat/route.ts`
- **Test route to remove:**
  - `/dashboard/ai-test`
- **LLM API key consideration:**
  - After removal, audit `.env.example` and Vercel env for any AI provider keys (Anthropic/OpenAI) that are no longer used. If they're only used by this widget, remove from env.

**What stays (still aligned with PD V1 §7 logistics-not-relationship):**

- `app/actions/knowledge-library.ts` — `calculateEngagementScore(session)` (content scoring, not member scoring — defensible)
- `app/actions/ai-recommendations.ts:98` — engagement score on posts (same rationale)
- `app/actions/dashboard.ts:927-948` — community health engagement score

---

## Implementation order

The implementation is sequenced by **size and risk**. Quick wins first, largest scope last.

### Phase 3.0 — Quick wins (Day 1)

Low-risk fixes that pave the way:

1. **Briefing §1 stale fix** — update CONTEXT_BRIEFING.md §1 to align with PD V1 ("comunidad de membresía live-first", 3-tier pricing). ETA: 10 min.
2. **View Full Profile 404 fix** (P2 from 2026-05-15) — investigate route, likely missing page or wrong link. ETA: 15-30 min.
3. **`don't miss` copy rewrite** (Cat C soft violation from audit) — `app/actions/session-jobs.ts:324` + `lib/email.ts:165` factual phrasing. ETA: 10 min.

**Output:** 1-3 commits, briefing in sync with PD V1, smallest bugs cleared.

### Phase 3.1 — Cat E removal (Day 1)

Smallest scope. Self-contained.

1. Remove `app/[locale]/explore/page.tsx`
2. Remove `app/(dashboard)/dashboard/communities/explore/page.tsx`
3. Remove `exploreCommunities` from `app/api/communities/route.ts`
4. Remove "Explore" sidebar nav item
5. `npx next build` verify
6. Single commit: `feat(de-feat): remove /explore + trending per PD V1 §5 Cat E`

**Output:** 1 commit. ETA: 30-60 min.

### Phase 3.2 — Cat F removal (Day 1)

Self-contained, parallel-safe with Phase 3.1.

1. Remove `components/ai/AIChatWidget.tsx`
2. Remove `components/ai/AIWidgetProvider.tsx`
3. Edit `components/community/CommunityLayoutClient.tsx:118` — remove mount
4. Remove `app/api/ai/chat/route.ts`
5. Remove `/dashboard/ai-test` route
6. Audit env vars for unused AI keys
7. `npx next build` verify
8. Single commit: `feat(de-feat): remove AIChatWidget per PD V1 §5 Cat F`

**Output:** 1 commit. ETA: 30-60 min.

### Phase 3.3 — Cat B DM gating (Day 2)

Requires careful auth-gate audit before changes.

1. **Audit current state:**
   - View `app/actions/messages.ts:18` to read current `canUsersDirectMessage` logic
   - Identify all callers of the gate
   - Identify all UI "Message" buttons (member cards, profile pages, conversation list)
2. **Update auth gate:**
   - Restrict `canUsersDirectMessage` to host→member only
   - Update `lib/authorization.ts:354` `canSendMessage` to match
3. **UI cleanup:**
   - Remove "Message" buttons from non-host viewer paths
   - Keep "Message" in host member management views
   - Adjust member's inbox view to clarify scope
4. **Test:**
   - Defensive test in `tests/unit/auth-security.test.ts` for DM authorization
   - Manual: as host can DM member ✓; as member can't DM another member ✗
5. Commit: `feat(de-feat): restrict DMs to host→member per PD V1 §5 Cat B`

**Output:** 1 commit. ETA: 2-4 hours.

### Phase 3.4 — Cat A gamification removal (Day 3-5)

Largest scope. Sequenced as multiple commits.

#### Phase 3.4a — UI surface removal

1. Remove `/leaderboard` route and component
2. Remove `/achievements` page
3. Remove all gamification widgets from dashboard
4. Remove streak UI from `dashboard/page.tsx` (the 🔥 block)
5. Remove `notifyOnAchievement` + `showAchievements` settings
6. Remove member-card visual indicators (Lv1/Lv2 badges, points display, "Online now" / "Active X ago", "Available" badge)
7. `npx next build` verify
8. Commit: `feat(de-feat): remove gamification UI per PD V1 §5 Cat A (phase 1/3)`

ETA: 1 day.

#### Phase 3.4b — Server actions removal

1. Remove `app/actions/gamification.ts`
2. Remove `app/actions/achievements.ts`
3. Remove `app/actions/live-gamification.ts`
4. Strip XP from `app/actions/quizzes.ts` (keep quiz completion tracking)
5. Remove `getMemberLeaderboard` from `app/actions/dashboard.ts`
6. Remove streak leaderboard from `app/actions/analytics-extended.ts`
7. Remove `/api/user/gamification-stats` route
8. Remove `lib/streaks.ts` + `lib/achievements-data.ts`
9. `npx next build` verify
10. Commit: `feat(de-feat): remove gamification server actions per PD V1 §5 Cat A (phase 2/3)`

ETA: 0.5-1 day.

#### Phase 3.4c — Schema migration

1. Generate Prisma migration to drop:
   - User columns: `points`, `level`, `currentStreak`, `longestStreak`, `lastStreakDate`
   - Member columns: `points`, `level`
   - ChannelMember columns: `isOnline`, `isTyping`, `lastSeenAt`, `lastTypingAt` + index
   - Tables: `Achievement`, `UserAchievement`, `DailyActivity`
2. Test migration locally (verify `npx next build` after schema change)
3. Apply to Neon dev branch first if possible
4. Commit: `feat(de-feat): drop gamification schema per PD V1 §5 Cat A (phase 3/3)`
5. Deploy → migration runs on Vercel

ETA: 0.5 day. **Risk: medium** — destructive migration. Pre-launch (0 real users) makes this safe.

### Phase 3.5 — Reverting Phase 3.1 /explore de-feat (planning entry, 2026-05-27)

> **Status**: planning entry only. This section documents _what_ and _why_. Implementation ships as a separate PR (code), not part of the doc-only revision that introduced this section.

**Trigger.** PD V1 §1, §2, and §5 Cat E were revised on 2026-05-27 (emerging-creator pivot). The revised §5 Cat E re-opens the discovery surface, gated by a four-criterion quality bar. See PD V1 §5 Cat E "REVISED 2026-05-27" for the normative text. See also `SECTION_5_AUDIT.md` 2026-05-27 entry for the audit-side rationale.

**What this phase does (high level).**

1. Revert commit `e8d7e2e0` (the original Phase 3.1 de-feat) to restore:
   - `app/[locale]/explore/page.tsx`
   - `components/explore/*`
   - The `/explore` entry in the sitemap
   - Internal navigation links that referenced `/explore`
2. Re-introduce quality-bar gating on the listing query, per revised PD V1 §5 Cat E:
   - At least 1 live session scheduled in the next 7 days.
   - At least 3 active members.
   - Description + cover image set.
   - Community is ≥14 days old.
3. Add a community-level opt-OUT setting so creators can hide their community from public `/explore` listing (default: opt-IN, since the §2 persona benefits from discovery).
4. Replace the original "trending" default sort with topical-match filters (filtros por especialidad), per revised Cat E risk mitigation.

**What this phase does NOT do.**

- Does not restore the dashboard `/dashboard/communities/explore` page exactly as it was, without first reviewing whether logged-in members need a different surface than logged-out prospects. That review happens before code lands.
- Does not bring back "trending communities this week" surfaces in their generic form — those remain anti-feature per revised Cat E.
- Does not introduce featured/paid placements; those are gated by §9 thresholds (≥1,000 creators + ≥50k unique monthly visitors).

**Sequencing.**

- This phase ships **after** Phase 3.4 (Cat A gamification removal) closes. The Cat A removal is invariant under the §2 revision and should not be blocked by it.
- This phase ships in its **own PR** (code only). The PD V1 revision is doc-only and ships first.
- Quality-bar code lives in the listing query layer, not at the page-render layer — so the same gating applies to any future surface that lists communities (XML sitemap entries, future API).

**Definition of Done for Phase 3.5.**

- Revert applied; `/explore` route resolves and renders.
- Listing query gated by the four quality-bar criteria; verified by unit test (fixtures that fail each criterion are excluded; a fixture that meets all four is included).
- Community opt-OUT setting wired through schema + settings UI + listing query.
- Sort options: removed "trending," kept "newest" and added topical-match filters.
- `npx next build` passes.
- `SECTION_5_AUDIT.md` re-run on the relevant Cat E surface returns ZERO violations of the revised PD V1 §5 Cat E.

**ETA.** Half a day to a day for the revert + gating + opt-OUT setting, assuming the original `/explore` UI is restorable as-is and only the query layer needs the new bar. Larger if community-card design needs refresh to match new marketing positioning (§7).

---

### Phase 3.6 — Operational alongside (formerly Phase 3.5)

These run in parallel with the de-featurization work, NOT blocking:

1. **2026-05-18 (Monday)** — Phase 4c CSP re-recon día 3. SQL query against `csp_violations` table. Decision: enforce switch ready or wait until día 7.
2. **2026-05-22 (Thursday)** — Phase 4c re-recon día 7. Final decision on enforce switch.
3. **Phase 4d nonces** — separate work, can start after Cat A is mostly done. Own sprint if scope grows.

### Phase 3.7 — Deferred bugs (P2/P3) (formerly Phase 3.6)

These fold into the natural sprint work where possible, but are not gating:

- **Logout cache issue (P1)** — likely Service Worker or Next.js cache. Could be fixed during Cat A work since the home page is touched then. If not, dedicated investigation.
- **Discovery card sparseness (P3)** — moot after E1 (/explore removed). The card was on /explore. Verify.
- **Live session UX layout (P2-architectural)** — video + whiteboard simultaneous. **DEFERRED to Sprint 4** unless quick win discovered. Scope larger than de-featurization.

---

## Estimated total Sprint 3 effort

| Phase                           | Scope                                                    | ETA            |
| ------------------------------- | -------------------------------------------------------- | -------------- |
| 3.0 Quick wins                  | 3 small fixes                                            | 30-60 min      |
| 3.1 Cat E removal               | /explore + trending (executed; superseded by 3.5 revert) | 30-60 min      |
| 3.2 Cat F removal               | AIChatWidget                                             | 30-60 min      |
| 3.3 Cat B DM gating             | Auth + UI                                                | 2-4 hr         |
| 3.4 Cat A gamification          | UI + actions + schema                                    | 2-3 days       |
| 3.5 Revert /explore de-feat     | Revert + quality-bar gating + opt-out                    | 0.5-1 day      |
| 3.6 Phase 4c re-recon (was 3.5) | Data check + decision                                    | 1-2 hr (twice) |
| 3.7 Bug investigation (was 3.6) | Logout cache                                             | 1-2 hr         |

**Total:** ~5-6 working days for de-featurization + the /explore revert + Phase 4c operational closure.

**Calendar:** if Carlos starts Monday 2026-05-18 and works ~4-5 hr/day, Sprint 3 closes around 2026-05-23 to 2026-05-25.

---

## Definition of Done

Sprint 3 closes when:

- [ ] All Section 5 alignment phases (3.1–3.4) committed and deployed
- [ ] Phase 3.5 (/explore revert + quality-bar gating per revised PD V1 §5 Cat E) committed and deployed
- [ ] `git grep` re-audit shows 0 hits in critical categories that remain anti-feature (Cat A) and in the _un-gated_ surfaces that revised Cat E still excludes (cross-community member browsing, generic "trending" sort, peer ratings)
- [ ] `npx next build` passes after each commit
- [ ] Phase 4c CSP enforce switch decision made (enforce or extended wait)
- [ ] `tests/unit/auth-security.test.ts` extended with DM authorization defensive test
- [ ] CONTEXT_BRIEFING.md updated with Sprint 3 state
- [ ] SECTION_5_AUDIT.md re-run (Phase 2 grep) to verify de-featurization complete on still-anti-feature categories
- [ ] SPRINT_3_CLOSURE.md written (retro pattern from SPRINT_1_CLOSURE.md)

---

## Out of scope (parking lot)

These were considered but pushed to Sprint 4 or later:

- **Live session UX rework** — video + whiteboard simultaneous layout. Architectural, deserves dedicated planning.
- **React Compiler audit** — 581 ESLint warnings (159 latent try/catch-JSX bugs). Dedicated sprint when capacity allows.
- **Tiptap 2→3 upgrade** — minor backlog, no urgency.
- **PWA update banner + manifest screenshots** — partial work done 2026-05-15 (Task C.1 paused). Resume in Sprint 4 if Lighthouse hygiene matters.
- **Cat G pro-features verification** — audit each PD V1 §5 Cat G pro-feature is present/planned. Dedicated audit task in Sprint 4.
- **AI features that ARE aligned** — content scoring (engagement on posts/sessions), library search/indexing. These STAY but no new investment this sprint.
- **Autopilot activation** — gate requires 30+ paid hosts + workflow evidence per PD V1 §7. Not triggered yet.

---

## Open questions before sprint kickoff

These need quick decisions Monday morning before starting Phase 3.0:

1. **"Messages" sidebar item naming after Cat B restriction.** Members will have an inbox containing only host messages. Options:
   - Keep "Messages" (generic, works)
   - Rename "Host Messages" (explicit, clearer)
   - Rename "Inbox" (neutral)
2. **Quiz XP removal — what happens to quiz UX?** Currently quizzes award XP. After A1:
   - Keep quiz completion tracking (utility) but remove "+N points" toast
   - Remove all quiz UX entirely (quizzes are part of courses, may not be heavily used)
   - Decision depends on whether quizzes are used in current implementation
3. **Schema migration: drop columns now vs deprecate.**
   - **Drop now** (recommended): pre-launch, 0 real users, cleanest. Migration is destructive but safe.
   - **Deprecate** (more conservative): keep columns, just stop writing. Easier to rollback but leaves dead schema.
4. **Mobile/desktop "Message" button removal scope.** Audit confirms member cards have Message button. Need to check:
   - Profile pages
   - Conversation list view
   - Any deep links
5. **AI provider env keys cleanup.** After F1, check Vercel env for `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or similar. Remove if no longer used.

---

## Risks

- **Cat A schema migration** is destructive. Pre-launch state mitigates (0 real users), but careful testing on Neon dev branch first is wise.
- **Live UX rework** is architectural and deferred — Sprint 4 should not skip it indefinitely. The core differentiator (live-first with whiteboard) suffers without it.
- **Logout cache bug** if Service Worker-related could affect deploy flow — needs investigation early.
- **CSP enforce switch (Phase 4c)** decision depends on data quality. If `csp_violations` has noisy or insufficient data, enforce gets pushed past Sprint 3.

---

## Sprint 3 → Sprint 4 transition

When Sprint 3 closes:

- `SPRINT_3_CLOSURE.md` retro created
- Briefing updated to Sprint 4 state
- Open questions from this doc resolved or carried forward
- New `SPRINT_4_PLAN.md` written based on Sprint 4 priorities (probably: live session UX, autopilot activation prep, new feature work)

---

**Document end. Sprint 3 ready to begin.**
