# Unytea — Unit economics: does the pricing cover server costs?

*Point-in-time analysis, August 2026. Prices are current-but-approximate and the usage model is an estimate — see Caveats. Purpose: determine whether the plans cover infra cost, and where the exposure is.*

## Verdict in three lines

1. The dominant variable cost is **built-in video (LiveKit) — bandwidth above all** — which is the exact cost your main competitor **Skool avoids by not hosting video** (their creators use Zoom). You undercut Skool ($49 vs their $99) while carrying a cost they don't.
2. At **typical** usage the plans cover cost comfortably. The exposure is in the **tail**: nothing in your plans caps video minutes, in-session attendees, session frequency, or recording storage — so one heavy community can cost **10× its subscription**. You meter *members* (only Free caps, at 50); you don't meter the expensive resource.
3. **Free (START) is pure cost, zero revenue** — but bounded (1 community, 50 members, no monetization), so it's a small, capped subsidy, not a runaway.

## The plans (from `lib/plans.ts`), and what they meter

| Plan | Price | Members | Txn fee | Caps on **video / recording / storage** |
|---|---|---|---|---|
| START (free) | $0 | 50 | 8% | **none** |
| Creator | $15 | ∞ | 5% | **none** |
| Business | $49 | ∞ | 2% | **none** |
| Pro | $149 | ∞ | 0% | **none** |

The limits are members, communities, admins, transaction fee, and feature flags (custom domain, white-label, API, paid community/courses). **The cost-driving resource — hosted video and recordings — is uncapped on every tier.** That is the whole story of the exposure.

Note the **transaction fee** (8→5→2→0%): it's a second, usage-correlated revenue stream — a community that monetizes pays you more as it grows. That is well-aligned with cost (more successful communities tend to use more infra) and is your best natural hedge. But Free can't monetize, so free communities pay 0% and cost money.

## Cost drivers (current prices)

- **LiveKit (video) — the swing factor.** Ship tier $50/mo base; overage: **bandwidth $0.12/GB** (downstream), **connection $0.0005/participant-min**, **recording/transcode ~$0.02/min (video)**. Bandwidth dominates.
- **Cloudflare R2 (recording storage):** $0.015/GB-month, **$0 egress**. Cheap and growing.
- **OpenAI (recaps/moderation):** GPT-5.4-mini ~$0.75 / $4.50 per 1M tokens → **cents per recap**. Negligible unless a feature loops it.
- **Stripe:** ~2.9% + $0.30 per charge → ~$1.72 on a $49 subscription.
- **Fixed platform floor (amortized across all customers):** Vercel, Neon (Postgres), Pusher (chat/presence), Resend, Sentry — roughly a few hundred $/month total at small scale, shrinking per-customer as you grow.

## Per-community model (video-dominated)

Assumptions: host-broadcast (webinar) topology, ~1.5 Mbps video → **~0.65 GB per attendee-hour received**.
- Live bandwidth: 0.65 GB × $0.12 ≈ **$0.08 / attendee-hour**
- Connection: 60 min × $0.0005 ≈ **$0.03 / participant-hour**
- ≈ **$0.11 per attendee-hour live**, plus **~$1.20 per hour recorded** (transcode) + trivial storage/AI.

| Community usage / month | Infra cost | vs Business $49 |
|---|---|---|
| **Light** — 2 sessions × 15 attendees × 1h | ~$4 | very profitable |
| **Typical** — 4 × 20 × 1h, recorded | ~$14 | profitable (~$33 margin before fixed share) |
| **Heavy** — 12 × 40 × 1.5h, recorded | ~$100 | **underwater** |
| **Extreme** — daily × 100 × 2h | ~$660 | **10×+ underwater** |

Creator at **$15** is tighter: even a *typical* active community (~$14 infra) roughly eats the whole subscription before the fixed-cost share — Creator only stays healthy on the transaction fee from a community that actually monetizes, or on light video usage.

## The two exposures, and the levers

**1. Uncapped video on flat plans → the tail loses money.** This is the real risk, and it's structural: "unlimited members + built-in video" at a flat price with per-GB cost is exactly where hosted-video SaaS gets squeezed. Levers, least to most invasive:
- Meter the expensive resource: a per-tier allowance of **monthly video-participant-hours** and **recording-storage GB**, with overage billing or a hard cap. Converts unbounded tail risk into a bounded, priced product — invisible to the ~95% of communities at typical usage.
- Or tier by capacity: cap **concurrent attendees per session** and/or **recording retention** by plan; push heavy users to Pro/Enterprise.
- Lean on the transaction fee (already aligned): the communities that cost the most are often the ones earning the most, and you take 2–8% of that.

**2. Free is a subsidy — but a bounded one.** START is 1 community, 50 members, no monetization. Worst case is ~50 attendees × modest sessions ≈ low tens of $/month at $0 revenue. Levers: whether Free gets live video/recording at all, or a low free video-hour cap. (This is the pricing decision behind the earlier finding that a Free user gets their first community free.)

## Against Skool (your competitor)

- **Skool: ~$99/mo flat, no hosted video** (creators run Zoom themselves) → near-zero variable cost, dead-simple economics.
- **You: $49 Business with hosted video** → a materially richer product, a thinner price, and real tail risk Skool doesn't carry.
- The strategic choice is explicit: either **price the video in** (raise tiers, or add the usage guardrails above so heavy users pay for what they burn), or **treat cheap hosted video as a deliberate loss-leader** to pull creators off Skool — funded by the transaction fee on the communities that succeed. Both are viable; drifting into it unpriced is the one that isn't.

## Recommendation

Add a metered allowance on the two resources that actually scale cost — **video-participant-hours** and **recording-storage GB** — per tier, with overage or a cap. It's the single change that turns "unbounded tail risk" into "a product with known margins," and it touches nothing for normal users. Keep Free bounded as it is (the 50-member cap already contains it); consider a small free video-hour cap. And keep leaning on the transaction fee — it's the piece of your model that already scales revenue with cost.

## Caveats

- Prices are Aug-2026 and approximate; Stripe/OpenAI/LiveKit rates move.
- The bandwidth number assumes ~1.5 Mbps and a **webinar (host-broadcast) topology**. A many-to-many call (everyone's camera on) costs **several times** more per attendee-hour — if your sessions are group calls rather than broadcasts, shift every "heavy/extreme" row up.
- Fixed platform costs are amortized platform-wide; the per-community share is small at scale but a real floor when you have few paying customers.
- I have **not** read the actual LiveKit room config (bitrate, simulcast, SFU vs mesh) — reading it would tighten these numbers from "order of magnitude" to "budgetable." Worth a follow-up if you want to set the allowances precisely.

*Sources: LiveKit Cloud pricing; Cloudflare R2 pricing; OpenAI API pricing (GPT-5.4 family); standard Stripe fees. Plan definitions from `lib/plans.ts`.*
