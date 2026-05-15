# PRODUCT_DECISIONS_V1.md

**Status**: Living document, version 1. Created 2026-05-15. Canonical source of truth for product decisions before Sprint 3+ implementation.

This document encodes the strategic decisions that unblock Sprint 3+ product work. It serves as the anchor that prevents future feature work from drifting away from unytea's core thesis.

---

## How to use this document

1. Before building any feature → check Sections 1, 2, 3, 5
2. Before discussing pricing or business model → check Section 4
3. Before measuring success → check Section 6
4. Before activating autopilot or adding any automation → check Section 7

If a proposed feature conflicts with this document, the document wins unless the document is explicitly revised first.

---

## Section 1 — Canonical Identity

### The canonical sentence

> unytea es una comunidad de membresía live-first para creadores con audiencia propia: convierte cada sesión en vivo en conocimiento accesible y pertenencia que perdura para sus miembros — los que estuvieron en vivo y los que llegan después por la biblioteca — para que esos creadores puedan construir un negocio recurrente basado en relación real, no en una máquina de engagement vacío.

### Anatomy

- **Category**: "comunidad de membresía live-first" — existing category (Circle, Mighty) + unique modifier (live-first as architectural choice, not a feature)
- **User**: "creadores con audiencia propia" — includes online creators (Instagram/YouTube origin) and offline practitioners (with established clients/students/patients)
- **Action**: transforms live sessions into knowledge + belonging that persists, for both attendees and library viewers
- **Outcome**: recurring business based on real relationship, NOT "máquina de engagement vacío"

### Key implications

- Live sessions are the **unit of value**.
- Library is the **memory layer**.
- Courses are the **optional supplement**.
- Recordings preserve live; they don't replace it.
- Anti-Skool positioning: unytea is NOT "Skool with nicer copy" — structurally different (live-first vs forum-first).
- The "alma" claim has structural foundation: live = real-time human presence, which cannot be faked.

---

## Section 2 — Target User

### The Unified Persona: "Host Independiente"

Someone who has been a reference for "their people" — students, trainees, consultees, attendees. Those people can come from IG/YouTube (online frame) or studio/practice/word-of-mouth (offline frame). **Same product, two entry doors.**

### The 6 Dimensions

| Dimension | Spec |
|-----------|------|
| **Market** | Spanish-speaking LATAM (México, Colombia, Argentina, Chile, Perú). España secondary. |
| **"Their people" size** | 1k–30k reachable (combined online followers + offline clients + mailing list). Floor: enough to sustain 20–300 paid members at $10–50/mo. |
| **Niche / vertical** | Knowledge transfer + practice ownership: educators of skills, coaches (life/business/wellness), wellness practitioners, expert advisors, artist-teachers. NOT pure entertainment, lifestyle, or brand influencers. |
| **Origin mix** | Daniela side: IG/YouTube primary, fragmented in Hotmart + Patreon + WhatsApp. Marco side: established physical practice, fragmented in Calendly + Stripe + WhatsApp + Zoom + rent. Same product solves both. |
| **Monetization stage** | Already monetizing somehow (loose courses, 1:1 calls, ad-hoc memberships, in-person clients). NOT for someone pre-monetization still exploring. |
| **Psychographics** | Believes relationship is the asset, not reach. Prefers 30 committed members over 3000 cold followers. Wants to be teacher/guide, not influencer. Tired of overhead (algorithmic OR physical). Willing to pay to reduce operational friction. "Alma" / "intentionality" / "own space" are real values, not marketing. |

### Marketing copy by frame

Same persona, two entry points (same landing page can present both):

**Creator-economy frame** (primary):
> "Tu espacio propio fuera del algoritmo."

**Physical-replacement frame** (alternative / below-the-fold):
> "Tu salón virtual. Tu taller. Tu estudio. Tu gym. Tú eliges cómo llamarlo. Sin renta. Sin servicios. Sin empleados auxiliares."

### Shared pain points (both sub-types)

- Time lost on logistics that isn't teaching/practicing
- People scattered across 3+ platforms — no clear "home"
- Online: dependent on algorithm for reach
- Offline: paying overhead (rent, services, staff)
- Don't know who's genuinely engaged vs who only "watches stories"
- Live attendees who can't make it "lose" the session entirely
- Material library scattered (Drive, email, YouTube) — not organized
- Charging is friction (manual PayPal, transfers, awkward thank-you messages)

---

## Section 3 — v1 Features (MLP)

**MLP = Minimum Lovable Product**, not Minimum Viable Product. Features needed for users to genuinely love unytea, not just minimum-viable-launch.

### Layer 1 — Live Experience (CORE)

**IN v1:**
- Schedule live sessions (one-off + recurring weekly/monthly)
- LiveKit video/audio rooms, multi-participant
- Live chat during sessions
- Automatic recording
- Capacity per tier (50 / 150 / 300 max participants)
- Configurable pre-live notifications
- Shareable joining link
- Interactive whiteboard (Excalidraw) — unique differentiator

**OUT v1:**
- Polls in-session
- Breakout rooms
- Automatic captions / transcription → v1.5+

### Layer 2 — Community

**IN v1:**
- Long-form posts feed (no chat)
- Host posts + member posts (per-community configurable)
- Comments on posts (replies, no nested threads)
- Basic member profiles (name, bio, avatar)
- Member directory
- Host → Member DMs (private 1:1)

**OUT v1:**
- Member → Member DMs (anti-feature, see Section 5)
- Channels / sub-spaces (one community = one feed)
- Reactions / emoji on posts
- Complex @mention notifications
- Nested threads

### Layer 3 — Library + Courses

**IN v1:**
- Searchable session recordings (by title)
- Host upload of docs + videos
- Folder/category organization (minimal)
- Member-only gating (membership/course)
- Resume playback
- Mobile-friendly playback
- Structured courses: sequential lessons, modules, progress tracking (% complete), drip content (optional), "mark as complete" affordance
- Reflection prompts at lesson end (text field, response goes to community feed)
- Discussion seeds (lessons can open community thread automatically)

**OUT v1:**
- Formal graded quizzes → v1.5+ if hosts demand with real data
- Completion certificates → v1.5+
- Full-text transcript search

### Layer 4 — Monetization

**IN v1:**
- Tiered membership per community: free tier + 1–2 paid tiers
- Monthly + Annual plans (~20% annual discount)
- Stripe Checkout for subscriptions
- Self-serve cancellation
- One-off course purchases (separate from membership)
- Sane coupons: % off / fixed amount, scope, redemption limit, expiration
- Manual refunds (host-managed initially)
- Basic revenue dashboard (MRR, churn, member count)
- Embedded Stripe Customer Portal for self-service

**OUT v1:**
- Scarcity coupons (countdowns, "first N only")
- Affiliate programs (anti-feature)
- Multi-currency (USD-only or host's local currency initially)
- Complex tax handling (host responsible)
- Pay-per-session (anti-feature — fragments membership concept)
- Microtransactions (tips, super-chats)

### Layer 5 — Integrations (Tier 1+2)

**Tier 1 — In v1:**
- Stripe Connect Express (done)
- Google Calendar / iCal sync for live sessions
- Outbound webhooks (host configures their own automations)
- Transactional email service (Resend or similar)

**Tier 2 — v1.5:**
- Zapier / Make / n8n connector (universal multiplier — leverages host's existing tools)
- Mailchimp / ConvertKit / Beehiiv export for newsletter sync
- Embed widget for external sites

**Tier 3 — v2+:**
- YouTube cross-post (with "your canonical home is unytea" disclaimer)
- Notion content sync
- Custom OAuth providers

**Tier-gating by plan:**

| | Founder | Practice | Studio |
|---|---|---|---|
| Calendar sync | ✓ | ✓ | ✓ |
| Webhooks | 3 limited | 20 standard | Unlimited |
| API access | ✗ | ✗ | ✓ (full) |
| Zapier/Make | ✗ | ✓ | ✓ |
| Embed widget | ✗ | ✓ | ✓ |

---

## Section 4 — Revenue Model

### Plan Structure

```
              FOUNDER          PRACTICE          STUDIO
              $99/mes          $199/mes          $399/mes
                               (Recommended)

Communities   1                1                 Up to 3
Paid members  Up to 100        Up to 500         Unlimited
Live hrs      6                12                20
Max ppl/ses   50               150               300
Storage       50 GB            250 GB            1 TB
Admin seats   1                3                 5
Branding      Subdomain        Custom domain     White-label
Tx fee        5%               3%                1%
```

### Trial

**14 days on Founder tier, no credit card required.** If not upgraded, community is paused (not deleted) until host decides.

Trade-off acknowledged: no-CC trials convert at ~10% vs ~30% for CC-required. This aligns with the "alma" frame (no card before demonstrating value). Conversion target adjusted accordingly (see Section 6).

### Annual Plans

20% discount on all tiers (≈ 2.4 months free).

### Add-ons (modular, monthly recurring, self-serve)

| Add-on | Founder | Practice | Studio |
|---|---|---|---|
| +5 live hrs | $30 | $60 | $80 |
| +50 paid members | $5 | $10 | N/A (already unlimited) |
| +50 GB storage | $5 | $10 | $15 |
| +1 admin seat | $10 | $15 | $20 |

**Tier-gated features** (white-label, API, custom domain, multi-community) remain plan-level — not available as add-ons.

### Payment Architecture

- **Stripe Connect Express** — host is merchant of record
- Stripe splits automatically: host receives membership payment minus Stripe fees, unytea collects application fee
- Host onboarding via Stripe Connect (~10 min one-time, KYC included)
- Tax handling and chargebacks are host's responsibility
- Zero manual settlement by unytea

### Revenue Streams for unytea

1. **Plan flat fee** (monthly/annual)
2. **Application fees** on host transactions (1–5% by tier)
3. **Add-ons** (modular usage extensions)

### Anti-coupons (excluded by design)

Only "sabor sano" coupons: % off, fixed amount, expiration, redemption limit. **No scarcity UX**: no countdown timers, no "limited time only", no "first N only", no fake "almost sold out".

### Re-evaluation Cadence

Pricing re-evaluated **quarterly post-launch** with real cost data per tier and conversion rates between tiers.

---

## Section 5 — Anti-Features

**These features will NEVER be built**, regardless of:
- User requests
- Competitor moves
- Revenue upside arguments
- "Just an experiment" framing
- "Other platforms have it" arguments

### A. Engagement Extraction (Skool DNA)

- Streaks / daily login mechanics
- Public member leaderboards
- Visible badges / gamification
- "Trending posts" engagement algorithm
- Aggressive push notifications (default opt-out, not opt-in)
- Tab notification counts to create FOMO
- "Last active 2m ago" presence pressure

**Why**: These convert members into engagement metrics. They optimize time-on-platform over genuine value. They are literally the "máquina de engagement vacío" from Section 1.

### B. Member-to-Member Abuse Vectors

- Member-to-member DMs (Section 3 decision)
- Public listing of members across communities
- Member contact info export by other members
- Profile harvesting (scrape members from one to recruit elsewhere)
- Member-to-member group chats outside community

**Why**: Known vectors for spam, MLM recruitment (massive problem in LATAM in coaching/wellness niches), harassment, unwanted advances. Especially harmful in women-led wellness/coaching communities.

### C. Viral Growth Hacks

- Referral programs ("bring 3 friends, get 1 month free")
- Member-to-member affiliate marketing
- Member-to-member commission structures
- "Limited time" copy with countdown timers
- "Only first N people" scarcity
- Public-page urgency artifices
- Fake "almost sold out" scarcity

**Why**: Convert members into salespeople. Growth becomes extraction. Direct conflict with "relación real" — you're not relating, you're recruiting.

### D. Predatory Monetization

- Tips / super-chats / pay-to-promote-comments during lives
- Pay-per-session pricing
- Hidden fees / surprise charges
- Auto-renewal without clear 7-day-prior reminder
- Dark patterns in cancellation
- Pay-to-skip-queue mechanics

**Why**: Tips/super-chats create perverse incentives — host favors high-tippers, members compete via money. Pay-per-session fragments the "home" feeling. Dark patterns are anti-alma by definition.

### E. Marketplace Cannibalization

- Cross-community discovery feed ("explore other communities")
- Member browsing across communities within unytea
- Public review/rating system between communities
- "Communities like yours" recommendations
- "Trending communities this week" surfaces

**Why**: Hosts come to unytea to OWN their relationship. A public marketplace would let unytea (or other communities) steal members. The host's community is THEIR space, not a slot in unytea's marketplace.

### F. AI / Autopilot That Replaces Relationship

(Corresponding pro-autopilot principles in Section 7.)

- AI chatbots that respond AS the host
- AI-generated content posted under host's name without approval
- "Engagement quality" scoring of members
- Algorithmic promotion of "most likely to renew" members
- Auto-replies in DMs/posts that pretend to be from the host
- Sentiment analysis used to segment pricing
- Predictive churn modeling visible to host (assumes malice)

**Why**: Autopilot automates **logistics**, not **relationship**. Anything that fakes the host's voice/presence breaks trust.

### G. Pro-features (the inverse — what we EXPLICITLY support)

- Complete export of member data (CSV with emails, dates, metrics)
- Complete content export (downloadable recordings, portable courses)
- Migration tools / API for leaving unytea
- Custom CSS only on Studio tier (control of presentation)
- Host owns their member list, not unytea
- Notifications default opt-OUT for non-critical
- Self-serve cancellation, no "are you sure?" 5 times
- Transparent pricing without asterisks
- SEO-friendly public landing pages (member discovery via Google, not via unytea's marketplace)

**Why**: Trust is built on portability. Lock-in is the opposite of "alma". Hosts must know they can leave — paradoxically, that's what makes them stay.

### H. Anti-Integrations

- Meta/IG/TikTok pixels for member retargeting (anti-alma + privacy concerns)
- WhatsApp Business for mass DM to members (spam vector, same as member-to-member DMs)
- Telegram bot for mass push
- Automatic contact info export to external CRMs without explicit member opt-in

**Why**: Integrations support host ownership of their data. But integrations that turn members into ad targets or CRM rows violate the host-member trust relationship.

### Decision Flow

When a feature request arrives:

1. Falls in Categories A–F or H → **REJECT** (anti-feature)
2. Falls in Category G → **PRIORITIZE** (trust-building)
3. Neither → evaluate against Section 3 (features) and Section 7 (autopilot)

---

## Section 6 — Success Metrics

### North Star: **Healthy MRR**

```
Healthy MRR = MRR de hosts pagos que cumplen TODOS:
  1. Paid continuous >= 90 días
  2. >= 1 ritual de presencia significativo / 30 días
     (v1: live session ejecutada;
      v1.5+ may include other forms of recurring presence)
  3. >= 5 paid members activos
```

A host who fails any criterion: their revenue stays in raw MRR but exits Healthy MRR.

**Why not just MRR**: plain MRR can be inflated by spike-and-churn dynamics. Healthy MRR captures the alma principle without abandoning revenue accountability.

### Targets

- **Day 90 post-launch**: $5k Healthy MRR
- **Month 12 post-launch**: $30k Healthy MRR

### Scorecard

**GROWTH**
- MRR (raw)
- Number of paid hosts
- ARPA per host

**QUALITY**
- Host 90-day survival rate (target ≥ 75%)
- % of MRR that is Healthy MRR (target ≥ 70% by month 6)
- NRR — Net Revenue Retention (target ≥ 110% at 12 months)
- GRR — Gross Revenue Retention (target TBD with data — track from day 1)
- Member retention 30/90d (segmented by vertical)

**ACTIVATION**
- Trial-to-paid (no-CC trial) — target ≥ 10%; reconsider if ≤ 8% at 6 months
- Time-to-first-paid-member (target ≤ 14 days from signup)
- Host activation 7-day (target ≥ 60% ran a live session)

**LOVE / PULL**
- Organic host referral rate (no incentivized)
- PMF score "Very disappointed if couldn't use" — target ≥ 40%
  - **Sample eligibility**: paid ≥ 14 days + ran ≥ 1 live + has ≥ 3 paid members + 3+ logins in last 7 days

**HEALTH (problem signals)**
- Tickets per ACTIVE host-month (yellow > 1, red > 2)
- Stripe payment failure rate (yellow > 5%)
- Stripe dunning recovery rate (yellow < 60%)
- Live session technical failures (yellow > 1%, red > 3%)
- Storage cost vs revenue per host
- CSP violations unique/week (post-Phase 4c)

**ANTI-METRICS (explicitly NOT tracked)**
- DAU
- Time on platform
- Notification open rate
- Post/engagement velocity
- Member-to-member interaction rate
- Cross-community discovery metrics
- Individual member scoring as community value proxy ("vigilancia social")

### Operating Principles

1. **Bias toward hosts, not total users.** Members are inputs to host success, not the primary metric.
2. **Cohort-based, not instant snapshot.** Hosts onboarded month N → track retention/expansion in N+3, N+6.
3. **Never raise thresholds to inflate numbers.** If targets are missed, adjust product, not definition.

---

## Section 7 — Autopilot Activation Strategy

### Anchor Principle

> **Autopilot no existe para aumentar actividad. Existe para devolverle tiempo al host sin degradar su voz, su criterio ni la calidad de la comunidad.**

Everything that follows derives from this.

### Activation Gate

Autopilot does NOT enter external rollout until ALL conditions are met:

- [x] PRODUCT_DECISIONS_V1.md closed (this doc, 2026-05-15)
- [x] Phase 5+ webhook reliability arc closed (commits 5b3fac95 + c30fa4da)
- [x] Phase 4c-pre (csp_violations endpoint) running (commit 85f67231)
- [ ] Phase 4c CSP enforce switched
- [ ] Phase 4d nonces decided
- [ ] ≥ 30 paid active hosts
- [ ] Evidence: 10–15 hosts manually performing the workflows autopilot will automate (without manual pattern, don't automate)

### Opt-in Model

- **Default**: OFF for all hosts
- **Activation**: per-host, per-community, per-job
- **Preview mode**: host sees 7-day simulation before activating any job
- **Off-switch**: available anytime, no loss of historical data

### Phased Rollout

**Advance is by quality gates, NOT calendar time.**

#### Phase A — Safe automation
- Jobs: `auto_capture`, `auto_queue_next`
- Risk: low (pure mechanics, no relational touch)

**Gate A→B** (all must hold for ≥ 30 days):
- Tickets autopilot ≤ 0.2 / active host-month
- Undo/revert rate ≤ 5%
- Zero trust incidents
- Hosts report ≥ 2 hrs/month time savings

#### Phase B — Communication automation
- Jobs: `auto_promote`, `auto_distribute`
- Risk: medium (touches members with host's templates)

**Gate B→C** (same set + greater scrutiny):
- Phase A metrics still green
- Host edit rate < 30% (autopilot tone-accurate)
- Zero significant unwanted-action reports
- Zero AI-generated content posted without explicit approval

#### Phase C — Relational automation
- Jobs: `auto_engage`
- Risk: high (touches pre-session relationship)
- ONLY activatable if host configures explicit prep content
- The most philosophically dangerous job — most prone to crossing from "help host care for community" to "manufacture activity"

### Non-Negotiable Principles

1. No content posted under host's name without explicit approval
2. No simulation of host's voice/spontaneity without permission
3. No artificial urgency (FOMO, scarcity, countdowns)
4. No persecution of inactive members as "cold leads"
5. No individual member scoring ("vigilancia social")
6. Each job EXPLAINS its reasoning ("I propose X because...")
7. All actions logged auditably + reversible
8. Conservative defaults ("send less", not "send more")
9. AI processing content (transcription, library indexing) is OK — logistics, not relationship
10. If member asks, we don't lie: "this was sent automatically; the content was prepared by the host"

### Per-Job Specifications

| Job | DOES | DOES NOT |
|---|---|---|
| **auto_capture** | Recording start/stop, transcription, library indexing | Modify A/V with AI, generate "highlight reels", tag members as engaged/disengaged |
| **auto_queue_next** | Recurring schedule, calendar invites with factual info | Suggest frequency increases for "engagement boost", "we missed you" guilt-pings |
| **auto_promote** | Pre-session reminders with host's templates, configurable timing | AI-generated copy posing as host, FOMO/scarcity, forced personalization |
| **auto_distribute** | Post-live: "X is in your library" + transcript link | "X members already watched" manipulation, urgency artifice, re-mailing non-openers |
| **auto_engage** | Deliver prep content the host configured | Generate new content posing as host, AI-personalized fake intimacy, "set it and forget it" without host visibility |

### Autopilot-Specific Metrics

**ADOPTION**
- % paid hosts with ≥ 1 job active
- % activation per specific job
- Target: ≥ 60% of hosts on Phase A jobs by month 6

**QUALITY / CONTROL** (the most important category)
- Host edit rate before send/action
- Host reject rate (% suggestions discarded)
- Undo/revert rate (% actions reverted)
- Unwanted action reports (host marks "this shouldn't have happened")
- *No hardcoded targets — track from day 1, calibrate with data*

**HEALTH**
- Tickets autopilot per active host-month (target ≤ 0.2)

**LOVE**
- Self-reported time savings (target ≥ 4 hrs/month for hosts with all Phase A jobs active)

**ANTI-METRICS**
- ✗ Engagement uplift attributed to autopilot
- ✗ Frequency of messages sent
- ✗ Email open rates
- ✗ CTR of messages/nudges
- ✗ "% members reactivated" as primary KPI

---

## Maintenance

This document is **versioned**. v1 is locked as of 2026-05-15.

- **Major revisions** (changes to Sections 1, 2, 5) require explicit deliberation and full rewrite of dependent sections.
- **Minor revisions** (target adjustments in Section 6, new metrics) can be patched incrementally.
- **Anti-features** (Section 5) can only be removed by explicit policy decision, documented in this file.

When a future Claude (or human collaborator) is asked to make decisions that would conflict with this document, the response is: *the document wins unless the document is revised first.*

---

**End of v1 document.**
