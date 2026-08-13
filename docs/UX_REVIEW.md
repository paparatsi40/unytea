# Unytea — Structural UX review of the core journey

Grounded in the code (routes, components, onboarding, empty states). The **visual/aesthetic layer** — glassmorphism contrast and readability, visual hierarchy, density, mobile layout, "does it look premium and trustworthy" — is **not** covered here; that needs screenshots. This covers what makes the product *easy, practical and intuitive*: the flow, the friction, and the state handling.

---

## What's already good (worth keeping)

- **Empty states guide the first action.** The feed's empty state prompts "ask a question / share a win / share a resource / start a discussion"; sessions and comments have thoughtful empty states too. For a launch with zero content, the cold start is handled — this is a real strength.
- **Onboarding is a clean 5-step wizard** with a progress bar, per-step validation, and a "Skip for now" escape.
- **Full community surface**: feed, chat, courses, members, sessions, library, buddy, about, settings.
- **Translations exist at full parity** (1,982 keys × EN/ES/FR). The i18n problem below is "wire it up," not "translate everything."

---

## Tier 1 — highest impact, and launch-relevant

**1. The dashboard and onboarding are English-only, despite full translations existing (PROD-01).**
`app/(dashboard)` and `app/onboarding` sit *outside* the `[locale]` route segment, so they can't resolve the user's locale — and `onboarding/page.tsx` has `useTranslations` literally commented out (line 69) with every string hardcoded in English. A user who signs up in Spanish gets a Spanish landing and signup, then an English wizard and an English app. This is the single most jarring inconsistency in the product. Fix: bring these route trees under `[locale]` (or resolve locale for them) and wire the existing `t()` keys. Structural, but the strings are already there.

**2. No loading states → the app feels slow and broken.**
There is exactly **one** `loading.tsx` in the whole app (explore). The dashboard routes are dynamic (server data), so every navigation shows a blank screen until data arrives — which reads as "slow" or "hung." Add per-segment `loading.tsx` skeletons. Cheap, and it's one of the biggest perceived-speed wins available.

**3. No per-segment error boundaries → one error blanks the whole app.**
Zero `error.tsx` files; the only boundary is the app-wide `global-error.tsx`. Any render error in any route takes down the entire app instead of the failing panel. Add `error.tsx` at the major segments (dashboard, community, session).

---

## Tier 2 — first-run and conversion

**4. Onboarding friction.**
- The **"goals" step is a required free-text essay** — you cannot advance without typing a paragraph. Forcing that mid-signup costs completions; make it optional.
- **Plan selection is step 5 of onboarding**, pushing the "Professional $49 / Most Popular" card, with paid choices routed straight to Stripe checkout. Asking a brand-new user to make a monetization decision inside onboarding is aggressive; consider letting them finish free and deciding to pay when they actually hit the create-a-community wall.
- **Errors are swallowed.** If the save fails, the user is redirected to the dashboard anyway with no message; if checkout fails, they land in the dashboard without the plan they picked. Surface failures.

**5. Inaccurate plan copy.**
The Free plan lists "Direct messaging with members" — but DMs are host↔member only (a member can't message another member). The copy oversells; correct it, the way the README claims were corrected.

---

## Tier 3 — polish (overlaps the hardening tier)

**6. Accessibility** — ~260 `<button>` elements against ~25 `aria-label`s; icon-only buttons are unlabeled for screen readers (PROD-04).
**7. Perceived speed / weight** — 159 client components, a single dynamic import, a 1.77 MB chunk on dashboard routes (PERF-03) — the first load is heavier than it needs to be.

---

## Not yet reviewed (needs a look)

- The **join / paywall gate** experience (`CommunityGateView`) — what a member sees at the moment of joining or hitting a locked community. High-stakes for conversion; I couldn't read it this pass.
- The entire **visual layer** — send screenshots of the dashboard, a community's inside (feed/chat/members), and a session, and I'll do the aesthetic + hierarchy pass.

---

## Recommendation

Start with **Tier 1** as the first UX implementation prompt — i18n wiring for the dashboard + onboarding, plus `loading.tsx`/`error.tsx` across the main segments. It's the highest impact-per-effort, it's launch-relevant, and it's unambiguous from the code (no screenshots needed). Tier 2 is a short follow-up. The visual layer waits on screenshots.
