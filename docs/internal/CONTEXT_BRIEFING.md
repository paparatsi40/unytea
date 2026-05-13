# unytea — Context Briefing for New Claude Sessions

**Status**: living document. Last updated 2026-05-12 after Phase 3e completion at commit `b7297968`.

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

- **main HEAD**: `b7297968` (ESLint flat config migration with React Compiler rules as warn)
- **Sprint 1**: closed 2026-05-12 — see `docs/internal/SPRINT_1_CLOSURE.md` for full retro.
- **Sprint 2**: in progress.

```
✅ Phase 3a — Audit recon (read-only)
✅ Phase 3b — npm audit safe + next-auth beta.30 → beta.31    1a4d85a6
✅ Phase 3c — Next 14 → 16 + React 18 → 19                    2001abed (merged from feature branch)
✅ Phase 3d — effect@>=3.20.0 override (CVE-2026-32887)       c9b4af71
✅ Phase 3e — Cleanup (next.config, eslint flat, React Compiler→warn)   0fe35241..b7297968
⏳ Phase 4  — CSP rewrite (unsafe-eval removal, connect-src restriction, unpkg.com elimination)
```

Phase 3e note: Step 3 (Zustand migration) was NO-OP — dep declared in `package.json` but **0 imports** in code. `npm uninstall zustand` queued in Phase 5+ backlog.

**Vulnerabilities**: 11 → 2 (8 HIGH closed during Sprint 2). The 2 remaining are MODERATE residuals in `next` 16.x and transitive `postcss` — both require Next 17 (when released) to fully clear.

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

`lib/sanitize.ts` exports `sanitizeHTML()` using `isomorphic-dompurify`. The allowlist matches Tiptap WYSIWYG output (the editor used in `community-builder`). A registered hook forces `rel="noopener noreferrer"` on any `<a>` tag with a `target` attribute.

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

### 5.2 Vercel preview deploys break auth flows
The Vercel project has `AUTH_URL` set project-wide to `https://www.unytea.com`. Preview deploys live on `*.vercel.app` subdomains, causing cross-origin redirects that fail with CORS preflight errors. **Workaround**: test locally instead of on preview deploys for any auth-related verification. **Backlog item to fix properly**: add `AUTH_TRUST_HOST=true` env var so NextAuth uses request host dynamically.

### 5.3 PowerShell `[slug]` paths
PowerShell interprets square brackets as glob wildcards. Reading files at paths like `app/api/communities/[slug]/route.ts` requires `Get-Content -LiteralPath "..."` (not just `Get-Content "..."`, which fails silently with "path does not exist").

### 5.4 PWA install banner
The site has a Progressive Web App manifest + Service Worker (via `web-push`). Browsers may show "Install Unytea" prompts. Intentional, not a bug. Also produces some console noise that can be filtered out when debugging.

### 5.5 Untracked files commonly present
`git status` typically shows:
- `.claude/` — Claude Code state, gitignored eventually but currently untracked
- `.env.local.backup-*` — manual backups Carlos has made

Don't include these in any commit unless explicitly asked.

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

Before any product feature work (Sprint 3+), Carlos needs to write `docs/PRODUCT_DECISIONS_V1.md`. Required topics:

- Canonical product identity (one paragraph)
- Target user (specific persona, not "everyone")
- Core v1 features (the minimum lovable product)
- Revenue model
- Anti-features (what unytea explicitly will NOT do)
- Success metrics
- Autopilot activation strategy
- **PWA `start_url`**: `/dashboard` (current) vs `/`. Trade-off: `/dashboard` assumes user is authenticated when opening the PWA (common if already logged in); `/` is more welcoming for users who install before logging in. Decision should align with the target user persona for v1.

**This is product work, not code work** — don't try to execute it as a Claude Code prompt. It requires Carlos to think and write himself. You can help by asking clarifying questions or critiquing drafts.

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
- Eliminate `unsafe-eval` from CSP
- Restrict `connect-src` to known hosts (currently permissive)
- Eliminate `unpkg.com` external load (replace with npm-installed local equivalent)
- Deploy CSP in report-only mode first, monitor violations, then switch to enforce

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
- `npm uninstall zustand` — declared in `package.json` ^5.0.1 but 0 imports in code (post Phase 3e Step 3 finding)
- Stale Clerk keys in `.env` (legacy auth, replaced by NextAuth in earlier work)
- `.env.local` vs `.env.production` reconciliation
- `AUTH_TRUST_HOST=true` for Vercel preview deploys to work (see Section 5.2)
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
