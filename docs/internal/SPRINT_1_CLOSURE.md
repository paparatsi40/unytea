# Sprint 1 Closure — unytea security & cleanup foundation

**Cierre:** 2026-05-12
**Estado del repo:** `main @ 3f6ec634`
**Commits:** 20 across 12 phases
**Outcome:** Phase 0, 1, 2 completas. Foundation lista para Sprint 2 (deps + CSP).

---

## Resumen ejecutivo

Sprint 1 fue un esfuerzo de **cleanup técnico + endurecimiento de superficie de auth/security/perf**, basado en el audit técnico de `docs/audit/2026-05-11/` (136 findings: 18 P0, 65 P1, 53 P2).

Sprint 1 NO incluyó trabajo de producto. Su propósito fue dejar el repo en un estado defendible — sin código muerto significativo, con migrations modernas, sin vectors de seguridad activos en la superficie auditada, y con patterns reusables para Sprint 2+.

### Lo que se logró

- **Cleanup masivo**: ~849k LOC eliminadas (principalmente tracked `node_modules` en `/web/`), TS errors 607 → 0
- **Migrations modernas**: pipeline Vercel migrado de `prisma db push` a `prisma migrate deploy`. 4 migrations nuevas creadas correctamente.
- **Auth surface**: 7 sub-phases del Phase 2c, cerrando 9 findings del audit (2 HIGH, 2 MED, 3 LOW security + 1 MED + 1 LOW perf)
- **Infrastructure nueva**: typed errors (`UnauthorizedError`, `ForbiddenError`), `handleApiError`, `requireAdmin`, sanitización HTML con allowlist Tiptap-aware, validación zod en routes críticas, rate limiting wired

### Lo que se difirió

Items que aparecieron durante Sprint 1 pero NO se cerraron porque (a) están fuera del scope del audit, (b) son trabajo de producto que requiere decisiones, o (c) son tech debt que merece su propia phase. **~21 items totales registrados al final del doc.**

---

## Phase breakdown

### Phase 0 — Cleanup (7 commits)

Eliminación de código muerto y `node_modules` trackeado.

| Commit | Cambio |
|--------|--------|
| `2a65d917` | Remove `/web/` (-848,961 LOC, tracked node_modules) |
| `59be4dbb` | Dead root files |
| `40ed0f12` | Dead/empty API routes |
| `5a2ebaf9` | Move notes → `docs/internal/` |
| `320b287b` | Move camera-test → `(debug)` |
| `feb44238` | Archive old docs |
| `5ce0bb72` | Remove phantom role type |

**Resultado:** TS errors 607 → 0. Build OK.

### Phase 1 — Prisma migrations modernization (5 commits)

| Sub-phase | Commit | Cambio |
|-----------|--------|--------|
| 1a | `740fea95` | fix(prisma): welcome_message migration table name (Community → communities) |
| 1b | `90cf2c87` | feat(build): prisma db push → migrate deploy |
| 1b | `148d066f` | chore: gitignore .env.production |
| 1c | `e652b438` | feat(welcome): showWelcomeMessage + welcomeMessageSeen tracking |
| 1d | `4d0f1883` | feat(community): SOCIAL_HUB enum value to CommunityLayoutType |

**Debugging notable durante Phase 1:**
- Vercel CLI OAuth flow para `vercel env pull` (sin permisos automáticos)
- Corporate WiFi bloqueando outbound 5432 → workaround con hotspot móvil
- `DIRECT_URL` vacío en Vercel prod (resuelto seteando = `DATABASE_URL_UNPOOLED`)
- Migration baseline: 16/17 ya aplicadas (legacy Supabase → Neon era); la pendiente era idempotente `IF NOT EXISTS`
- P1002 advisory lock por orphan PID en Neon → killed manualmente

### Phase 2a — Cron security (1 commit)

| Commit | Cambio |
|--------|--------|
| `830f2293` | feat(security): fail-closed CRON_SECRET + timing-safe comparison |

Refactor de 3 cron routes (`sessions`, `session-reminders`, `autopilot`) para usar `lib/cron-auth.ts` con `verifyCronAuth()` helper. **16 unit tests** en `tests/unit/cron-security.test.ts`.

**Nota:** el route `autopilot` está completo en código pero **dormant** (NO en `vercel.json`). Activación pendiente por decisión de producto (item en backlog).

### Phase 2b — Auth shape rename (1 commit)

| Commit | Cambio |
|--------|--------|
| `c0e684dd` | refactor(auth): requireAuth → requireUserId + module docs |

Cleanup de naming entre `lib/authorization.ts` (250 LOC scaffold sin callers externos — kept como foundation para 2c.3+) y `lib/auth-utils.ts` (40 callers, mostly `getCurrentUserId`).

**Bug latente identificado:** `canCreateCommunity` tenía 2 implementaciones contradictorias (`auth-utils`: plan-based, `Permissions`: always true). **Resuelto formalmente en Phase 2c.4** (delegate Permissions → auth-utils).

### Phase 2c — Audit findings closure (7 sub-phases)

La fase más sustancial de Sprint 1. Inspección sistemática y fix de 9 findings.

| Sub-phase | Commit | Findings cerrados |
|-----------|--------|-------------------|
| 2c.1 | (recon) | 2 HIGH, 3 MED, 3 LOW security + 1 MED + 1 LOW perf |
| 2c.2 | `14bacce0` | UserRole enum infrastructure (foundation para admin gate) |
| 2c.3 | `0b8f1da3` | IDOR fix en `GET /communities/[slug]` + admin gate en `GET /reports` (2 HIGH) |
| 2c.4 | `239fbf9a` | Rate-limit + zod + plan-limit en `POST /communities` + zod en `PATCH /landing` (2 MED) |
| 2c.5 | `bc2db035` | DOMPurify sanitization de aboutSection (XSS descubierto durante recon de 2c.4) |
| 2c.6 | `f5e35273` | 401 status fix + zod en `POST /onboarding` + rel hook en sanitizer (3 LOW + carry-over) |
| 2c.7 | `3f6ec634` | N+1 fix en `GET /communities` + hard cap en `GET /posts` (MED + LOW perf) |

**Patrones establecidos durante 2c (reusables Sprint 2+):**
- `requireUserId()` / `requireAdmin()` throw typed errors
- `handleApiError()` mapea typed errors → HTTP status codes (401/403/500)
- Zod validation + `ZodError` → 400 con `error.flatten()`
- Rate limit via `rateLimiters.<key>.check(userScopedKey)`
- DOMPurify allowlist Tiptap-aware en `lib/sanitize.ts`

---

## Métricas

| Métrica | Valor |
|---------|-------|
| Commits totales | 20 |
| Phases ejecutadas | 12 (0, 1a–1d, 2a, 2b, 2c.1–2c.7) |
| LOC eliminado neto | ~849,000 |
| TS errors | 607 → 0 |
| Migrations nuevas aplicadas | 4 |
| API routes inspectadas | 12 (de 46 totales) |
| Findings HIGH security cerrados | 2 |
| Findings MED cerrados (security + perf) | 3 |
| Findings LOW cerrados (security + perf) | 4 |
| Dependencies nuevas | 1 (`isomorphic-dompurify@3.12.0`) |
| Tests unit agregados | 35 (16 cron + 19 sanitize) |
| Vercel deploys verdes | 13 |

---

## Decisiones arquitectónicas registradas

### 1. NextAuth v5 beta JWT augmentation via `@auth/core/jwt` directo

**Problema:** `declare module "next-auth/jwt"` daba TS2664 bajo `moduleResolution: bundler` con NextAuth v5 beta. El re-export indirecto desde `next-auth/jwt` no es targetable para module augmentation.

**Solución:** Augmentation directa sobre `@auth/core/jwt` (donde NextAuth v5 beta define el tipo originalmente).

**Cuándo revisar:** al upgrade a NextAuth v5 GA, o si cambia `moduleResolution` en `tsconfig.json`.

### 2. Typed error classes + `handleApiError` pattern

**Decisión:** `lib/authorization.ts` define `UnauthorizedError` y `ForbiddenError`. Los helpers (`requireUserId`, `requireAdmin`, `requireCommunityMember`, etc.) throw esas typed errors. `lib/api-error-handler.ts` mapea → HTTP status codes en el route handler.

**Alternativa rechazada:** estilo "return Response or null" (como `lib/cron-auth.ts`). Razón: throw es más natural en TS moderno y permite que helpers sean HTTP-agnostic.

### 3. Zod schema LAX en landing builder

**Decisión:** Para `PATCH /communities/[slug]/landing`, zod valida `type` enum estricto (10 valores) + `props` como `Record<string, primitive>` recursivo con length limits, en lugar de discriminated union estricta por section type.

**Razón:** `SectionInstance.props: Record<string, any>` en `components/section-builder/types.ts`. Strict union requeriría refactor de 10 section components, out of scope para 2c.4.

**Cuándo revisar:** si se introduce rich-text rendering al landing (entonces XSS via stored JSON sí sería vector activo y necesitaríamos DOMPurify + types strict).

### 4. Hard cap (no cursor) en posts pagination

**Decisión:** `GET /communities/[slug]/posts` aplica `take: 50` default, máximo 100 vía `?limit=N`. NO cursor pagination.

**Razón:** El handler tiene priority sort cross-page (SESSION_ANNOUNCEMENT LIVE first) que es **arquitectónicamente incompatible** con cursor pagination (un announcement LIVE de hace 30 días aparecería en página 2 con cursor por createdAt). La solución correcta de infinite-scroll + pinning es product work (item en backlog).

### 5. `customCSS` removido del input del theme action

**Decisión:** `updateCommunityTheme` no acepta el field `customCSS` (zod lo strip-ea, type literal lo excluye). El field permanece en `prisma/schema.prisma` para no requerir migration.

**Razón:** Recon confirmó que `customCSS` NO se renderiza en ningún lugar del frontend (verified by `git grep`). Era dead surface en el action. Implementar CSS sanitization (~500 LOC con parser AST + allowlist) para código no-consumido es premature optimization sin product spec.

**Cuándo revisar:** si se diseña la feature `customCSS` formalmente con requisitos de product.

### 6. UserRole enum + session augmentation

**Decisión:** Nuevo enum `UserRole { USER, ADMIN }` en Prisma + propagación a session JWT via callbacks (jwt + session). User admin elevado manualmente en prod.

**Razón:** Foundation para `requireAdmin()` helper. Resolvía el TODO "admin check no implementado" en `GET /reports`.

**Consideraciones:** sessions existentes pre-deploy tienen JWT sin `role` → fallback "USER" en session callback evita break. Sign-out + sign-in necesario para que el role se refleje en el token.

---

## Backlog acumulado durante Sprint 1

Items registrados para phases/sprints futuros:

### Sprint 2 (Phase 3 — deps + vulns)

1. Prisma 5.22 → 7.8 upgrade
2. Next.js 14.2.28 → fix security CVE (audit P1)
3. Stripe 4 → 9 upgrade
4. 8 npm HIGH vulns del audit

### Sprint 2 (Phase 4 — CSP)

5. CSP rewrite: eliminar `unsafe-eval`
6. Restrict `connect-src` a hosts conocidos
7. Eliminate `unpkg.com` del CSP

### Phase 5+ — Env / dev cleanup

8. `.env` con keys Clerk muertas → limpiar
9. Consolidación `.env` vs `.env.local`
10. Documentar workaround corporate WiFi → `docs/internal/DEV_SETUP.md`
11. Docker Desktop setup doc (para regenerar migrations cuando aplique)
12. `.gitignore` patterns redundantes
13. OAuth keys restoration al volver a dev local (Google, GitHub, AUTH_TRUST_HOST, OPENAI, WHISPER, LIVEKIT, STRIPE)
14. Supabase → Neon migration history → `docs/internal/HISTORY.md`
15. P1002 advisory lock pattern → resilient connection pool
16. PowerShell multi-line commit workflow (here-strings)
17. Schema field `aboutSection` length limit at DB level (currently `@db.Text` unbounded; zod cap está a 50,000 chars)
18. `SectionInstance.props` typed shapes — discriminated union strict (tech debt)

### Sprint 3+ — Product work (post-gate)

19. `customCSS` feature design + CSS sanitization (cuando exista product spec)
20. Infinite-scroll + announcement pinning architecture para posts feed
21. Autopilot activation strategy (jobs around `MentorSessions`: `auto_promote`, `auto_engage`, `auto_capture`, `auto_distribute`, `auto_queue_next`)

---

## Next steps

### Sprint 2 (técnico)
- Phase 3: dependencies + npm vulns
- Phase 4: CSP rewrite

### Pre-Sprint-3 gate (producto, NO código)
- `docs/PRODUCT_DECISIONS_V1.md` requerido antes de Sprint 3
- Cubre: canonical identity, target user, core v1 features, revenue model, anti-features, success metrics, autopilot activation strategy

### Sprint 3+ (producto, post-gate)
- Implementación de v1 features según decisions del gate
- Scope depende del gate

---

## Apéndice: lineage de commits (cronológico)

```
2a65d917  cleanup: remove tracked /web/ node_modules        (-848,961 LOC)
59be4dbb  cleanup: dead root files
40ed0f12  cleanup: dead/empty API routes
5a2ebaf9  cleanup: move notes to docs/internal/
320b287b  cleanup: camera-test to (debug)
feb44238  cleanup: archive old docs
5ce0bb72  cleanup: remove phantom role type
740fea95  fix(prisma): welcome_message migration table name
90cf2c87  feat(build): prisma db push → migrate deploy
148d066f  chore: gitignore .env.production
e652b438  feat(welcome): showWelcomeMessage + welcomeMessageSeen
4d0f1883  feat(community): SOCIAL_HUB enum value
830f2293  feat(security): fail-closed CRON_SECRET
c0e684dd  refactor(auth): requireUserId rename + docs
14bacce0  feat(auth): UserRole enum + session
0b8f1da3  fix(security): IDOR + admin gate (2 HIGH)
239fbf9a  fix(security): rate-limit + zod + plan-limit (2 MED)
bc2db035  fix(security): aboutSection XSS via DOMPurify
f5e35273  fix(security): 401 + onboarding zod + rel hook (3 LOW)
3f6ec634  perf(api): N+1 + hard cap (MED + LOW perf)
```

---

**Sprint 1 cerrado.** Foundation lista para Sprint 2.
