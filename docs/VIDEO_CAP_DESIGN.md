# Video cap — Step B design

Design record for the enforcement half of the participant-hour cap. Written
before any of it was built, kept here as the reference the implementation is
measured against. Step A (the counter) shipped on 2026-08-17 and is validated
end to end.

Status as of **2026-08-20**: **B1 built** (read, display, warnings — nothing
refuses anyone). **B2 not started** (the gate).

---

## The scale

For Creator and Business:

| Zone    | Range       | What happens                                  |
| ------- | ----------- | --------------------------------------------- |
| Normal  | 0 – 80 %    | Nothing                                       |
| Warn    | 80 – 100 %  | Banner + one email                            |
| Buffer  | 100 – 150 % | Banner + one email. **Sessions still start.** |
| Blocked | > 150 %     | Starting a _new_ session is refused           |

Pro has no last row: the scale keeps going and the excess is measured.

Two emails and a banner fire on the two ticks. Only the last boundary refuses
anything, and it refuses **starting a new session** — never a session already
running.

---

## 1. Reading usage

One read function beside the existing counter, in `lib/usage/video-usage.ts` —
the module that already owns the period and the arithmetic.

| Returns       | From                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------- |
| `plan`        | `community.owner.platformPlan` — the same owner hop `resolveBillingPeriod` already makes |
| `capSeconds`  | `PLAN_LIMITS[plan].videoParticipantHours × 3600`                                         |
| `usedSeconds` | **Σ `exactSeconds`** over the period's accruals — see below                              |
| `percent`     | derived, never stored                                                                    |
| `state`       | `normal \| warn \| over` (`blocked` is B2)                                               |

### Where the cap number lives

**In `PLAN_LIMITS`, as `videoParticipantHours`.** Every other per-tier number is
already there and `getLimitsForPlan()` already resolves it. A separate config
file would be a second place a tier's entitlements live, and that file has a
history in this repo of drifting from the first — the commission rate sat in
three places and all three disagreed.

| Tier     | Cap     | Past the cap                   |
| -------- | ------- | ------------------------------ |
| Start    | 15 h    | Soft to 22.5 h, then blocked   |
| Creator  | 150 h   | Soft to 225 h, then blocked    |
| Business | 500 h   | Soft to 750 h, then blocked    |
| Pro      | 2 000 h | Never blocked; excess measured |

### What is summed, and why not `usedSeconds`

`community_video_usage.usedSeconds` accumulates `appliedSeconds`, which is
`max(exact, approx)`. Since nobody can be connected for longer than the room was
open, `exact ≤ approx` is arithmetic rather than a tendency — so
`applied ≡ approx` in every case except perfect full attendance, and every
participant is counted for the whole session window regardless of when they
actually arrived.

The figure shown to a coach, and the figure the warnings fire on, therefore
derives from **`exactSeconds`**. `usedSeconds` stays untouched as the internal
ledger of `applied`, for the exact-vs-approx comparison that has to happen
before B2.

The link that makes this summable:

```
SessionUsageAccrual.usageId  →  CommunityVideoUsage.id
CommunityVideoUsage           →  @@unique([communityId, periodStart])
```

So the period's accruals are exactly `where: { usageId: <that row's id> }`,
which is an indexed lookup (`@@index([usageId])`). No date-range guesswork, and
no reliance on `accruedAt` — which is when the row was _written_, not when the
session ended, and can land outside the period a late sweep is accruing for.

### The two traps

1. **The read path and the accrual path must resolve the same period.** Both
   call `resolveBillingPeriod()`, which anchors to the owner's Stripe cycle when
   there is one and the calendar month otherwise. If they ever compute different
   anchors, a host sees 60 % on screen and is refused at the door.
2. **`resolveUsageRow()` creates the row.** The read path must not use it — a
   dashboard visit must not open a billing period. Read with `findUnique` and
   treat a missing row as zero.

---

## 2. The gate — B2, not built

**Inside `joinSession`, on the `SCHEDULED → IN_PROGRESS` transition, and nowhere
else.** That transition is the single instant in the product where a session
stops being a plan and starts consuming minutes. It runs on the server, already
holds `ctx.communityId`, and happens once per session.

**Why a live session can never be cut:** the check sits _inside_ the branch that
only runs when `session.status === "SCHEDULED"`. A session already
`IN_PROGRESS` skips it entirely — not because a flag says to skip, but because
the code path is not reached. That covers the host reconnecting after a crash, a
member arriving in the last ten minutes, and a browser refresh mid-session. The
guarantee is structural, which is the only kind worth having when the failure
mode is throwing a coach out of their own workshop.

Points considered and rejected:

| Point                          | Why not                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `createSession`                | Punishes planning. A session scheduled today may start next month, in a period with its own allowance. |
| Token mint in `joinSession`    | Same function, wrong line — it would also refuse people joining a session already running.             |
| LiveKit `room_started` webhook | Fires after the room exists. Too late to refuse, and it is a third party's delivery.                   |
| `defineAction` paywall step    | Wrong grain. That gate is per-community and per-action; this one is per-transition.                    |

Shape: a new `ActionErrorCode` (`USAGE_CAP_REACHED`); Pro returns early rather
than being checked and allowed; whoever triggers the transition is the one
refused, with copy that differs by role. Ship it behind
`VIDEO_CAP_ENFORCEMENT`, defaulting to off — this is the first thing in the
product that can lock a paying customer out of something they are in the middle
of using.

---

## 3. Warnings at 80 and 100

### The banner is a sibling, not an extension

`SubscriptionBannerMount` fetches `/api/user/subscription-state`, and that state
is **user-scoped**. Video usage is **community-scoped**, and Pro allows three
communities per owner — so extending that state union would force a "which
community?" question into an endpoint with no answer to it.

Instead, a `VideoUsageBanner` mounted in
`app/(dashboard)/dashboard/c/[slug]/layout.tsx`, which already has the community
and already decides ownership. Owner sees it; members never do.

> **Built differently, on purpose.** The design assumed a client fetch against a
> new community-scoped route, mirroring `SubscriptionBannerMount`. That mirror
> was only necessary because the _dashboard_ layout is a client component. The
> `c/[slug]` layout is already a server component holding `community.id` and
> `isOwner`, so the banner is server-rendered: no route, no fetch, no
> flash-of-no-banner. Same grain, fewer moving parts.

### The email

`lib/email.ts` exists and is live — Resend, with a `sendEmail()` core and one
exported function per template. The usage warning is the sixth, in the same
shape. Nothing new to stand up.

**Where it fires:** from the accrual, never from a render. Concretely, at the
point `logAccrualOutcome` is already called — which covers all three triggers
(End Session, the `room_finished` webhook, the hourly sweep) through one line
rather than three.

**Claim, then send.** Do not read `warnedAt80`, decide, send, then write it: two
accruals in the same second both read null and both send. Claim the slot with a
conditional write —
`updateMany({ where: { id, warnedAt80: null }, data: { warnedAt80: now } })` —
and send only if it reports one row changed. Once per cycle then holds under
concurrency for the same reason accrual does: the database refuses the second
writer, not a check someone has to remember.

And send **after** the transaction commits, never inside it. An email is a slow
network call, and one sent inside a transaction that then rolls back cannot be
unsent.

A new period opens a new row, so both marks re-arm on their own.

---

## 4. Pro overage — B2

V1 stores nothing: overage is `max(0, usedSeconds − capSeconds)`, derived at
read time. No column, no migration, no Stripe. It is **measured**, not
**billed** — anything with a currency symbol in it is a promise the product does
not yet keep.

Metered billing will need reporting state on `CommunityVideoUsage`
(`reportedSeconds`, a Stripe usage-record id) plus a job that reports the delta
at period end. That is a migration and it belongs to that work. The only thing
B1 must do is not get in its way, and it does not.

---

## 5. Showing a coach their usage

Primary home: the community's own admin area, community-scoped like the data. A
compact second view in `dashboard/settings/billing`, next to the plan, where
someone goes when they are already thinking about limits.

### The unit problem

"Participant-hours" is an infrastructure word. A coach thinks in sessions and
people. The number cannot be hidden — it is what the cap is measured in — but it
can be introduced rather than asserted:

> **38.5 of 150 hours used** · resets 1 September
> One hour with six people in the room counts as six.

That second line does the whole job: it defines the unit in the reader's own
terms, and it quietly explains why the number climbs faster than they expect.
Shown once, near the bar, not in a tooltip nobody opens.

### Details that matter

- **Never round up.** Floor to one decimal. Rounding up can print "150 of 150"
  while the gate still lets them in, and a number that says stop while the door
  is open is worse than no number.
- Mark 80 / 100 on the bar. The buffer is a feature and hiding it makes the
  block look arbitrary when it lands.
- Seconds stay the storage unit throughout; hours are a display concern.
- Strings in en / es / fr with parity, including plural forms.

---

## 6. Scope

| Piece                       | When      | Note                                      |
| --------------------------- | --------- | ----------------------------------------- |
| Caps in `PLAN_LIMITS`       | B1        | Start = 15 h                              |
| Usage read                  | B1        | Sums `exactSeconds`; must not create rows |
| Usage card + bar            | B1        | en / es / fr                              |
| 80 / 100 banner             | B1        | Server-rendered in the community layout   |
| 80 / 100 email              | B1        | Claim-then-send, post-commit              |
| The 150 % gate              | B2        | Behind the env flag                       |
| Pro overage display         | B2        | Derived, no column                        |
| Stripe metered billing      | Follow-up | Migration lives here                      |
| Per-community cap overrides | Follow-up | For the first enterprise conversation     |
| Usage history across cycles | Follow-up | The rows are already there for it         |

**Two prompts, not one.** B1 is the read side and cannot refuse anyone, so it
ships and is watched while real numbers accumulate. B2 is the gate. The split is
not about size — B1 is the larger half. It is that B2 is the only part that can
lock a customer out, and it should be revertible on its own, without taking the
warnings and the usage display down with it.

---

## Risk #1 — the number being enforced over-counts by construction

Step A applies `max(exact, approx)`, and after the webhook fix the
approximation is:

```
approx = attendeeCount × (last leave − first join)
```

Nobody can be connected for longer than the room was open, so `exact ≤ approx`
is always true. `applied ≡ approx` in every case except perfect full attendance,
and **every participant is counted for the entire session window regardless of
when they actually arrived or left**. A community whose members drop in for
twenty minutes of a ninety-minute workshop is charged as though all of them
stayed for all of it.

That was a deliberate choice while nothing depended on the figure: over-counting
is visible, silence is not. It stops being safe the moment the number closes a
door.

**Mitigated in B1** by showing and warning on `exactSeconds` instead. The
decision still outstanding for B2 is what the _gate_ enforces on. Before it
ships: one full cycle comparing `exactSeconds` against `approxSeconds` on the
accrual rows — both columns are already stored for exactly this. If the
participant webhook is delivering, `appliedSeconds` should become `exact`; if it
is not, that has to be fixed before anything is enforced.

### Open decisions

1. **Start tier cap** — resolved 2026-08-20: 15 h.
2. **What the gate enforces on** — open. B1 ships regardless; B2 waits on the
   comparison or ships with the flag off until it exists.
