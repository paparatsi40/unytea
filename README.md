# ☕ Unytea — Where Communities Unite

> **Community with soul.** A live-first community platform for creators: paid or free
> communities with built-in video sessions, courses, real-time chat and a resource library.

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)

---

## Status

**Pre-launch. Not production-ready.** No real users, no real data.

An independent audit (`docs/AUDIT_REPORT.md`, August 2026) put production readiness
at roughly 55%: the feature surface is largely built, but the authorization layer,
test coverage and CI gating are not finished. Remediation is tracked in
`docs/REMEDIATION_PLAN.md`. Do not point real customers at this until the
Critical and High items there are closed.

This file describes **what is actually in the repository**. Claims that could not
be verified against the code have been removed.

---

## Features

### Working

**Communities** — Create branded communities with custom landing pages, a section
builder, categories, and member roles (Owner / Admin / Moderator / Member).
Public discovery via `/explore`. Posts with threaded comments, reactions and pinning.

**Live sessions** — Video and audio sessions powered by LiveKit: scheduling,
recurring series, RSVP, recordings, a collaborative whiteboard (Excalidraw),
live polls and reactions, shared session notes, post-session feedback, and
AI-generated recaps. Public SEO pages per session.

**Courses** — Modules and lessons with progress tracking, quizzes, enrolment,
one-off course purchases, and completion certificates with public verification.

**Chat** — Community channels with real-time messaging, presence and typing
indicators, plus 1:1 direct messages. Real-time transport is **Pusher**.

**Resource library** — Categorised resources with progress tracking and likes.

**Buddy system** — Member matching within a community, with shared goals and
check-ins.

**Auditorium view** — Visual real-time presence for a community's chat.

**Payments** — Stripe: platform subscriptions with plan limits, paid communities,
one-off course purchases, creator payouts via Stripe Connect, and the customer
billing portal. Subscription state is driven by webhooks, not by the client.

**Notifications** — In-app notification centre plus Web Push (PWA).

**Internationalisation** — English, Spanish and French across the marketing site,
auth and community pages, at full key parity. **The `/dashboard` area is
English-only** — it sits outside the `[locale]` segment. See PROD-01 in the audit.

**PWA** — Manifest, service worker, offline route, install prompt.

**Observability** — Sentry on the client, server and edge runtimes.

### Not built

These have appeared in earlier versions of this README and **do not exist** in the
codebase: gamification (points, levels, leaderboards, streaks), achievements and
badges, custom domains, white-labelling, and analytics export / date-range filters.

The analytics dashboard exists but renders hand-built components — there is no
charting library installed.

---

## Tech stack

| Layer        | Actual                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| Framework    | Next.js 16 (App Router), React 19                                                                      |
| Language     | TypeScript 5, `strict`                                                                                 |
| Server logic | **Server Actions + Route Handlers** — all actions go through the `defineAction` seam in `lib/actions/` |
| Database     | PostgreSQL (Neon) via Prisma 5                                                                         |
| Auth         | NextAuth v5 (beta) — credentials, Google, GitHub                                                       |
| Payments     | Stripe + Stripe Connect                                                                                |
| Video        | LiveKit                                                                                                |
| Real-time    | Pusher                                                                                                 |
| Uploads      | UploadThing                                                                                            |
| Email        | Resend                                                                                                 |
| Push         | web-push (VAPID)                                                                                       |
| AI           | OpenAI SDK                                                                                             |
| Styling      | Tailwind CSS + shadcn/ui + Radix                                                                       |
| Animation    | Framer Motion                                                                                          |
| i18n         | next-intl                                                                                              |
| Monitoring   | Sentry                                                                                                 |
| Testing      | Vitest (unit), Playwright (E2E)                                                                        |
| Hosting      | Vercel                                                                                                 |

> There is **no tRPC, no Socket.io, no Zustand, no TipTap and no PostHog** in this
> codebase, despite earlier claims. The API layer is Server Actions; real-time is
> Pusher.

---

## Getting started

### Prerequisites

- Node.js 24.x (see `.nvmrc`), npm ≥ 10
- A PostgreSQL database

### Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run db:push              # or: npm run db:migrate
npm run dev
```

Open <http://localhost:3000>.

`npm install` also installs the git hooks (`core.hooksPath` → `.githooks`), which
block committing a secret-shaped value under a `NEXT_PUBLIC_*` name.

---

## Scripts

```bash
# Development
npm run dev            # dev server
npm run start          # production server

# Quality gates — all four must pass before a PR
npm run type-check     # tsc --noEmit
npm run lint           # eslint
npm run test           # vitest
npm run format:check   # prettier

npm run check:env      # fail on secrets in NEXT_PUBLIC_* vars
npm run test:e2e       # playwright
npm run analyze        # bundle analyzer

# Database
npm run db:generate
npm run db:push
npm run db:migrate
npm run db:studio
```

### ⚠️ `npm run build` touches the database

`build` runs `prisma migrate deploy` before `next build`, against whatever
`DATABASE_URL` is in the environment. **To verify a build locally, run
`npx next build` instead.** Moving migrations out of the build step is tracked as
M9 in the remediation plan.

---

## Architecture notes

### Server Actions go through `defineAction`

Next.js exposes every exported async function in a `"use server"` file as a public
POST endpoint — middleware does not protect them. Every action must therefore be
declared through `lib/actions/define-action.ts`, which applies identity,
authorization, Zod validation and rate limiting in one place:

```ts
export const deletePost = defineAction(
  {
    name: "deletePost",
    auth: "member", // public | user | member | admin
    args: [z.string().min(1).max(64)],
    community: ([postId]) => communityOfPost(postId),
    rateLimit: "create",
  },
  async (ctx, postId) => {
    /* ctx.userId is a string; ctx.member is the caller's row */
  }
);
```

The ESLint rule `unytea/no-bare-server-action` enforces this, so `auth: "public"`
is an explicit, reviewable choice rather than the default. **The migration of
existing actions onto the seam is still in progress** — the rule is currently a
warning and reports the remaining count.

### Privileged work is not a Server Action

Cron pipelines and webhook handlers live in `lib/jobs/` with **no** `"use server"`
directive, so they are reachable only through their `CRON_SECRET`-guarded routes
or a verified webhook signature.

---

## Repository layout

```
app/
  (dashboard)/     authenticated app (outside [locale] — English only)
  [locale]/        public marketing, auth, community and session pages
  actions/         Server Actions (via defineAction)
  api/             route handlers: auth, stripe, cron, webhooks, uploads
components/        UI, grouped by feature
lib/
  actions/         the defineAction seam, resolvers, guards
  jobs/            internal pipelines — never "use server"
  authorization.ts RBAC primitives
locales/           en / es / fr
prisma/            schema + migrations
tests/             vitest unit tests, playwright e2e
docs/              audit report and remediation plan
```

---

## Security

Current posture, honestly stated. Full detail in `docs/AUDIT_REPORT.md`.

**In place**

- Stripe webhook signature verification with idempotency
- `CRON_SECRET` on cron routes, constant-time comparison, fail-closed
- Anti-enumeration on login, signup and password reset; constant-time password compare
- JWT sessions; `httpOnly`, `SameSite=Lax`, `Secure` + `__Secure-` prefix in production
- HSTS (preload), `X-Frame-Options`, `nosniff`, `Referrer-Policy`, and a CSP
- Rate limiting (Upstash Redis, in-memory fallback)
- Zero known dependency advisories (`npm audit --omit=dev`)
- CI guard against secrets in `NEXT_PUBLIC_*` variables
- SQL injection is not a practical risk — Prisma everywhere, no raw string interpolation

**Known gaps — do not launch before these close**

- The `defineAction` migration is incomplete; some actions still lack an authorization check
- The enforced CSP still allows `'unsafe-inline'` / `'unsafe-eval'` in `script-src`
- JSON-LD is injected unescaped on public pages (stored XSS — H4)
- `POST /api/email/send` and `PUT /api/pusher` are under-authorized (H1, H2)
- No authorization test coverage yet; CI does not gate on build, E2E or lint

---

## Contributing

`type-check`, `test`, `lint` and `format:check` must pass. Never run
`npm run build` locally — use `npx next build`. New Server Actions must go through
`defineAction`.

---

## Support

- Email: support@unytea.com

---

Made with 💜 to bring warmth and soul to online communities.
