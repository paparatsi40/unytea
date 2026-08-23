# New-user journey — audit punch list

Read-only audit of the path a brand-new user walks: landing → signup → OAuth →
onboarding → first community → first session. Carried out against `main` at
`1b0d8605` on **2026-08-22**.

Everything below was **confirmed by reading the code** unless it says
_"verify manually"_. Nothing here was found by running the product; a real
end-to-end run against production is still owed and would likely add to the
list rather than shorten it.

Severity: 🔴 blocker (stops the user) · 🟠 friction (annoying, survivable) ·
⚪ cosmetic. **[C]** = code · **[E]** = environment/config.

---

## 🔴 Blockers

- [x] **B1 · `/auth/error` did not exist — every OAuth failure 404'd** 🔴 **[C]**
      `lib/auth.ts` declared `pages.error: "/auth/error"` and no such route
      existed. `@auth/core/index.js:169` redirects there on any `AuthError`
      whose kind is `"error"`; the commonest is pressing **Cancel** on Google's
      consent screen (`AccessDenied`). Visitor met Next's bare 404 with no way
      back.
      **Fixed** — `app/auth/error/page.tsx` + `app/[locale]/auth/error`, with
      the `?error=` → message mapping in `lib/auth-error-page.ts`.

- [x] **B2 · The password-reset link from the email 404'd** 🔴 **[C]**
      `app/auth/reset-password/page.tsx` existed but
      `app/[locale]/auth/reset-password` did not. The middleware sends every
      unprefixed `/auth/*` through next-intl with `localePrefix: "always"`, so
      `${SITE_URL}/auth/reset-password?token=…` 307'd to
      `/en/auth/reset-password` and 404'd. Every other auth page had its
      one-line locale re-export; this one was skipped.
      **Fixed** — re-export added. _Verify manually: request a reset and open
      the link from the mail client, not by pasting it (the Referer matters)._

- [x] **B3 · Signing up with an email that already exists was a dead end** 🔴 **[C]**
      `app/api/auth/signup/route.ts:44` returns **201 with a generic message**
      when the email exists (anti-enumeration). The client reads `response.ok`
      as success and immediately calls `signIn("credentials", …)`, which fails
      for any account with a different password — or with no password at all,
      i.e. every Google-created account. The user gets a bare "sign-in error"
      toast on the signup page, is never told an account exists, and there is
      no "forgot password" link on that page.
      Note the anti-enumeration protection is **defeated by the client flow
      anyway**: with a random password, a new email signs in and an existing
      one does not, so an attacker distinguishes them regardless. The UX cost
      is being paid for no security benefit.
      **Fixed** — the route answers **409** with a code naming the method
      (`EMAIL_IN_USE_PASSWORD` / `_GOOGLE` / `_GITHUB` / generic), decided in
      `lib/signup-conflict.ts`. The page shows it in place with links to sign
      in (carrying the address) and to reset, and no longer calls `signIn()`.
      Approach A of the two on the table: the address was already
      discoverable, so hiding it cost the user everything and bought nothing.
      Naming the provider is a deliberate, bounded disclosure — the rate
      limiter still runs first.

- [ ] **B4 · A brand-new GitHub user can never sign up** 🔴 **[C]** — only if
      `GITHUB_CLIENT_ID`/`SECRET` are set.
      In `@auth/core`, the `signIn` callback (`callback/index.js:63`) runs
      **before** `handleLoginOrRegister` (`:70`). Our callback
      (`lib/auth.ts:167`) creates the `User` row with no `Account` row; the
      adapter then finds it via `getUserByEmail` and, without
      `allowDangerousEmailAccountLinking`, throws `OAuthAccountNotLinked`
      (`handle-login.js:250`). Google is fine — it has the flag. GitHub is not.
      **Decide first:** are the GitHub credentials set in Vercel? If not this
      is inert (no credentials → no button, by `lib/auth-providers.ts`).

---

## 🟠 Friction

- [ ] **F1 · `quickStart=1` is read by nobody** 🟠 **[C]**
      `communities/new/page.tsx:226` redirects to
      `…/sessions?quickStart=1` commented as the "first-session activation
      flow". A repo-wide grep finds exactly one occurrence: that line. The
      sessions page reads only `filter`, `pastFilter`, `window`. The moment of
      highest intent is spent on a plain empty hub. (Not a dead end — the empty
      state does carry a "Schedule session" CTA.)

- [ ] **F2 · "Skip" in onboarding saves nothing, and progress is not kept** 🟠 **[C]**
      The skip button does `router.push("/dashboard")` without calling the API:
      `isOnboarded` stays `false`, no bio, no interests. Nothing blocks —
      `requireOnboarded()` (`lib/auth-utils.ts:99`) is **never called** — so
      there is no redirect loop. But the wizard's state lives only in
      `useState`, so abandoning mid-way loses everything.

- [ ] **F3 · Finishing onboarding does not refresh the JWT** 🟠 **[C]**
      `POST /api/user/onboarding` writes `isOnboarded: true`, but the `jwt`
      callback (`lib/auth.ts`) only copies that flag **when `user` is present**,
      i.e. at login. `useCurrentUser()` reads the session, so the token keeps
      saying `false` for up to 30 days. Returning to `/onboarding` shows the
      empty wizard again as if nothing had been done. The hook exposes
      `update`; the page never calls it.

- [ ] **F4 · The wizard does not prefill the name the user already gave** 🟠 **[C]**
      `formData` starts empty. A Google user who just authorised their profile,
      and an email user who just typed their name, must both retype it — and
      step 1 is mandatory. What they type **overwrites** `user.name`.

- [x] **F5 · The sign-in page never read `?error=`** 🟠 **[C]**
      `signin-content.tsx` uses `useSearchParams` only for `callbackUrl`. Every
      `SignInError` routed to `/auth/signin?error=…` — `OAuthAccountNotLinked`
      among them — renders a blank, ordinary login form. The user is never told
      why Google refused.
      **Fixed** — `signInErrorKey` in `lib/auth-error-page.ts` maps the
      sign-in-kind codes to sentences shown in an alert above the form. The
      raw value is never rendered. Password recovery also moved from grey
      type at the foot of the page to beside the password field.

- [ ] **F6 · Signup is capped at 5 attempts per IP per 15 minutes** 🟠 **[C]**
      `rateLimiters.auth` (`lib/rate-limit.ts:172`), keyed `signup:${ip}`, and
      the check runs **before** validation so mistyped-password attempts count.
      Someone who fumbles five times is locked out for 15 minutes; on a shared
      IP (office, conference, mobile CGNAT) the sixth person in 15 minutes
      cannot sign up at all.

- [ ] **F7 · Server error messages are in a fixed language** 🟠 **[C]**
      Plan limit is **hardcoded Spanish** (`"Tu plan START solo permite 1
      comunidad…"`, `app/actions/communities.ts`) and shown raw to English and
      French users. Most others are **hardcoded English**
      (`"Community slug already taken"`, ~20 in `app/actions/sessions.ts`,
      `"Video is not configured."`). `signup-content.tsx:127` has
      `dividerLabel="or sign up with email"` in fixed English — sign-in's
      equivalent is translated.
      **Partly done** — the signup divider is now `auth.signup.orWithEmail`
      in all three locales. The plan-limit Spanish and the ~20 English
      strings in `app/actions/sessions.ts` are still open.

- [ ] **F8 · `alert()` on community-creation failure** 🟠 **[C]**
      `communities/new/page.tsx:248`, in the `catch` — the rest of the file
      uses toasts. For a failed server action it prints Next's generic digest
      message.

- [ ] **F9 · Slug generation degrades badly** 🟠 **[C]**
      ```js
      slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      slug = `${slug}-${Math.floor(Math.random() * 10000)}`;
      ```
      Every community URL ends in a random four-digit suffix, permanently, with
      no way to edit it. A name with no `a-z0-9` (Japanese, Cyrillic, Arabic,
      emoji) collapses to `""` before the suffix → slug `-1234`, leading hyphen
      and all. On the 1-in-10 000 collision the user gets
      `"Community slug already taken"` in English and must resubmit by hand.
      The Zod schema does not validate slug shape at all.

- [ ] **F10 · The room bounces silently when it cannot load** 🟠 **[C]**
      In `sessions/[sessionId]/room/page.tsx`, a throw in `loadSession()` is
      caught, toasted and then falls through with `videoSession === null`, so
      `roomName` is undefined and the component calls
      `router.replace("/dashboard/sessions")` **during render** — a React
      antipattern that can loop. The `!result.success` path (line 54) bounces
      with no message at all, including for "you do not have permission".

---

## ⚪ Cosmetic

- [ ] **C1 · The dashboard onboarding checklist can never complete** ⚪ **[C]**
      `app/actions/onboarding.ts:63` includes `hasBuddy` and
      `hasCompletedLesson`, neither of which happens while creating your own
      community. `showChecklist` only turns off when **all** are done, so it
      sits at 60% for the full 30 days.

- [ ] **C2 · `events.createUser` fires when merely linking** ⚪ **[C]**
      `handle-login.js:262` sits outside the if/else, so `[auth] user_created`
      is logged for OAuth sign-ins that only linked an existing account.

- [ ] **C3 · `welcomeBack` with a nameless account** ⚪ **[C]**
      `t("welcomeBack", { name: data.user.name })` renders empty for an OAuth
      user with no name.

- [ ] **C4 · Full page reload after creating a community** ⚪ **[C]**
      `window.location.href` instead of `router.push`.

---

## ✅ Confirmed working (from code)

- Landing CTAs all point at `/${locale}/auth/signup`, and those routes exist
  (`app/[locale]/auth/signup/page.tsx` re-exports the unprefixed page).
- **There is no email-verification step at all.** No token, no gate; signup logs
  you straight in. So Resend being down does **not** block registration — the
  welcome mail is fire-and-forget with a `.catch`. (The *reset* mail is
  critical; see B2.)
- Dashboard empty state is well handled: `resolveNextStep` promotes "Create
  community" to the hero when the user owns none.
- `createCommunity` is transactional — community + owner `Member` (role OWNER)
  in one `$transaction`.
- `lib/auth-providers.ts`: a provider without credentials does not exist — no
  button, no callback route. Nothing is offered that the server cannot deliver.
- Community logo/cover uploads are optional and wrapped in try/catch + toast, so
  UploadThing being down does not block community creation.
- Onboarding save failures no longer fall through to the dashboard: error shown
  with `role="alert"`, retry on the same button.

---

## ⚙️ Config to verify in Vercel

| Variable | What breaks without it | Note |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | All of OAuth signup | ⚠️ `/[locale]/auth/signin` and `signup` are **prerendered** — the button list is baked at build time. Adding these needs a **redeploy**, not just a save. |
| Google Console redirect URI | The OAuth handshake | Must be the apex: `https://unytea.com/api/auth/callback/google`. `/api/*` is **outside the middleware matcher**, so a `www` URI is never redirected — it just fails. |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | See **B4** | If set, the button appears and no new user can use it. |
| `RESEND_API_KEY` | Password reset (critical); welcome mail (not) | `getResend()` throws when absent — **this** is the variable that stops mail. |
| `EMAIL_FROM` | Nothing, unless the default domain is unverified | **Optional.** `lib/email.ts:20` defaults to `Unytea <noreply@unytea.com>`. Format is RFC 5322: `Display Name <address@domain>`, or a bare address. What actually matters is that the sending domain is **verified in Resend** — an unverified one is refused whatever this says. |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Rate limiting | Falls back to in-memory, which on serverless means per-instance counters — effectively no limit. |
| `UPLOADTHING_TOKEN` | Community logo/cover | ⚠️ **Missing from `.env.example`.** The SDK reads it implicitly. |
| `LIVEKIT_API_KEY` / `_SECRET` / `NEXT_PUBLIC_LIVEKIT_URL` | Joining a session room | Fails cleanly with `"Video is not configured."` (English only). There is a hardcoded fallback URL `wss://unytea-livekit.livekit.cloud` when the URL is unset. |
| `NEXT_PUBLIC_APP_URL`, `AUTH_URL`, `NEXTAUTH_URL` | Email links, cookie host | **Still pending**: all three should be `https://unytea.com`. `SITE_URL` builds the reset link in B2. |
| `PUSHER_*`, `NEXT_PUBLIC_PUSHER_KEY` | Live chat | Outside signup, inside the first-session path. |

---

## Still to verify by hand

1. `/auth/error` renders, and a Google sign-in cancelled at the consent screen
   lands on it rather than a 404.
2. A reset link opened **from the mail client** reaches the form.
3. B3 — sign up with an email that already exists, using a different password.
   What exactly does the toast say?
4. B4 — only if GitHub is configured: sign up with a fresh GitHub account.
5. F3 — finish onboarding, then type `/onboarding`. Wizard again, or dashboard?
6. A full end-to-end run with a real address: signup → onboarding → community →
   session → room. The only way to know LiveKit, UploadThing and Resend are
   actually alive in production.

---

## Changelog

- **2026-08-22** — audit carried out against `main` `1b0d8605`.
- **2026-08-22** — B3 fixed (409 + a named method + a way out), F5 fixed
  (`?error=` read through an allow-list), signup divider localized. Password
  recovery moved next to the password field.
- **2026-08-22** — B1, B2 fixed; root `not-found.tsx` added as a net for any
  future missing route; `pages.verifyRequest` removed (unreachable — it is fed
  only by `@auth/core`'s `sendToken`, which runs for a provider of
  `type: "email"`, and this app registers none).
