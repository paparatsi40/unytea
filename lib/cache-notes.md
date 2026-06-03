# Cache invalidation notes (perf-2, effort #70)

Forward-ready reference for the `unstable_cache` layers added in perf-2 and the
mutations that should invalidate them once the Next 16 cache API stabilizes.

## Cached layers

| Page                                     | Cache wrapper                                              | Tag                 | `revalidate`      | Render type                              |
| ---------------------------------------- | ---------------------------------------------------------- | ------------------- | ----------------- | ---------------------------------------- |
| `/[locale]/s/[slug]` (session replay)    | `getCachedSessionData` in `app/actions/public-sessions.ts` | `session:${slug}`   | 3600s (1h)        | `ƒ` Dynamic (auth-gated recording URL)   |
| `/[locale]/c/[slug]` (community landing) | `getCommunity` in `app/[locale]/c/[slug]/page.tsx`         | `community:${slug}` | 300s (5min)       | `ƒ` Dynamic (auth-gated paywall preview) |
| `/[locale]/blog/[slug]`                  | — (SSG, in-repo content)                                   | —                   | rebuild on deploy | `●` SSG                                  |

Both dynamic pages stay dynamic on purpose — they apply an **auth-dependent gate
per request** (recording URL for community-visibility sessions; owner paywall
preview). Only the heavy DB read is cached; the gate is re-evaluated each request.

## Why no on-demand tag invalidation yet (Next 16 API in transition)

The original plan was to call `revalidateTag(`session:${slug}`)` / `revalidateTag(
`community:${slug}`)` from the mutations below. Next 16 changed the cache API and
this no longer applies cleanly:

- **`revalidateTag(tag, profile)`** now **requires a second `profile` argument**
  (`string | CacheLifeConfig`) — part of the new `"use cache"` / `cacheLife`
  model. The bare `revalidateTag(tag)` is a type error (`Expected 2 arguments`).
- **`updateTag(tag)`** is the new one-arg invalidator but is **server-actions-only**
  ("read-your-own-writes"); the egress webhook is a **route handler**, so it can't
  use it.
- **`revalidatePath(path)`** still works without a profile, BUT: (a) it does not
  reliably invalidate a tag-keyed `unstable_cache` entry on a _dynamic_ page, and
  (b) the route-pattern form `revalidatePath('/[locale]/c/[slug]', 'page')` is
  over-broad (invalidates **every** community page on a single edit), defeating the
  cache. The slug-specific form additionally needs all three locales.

Because of this, perf-2 ships **time-based revalidation only** (1h / 5min). For
near-immutable session replays and infrequently-edited community landings this is
an acceptable staleness window. Adding uncertain-value invalidation calls inside a
performance sweep would be scope creep — see the follow-up below.

> Pre-existing note: some mutations already call `revalidatePath('/c/[slug]')`
> (posts.ts, comments.ts) **without the `[locale]` segment**, so they likely do not
> match the real `/[locale]/c/[slug]` route. Worth fixing alongside the follow-up.

## Mutations to wire when the cache API stabilizes (or in a dedicated PR)

### Session cache — tag `session:${slug}`

The replay page only renders **COMPLETED** sessions with a **READY** recording, so
only these transitions change what it shows:

| Mutation                | File                                                                                      | Effect                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `markRecordingReady`    | `app/actions/session-core.ts` (recording.update → READY + session.update)                 | recording becomes available → replay appears                                                            |
| egress recording status | `app/actions/webhooks.ts` (`handleEgressUpdated` / `handleEgressEnded`, recording.update) | **production** recording-ready trigger (route handler → needs `revalidateTag`+profile, not `updateTag`) |
| `updateSessionNotes`    | `app/actions/sessionNotes.ts`                                                             | notes rendered on the replay                                                                            |
| session delete          | `app/actions/sessions.ts` (delete / deleteMany)                                           | page should 404                                                                                         |

Note: `editSession` (sessions.ts) only edits `SCHEDULED`/`CANCELLED` sessions, so it
does **not** affect the COMPLETED-replay page — no invalidation needed.

### Community cache — tag `community:${slug}`

| Mutation                 | File                                                                | Effect                                       |
| ------------------------ | ------------------------------------------------------------------- | -------------------------------------------- |
| `updateCommunity`        | `app/actions/communities.ts`                                        | name / description / imageUrl                |
| theme/settings updates   | `app/actions/communities.ts` (L269, L333)                           | colors / paywall / visibility                |
| `updateCommunityTheme`   | `app/actions/community-builder.ts`                                  | primary/secondary colors                     |
| `updateCommunityLayout`  | `app/actions/community-builder.ts`                                  | landingLayout (the rendered sections)        |
| section CRUD             | `app/actions/community-builder.ts` (create/update/delete + reorder) | landing sections                             |
| `resetLandingLayout`     | `app/actions/community-landing.ts`                                  | already calls `revalidatePath(`/c/${slug}`)` |
| create/update/deletePost | `app/actions/posts.ts`                                              | only the `_count` shown in the Stats section |
| community delete         | `app/actions/communities.ts`                                        | page should 404                              |

## Follow-up scope

A dedicated "cache invalidation modernization" PR should:

1. Decide the Next 16 mechanism: `"use cache"` directive + `cacheTag`/`cacheLife`,
   or `revalidateTag(tag, profile)` / `updateTag(tag)` against the existing
   `unstable_cache` tags.
2. Wire the mutations above (server actions via `updateTag`; the egress webhook via
   `revalidateTag` + profile).
3. Fix the `revalidatePath('/c/[slug]')` calls that omit the `[locale]` segment.
4. Re-evaluate ISR for `/s/[slug]` (Opción 2: client island for the gated recording
   URL) if Vercel Speed Insights shows the dynamic render is a real TTFB problem.

The tags are already in place (`session:${slug}`, `community:${slug}`), so the wiring
is additive.

## Fix #72 — broken revalidatePath calls (resolved)

The audit flagged broken `revalidatePath` calls. Discovery found 3 classes (16 sites),
all fixed:

1. **Class 1** (9 sites) — `/c/[slug]` missing the `[locale]` segment **and** the
   `'page'` type. Without `'page'`, `revalidatePath` treats `[slug]` as a literal path,
   so it matched nothing even after adding the locale. Fixed via the new
   `lib/cache-invalidation.ts` helper `revalidateLocalizedPath(path, type?)` (invalidates
   all 3 locales). Files: `comments.ts`, `posts.ts`, `reactions.ts`, `community-landing.ts`.
2. **Class 2** (3 sites) — missing the `/dashboard` prefix (the routes are dashboard, not
   public/localized). Fixed to `/dashboard/c/[slug]/...` + `'page'`. Files: `channels.ts`,
   `members.ts`.
3. **Class 3** (4 sites) — invalid `*` wildcard syntax. Fixed to `[slug]` + `'page'`.
   File: `buddy.ts`.

**Caveat preserved:** this fixes the path/intent (the calls are no longer silent no-ops
and now give Next a real route to invalidate), but full freshness on `/c/[slug]` (a
dynamic + tag-keyed page) still depends on the tag-invalidation activation described
above, pending the Next 16 cache API. `revalidatePath` does meaningfully invalidate the
Data Cache of static/SSG routes it targets.
