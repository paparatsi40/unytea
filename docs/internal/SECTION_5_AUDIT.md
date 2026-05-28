# SECTION_5_AUDIT.md

**Status**: Living document, version 1. Created 2026-05-15.

This document captures the delta between [PRODUCT_DECISIONS_V1.md](./PRODUCT_DECISIONS_V1.md) Section 5 (anti-features) and the implemented unytea codebase as of commit `0a446099`.

The audit was performed in 2 phases on 2026-05-15:
- **Phase 1**: Visual audit during the PWA screenshot session
- **Phase 2**: Codebase grep + Prisma schema review

This document does **NOT** make remediation decisions. It captures the gap so Sprint 3 planning can prioritize.

---

## Executive summary

The current implementation contains substantial surface that conflicts with anti-features locked in PRODUCT_DECISIONS_V1.md Section 5. The largest gaps are:

1. **Cat A — Engagement Extraction**: full Skool-style gamification stack (points, levels, streaks, achievements, leaderboards, daily activity tracking, presence indicators)
2. **Cat E — Marketplace Cannibalization**: public `/explore` page with default `trending` sort across communities

Several categories are confirmed clean (Cat C affiliates/referrals, Cat D tips/super-chats, Cat F sentiment/churn modeling, Cat H tracking pixels). These represent existing alignments that the doc retroactively confirms.

A small number of items need strategic calls before Sprint 3 work can proceed:
- **Cat B** — Member-to-member DMs (already gated via `canUsersDirectMessage`)
- **Cat F** — AIChatWidget on every community page (positioning unclear)

The doc-vs-code delta is significant enough that **Sprint 3 cannot be purely "build new features"** — it must include strategic de-featurization in at least two critical categories (A and E) plus strategic calls on B and F.

---

## Cat A — Engagement Extraction → CRITICAL VIOLATION

The product implements the classic Skool engagement-extraction stack. This is the largest conflict surface in the codebase.

### Schema-level surface (`prisma/schema.prisma`)

| Lines | Field/Model | Conflict |
|---|---|---|
| 84-87 | `User.points`, `User.level`, `User.currentStreak`, `User.longestStreak`, `User.lastStreakDate` | Per-user persistent gamification |
| 226-227 | `Member.points`, `Member.level` | Per-community duplication of gamification |
| 835-861 | `Achievement` + `UserAchievement` models | Badge / achievement infrastructure |
| 898-915 | `ChannelMember.isOnline`, `isTyping`, `lastSeenAt`, `lastTypingAt` + `@@index([isOnline])` | Presence pressure |
| 1349 | `DailyActivity { ... pointsEarned ... }` | Daily activity → streak computation |

### Routes and pages

- `/dashboard/c/[slug]/leaderboard` — per-community leaderboard (`app/(dashboard)/dashboard/c/[slug]/leaderboard/page.tsx`)
- `/dashboard/achievements` — global achievements UI (`app/(dashboard)/dashboard/achievements/page.tsx`)
- `/api/user/gamification-stats` — XP/level calculation endpoint (`app/api/user/gamification-stats/route.ts:38`)

### Components

- `components/gamification/Leaderboard.tsx`
- `components/gamification/PointsGuide.tsx`
- `components/gamification/GamificationWidget.tsx`
- `components/dashboard/GamificationWidget.tsx`
- `components/achievements/AchievementGridCard.tsx`

### Server actions

- `app/actions/gamification.ts:9` — `getLeaderboard`
- `app/actions/achievements.ts` — `getUserAchievements`, achievement types include `post_streak`, `check_in_streak`
- `app/actions/live-gamification.ts` — points awarded during live sessions, `formatPointsNotification` shows "+N points" toasts
- `app/actions/quizzes.ts:255-272` — XP on quiz completion
- `app/actions/dashboard.ts:1873` — `getMemberLeaderboard`
- `app/actions/analytics-extended.ts:398` — analytics leaderboard (top 10 ranked by streaks)

### Libraries

- `lib/streaks.ts:43-220` — daily-activity → streak computation library
- `lib/achievements-data.ts`

### UI copy (explicit Skool-style coercion)

`app/(dashboard)/dashboard/page.tsx:1015-1057`:

> 🔥 {gamification.streak.weeks}  
> "You hosted this week — streak alive"  
> "Host this week to keep the streak"

This is textbook engagement extraction language.

### Settings surface

- `app/(dashboard)/dashboard/settings/notifications/page.tsx:17,146-160` — `notifyOnAchievement` preference (opt-in/out)
- `app/(dashboard)/dashboard/settings/privacy/page.tsx:16,125` — `showAchievements` privacy toggle (default ON)

### Visual evidence (Phase 1)

Captured from `unytea.com/dashboard/c/unytea-2912/members` on 2026-05-15:

- `Lv1` / `Lv2` badges on member cards with point totals (`0 pts`, `20 pts`, `150 pts`)
- `Achievements` item in primary sidebar nav
- `Available` green badges on member cards
- `Online now` / `Active 8 minutes ago` / `Active about 1 month ago` presence text
- Red notification badge with count (`7`) in top bar

### Strategic question for Sprint 3

PRODUCT_DECISIONS_V1.md Section 5 Cat A explicitly names: streaks, leaderboards, badges/gamification, "trending posts", aggressive notifications, "last active" pressure. All of these are present in code.

**Decision options:**
- **A. Full removal**: remove all gamification UI + schema columns. Significant scope (~15 files + 4 Prisma models).
- **B. Hide UI but keep schema columns inert**: less work, leaves mechanism present (and reversible regression).
- **C. Revise PD V1 Cat A**: scope which gamification (if any) is acceptable. E.g., private streak-for-hosts as private analytics ≠ public streak-for-members as coercion. Would require explicit doc revision.

---

## Cat B — Member-to-Member Friction → STRATEGIC CALL

### Implementation

- `prisma/schema.prisma:337` — `DirectMessage` model
- `prisma/schema.prisma:359` — `Conversation` model
- `app/actions/messages.ts` — full CRUD: `createMessage`, `getMessages`, `updateMessage`, `deleteMessage`, `markAsRead`
- `app/actions/messages.ts:18` — `canUsersDirectMessage` authorization gate (already exists)
- `lib/authorization.ts:354` — `canSendMessage`

### Clean

- No member directory export found (no `exportMembers`, `memberExport`, `directoryExport`)

### Strategic question

PD V1 §5 Cat B lists "Member-to-member DMs" as anti-feature. The implementation exists but is already gated by `canUsersDirectMessage` (likely scoping is same-community only).

**Decision needed:**
- Enforce strict §5 Cat B (remove DMs entirely)
- Accept same-community DMs as community-glue and revise §5 Cat B's interpretation
- Restrict DMs to host→member only (remove member→member, keep host→member which is OK per Section 3 Layer 2)

---

## Cat C — Viral Growth → MOSTLY CLEAN, soft violations present

### Clean

| Surface | Hits |
|---|---|
| Affiliate programs | 0 |
| Referral / invite codes | 0 |
| Member-to-member commissions | 0 |
| Scarcity / countdown UX | 0 |

### Soft violations

**"Don't miss" copy:**
- `app/actions/session-jobs.ts:324` — `"${session.title} starts at ${time} · Join now so you don't miss it"`
- `lib/email.ts:165` — `"Hey ${userName}, don't miss this session!"`

**Session urgency labels** (probably acceptable — factual time-to-event, not artificial scarcity):
- `app/[locale]/community/[slug]/page.tsx:32` — `sessionUrgencyLabel(date)`
- `app/[locale]/explore/page.tsx:56` — `getSessionUrgencyLabel(date)`
- `lib/email.ts:136-153` — `urgencyMap` for session reminders

### Recommendation

Rewrite the 2 "don't miss" lines to factual phrasing. Keep urgency labels — they describe real schedules, not manufactured scarcity.

---

## Cat D — Predatory Monetization → CLEAN

### Clean

| Surface | Hits |
|---|---|
| Tips / donations | 0 |
| Super-chats | 0 |
| Pay-per-session pricing | 0 |
| Pay-to-promote-comments | 0 |

unytea is correctly subscription-only. **Confirmed alignment.**

---

## Cat E — Marketplace Cannibalization → CRITICAL VIOLATION

### Implementation

- `app/[locale]/explore/page.tsx` — public Explore page (cross-community browse)
- `app/api/communities/route.ts:287` — `exploreCommunities` query
- `app/(dashboard)/dashboard/communities/explore/page.tsx` — logged-in explore page (separate)

### Trending mechanic

`app/[locale]/explore/page.tsx:115,126,348-543`:

```typescript
sort?: "trending" | "members" | "newest";
const selectedSort = searchParams?.sort?.trim() || "trending";  // default
const trendingCommunities = sorted.slice(0, 3).map(...);
// Top 3 marked with isTrending: true badge
```

### Clean

- No community reviews / ratings system (0 hits)

### Visual evidence (Phase 1)

The "All Communities" discovery card surfaces communities with `Join Community` button and Pinterest-style `Save` badge — the centerpiece of cross-community discovery flow.

### Strategic question

PD V1 §5 Cat E names cross-community discovery feed AND trending communities surface AS anti-features. The `/explore` page implements both as its centerpiece.

**Decision needed:**
- **A. Remove `/explore` entirely.** Communities are accessed only via direct link or already-joined dashboard.
- **B. Keep `/explore` but reframe as "unytea marketing showcase"** — small curated set, no algorithmic ranking, no "trending" sort. Communities listed by editorial choice or join-by-link only.
- **C. Revise PD V1 §5 Cat E.** Less likely — the rationale ("hosts own their relationship; unytea is not a marketplace") was solid.

---

## Cat F — AI Replacing Relationship → PARTIAL VIOLATION (strategic call)

### Implementation

- `components/ai/AIChatWidget.tsx`
- `components/ai/AIWidgetProvider.tsx`
- `components/community/CommunityLayoutClient.tsx:118` — `{isMember && <AIChatWidget communitySlug={slug} />}`
- `app/api/ai/chat/route.ts:154-158` — `generateChatCompletion`, returns `aiResponse`
- Test route: `/dashboard/ai-test`

### Defensible content scoring (NOT member targeting)

These score content/sessions/communities, not individual members. Reasonable analytics:
- `app/actions/knowledge-library.ts:63,76` — `calculateEngagementScore(session)` based on attendees + reactions
- `app/actions/ai-recommendations.ts:98` — engagement score on posts (`comments*2 + reactions`)
- `app/actions/dashboard.ts:927-948` — community health engagement score

### Clean

| Surface | Hits |
|---|---|
| Sentiment analysis on members | 0 |
| Churn risk modeling | 0 |
| Host impersonation | 0 |
| `memberScore` / `engagementScore` per-member | 0 |

### Strategic question

Is the `AIChatWidget` positioned as platform-help (e.g., "ask about how to use unytea") or as host-replacement (e.g., "ask the assistant your questions about this community's content")?

- **Platform-help** → aligned with PD V1.
- **Host-replacement** → violates §5 Cat F ("AI chatbots that respond AS the host").

**Decision needed:** clarify positioning and either align UX language/scoping or remove the widget.

---

## Cat G — Pro-features → NOT AUDITED IN DETAIL

These are positive features unytea should keep/expand. Sprint 3 should verify each pro-feature is present or planned:

- [ ] Complete export of member data (CSV with emails, dates, metrics)
- [ ] Complete content export (downloadable recordings, portable courses)
- [ ] Migration tools / API for leaving unytea
- [ ] Custom CSS on Studio tier
- [ ] Notifications default opt-OUT for non-critical
- [ ] Self-serve cancellation (Stripe Customer Portal)
- [ ] Transparent pricing without asterisks
- [ ] SEO-friendly public landing pages

---

## Cat H — Anti-Integrations → CLEAN

### Clean

| Surface | Hits |
|---|---|
| Meta/IG/TikTok tracking pixels (`fbq`, `fbevents`, `tiktokpixel`, `gtm.`, `googleAds`) | 0 |
| WhatsApp Business mass DM | 0 |
| Telegram bot | 0 |
| Mass broadcast messaging | 0 |

**Strong confirmed alignment** with §5 Cat H.

---

## Summary table

| Category | Conflict severity | Surface size | Decision needed by Sprint 3 |
|---|---|---|---|
| **A — Engagement Extraction** | CRITICAL | ~15 files, 4 Prisma models | Yes — major strategic call |
| **B — Member-to-Member DMs** | HIGH | DM + Conversation + actions | Yes — gate, restrict, or remove |
| **C — Viral Growth** | LOW | 2 copy strings | Minor copy fix |
| **D — Predatory Monetization** | CLEAN | 0 hits | Confirmed alignment |
| **E — Marketplace Cannibalization** | CRITICAL | `/explore` + dashboard route | Yes — remove or reframe |
| **F — AI Replacing Relationship** | HIGH | AIChatWidget on all communities | Yes — clarify positioning |
| **G — Pro-features** | TBD | Not audited | Sprint 3 verification task |
| **H — Anti-Integrations** | CLEAN | 0 hits | Confirmed alignment |

---

## What this means for Sprint 3

The doc-vs-code delta is significant. Sprint 3 cannot just be "build new features" — it must include strategic de-featurization work in at least two critical categories (A and E) plus strategic calls on B and F.

This audit serves as **the input for Sprint 3 planning**. The decisions are NOT made in this document. They will be made in Sprint 3 kickoff after Carlos reviews:

1. Whether to maintain strict Section 5 enforcement (and accept the de-featurization cost)
2. Whether to revise specific subsections of Section 5 in PD V1 (must be explicit, documented in PD V1)
3. The prioritization of de-featurization vs new-feature work
4. The migration path for users who have accumulated points/levels/achievements (data preservation vs reset)

---

## Method notes

**Phase 1 — Visual audit (2026-05-15)**:
Conducted opportunistically during PWA screenshot capture session. Findings derived from screenshots of:
- `/dashboard/c/unytea-2912/members` — Members view
- `/dashboard/sessions/[id]/room` — Live session view
- Community discovery card
- Primary nav sidebar

**Phase 2 — Codebase grep + schema review (2026-05-15)**:
Conducted via `git grep` with case-insensitive patterns across `*.ts`, `*.tsx`, `*.json`, `*.prisma`, and `*.md` files. Full grep coverage of all 8 categories in PD V1 §5. Repo HEAD at audit time: `0a446099`.

---

## Next steps

1. Carlos reviews this audit cold (fresh eyes — recommend morning of 2026-05-16)
2. Sprint 3 kickoff session: decisions per category
3. If any PD V1 §5 subsection is revised, the revision is documented IN PD V1 (not here) with date and rationale
4. Implementation plan for chosen approach captured separately as Sprint 3 plan doc

---

**Document end.**

---

## 2026-05-27 — Cat E revision (post-pivot)

This entry is appended after the document was originally closed. The audit body above is unchanged; what follows is a dated revision of the **Cat E** verdict only.

### What the audit originally said about Cat E

The 2026-05-15 audit (above, "Cat E — Marketplace Cannibalization → CRITICAL VIOLATION") presented three options and recommended decision-making in Sprint 3:

- **A. Remove `/explore` entirely.**
- **B. Keep `/explore` but reframe as marketing showcase.**
- **C. Revise PD V1 §5 Cat E** — flagged at the time as *less likely* because "the rationale ('hosts own their relationship; unytea is not a marketplace') was solid."

Sprint 3 chose **Option A — full removal**, executed in Phase 3.1 (commit `e8d7e2e0`). At the time the choice was internally consistent: PD V1 §2 specified a target user with pre-existing audience, so PD V1 §5 Cat E's cannibalization concern followed logically, and Option A was the strict-alignment path.

### What changed on 2026-05-27

In the 2026-05-27 strategy review, **PD V1 §2 itself was revised**. The primary target user is no longer the established host with 1k–30k audience; it is the *emerging creator with 0–500 followers monetizables or none*. See revised PD V1 §1 and §2 for the new framing.

That change overturns the *premise* of Cat E's original reasoning. The Cat E reasoning was: "discovery cannibalizes hosts who bring their own audience." With no pre-existing audience to cannibalize, discovery is not a threat — it is the entry point. The platform's job for the §2 (revised) persona is to deliver the creator's first 30 members.

Therefore, on 2026-05-27, PD V1 §5 Cat E was revised in place. See PD V1 §5 Cat E "REVISED 2026-05-27" for the new conclusion and the quality bar that gates listings. The original Cat E reasoning is preserved above it in PD V1, dated.

### Audit logic vs. audit premise

The audit's logic (Option A is the strict-alignment path given the doc as it stood on 2026-05-15) was correct then and is correct as a historical artifact. The audit's *premise* — that PD V1 §2 was stable and correct — turned out to be wrong eleven days later. The 2026-05-27 revision corrects the premise; the audit itself remains a faithful record of the doc-vs-code delta at the time it was performed.

In other words: **the audit was right; the document it audited was wrong.**

### This is documented, not a quiet rollback

The Phase 3.1 implementation (commit `e8d7e2e0`) will be reverted under Sprint 3 Phase 3.5 (see `SPRINT_3_PLAN.md`). That revert is **not** a tacit admission that the original audit was flawed and **not** an organic "we changed our mind." It is the downstream consequence of an explicit, dated PD V1 revision:

1. PD V1 §2 was revised first (target user).
2. PD V1 §5 Cat E followed (premise removed).
3. The code revert follows the doc, not the other way around.

Future readers (and future audits) should treat the chain in that order: **doc → audit → code**, in both directions. If §2 ever swings back to "established host," Cat E swings back to anti-feature, and `/explore` goes away again. The mechanism is the same; only the premise moves.

### What did NOT change in this revision

- **Cat A (engagement extraction):** unchanged. The de-feat track stays.
- **Cat B (member-to-member friction):** unchanged.
- **Cat C, D, F, G, H:** unchanged.
- **The audit's verdicts for all other categories:** unchanged.
- **The discovery quality bar:** the four criteria in revised PD V1 §5 Cat E (live session in 7 days; ≥3 active members; description + cover image; ≥14 days old) are *new* gating that did **not** exist in the pre-removal `/explore`. The revert restores discovery as a surface; it does **not** restore the un-gated 2026-05-15-era `/explore`.

### Implementation handoff

Implementation of the revert and the quality-bar gating is tracked in `SPRINT_3_PLAN.md` Phase 3.5. This audit document is not the place for code changes — it records the audit, the original verdict, and now the dated revision.

**End of 2026-05-27 revision entry.**
