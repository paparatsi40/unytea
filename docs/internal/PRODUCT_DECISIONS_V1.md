# PRODUCT_DECISIONS_V1.md

**Status**: Living document, version 1. Created 2026-05-15. Revised 2026-05-27 (emerging-creator pivot). Canonical source of truth for product decisions before Sprint 3+ implementation.

This document encodes the strategic decisions that unblock Sprint 3+ product work. It serves as the anchor that prevents future feature work from drifting away from unytea's core thesis.

---

## How to use this document

1. Before building any feature → check Sections 1, 2, 3, 5
2. Before discussing pricing or business model → check **Section 6** (canonical). Section 4 is preserved but superseded.
3. Before writing marketing copy or landing-page hero → check Section 7
4. Before planning growth experiments or geo expansion → check Section 8
5. Before agreeing to any ad placement, sponsorship, or "featured" slot → check Section 9
6. Before measuring success → check Section 10
7. Before activating autopilot or adding any automation → check Section 11

If a proposed feature conflicts with this document, the document wins unless the document is explicitly revised first.

---

## Section 1 — Canonical Identity

> **REVISED 2026-05-27.** The original §1 framed unytea as a platform for "creadores con audiencia propia." That framing implicitly assumed the host arrives with an audience already attached, which then drove the §5 Cat E decision to remove cross-community discovery. With §2 revised to "creador emergente sin audiencia," §1 has to follow: discovery is now a primary job of the platform, not an optional surface. The canonical sentence below reflects that shift. The original §1 wording is preserved at the end of this section for traceability.

### The canonical sentence

> unytea es la plataforma de lanzamiento e infraestructura para creadores emergentes que están construyendo un negocio de educación online: en su primera etapa, ayuda al creador a encontrar sus primeros miembros mediante una superficie de descubrimiento curada; en su etapa de tracción, sostiene la operación recurrente —sesiones en vivo, biblioteca, comunidad, cobros, dominio propio— para que ese negocio crezca con relación real, no con una máquina de engagement vacío. Los hosts con audiencia preexistente pueden migrar en cualquier momento, pero no son el usuario para el cual optimizamos.

### Anatomy

- **Category**: "plataforma de lanzamiento e infraestructura" — dual role. Not a marketplace, not a pure infrastructure tool. Discovery surface + business OS for the same creator across two stages.
- **User**: emerging creator (see §2). Treat established hosts as a secondary, future segment — they can migrate, but we do not design around them.
- **Stage (a) — Launchpad**: the creator's first 30 paid members come _through unytea's discovery surface_, not from a pre-existing follower base. This is the structural reason §5 Cat E's removal premise has been overturned.
- **Stage (b) — Infrastructure**: once tracción exists, unytea is the recurring business OS — live sessions, library, monetization, custom domain (on paid tiers), branding.
- **Outcome unchanged**: a recurring business based on real relationship, NOT "máquina de engagement vacío." The anti-Skool stance carries forward; the change is _who_ we serve, not _how_ we serve them.

### Key implications

- Live sessions remain the **unit of value**.
- Library remains the **memory layer**.
- Courses remain the **optional supplement**.
- Recordings preserve live; they don't replace it.
- Anti-Skool positioning is intact (live-first vs forum-first) — but the competitive comparison shifts: Skool's Hobby tier ($9/mo + 10% rev share) overlaps the emerging-creator segment, so the differentiator now reads as "live-first + Spanish-LATAM-native + transparent fees," not "premium infrastructure for established hosts."
- Discovery is no longer optional. The /explore surface is the entry point for the primary persona, gated by quality bars (see §5 Cat E revised).
- The "alma" claim still has structural foundation: live = real-time human presence, which cannot be faked.

### Original §1 (preserved for traceability — superseded 2026-05-27)

> unytea es una comunidad de membresía live-first para creadores con audiencia propia: convierte cada sesión en vivo en conocimiento accesible y pertenencia que perdura para sus miembros — los que estuvieron en vivo y los que llegan después por la biblioteca — para que esos creadores puedan construir un negocio recurrente basado en relación real, no en una máquina de engagement vacío.

---

## Section 2 — Target User

> **REVISED 2026-05-27.** The original §2 ("Host Independiente, 1k–30k audiencia preexistente") was overturned in a strategy review. The real target is the emerging creator with no monetizable audience. The original persona is preserved at the end of this section for traceability; it now describes a secondary, long-term segment, not the primary user.

### The Primary Persona: "Creador Emergente"

Profesional emergente con conocimiento enseñable. 0–500 followers monetizables o ninguno. Tiene skill, oficio, expertise, o experiencia profesional concreta. Quiere construir un negocio de educación online — no fama. Ejemplos: ingenieros, profesionales de salud, ex-ejecutivos, consultores, profesores particulares, coaches. NO es influencer puro (ya monetiza en redes). NO es host establecido (segmento secundario, futuro). Dispuesto a invertir 5–15 hrs/semana en contenido. Tiempo > dinero en arranque.

### Concrete examples

- Ingeniero senior que quiere enseñar arquitectura de sistemas.
- Nutricionista armando grupo de clientes.
- Ex-CFO con mentorías para founders early-stage.
- Profesor particular profesionalizando su lista de alumnos.
- Coach con expertise vertical (no lifestyle genérico).

### Why this matters for product

- **No audience → discovery is the platform's job.** The creator does not bring their first 30 members; unytea does, via the /explore surface (§5 Cat E revised) and SEO-friendly community landings (§5 Cat G).
- **Time-rich, capital-poor.** Willing to invest 5–15 hrs/week. Pricing must reflect that the host is paying with time before paying with money — hence the §6 trial design (extensible to 28 days if <10 members) and the low entry tier ($15/mo Creator).
- **Expertise, not entertainment.** Knowledge transfer, not lifestyle. This sustains the anti-Skool/anti-engagement-extraction stance in §5 Cat A — engagement metrics misread quiet expertise communities as "low quality."
- **Business-owner mindset, not hobbyist.** The host is starting a business, not a passion project. Marketing positioning (§7) frames the host accordingly.

### Secondary segment (not optimized for): "Host Establecido"

Hosts with 1k–30k pre-existing reachable audience (the original §2 persona). They can migrate to unytea at any time and will benefit from the same infrastructure — but we do not build _for_ them. Specifically:

- Their needs (custom domain, white-label, advanced analytics) are covered by Business/Pro tiers in §6, not by special workflows.
- They will not see /explore as the primary entry point — they will land on a community URL directly. That is fine; discovery is opt-in (Cat E revised).
- Decisions never trade off "emerging creator activation" against "established host comfort." If a feature only matters to established hosts, it goes to a later sprint.

### Marketing copy

Replaces the old "Tu espacio propio fuera del algoritmo" / "Tu salón virtual" pair. See §7 for full positioning, including the primary message in Spanish and the rent-vs-platform comparison frame.

### Shared pain points (primary persona)

- Has expertise, no playbook for monetizing it.
- Building an audience from zero on social is slow, algorithm-dependent, and orthogonal to actually teaching.
- Existing tools (Hotmart, Teachable, Stripe + Zoom + WhatsApp duct-tape) assume the creator has demand; they do not generate it.
- Charging is friction (manual transfers, awkward pricing conversations).
- Material scattered across Drive/email/YouTube — no clear "home" for prospective members to land on.
- No external validation that what they teach is "good enough to charge for" — the platform's quality signals (curated /explore, peer creators) double as confidence builders.

### Original §2 (preserved for traceability — superseded 2026-05-27)

The "Host Independiente" persona below was the canonical target through 2026-05-27. It is now the secondary segment described above.

#### The Unified Persona: "Host Independiente"

Someone who has been a reference for "their people" — students, trainees, consultees, attendees. Those people can come from IG/YouTube (online frame) or studio/practice/word-of-mouth (offline frame). **Same product, two entry doors.**

#### The 6 Dimensions

| Dimension               | Spec                                                                                                                                                                                                                                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Market**              | Spanish-speaking LATAM (México, Colombia, Argentina, Chile, Perú). España secondary.                                                                                                                                                                                                                                 |
| **"Their people" size** | 1k–30k reachable (combined online followers + offline clients + mailing list). Floor: enough to sustain 20–300 paid members at $10–50/mo.                                                                                                                                                                            |
| **Niche / vertical**    | Knowledge transfer + practice ownership: educators of skills, coaches (life/business/wellness), wellness practitioners, expert advisors, artist-teachers. NOT pure entertainment, lifestyle, or brand influencers.                                                                                                   |
| **Origin mix**          | Daniela side: IG/YouTube primary, fragmented in Hotmart + Patreon + WhatsApp. Marco side: established physical practice, fragmented in Calendly + Stripe + WhatsApp + Zoom + rent. Same product solves both.                                                                                                         |
| **Monetization stage**  | Already monetizing somehow (loose courses, 1:1 calls, ad-hoc memberships, in-person clients). NOT for someone pre-monetization still exploring.                                                                                                                                                                      |
| **Psychographics**      | Believes relationship is the asset, not reach. Prefers 30 committed members over 3000 cold followers. Wants to be teacher/guide, not influencer. Tired of overhead (algorithmic OR physical). Willing to pay to reduce operational friction. "Alma" / "intentionality" / "own space" are real values, not marketing. |

#### Original marketing copy by frame

**Creator-economy frame** (was primary):

> "Tu espacio propio fuera del algoritmo."

**Physical-replacement frame** (was alternative):

> "Tu salón virtual. Tu taller. Tu estudio. Tu gym. Tú eliges cómo llamarlo. Sin renta. Sin servicios. Sin empleados auxiliares."

#### Original shared pain points

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
- Capacity per tier: 100 / 300 / 1000 participants per live session (Creator / Business / Pro)
- Configurable pre-live notifications
- Shareable joining link
- Interactive whiteboard (Excalidraw) — unique differentiator

> **RESOLVED 2026-05-28:** Participant caps re-modeled against LiveKit cost
> (~$0.015/min per participant) and new Creator/Business/Pro economics (§6).
> Per-tier caps below are now Carlos-approved (2026-05-28).
>
> **Cap model (industry-standard Zoom tier alignment):**
>
> - Creator tier: 100 concurrent participants per live session
> - Business tier: 300 concurrent participants per live session
> - Pro tier: 1000 concurrent participants per live session
>
> **Margin model assumes typical usage (not saturation):**
> Average attendance of 20–30% of community size, 60-min session length, 4
> sessions/month. Under those assumptions, Creator tier margin stays positive
> (Unytea revenue from $15 platform fee + 8% commission on member subscriptions
> exceeds LiveKit + Stripe + infra cost). If a host approaches saturation of
> their tier cap, the expected behavior is tier upgrade (Business → Pro), not
> continued operation at margin-negative scale.
>
> **Out of scope for v1:** dynamic overage charging when host hits cap. v1
> enforces caps as hard limits — session refuses additional join attempts past
> the cap. UX work for graceful upgrade prompt deferred to follow-up.

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

|               | Creator   | Business    | Pro       |
| ------------- | --------- | ----------- | --------- |
| Calendar sync | ✓         | ✓           | ✓         |
| Webhooks      | 3 limited | 20 standard | Unlimited |
| API access    | ✗         | ✗           | ✓ (full)  |
| Zapier/Make   | ✗         | ✓           | ✓         |
| Embed widget  | ✗         | ✓           | ✓         |

---

## Section 4 — Revenue Model

> **REVISED 2026-05-27 — SUPERSEDED BY §6.** The Founder/Practice/Studio tiering at $99/$199/$399/mo documented below was sized for the original §2 persona (established host with audience). With the pivot to the emerging creator (§2 revised), the entry price has been brought down and the tier names changed: see §6 "Pricing & Monetization" for the canonical pricing. The body of §4 is preserved below for traceability and to document the reasoning that was in force from 2026-05-15 to 2026-05-27. **New work follows §6.** When §4 and §6 disagree, §6 wins.

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

| Add-on           | Founder | Practice | Studio                  |
| ---------------- | ------- | -------- | ----------------------- |
| +5 live hrs      | $30     | $60      | $80                     |
| +50 paid members | $5      | $10      | N/A (already unlimited) |
| +50 GB storage   | $5      | $10      | $15                     |
| +1 admin seat    | $10     | $15      | $20                     |

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

#### Original decision (2026-05-15) — preserved for traceability

- Cross-community discovery feed ("explore other communities")
- Member browsing across communities within unytea
- Public review/rating system between communities
- "Communities like yours" recommendations
- "Trending communities this week" surfaces

**Why** (original reasoning, 2026-05-15): Hosts come to unytea to OWN their relationship. A public marketplace would let unytea (or other communities) steal members. The host's community is THEIR space, not a slot in unytea's marketplace.

This conclusion drove the SECTION_5_AUDIT.md verdict (Option A — full removal) and the Sprint 3 Phase 3.1 implementation: commit `e8d7e2e0` removed `/explore`, `components/explore/*`, the sitemap entry, and internal links.

#### REVISED 2026-05-27

The original premise — that discovery cannibalizes hosts' ownership of audience — assumed hosts brought their own audience (per old §2). With §2 revised to "creador emergente sin audiencia," the cannibalization risk is moot: there is no pre-existing relationship to cannibalize. Discovery becomes the entry point, not a threat.

Risk mitigation for quality (replaces the removal decision):

- Curated quality bar before listing in /explore (see below).
- Creators can opt-OUT of public listing (community-level setting).
- Discovery favors topical match (filtros por especialidad) over generic "trending," to reduce one-creator-eats-another dynamic.

**Quality bar for /explore listing:**

1. At least 1 live session scheduled in the next 7 days.
2. At least 3 active members.
3. Description + cover image set.
4. Community is ≥14 days old.

(These four criteria are normative — they will be implemented as gating logic when Phase 3.5 ships. Do not paraphrase when porting to code.)

The discovery surface re-opens. The de-feat commit `e8d7e2e0` is scheduled to be reverted under Sprint 3 Phase 3.5 (a separate forthcoming change). The other surfaces originally bundled under Cat E remain reviewed individually:

- **Cross-community discovery feed (/explore)** — REOPENED, gated by quality bar above.
- **Member browsing across communities** — STILL ANTI-FEATURE. Members are not browsable across communities. Cat B's member-protection logic is unaffected.
- **Public review/rating system between communities** — STILL ANTI-FEATURE. Discovery quality is upheld via the curated bar above, not via peer ratings, which would replicate Skool/marketplace dynamics.
- **"Communities like yours" recommendations** — DEFERRED, not anti-feature. Acceptable if the recommendation is topical (same specialty filter) rather than algorithmic/behavioral. Not in MVP.
- **"Trending communities this week"** — STILL ANTI-FEATURE in its generic form. Curated "Featured" placements are addressed in §9 (Advertising Roadmap).

### F. AI / Autopilot That Replaces Relationship

(Corresponding pro-autopilot principles in Section 11.)

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
- Custom CSS only on Pro tier (control of presentation)
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
3. Neither → evaluate against Section 3 (features) and Section 11 (autopilot)

---

## Section 6 — Pricing & Monetization

**Status**: Canonical pricing as of 2026-05-27. Supersedes §4. Reviewed in the same strategy session that revised §1, §2, and §5 Cat E.

### Tier structure

|                   | **Creator** | **Business** | **Pro**        |
| ----------------- | ----------- | ------------ | -------------- |
| Plan flat fee     | $15 / mo    | $49 / mo     | $149 / mo      |
| Revenue share     | 8%          | 5%           | 3%             |
| Communities       | 1           | 3            | Unlimited      |
| Paid members      | Unlimited   | Unlimited    | Unlimited      |
| Custom domain     | —           | ✓            | ✓              |
| Branding controls | —           | ✓            | ✓ White-label  |
| Analytics         | Basic       | Advanced     | Advanced + API |
| API access        | —           | —            | ✓              |

The Creator tier is the entry point for the §2 primary persona. Business is for emerging creators who have validated demand and want their own brand surface. Pro is for established hosts (the §2 secondary segment) and small studios with multiple programs.

### Trial (updated 2026-05-28)

14-day free trial. NO credit card required at signup. Stripe Subscription
created with `trial_period_days: 14` and no default payment method.

**At day 14:** subscription transitions to `past_due` state. Webhook
handler toggles the community to `paywall_locked` mode:

- Host can still log in and see their community data
- Members can no longer post, attend live sessions, or interact
- Banner shows "Add payment to reactivate"
- Host can come back any time, add card via Stripe Customer Portal,
  subscription reactivates instantly

**Email reminders:** day 11 + day 13 prompts to add payment before
paywall lock. Day 15 confirmation of paywall state with reactivation CTA.

**Re-trial policy:** a host who lets a community lapse to paywall_locked
and reactivates within 30 days does NOT get a second trial — payment
resumes immediately. A host whose community has been paywall_locked for
30+ days and reactivates can get one additional 7-day trial as goodwill
(one-time, not stackable). This handles the "I tried Unytea, life got
busy, coming back later" scenario without enabling abuse.

**Strategic rationale (decided 2026-05-28):**
Carlos chose this hybrid model over standard SaaS card-upfront after
considering:

- Target persona (§2 emerging creator) is capital-poor, often LATAM-based
  (~40% adult credit-card penetration in LATAM avg). Card-upfront kills
  funnel at the most sensitive moment.
- Pure no-CC + indefinite extension (the original 2026-05-27 policy) is
  operationally complex (custom lifecycle states, not Stripe-native) and
  attracts more freeloaders.
- Hybrid: no-CC at signup (low friction, large funnel) + standard 14-day
  trial (no gimmicks) + paywall lock (data preserved, host can return)
  captures the persona advantage without operational overhead. Expected
  conversion: 15–20% (vs ~30% for CC-upfront and ~10% for no-CC-extension).
- Funnel math: napkin estimate of 300 signups × 20% = 60 paying vs 100
  signups × 30% = 30 paying. Larger funnel wins despite lower conversion.

**Implementation cost:** higher than Stripe-native CC-upfront trial.
Requires custom webhook handling for `customer.subscription.updated` →
community state machine. Estimated +1 commit in Fase C code PR scope.

### Annual billing (added 2026-05-28)

Per Carlos decision 2026-05-28: monthly plans + annual plans with 16%
discount. Annual prices: Creator $150/year (vs $180 monthly), Business
$490/year (vs $588 monthly), Pro $1490/year (vs $1788 monthly). Math =
2 months free (Skool-style "save 16%" framing).

### Stripe fees — pass-through, not absorbed

Stripe processing fees are passed through to the host transparently. Unytea does not absorb them. The host sees, on every transaction:

- What the member paid.
- What Stripe charged (network fee + Stripe %, exactly).
- What unytea charged (the revenue share above).
- Net amount the host receives.

The flat plan fee covers infrastructure; the revenue share covers platform value; Stripe fees are Stripe's. Conflating them would either erode unit economics (if absorbed) or hide them in opaque "platform fees" (anti-alma, against the §5 Cat G transparency principle).

### Revenue streams for unytea

1. **Plan flat fee** (monthly).
2. **Application fees** on host transactions (3–8% by tier).
3. **Add-ons** — out of scope for v1; revisit when ≥30 paid hosts exist (same gate as §11 autopilot).
4. **Advertising / Featured placements** — gated; see §9.

### Anti-coupons (unchanged from old §4)

Only "sabor sano" coupons: % off, fixed amount, expiration, redemption limit. No countdown timers, no "first N only," no fake scarcity. The principle survives the pricing pivot — see §5 Cat C and Cat D.

### Re-evaluation cadence

Pricing re-evaluated **quarterly post-launch** with real cost data per tier and conversion rates between tiers. The same rule applies as in §10: never raise thresholds to inflate numbers; adjust product, not definition.

### Trial — original 2026-05-27 (superseded 2026-05-28)

_Original rationale preserved for historical context. See updated Trial sub-section above for current policy._

- **14 days** on Creator, no credit card required up front.
- **One-click extension to 28 days total** if the creator has not yet reached 10 members at day 14. The button appears in-dashboard on day 14 if the threshold is unmet; no support ticket required.
- Rationale: the emerging-creator persona (§2) is time-rich and capital-poor, and their first 30 members come through the platform's discovery surface — which itself takes time to convert. A rigid 14-day trial would punish exactly the user we are trying to activate.

---

## Section 7 — Marketing Positioning

**Status**: Canonical positioning as of 2026-05-27. Replaces the §2 marketing copy ("Tu espacio propio fuera del algoritmo" / "Tu salón virtual"), which is preserved in §2 history.

### Primary message (Spanish)

> **"Construye tu negocio de educación online."**
>
> Sub-line: **"Tu academia online sin oficina ni desarrollo web."**

This pair is the canonical hero. It frames the host as a _business owner_, not as a hobbyist, an influencer, or a "content creator" in the social-media sense.

### Comparison frame: platform vs renting a physical aula

The mental comp the customer should make is **not** "unytea vs Skool" or "unytea vs Hotmart" — it's **"unytea vs renting a physical classroom."**

Concretely:

- Renting an aula in a mid-tier LATAM city: roughly $300–$1,500/month, plus utilities, insurance, signage, scheduling overhead.
- Building a basic website + payments + scheduling stack: weeks of work or a freelancer's invoice.
- Business tier at $49/mo is a low cost of goods compared to either alternative.
- Pro tier at $149/mo is _still_ cheaper than the physical aula it replaces, while serving members worldwide.

When a prospect hesitates at $49 or $149, the response is not "look how cheap we are vs other SaaS" — it's "what does your current operation cost you in rent, in tools, in the weekend you spent making a Squarespace?"

### Host positioning

The host is a **business owner**, not a hobbyist:

- "Tu academia" not "tu canal."
- "Tus alumnos" not "tu audiencia."
- "Tu negocio recurrente" not "tu side project."
- "Tu metodología" not "tu contenido."

This vocabulary is intentional and should propagate to onboarding, dashboards, and email copy — it shapes how the host sees themselves on the platform, which shapes whether they treat the work seriously.

### Anti-positioning (avoid)

- "Conviértete en influencer" / "monetiza tu audiencia" — wrong frame for §2 persona; they don't have an audience and they don't want to be influencers.
- "Crea tu comunidad apasionada" — pasiones don't pay rent; we sell a business, not a hobby.
- "Como Skool pero…" — we are not Skool-with-better-copy. We are live-first business infrastructure with discovery built in.

### Where this gets used

- Marketing landing pages (`/`, locale-specific homes).
- /explore page header copy.
- Onboarding flow microcopy.
- Outbound: blog, newsletter, partnerships.
- Pitch decks and partner conversations (LATAM-first per §8).

---

## Section 8 — Go-To-Market

**Status**: Canonical as of 2026-05-27.

### Product: global. Marketing budget: LATAM-first.

The product is multi-language (i18n already shipped) and can serve a creator anywhere. **Marketing spend, partnerships, and content concentrate on LATAM first.** This is a budget-allocation decision, not a product-scope decision.

### Why LATAM-first

1. **Purchasing-power-parity arbitrage.** Plan fees in USD ($15 / $49 / $149) are competitive in US/EU terms but feel premium-but-affordable in LATAM. The same fee that's "$15" is "$15 you keep most of" because the cost base (creator's living costs, member-side discretionary spend) is denominated locally.
2. **Less-localized competition.** Skool, Mighty, Circle: English-first, US-payment-first, US-support-first. Their LATAM presence is residual.
3. **Accessible partnerships.** LATAM creator-economy ecosystems (universities, professional associations, Spanish-language YouTubers in the education space) are addressable with smaller teams and smaller budgets than US equivalents.
4. **Local payment processors.** Stripe coverage + local rails (OXXO, PIX, Mercado Pago via Stripe Connect) reduce friction for member payments.

### Priority markets (in order)

1. **México** — largest Spanish-speaking creator economy by absolute size, payment-rails mature.
2. **Colombia** — strong professional/educational creator scene.
3. **Argentina** — high-skill creator density; ARS volatility is real but workable via USD pricing.
4. **Chile, Perú** — secondary, opportunistic.
5. **España** — secondary, share Spanish but very different ARPA economics and a different competitive set.

### What "LATAM-first marketing" looks like in practice

- Hero/landing copy in Spanish (LATAM-neutral, not Spain Spanish).
- Customer support primary language: Spanish, with English fallback.
- Partner outreach prioritizes Spanish-LATAM creators and education orgs.
- Paid acquisition (when it begins) targets MX/CO/AR geos.
- US/EU creators who self-discover and sign up are **welcome and supported** — the product works for them — but we do not actively invest to acquire them in MVP.

### Out of scope for GTM v1

- Translated marketing for non-Spanish/English audiences.
- Local entities / VAT compliance for individual EU countries.
- LATAM country-specific landing pages (one Spanish-LATAM page first; localized variants if metrics justify).

---

## Section 9 — Advertising Roadmap

**Status**: Canonical as of 2026-05-27. **Advertising is NOT MVP.**

### Activation triggers

Advertising and paid placements activate **only when both** thresholds are met:

- **≥ 1,000 active creators** on the platform, AND
- **≥ 50,000 unique monthly visitors** to public surfaces (`/`, `/explore`, community landings).

Until both gates are crossed, no ad placements ship — including "small experiments." This is a hard gate, not a target.

### Acceptable formats (once activated)

1. **"Featured" paid placements in /explore.**
   - Opt-in by other creators (paid by them, not by unytea).
   - Clearly labeled as "Featured" / "Destacado."
   - Subject to the same §5 Cat E quality bar as organic listings — featured ≠ unvetted.
2. **Sponsored blog posts / newsletter.**
   - Editorial review.
   - Clearly labeled as sponsored.
   - No paid coverage of competitors' anti-features (referrals, scarcity) to keep editorial line consistent with §5.
3. **Optional side banners on community public landings.**
   - Creator opt-IN at the community level (default off).
   - Revenue share back to the creator (terms TBD when activated; floor: meaningful share, not a token).
   - Hosted ads only — no third-party tracking pixels (§5 Cat H still applies).

### Hard exclusions (even after activation)

- In-product ads to logged-in members. Members pay for the experience; selling their attention is a §5 Cat A/D violation.
- Pop-ups, interstitials, retargeting pixels.
- Ads inside live sessions or session recordings.
- "Sponsored" community recommendations that aren't visually distinguishable from organic.
- Ad placements purchased by entities that violate §5 (MLM, get-rich-quick, scarcity-driven funnels).

### Why this is gated, not opportunistic

Until ≥1,000 creators and ≥50,000 visitors, ad inventory is too small to attract serious advertisers and too valuable to spend on weak ones. Burning the /explore surface with low-quality placements before the quality bar is in lived practice would undermine §5 Cat E's revised premise (discovery as a value-add for the emerging creator).

---

## Section 10 — Success Metrics

> **RESOLVED 2026-05-28:** Targets re-modeled against new ARPA assumption.
>
> **ARPA model:**
> Expected mix: ~60% Creator ($15/mo), ~30% Business ($49/mo), ~10% Pro
> ($149/mo). Weighted average: ~$38/mo platform fee per host. Plus
> commission revenue on member subscriptions (variable, typically 50–100%
> additional on platform fee for active hosts). Conservative ARPA used for
> targets: $40/mo per paying host.
>
> **Day-90 target:** $5,000 MRR
> Implies ~125 paying hosts active at Day-90. Assumes growth motion driven by
> organic discovery (/explore page restored in Fase B) + emerging-creator
> positioning + Skool comparison content.
>
> **Month-12 target:** $30,000 MRR
> Implies ~750 paying hosts active at Month-12. Roughly 6× Day-90 (sustained
> monthly compounding ~17%/mo net of churn).
>
> **Annual ARPA upside:** the 16% discount on annual plans (2 months free)
> may pull a fraction of cohort to annual billing, which has higher LTV but
> lower MRR (Stripe accounts annual as deferred revenue). Targets above
> assume MRR view of monthly billers only; annual subscribers count toward
> LTV but get amortized into MRR over their term. Revisit at Month-6 with
> real cohort data.
>
> Healthy MRR's definitional criteria (the three boolean tests below) are
> unaffected by the pricing pivot. The **Operating Principles** rule still
> binds — _never raise thresholds to inflate numbers_ — and any change to
> these targets must be a documented decision, not a quiet adjustment.

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

## Section 11 — Autopilot Activation Strategy

### Anchor Principle

> **Autopilot no existe para aumentar actividad. Existe para devolverle tiempo al host sin degradar su voz, su criterio ni la calidad de la comunidad.**

Everything that follows derives from this. (Note: this section was §7 prior to 2026-05-27. References to "Section 7 — Autopilot" elsewhere in the doc have been updated to §11; if you find a stale reference, treat it as a doc bug, not a rename.)

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

| Job                 | DOES                                                             | DOES NOT                                                                                                           |
| ------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **auto_capture**    | Recording start/stop, transcription, library indexing            | Modify A/V with AI, generate "highlight reels", tag members as engaged/disengaged                                  |
| **auto_queue_next** | Recurring schedule, calendar invites with factual info           | Suggest frequency increases for "engagement boost", "we missed you" guilt-pings                                    |
| **auto_promote**    | Pre-session reminders with host's templates, configurable timing | AI-generated copy posing as host, FOMO/scarcity, forced personalization                                            |
| **auto_distribute** | Post-live: "X is in your library" + transcript link              | "X members already watched" manipulation, urgency artifice, re-mailing non-openers                                 |
| **auto_engage**     | Deliver prep content the host configured                         | Generate new content posing as host, AI-personalized fake intimacy, "set it and forget it" without host visibility |

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
- _No hardcoded targets — track from day 1, calibrate with data_

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

This document is **versioned**. v1 was locked 2026-05-15; revised 2026-05-27 (emerging-creator pivot — §1, §2, §5 Cat E, new §6–§9, §10 targets flagged for revisit). Future minor edits keep the v1 label; the next material framing change starts v2.

- **Major revisions** (changes to Sections 1, 2, 5, 6, 7, 8, 9) require explicit deliberation and full rewrite of dependent sections. The 2026-05-27 revision (§1 thesis, §2 persona, §5 Cat E, new §6–§9) is the canonical worked example of this.
- **Minor revisions** (target adjustments in Section 10, new metrics, pricing tweaks within §6 cadence) can be patched incrementally.
- **Anti-features** (Section 5) can only be removed by explicit policy decision, documented in this file. The §5 Cat E re-opening is itself the worked example: original reasoning preserved, revision below it, dated.

When a future Claude (or human collaborator) is asked to make decisions that would conflict with this document, the response is: _the document wins unless the document is revised first._

---

**End of v1 document.**
