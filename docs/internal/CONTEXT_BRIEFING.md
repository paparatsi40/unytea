# unytea — Context Briefing for New Claude Sessions

**Status**: living document. Last updated 2026-05-15 after SECTION_5_AUDIT.md discovery (delta between PD V1 §5 and implementation).

If you're a Claude instance picking up unytea work, read this completely before asking the user for context. This document is the source of truth for project state, established patterns, and working agreements.

---

## 0. Critical: do NOT ask for these

- **`.env` or `.env.local` contents** — these contain real production credentials (Stripe secret keys, Neon Postgres URL with auth, OpenAI key, NextAuth secret, etc.). Pasting them to a chat is a security exposure and serves no purpose: nothing you need to know requires the values.
- **If you need to know what env vars are configured**, ask the user to run:
  ```powershell
  Get-Content .env.local | Select-String -Pattern "^[A-Z_]+=" | ForEach-Object {
      if ($_.Line -match "^([A-Z_]+)=") { $matches[1] }
  }
  ```
  This returns only the NAMES, not the values. Safe to share.
- **Production database queries with embedded credentials** — the user accesses Neon via their web SQL editor (`console.neon.tech`), no credentials needed in chat.

---

## 1. Project basics

- **What**: unytea — a Skool.com competitor positioned at $49/mo ("Skool killer con alma"). Mentor-led communities + cohort-based learning + live sessions (LiveKit), with planned autopilot orchestration for engagement.
- **Stack**: Next.js 16.2.6 + React 19.2.6 + Prisma 5.22 + Neon Postgres + Vercel + NextAuth v5 beta + Tailwind + Tiptap WYSIWYG + tRPC 11 + LiveKit + Pusher + Stripe + UploadThing.
- **Repo**: https://github.com/paparatsi40/unytea (public)
- **Working dir**: `C:\unytea` (Windows + PowerShell)
- **Production URL**: https://unytea.com
- **Developer**: Carlos, solo (no team).

---

## 2. Current state

- **main HEAD**: `85f67231` (Phase 4c-pre — CSP violation reporting endpoint + Prisma `CspViolation` model)
- **Production**: stable. `/dashboard/c/[slug]` loading clean. `/dashboard/sessions/[id]/room` whiteboard mounts clean (Phase 5+ Whiteboard CLOSED).
- **Sprint 1**: closed 2026-05-12 — see `docs/internal/SPRINT_1_CLOSURE.md` for full retro.
- **Sprint 2**: in progress.

```
✅ Phase 3a — Audit recon (read-only)
✅ Phase 3b — npm audit safe + next-auth beta.30 → beta.31    1a4d85a6
✅ Phase 3c — Next 14 → 16 + React 18 → 19                    2001abed (merged from feature branch)
✅ Phase 3d — effect@>=3.20.0 override (CVE-2026-32887)       c9b4af71
✅ Phase 3e — Cleanup (next.config, eslint flat, React Compiler→warn)   0fe35241..b7297968
✅ Phase 4a — CSP audit + unpkg.com elimination                65dd8880
✅ Phase 4b — CSP Report-Only deployed                         fc06264b..051ba24f (2026-05-12)
   Hotfix Series Bugs 1-4 ESM/CJS (May 13)                   479abe56..c28f3d68
✅ Phase 5+ Whiteboard ReactCurrentOwner — Excalidraw 0.18.1   c78b883e..11c9f241 (merged May 13)
✅ Phase 5+ LiveKit webhook reliability arc                   5b3fac95..c30fa4da (2026-05-14)
   (P2025 unknown session + P2002 race + 8-value enum drift migration + signature 400→401)
✅ Phase 4c-pre — CSP violation reporting endpoint + csp_violations table   85f67231 (2026-05-15)
✅ Pre-Sprint-3 gate — PRODUCT_DECISIONS_V1.md (ver Section 7)              2026-05-15
⏳ Phase 4c — CSP switch to enforce (espera 3-7 días desde 4c-pre deploy 2026-05-15 con violation data real)
⏳ Phase 4d — Nonces for script-src 'unsafe-inline' removal (sprint propio)
```

**Phase 5+ CRÍTICOs**: **0 active**. Whiteboard regression closed May 13. Remaining Phase 5+ items are non-critical backlog (React Compiler audit, type hygiene, webhook handler audit, env cleanup).

**Discovery crítico de cierre (2026-05-15)**: `docs/internal/SECTION_5_AUDIT.md` ejecutado tras el landing de PRODUCT_DECISIONS_V1.md. La implementación actual contiene ~15 archivos + 4 modelos Prisma con surface de gamification (Cat A: User/Member points+level+streaks, Achievement+UserAchievement models, `/dashboard/c/[slug]/leaderboard`, `/dashboard/achievements`, presence indicators con `isOnline` flag, GamificationWidget, streak UI con 🔥 + copy "keep the streak") plus un `/explore` page con sort default `"trending"` (Cat E: marketplace cannibalization) que **conflictúan directamente con anti-features locked en PD V1 §5 esta tarde**.

Adicional: surface a evaluar estratégicamente en Cat B (DirectMessage system, ya gated por `canUsersDirectMessage`) y Cat F (AIChatWidget renderizado a cada miembro de cada community — positioning ambiguo).

Confirmed clean: Cat C affiliates/referrals, Cat D tips/super-chats/pay-per-session, Cat F sentiment/churn/impersonation, Cat H tracking pixels/WhatsApp/Telegram bots.

**Sprint 3 NO puede ser solo "build features"** — debe incluir de-featurization estratégica en al menos Cat A + Cat E, plus calls explícitos sobre Cat B + Cat F, O bien revisión de PD V1 §5 (la revisión debe documentarse en PD V1 mismo, no en branch code). Decisiones pendientes por categoría documentadas en SECTION_5_AUDIT.md.

Phase 3e note: Step 3 (Zustand migration) was NO-OP — dep declared in `package.json` but **0 imports** in code. `npm uninstall zustand` ejecutado 2026-05-14 (housekeeping post Phase 5). Transitive `zustand@4.5.7` permanece bajo `@excalidraw/excalidraw → tunnel-rat` (no es controlable, no afecta).

**Overrides (final)**: only `"effect": ">=3.20.0"` remains (Phase 3d CVE-2026-32887). Defensive overrides for jsdom chain (html-encoding-sniffer, whatwg-url, jsdom) removed in `c28f3d68` — no longer needed once jsdom is out of the dep tree.

**Sanitization**: `sanitize-html ^2.17.4` (replaced `isomorphic-dompurify` in `c28f3d68`). Pure JS parser, no DOM environment. Eliminates entire jsdom chain.

**Vulnerabilities** (snapshot 2026-05-14, post zustand uninstall): 11 (10 MODERATE, 1 HIGH). 8 HIGH closed during Sprint 2 deps phase. Remaining chains:
- `postcss` <8.5.10 (MODERATE) transitive under `next` — requires Next 17 to clear, no advisory in app code path.
- `nanoid` <5.0.9 (MODERATE) transitive under `@excalidraw/excalidraw@0.18.1` + `@excalidraw/mermaid-to-excalidraw`.
- `lodash-es` <=4.17.23 (HIGH, Prototype Pollution) transitive under `@excalidraw/excalidraw@0.18.1 → @excalidraw/mermaid-to-excalidraw → @mermaid-js/parser → langium → chevrotain → lodash-es`. **New since 0.17.6 → 0.18.1 bump**; surface only reachable if mermaid-to-excalidraw runs on attacker-controlled mermaid source. Backlog: monitor Excalidraw releases for upstream lodash fix.

`npm audit` exact output kept in audit folder for traceability.

---

## 3. Architectural patterns established

When extending the API surface, working on routes, or creating server actions, follow these patterns. They're enforced across the codebase.

### 3.1 Authentication / Authorization

`lib/authorization.ts` defines typed errors and helpers:

| Helper | Returns | Throws |
|--------|---------|--------|
| `requireUserId()` | userId (string) | `UnauthorizedError` if no session |
| `requireAdmin()` | userId (string) | `UnauthorizedError` or `ForbiddenError` |
| `requireCommunityMember(communityId)` | member object | `ForbiddenError` if not active member |
| `requireCommunityRole(communityId, roles[])` | member object | `ForbiddenError` if role not in allowed list |

`lib/api-error-handler.ts` exports `handleApiError(error)` which maps:
- `UnauthorizedError` → HTTP 401
- `ForbiddenError` → HTTP 403
- Unknown errors → HTTP 500 (logged to console)

**Pattern for new API routes**:

```typescript
import { requireUserId } from "@/lib/authorization";
import { handleApiError } from "@/lib/api-error-handler";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();
    // ... handler logic ...
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 3.2 HTML sanitization

`lib/sanitize.ts` exports `sanitizeHTML()` using `sanitize-html` (pure JS parser, no DOM environment needed — replaced `isomorphic-dompurify` in `c28f3d68` to eliminate the jsdom ESM/CJS chain). The allowlist matches Tiptap WYSIWYG output (the editor used in `community-builder`). A `transformTags` hook forces `rel="noopener noreferrer"` on any `<a>` tag with a `target` attribute.

**Apply when**: persisting any user-provided HTML to DB, especially from rich-text editors.

```typescript
import { sanitizeHTML } from "@/lib/sanitize";

const sanitized = {
  ...validatedInput,
  aboutSection: sanitizeHTML(validatedInput.aboutSection),
};
await prisma.community.update({ where: { id }, data: sanitized });
```

### 3.3 Input validation (zod)

Server actions and API routes validate inputs with zod schemas. Use `safeParse` when you want to return validation errors; use `parse` (throws `ZodError`) in routes wrapped with `handleApiError`.

```typescript
import { z } from "zod";

const schema = z.object({ /* ... */ });

try {
  const data = schema.parse(body);
  // ... use data (not body) downstream ...
} catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Validation failed", details: error.flatten() },
      { status: 400 }
    );
  }
  return handleApiError(error);
}
```

### 3.4 Rate limiting

`lib/rate-limit.ts` exports a `rateLimiters` object with named limiters (e.g., `rateLimiters.create`). Use for write endpoints that could be abused.

```typescript
const ok = await rateLimiters.create.check(`scope:${userId}`);
if (!ok) {
  return NextResponse.json({ error: "Too many requests" }, { status: 429 });
}
```

### 3.5 Plan-based authorization

`auth-utils.canCreateCommunity(userId)` is the single source of truth for community-creation plan limits (free=1, starter/pro=1, business=3). `lib/authorization.ts` `Permissions.canCreateCommunity` delegates to it. Don't duplicate the logic.

---

## 4. Branching strategy

Hybrid approach decided in Sprint 2 planning:

- **Direct-to-main**: for safe operations — docs, small fixes, dep patches that don't change major versions, surgical replacements, recon.
- **Feature branch + Vercel preview deploy**: for risky operations — Prisma majors, Stripe majors, framework migrations, CSP changes.

Feature branch workflow:

```powershell
git checkout -b phase-<name>
# ... Claude Code performs the work ...
git push origin phase-<name>          # Vercel auto-creates preview deployment

# Manual smoke test on the preview URL (from Vercel dashboard or GitHub commit comment)
# If verde:
git checkout main
git merge phase-<name> --no-ff        # preserves feature branch history in git log
git push origin main
git branch -d phase-<name>
git push origin --delete phase-<name>
```

**Caveat**: preview deploys currently fail auth flows due to a config issue (see Section 5.2). For now, local testing via `npm run dev` is the workaround when manual auth-related validation is needed.

---

## 5. Operational gotchas

Workflow issues that have caused confusion before. Awareness saves debug cycles.

### 5.1 Corporate WiFi blocks port 5432
Carlos's corporate network blocks outbound Postgres traffic. Symptom: `Can't reach database server at ep-purple-surf-...neon.tech:5432` when running `npm run dev`, `npx prisma migrate`, or any Prisma command locally. **First instinct when seeing DB connection errors locally: ask whether on corporate WiFi.** Workaround: switch to mobile hotspot.

### 5.2 Vercel preview deploys and auth flows — ✅ RESOLVED
The Vercel project has `AUTH_URL` set project-wide to `https://www.unytea.com`. Preview deploys live on `*.vercel.app` subdomains, which historically caused NextAuth to reject the request because the actual Host header didn't match `AUTH_URL`.

**Fix (already in code)**: `lib/auth.ts` has `trustHost: true` hardcoded in the NextAuth config (see the explained comment around the relevant line). This tells NextAuth to trust the `X-Forwarded-Host` header from Vercel's edge instead of validating against `AUTH_URL`. Preview deploys now sign in cleanly.

**Historical note**: an `AUTH_TRUST_HOST=true` env var was briefly set in Vercel Preview on 2026-05-14 under the assumption it was the missing fix. It was a no-op — `trustHost: true` in the config takes precedence over the env. The env var was removed on 2026-05-15 for cleanliness.

The official NextAuth recommendation lists either approach (code config or env var) as valid; we keep the code-based config so it's visible in PRs and reviewable.

### 5.3 PowerShell `[slug]` paths
PowerShell interprets square brackets as glob wildcards. Reading files at paths like `app/api/communities/[slug]/route.ts` requires `Get-Content -LiteralPath "..."` (not just `Get-Content "..."`, which fails silently with "path does not exist").

### 5.4 PWA install banner
The site has a Progressive Web App manifest + Service Worker (via `web-push`). Browsers may show "Install Unytea" prompts. Intentional, not a bug. Also produces some console noise that can be filtered out when debugging.

### 5.5 Untracked files commonly present
`git status` typically shows:
- `.claude/` — Claude Code state, gitignored eventually but currently untracked
- `.env.local.backup-*` — manual backups Carlos has made

Don't include these in any commit unless explicitly asked.

### 5.6 Validation gate for prod readiness (added 2026-05-13)

**Lesson from Hotfix Series Bugs 1-4**: `npm run dev` is **INSUFFICIENT** for validating phase completion. Turbopack dev mode and Turbopack prod build resolve external modules differently. Bugs latent in CJS↔ESM interop only surface in prod build / SSR runtime. Phase 3c (Next 14→16 upgrade) closed clean in dev validation, then leaked 4 ERR_REQUIRE_ESM bugs into prod over the following weeks.

**MANDATORY for closing any future phase** (4c, 4d, Sprint 3+):

1. `npx next build` — local prod build (catches type errors + most module resolution issues)
2. `npm run start` — local prod server (catches SSR runtime errors that build alone misses)
3. **Navigate critical routes manually** with browser open:
   - `/dashboard/c/[slug]` (community detail — historical landmine for SSR module resolution)
   - `/dashboard/sessions/[id]/room` (LiveKit + Excalidraw lazy load)
   - `/dashboard/feed` (Tiptap server-side render path)
   - Any API route changed in the phase
4. **Check Vercel runtime logs** on first production deploy for runtime errors (not just build-time)
5. **Smoke test in production deploy URL** before marking phase done — `npm run dev` validation alone is no longer sufficient sign-off
6. **For UI library upgrades**: validate visual rendering (not just mount/load) — toolbars, panels, modals, popovers, and any UI surface depending on CSS-only styling. Modern ESM-first libraries (Excalidraw 0.18, future bumps) often separate CSS as side-effect exports requiring explicit import; missing imports fail silently (no console error, component just renders unstyled). Added 2026-05-13 after Excalidraw 0.18 toolbar regression (commit `11c9f241`).

This gate is **retroactive**: applies to Phase 4b reopening also if anything surfaces during its monitoring period.

---

## 6. Working agreements with Carlos

These shape interaction style.

- **Language**: Argentine Spanish in chat. Technical terms, code, and identifiers stay in English.
- **No shortcuts, no patches**: prefer proper fixes over workarounds. When choosing between scope reduction and proper-but-bigger work, default to proper unless the bigger work is buying speculative defense for unused surface (see Phase 2c.5 `customCSS` decision — removing dead surface > building defense for it).
- **Serial execution default**: when given multiple parallel-eligible tasks, Carlos executes the first and reports before starting the second. Mark tasks "paralelo OK" only when outputs are truly independent and one doesn't change the plan for the other.
- **Complete code solutions** preferred over snippets. Show full file diffs or complete blocks, not "...add this line here, then this one over there".
- **Uses Claude Code in parallel** with the chat for execution. When writing prompts intended for Claude Code, structure them as complete Step 0–N runbooks with explicit STOP/REPORT points and detailed verification.
- **Strategic discussions valued**: Carlos enjoys discussing trade-offs and architectural decisions, not just execution. Surface decisions before executing if they're non-obvious.
- **Admin identity**: Carlos's user has `role=ADMIN` in `User` table (set manually post Phase 2c.2). Use this identity mentally for testing admin-gated routes — don't ask him to elevate other test users.

---

## 7. Pre-Sprint-3 gate

**Status**: ✅ DONE (2026-05-15)

`docs/internal/PRODUCT_DECISIONS_V1.md` v1 was completed on 2026-05-15. See that doc for the canonical decisions.

The document encodes 7 sections of locked decisions:
1. **Canonical Identity** — "comunidad de membresía live-first para creadores con audiencia propia"; live as architectural choice, not feature; library as memory layer; anti-Skool positioning.
2. **Target User** — unified persona "Host Independiente" (online + offline creators with established audience); not everyone, not pure beginners.
3. **v1 Features** — Minimum Lovable Product with 5 layers + integrations Tier 1+2.
4. **Revenue Model** — 3 tiers + add-ons + Stripe Connect Express for creator payouts.
5. **Anti-features** — categories A-H of explicit non-goals (including anti-integrations).
6. **Success Metrics** — Healthy MRR as North Star.
7. **Autopilot Activation Strategy** — phased rollout gated on quality metrics (Section 8 of this briefing references this).

Any future product decision should reference this doc. If a decision conflicts with it, the doc wins unless explicitly revised first.

The decision on **PWA `start_url`** (previously listed here as open) should now anchor against the target user persona defined in Section 2 of `PRODUCT_DECISIONS_V1.md` — re-evaluate when first Sprint 3 PWA-touching feature lands.

---

## 8. Autopilot — dormant feature, key differentiator

`/api/cron/autopilot` exists in code but is **dormant** (not wired into `vercel.json`). Carlos's stated intent: "absolutamente quiero activarlo en su momento — es differentiator central". Jobs the autopilot orchestrates around `MentorSession` lifecycle:

- `auto_promote` — promote upcoming sessions to followers
- `auto_engage` — pre-session engagement triggers
- `auto_capture` — capture session content during/after
- `auto_distribute` — distribute recordings/highlights post-session
- `auto_queue_next` — queue next session in a series

Activation is a Sprint 3+ decision dependent on `PRODUCT_DECISIONS_V1.md`.

---

## 9. Backlog items

Items accumulated during Sprint 1 + 2, organized by destination phase.

### Phase 3e — Cleanup — ✅ DONE (commits 0fe35241..b7297968)
- ~~Remove `swcMinify` and `optimizeFonts` from `next.config.mjs`~~ done in `0fe35241`
- ~~Custom Cache-Control header warning on `/_next/static/:path*`~~ done in `8764eef0`
- ~~Zustand migration~~ NO-OP (0 imports in code; uninstall queued in Phase 5+)
- ~~ESLint flat config decision~~ done in `b7297968` — migrated to flat config, native eslint-config-next imports, React Compiler rules as warn
- ~~`web-push` PWA sanity check~~ inspected (Step 5), 3 findings queued in Phase 5+ Env/dev

### Phase 4 — CSP rewrite

- ✅ **Phase 4a — CSP audit + unpkg.com elimination** (`65dd8880..1eb584ab`)
  - `unpkg.com` removido del `script-src` — era dead permission (solo `@auth/core` lo invoca para Passkey/WebAuthn provider, no configurado en `lib/auth.ts`)
  - Audit completo en `next.config.mjs:57-74` — CSP única, estática, en `async headers()`
  - No code-level uses of `eval()` / `new Function()` (0 hits en `.ts`/`.tsx`)
  - WASM: solo Excalidraw vendor bundle (`public/excalidraw-assets/vendor-*.js`) → necesita `'wasm-unsafe-eval'` específicamente
  - `scripts/external-domains.cjs` añadido como utility para recon de dominios externos

- 🧪 **Phase 4b — CSP tightening "fácil" (Report-Only deploy)** — dual-CSP deployed en commit `fc06264b` (feature branch `phase-4b-csp-report-only`):
  - `script-src 'unsafe-eval'` → `'wasm-unsafe-eval'` (CSP3 subset, solo WASM para Excalidraw)
  - Wildcards `https:` en `img-src`/`media-src`/`font-src`/`connect-src` → whitelist explícita
  - Orphans removidos: `img.clerk.com`, `cdn.discordapp.com`
  - `'unsafe-inline'` mantenido en `script-src` Y `style-src` (diferido a 4d)
  - `Content-Security-Policy-Report-Only` header paralelo al `Content-Security-Policy` actual

  **Phase 4b status — manual testing findings**:

  Manual testing en localhost (prod build, `npx next build && npm run start`) ejercitó: home pública (`/en`), login con Credentials provider, dashboard, community feed, session room con LiveKit (audio+video activos, sin whiteboard).

  **Resultado: 0 violations `[Report Only]` reales en consola durante uso normal.**

  Hallazgos no accionables:
  - Chrome Issues tab muestra `eval blocked` advisory con Source location vacía. Confirmado falso positivo (no aparece log `[Report Only]` real de `eval` en consola). Probable origen: Web Worker de LiveKit para audio processing.
  - 12 warnings `invalid source <URL>` en `connect-src` son cosméticos del parser de Chrome (LiveKit conectó OK, Pusher se asume OK por mismo patrón de wildcards). Encoding del `next.config.mjs` verificado limpio (solo em-dash UTF-8 en comment, irrelevante). Considerar consolidar wildcards Pusher (`wss://*.pusher.com` cubre `ws-*` y `sockjs-*`) en Phase 4c.
  - `apps.rokt.com` font-src violation = injection externa (extensión Chrome del developer o Vercel SSO page de preview deploys). NO agregar a CSP — ruido no controlable.
  - Google OAuth login fails en localhost (Error 401 `invalid_client`) — out-of-scope para Phase 4b. Workaround: Credentials provider con email/password admin. Backlog: revisar `AUTH_GOOGLE_ID` en `.env.local` vs Google Cloud Console.

  Pending: merge a main → empezar monitoring period (3-7 días en prod) → Phase 4c switch a enforce.

- ⏳ **Phase 4c — Switch to enforce**:
  - Después de ~3-7 días de Report-Only en prod sin violations relevantes
  - Mover Report-Only a enforce, eliminar CSP vieja

- ⏳ **Phase 4d — Nonces para eliminar `'unsafe-inline'` de `script-src`**:
  - Middleware genera nonce per-request
  - Inline scripts (incluyendo los inyectados por Next.js: `__NEXT_DATA__`, etc.) heredan el nonce
  - Tailwind `'unsafe-inline'` en `style-src` se queda (requerimiento del runtime, no removible sin perder JIT classes)
  - Backlog detallado para sprint dedicado, no en mismo push que 4b/4c

#### Phase 4b inputs (compilados en 4a)

**CSP actual está laxa, no rota.** 4b consiste en apretarla: eliminar `https:` wildcards en img/media/font/connect, eliminar `unsafe-eval` donde sea posible, mitigar `unsafe-inline` en `script-src` vía nonces o hashes (Tailwind requiere `unsafe-inline` en `style-src` — eso queda).

**CSP actual (texto completo)**:
```
default-src 'self'
base-uri 'self'
form-action 'self'
frame-ancestors 'self'
object-src 'none'
worker-src 'self' blob:
script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://*.vercel.app https://*.livekit.cloud https://*.livekit.io
style-src 'self' 'unsafe-inline'
img-src 'self' data: blob: https:
media-src 'self' blob: https:
font-src 'self' data: https:
frame-src 'self' https://vercel.live
connect-src 'self' https: ws: wss:
```

**Dominios externos categorizados por directiva CSP**:

- `script-src`: `js.stripe.com` (Stripe.js), `*.livekit.cloud`/`*.livekit.io` (LiveKit), `vercel.live` (dev/preview only), `vitals.vercel-insights.com` (si Vercel Analytics activado)
- `connect-src`: `api.stripe.com`, `wss://*.livekit.cloud`, `wss://*.pusher.com`, `wss://ws-*.pusher.com`, `utfs.io` (UploadThing endpoint)
- `frame-src`: `js.stripe.com` (Stripe Checkout iframe), `vercel.live`
- `img-src`: `utfs.io`, `uploadthing.com`, `lh3.googleusercontent.com`, `avatars.githubusercontent.com`, `images.unsplash.com` — orphans a remover: `img.clerk.com` (Clerk legacy), `cdn.discordapp.com` (no Discord OAuth)
- `media-src`: `utfs.io` (videos/audio uploaded), eventual `cdn.livekit.cloud` si recording egress activado
- `font-src`: `'self'` + `data:` — sin Google Fonts CDN (proyecto usa Geist via `next/font`)

**Deps que requieren `unsafe-eval`** (o equivalente):
- `@excalidraw/excalidraw@^0.17.6` — usa WebAssembly + math expressions internas → recomendar `'wasm-unsafe-eval'` específicamente (CSP3 keyword, Chrome 97+/Firefox 110+/Safari 16+)
- `recharts@^2.13.3` — media sospecha (animation paths via `react-smooth`)
- `framer-motion@^11.18.2` — media sospecha (path transforms; v11 mayormente sin Function constructor, verificar en prod)

**Deps que NO requieren eval** (confirmadas):
- Tiptap stack instalado: starter-kit, react, image, link, placeholder (sin Mention/Suggestion que sí lo necesitarían)
- DnD libs (`@dnd-kit/*`, `@hello-pangea/dnd`), `lottie-react`, `react-day-picker`, `html-to-image`

### Hotfix Series Bugs 1-4 ESM/CJS (May 13, 2026) — ✅ CLOSED (`479abe56..c28f3d68`)

Pre-existing latent bug from Phase 3c (Next 14→16 upgrade) surfaced when `/dashboard/c/[slug]` was navigated in production for the first time post-upgrade. Phase 3c validation used `npm run dev` (Turbopack dev mode resolves modules differently than prod build), missing 4 ERR_REQUIRE_ESM bugs in jsdom's dep chain.

**Bugs discovered (in order)**:
- **Bug 1**: `html-encoding-sniffer@5+` requires `@exodus/bytes` (ESM-only)
- **Bug 2**: `whatwg-url@16+` requires `@exodus/bytes` (different chain, same dep)
- **Bug 3**: `jsdom@28+` itself requires `@exodus/bytes` directly (root cause)
- **Bug 4**: `cssstyle` / `@asamuzakjp/css-color` requires `@csstools/css-calc` (different ESM module entirely)

**Approach evolution**:
- *Attempts 1-3*: defensive npm overrides (`479abe56`, `4d92581d`). Whack-a-mole — each fix surfaced the next bug.
- *Attempt 4*: switch production build to `--webpack` (`cd7002d6`). Failed — stack trace changed from Turbopack runtime to Node native runtime, same `ERR_REQUIRE_ESM`. Confirmed the constraint is at Node level (CJS cannot `require()` ESM), not bundler-level. No bundler can resolve this.
- *Definitive fix* (`c28f3d68`): **replace `isomorphic-dompurify` with `sanitize-html`**. Eliminates jsdom entirely from dep tree. Single file change to `lib/sanitize.ts`, ports allowlist + `rel="noopener noreferrer"` hook faithfully. Removed defensive overrides (h-e-s, whatwg-url, jsdom) — no longer needed without jsdom.

**Validation**:
- `npm ls jsdom` → empty
- `npm ls @exodus/bytes` → empty
- `npm ls @asamuzakjp/css-color` → empty
- `npm ls @csstools/css-calc` → empty
- 71/71 tests passing (was 70/71 with obsolete `getIP` test, fixed in same commit)
- `npx next build` → clean, Turbopack default restored
- Production validated: `/dashboard/c/unytea-2912` loads cleanly

### Phase 5+ — Whiteboard ReactCurrentOwner — ✅ CLOSED (May 13 2026, `c78b883e..11c9f241`)

**Original symptom** (pre-fix): Excalidraw 0.17.6 read `React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner` at module-load time. React 19 (introduced in Phase 3c, May 12) removed that internal API. Result: navigating to `/dashboard/sessions/[id]/room` and opening whiteboard crashed with `Cannot read properties of undefined (reading 'ReactCurrentOwner')`. Chrome showed "This page couldn't load" (React tree fully crashed, no error boundary).

**Diagnose** (Phase A, May 13): grep `node_modules/` for `ReactCurrentOwner` found 4 candidate packages. After analysis:
- `@excalidraw/excalidraw@0.17.6` — peer dep `react ^17 || ^18` (no 19). **Root cause.**
- `framer-motion@11` — declares `react ^18 || ^19`, code path guarded. Not a culprit.
- `@effect/platform` — match was inside a JS string (vendored swagger-ui-bundle source), not executed.
- `prisma/build/public/assets/vendor.js` — Prisma Studio bundle, not in app runtime.

**Fix** (Phase B, May 13, commit `c78b883e`): bump `@excalidraw/excalidraw` 0.17.6 → 0.18.1. The 0.18 release explicitly declares `peerDependencies: { react: '^17 || ^18 || ^19' }` and dropped the secret-internals reference (`grep ReactCurrentOwner` in 0.18.1 bundle = 0 matches). 0.18 went through 7 RCs before stable. Single user-code caller (`components/sessions/SessionWhiteboard.tsx`) — APIs used were stable cross-versions, **0 caller changes needed**.

**Validation**:
- Feature branch preview deploy verified green by Carlos (whiteboard mounts, console clean)
- Merged to main `77e6c0b7`
- Production validation: see Phase 4b monitoring period continues alongside this fix

**Note**: Excalidraw 0.18.1 bundles nested `@radix-ui` packages with older peer declarations (`react ^16.8 || ^17 || ^18`) that npm flags as "invalid" under React 19. These are pure-JS ref/context utilities without secret-internals access; `--legacy-peer-deps` accepts them and they run clean under React 19.

**Validation gap discovered post-merge** (commit `11c9f241`, May 13): Excalidraw 0.18 mounted without crash but the toolbar, color/stroke panel, and library button rendered invisible. Root cause: Excalidraw 0.18 changed its CSS distribution model — CSS was separated from the JS bundle into a standalone `./index.css` export (0.17 auto-injected styles as a side-effect of importing the JS module). Required explicit `import '@excalidraw/excalidraw/index.css'` in `components/sessions/SessionWhiteboard.tsx` (the single user-code caller).

**Lesson learned**: when bumping libraries across a major version, validate UI/functional state — not just "mounts without crash". Modern ESM-first libraries often separate CSS as side-effect exports requiring explicit import, and the absence of styles can be invisible to console/logs (no error fires, the component just renders unstyled). Added as item #6 to the Section 5.6 validation gate.

### Phase 5+ — LiveKit webhook handlers audit — ✅ CLOSED (`5b3fac95..c30fa4da`, 2026-05-14)

Original symptoms (Prisma errors flooding Vercel runtime logs from `app/api/webhooks/livekit/route.ts` and `app/actions/webhooks.ts`):

1. **P2025 on `room_started` / `room_finished`** — handler updated MentorSession by id extracted from roomName; threw P2025 when room mapped to no DB session.
2. **Enum drift `SessionEventType`** — turned out to be 8 missing values (not 1 as the original symptom report suggested): `ROOM_STARTED`, `ROOM_FINISHED`, `PARTICIPANT_JOINED`, `PARTICIPANT_LEFT`, `EGRESS_STARTED`, `EGRESS_UPDATED`, `EGRESS_ENDED`, `POST_PROCESSING_TRIGGERED`. Masked by `type: type as any` in the local `logSessionEvent` helper in webhooks.ts (separate from the well-typed `logSessionEvent` in session-core.ts which was clean).
3. **P2002 race on `participant_joined`** — `livekitIdentity @unique` constraint hit during concurrent webhook delivery; both calls decided "row missing" and both inserted with the same identity.

**Fixes (`5b3fac95`)**:
- Additive migration `20260514154625_add_livekit_event_types_to_session_event_type` adding 8 enum values (`ALTER TYPE ADD VALUE × 8`).
- `findUnique → log+ack-200` pattern in `handleRoomStarted` / `handleRoomFinished` (idempotent ack to LiveKit, no retry storm).
- `try/catch P2002 → log+ack-200` around the participant_joined upsert.
- Removed `as any` from local `logSessionEvent`; typed `type: SessionEventType`; replaced 8 string-literal callsites with `SessionEventType.XXX` references.

**Follow-up (`c30fa4da`)**: 400→401 signature distinction. `handleLiveKitWebhook` now returns a discriminated union with `reason: "config" | "signature" | "processing"`; route handler maps signature → 401 (Unauthorized, no retry), config + processing → 500. Eliminates LiveKit retry-storms on signature failures and logs non-sensitive request metadata (user-agent, content-length) for security forensics.

Audit notes (out-of-scope of the fix, kept here for future awareness):
- `app/actions/session-core.ts` has its own exported `logSessionEvent` with different signature (`(params: {...})`). 12 callsites, all using `SessionEventType.XXX` correctly — clean, not affected by the webhooks bug.

### Phase 5+ — React Compiler audit + Type hygiene (post Phase 3e)
Surfaced when ESLint flat config (Phase 3e Step 4) re-enabled lint enforcement after `next lint` removal in Next 16. All currently downgraded to `warn` — backlog to actually fix.
- 185 `@typescript-eslint/no-explicit-any` — typing pass (server actions + API routes + components con Prisma JSON fields)
- 159 try/catch wrapping JSX → reemplazar con `<ErrorBoundary>` components (**BUGS LATENTES, alto-ROI** — React no catches rendering errors via try/catch)
- 76 immutability / mixed state mutation
- 44 `@next/next/no-img-element` → migrar a `next/image`
- 29 TDZ patterns (Cannot access variable before declared — reordenar declarations)
- 28 `setState` synchronously in effect → mover a event handlers o computed values
- 24 `react-hooks/exhaustive-deps` review
- 14 `@typescript-eslint/no-unused-vars` cleanup
- 12 impure function during render → side effects fuera de render path
- 10 `@next/next/no-html-link-for-pages` → migrar a `<Link>`
- **Pre-requisito** antes de activar `experimental.reactCompiler` en `next.config.mjs`

### Phase 5+ — Env / dev cleanup
- ~~`npm uninstall zustand`~~ done in `cf6b6886` (2026-05-14); transitive `zustand@4.5.7` remains under Excalidraw → tunnel-rat (not controllable, no impact).
- **If Passkey/WebAuthn provider is activated in NextAuth**: decide between (a) pre-bundling `@simplewebauthn/browser` locally — requires fork or monkey-patch of `@auth/core` because the unpkg URL is hardcoded in its bundle; or (b) re-adding `unpkg.com` to `script-src` with strict subpath: `https://unpkg.com/@simplewebauthn/browser@*/dist/bundle/index.umd.min.js`. Surfaced when Phase 4a removed unpkg from CSP.
- ~~Stale Clerk keys in `.env` (legacy auth, replaced by NextAuth in earlier work)~~ — **in-repo audit clean** (2026-05-15): 0 code imports, 0 deps, 0 `.env.example` lines, no `/api/webhooks/clerk/` route, `img.clerk.com` removed from `next.config.mjs:images.remotePatterns`. Defensive test in `tests/unit/auth-security.test.ts` asserts no `CLERK_` keys leak into env files. **Pending Carlos manual cleanup outside repo**: any `CLERK_*` env vars in Vercel dashboard + `.env.local` on his machine.
- `.env.local` vs `.env.production` reconciliation
- ~~`AUTH_TRUST_HOST=true` for Vercel preview deploys to work~~ — moot: `lib/auth.ts` has `trustHost: true` hardcoded since pre-Sprint-2 (see §5.2 for full story).
- `docs/internal/DEV_SETUP.md` for onboarding (corporate WiFi workaround, Node version, etc.)
- `docs/internal/HISTORY.md` for Supabase → Neon migration historical context
- Excalidraw peer dep: installed with `--legacy-peer-deps` for React 19, validate runtime or bump to React 19-compatible version
- `aboutSection @db.Text` is unbounded at DB level (zod caps at 50k chars but DB allows more)
- `SectionInstance.props` typed shapes refactor (currently `Record<string, any>`, blocked the strict discriminated union zod for landing PATCH in 2c.4)
- **PWA update banner**: the SW activates new version on next reload via `skipWaiting`+`clients.claim`, but no UI banner notifies the user. Implement toast "Nueva versión disponible — refresh" when `ServiceWorkerRegistrar` detects `updatefound`. Impact: users with PWA installed or active cache don't see changes until manual reload.
- **PWA manifest `screenshots: []` empty** (`public/manifest.json`). Add 2-3 screenshots (mobile + desktop). Improves install prompt on Chrome/Edge mobile. Cosmetic, low priority.
- **SW cache name versioning**: `CACHE_NAME` in `public/sw.js` is hardcoded to `"unytea-v1"`. When precache list or cache strategy changes, version it with a build hash or env var to force refresh of stale caches. Prevention, not urgent.

### Product backlog (post-gate)
- `customCSS` feature design + CSS sanitization (currently rejected from action input — see Sprint 1 closure §5.5)
- Infinite scroll + announcement pinning architecture for community posts feed (Sprint 1 closure §5.4)
- Autopilot activation (Section 8)
- Tiptap 2 → 3 upgrade (currently on 2.27.1, latest 3.x has API changes)

---

## 10. Reference documents in repo

- `docs/internal/PRODUCT_DECISIONS_V1.md` — **canonical product decisions v1** (locked 2026-05-15). All Sprint 3+ feature work should anchor here. 7 sections: identity, target user, v1 features, revenue, anti-features, success metrics, autopilot strategy.
- `docs/internal/SECTION_5_AUDIT.md` — codebase delta against PRODUCT_DECISIONS_V1.md §5 anti-features (2026-05-15). **CRITICAL input for Sprint 3 planning.** Identifies major conflict surface in Cat A (engagement extraction: ~15 files + 4 Prisma models) and Cat E (marketplace cannibalization: `/explore` with trending default), plus strategic calls needed on Cat B (member DMs) and Cat F (AI widget). Confirmed alignments documented per category.
- `docs/internal/SPRINT_1_CLOSURE.md` — Sprint 1 full retrospective (cleanup + auth/security/perf hardening, 20 commits, 6 architectural decisions)
- `docs/internal/SPRINT_2_PLAN.md` — Sprint 2 preliminary plan (created mid-execution, may be slightly outdated relative to actual progress recorded in this doc)
- `docs/internal/CONTEXT_BRIEFING.md` — this doc
- `docs/audit/2026-05-11/` — original technical audit that triggered Sprints 1 + 2 (136 findings: 18 P0, 65 P1, 53 P2)

---

## 11. Quick start for new sessions

When opening a fresh conversation, recommended kickoff from Carlos:

```
"Sigamos con unytea. Estado actual: [phase 3e cleanup / phase 4 CSP / 
otra cosa]. Leí docs/internal/CONTEXT_BRIEFING.md vía 
https://raw.githubusercontent.com/paparatsi40/unytea/main/docs/internal/CONTEXT_BRIEFING.md"
```

If you (Claude) receive a vague resumption like "let's continue with unytea" without this doc referenced:
1. Fetch this briefing immediately via `web_fetch` on the raw GitHub URL.
2. Confirm to user you have context loaded ("OK, leí el briefing — main está en c9b4af71, pendiente Phase 3e/4...").
3. Then ask user what specifically they want to work on.
4. **Do NOT** ask user to paste `.env`, project basics, stack info, or anything covered by this doc.

If you need recent commit history beyond what's in this doc, ask user to run `git log --oneline -10` and paste the output.

---

## 12. Maintenance

This doc must be updated at the end of each sprint or whenever:
- Architectural patterns change
- A new operational gotcha is identified
- Working agreements with Carlos shift
- A major commit is merged to main (update "main HEAD" in Section 2)

Updates can be small commits. The doc's purpose is to keep new Claude sessions productive without re-discovery overhead.
