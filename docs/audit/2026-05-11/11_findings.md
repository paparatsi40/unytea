# 11 — Resumen ejecutivo y plan Sprint 1

## Top-level summary del estado del proyecto

- **unytea** es una plataforma tipo Skool con Next.js 14 + Prisma + Neon. Stack moderno, repo público en github.com/paparatsi40/unytea, deploy en Vercel a unytea.com. Branch `main` sincronizado con producción.
- **Bones del producto sólidos**: 49 modelos Prisma, 47 API routes, 44 server actions, 146 componentes React, i18n en 3 idiomas (en/es/fr), NextAuth v5, Stripe Connect, LiveKit video, Pusher real-time, OpenAI integration.
- **Las últimas semanas hay actividad de calidad** (PRs sobre SEO canonical/hreflang, OG image dinámica, fixes de middleware, blog en homepage) — el proyecto **está vivo y mejorando**.
- **Pero** el repo arrastra **deuda técnica visible**: ARCHITECTURE.md desactualizada con branding "Mentorly", 28 componentes huérfanos, 3 librerías de toast instaladas, tRPC instalado sin uso, 60 packages outdated, 8 vulnerabilidades npm HIGH, CSP relajado, rate-limit/zod solo en ~10% de las rutas.
- **Riesgo crítico OPERACIONAL #1**: el build script de producción corre `prisma db push --skip-generate` — eso sincroniza el schema en cada deploy sin migrations. Cualquier cambio local en `schema.prisma` (incluyendo drops de columna) se aplica silenciosamente a la DB con datos reales.
- **Riesgo crítico OPERACIONAL #2**: localmente, `node_modules` está fuera de sync con el lockfile commiteado: Next 16 + React 19 instalado vs Next 14 + React 18 en `package.json`/lockfile. 607 errors de TypeScript locales vs CI verde. **El dev no detecta regresiones type-level en su máquina**.
- **Riesgo crítico OPERACIONAL #3**: `CRON_SECRET` tiene fallback inseguro — si la env var falta en Vercel, los cron jobs públicos quedan invocables sin auth.
- **Riesgo crítico OPERACIONAL #4**: la migration tracked `20260306082705_add_welcome_message` referencia tabla `"Community"` (PascalCase) pero la tabla real es `"communities"` (mapped). Funcionó porque `db push` ya había sincronizado antes; pero si alguien corre `migrate reset`, falla. Hay además 3 archivos untracked en `prisma/migrations/` que generan ambigüedad.
- ✅ **Git history limpio de secretos** (escaneo completo: no hay `.env`, `sk_live`, `postgres://` con valores reales). No se requiere rotation de credenciales por leak histórico.
- ✅ **CSP, HSTS, cookies con `httpOnly`/`secure`/`__Secure-`, anti-enumeration en login** son baseline aceptables. Mitigation de timing attack en `lib/auth.ts:87-89` bien implementada.
- **Documentación interna es contradictoria**: `ARCHITECTURE.md` y `LOCALIZATION_AUDIT.md` mencionan "Mentorly", carpetas `server/`/`types/`/`config/` que no existen.

## Conteos de findings

| Severidad                                        | Cantidad |
| ------------------------------------------------ | -------- |
| **P0** (bloquea launch / expone seguridad ahora) | **18**   |
| **P1** (debería fixearse en Sprint 1)            | **65**   |
| **P2** (mejora valiosa, no urgente)              | **53**   |
| **Total**                                        | **136**  |

(Sumas aproximadas — algunos findings se solapan entre reportes.)

## Pre-findings (los 7 del prompt) — qué pasó con cada uno

1. **3 migrations Prisma UNTRACKED** — confirmado:
   - `20251210173306_add_recording_transcription/` → **DESCARTAR** (conflicto con schema actual; estructura nunca llegó al schema, las migrations posteriores `20260312000002_add_recording_and_events` refactorizaron la zona). Reporte 04.
   - `20251216_add_welcome_message/` → **DESCARTAR** (superseded por `20260306082705_add_welcome_message` pero con campos extra `showWelcomeMessage` + `welcomeMessageSeen` que NO están en schema; si quieren la feature completa, crear migration nueva limpia). Reporte 04.
   - `add_social_hub_layout.sql` → **DESCARTAR** (añade enum value `SOCIAL_HUB` que no existe en `CommunityLayoutType`; si la feature está pendiente, agregar al enum y crear migration formal). Reporte 04.

2. **`app/[locale]/dashboard/camera-test/page.tsx`** → debug de cámara/mic con `getUserMedia`. Recomendación: mover a `(debug)/` con env-flag o eliminar (ya existe `components/sessions/CameraDebug.tsx` huérfano con propósito similar). Reportes 01, 09.

3. **`COMO_MAPEAR_CAPITULOS.md`, `GUIA_PRODUCCION_VIDEOS.md`** → docs en español sobre producción de videos. **No son parte del producto**. Mover a `docs/internal/` o eliminar. Reporte 01.

4. **`lint-after.txt` + `lint-errors.txt`** (89 KB) → outputs de lint capturados. **Borrar y añadir a `.gitignore`**. Reporte 07.

5. **`BANNER.txt`** → ASCII banner sin uso. **Eliminar**. Reporte 01.

6. **`CLAUDE.md` (0 B)** → archivo vacío. **Eliminar o llenarlo** con instrucciones para Claude Code. Reporte 01.

7. **Scripts root** (`clean-restart.ps1`, `restart-clean.bat`, `reset-postgres-password.ps1`, `check_translations.py`, `generate_landing.py`, `check-file.js`) → ninguno tiene credenciales hardcoded. `reset-postgres-password.ps1` referencia path legacy `AndroidStudioProjects\Mentorly`. `generate_landing.py` **genera la landing tsx desde Python** — workflow inusual y riesgoso (sobrescribe `app/[locale]/page.tsx`). Reportes 01, 05.

8. **Tag `pre-i18n-backup`** → ESCANEADO. Limpio de secretos. ✅. Reporte 05.

9. **`ARCHITECTURE.md` + `LOCALIZATION_AUDIT.md`** previos → utilizados como contexto. Ambos están desactualizados (header "Mentorly", carpetas inexistentes), pero `LOCALIZATION_AUDIT.md` tiene mapa útil de strings hardcoded. Mover a `docs/archive/` o reescribir.

## TODOS los findings P0

| #         | Finding                                                                                                                                                                                | Reporte    |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **P0-1**  | `prisma db push --skip-generate` en cada build de prod → schema drift silencioso sobre DB con datos reales                                                                             | 04         |
| **P0-2**  | `CRON_SECRET` check con fallback `if (expectedSecret && ...)` → si la env var falta, endpoints cron públicos                                                                           | 03, 05     |
| **P0-3**  | 8 vulnerabilidades npm **HIGH** activas (`next`, `glob`, `@uploadthing`, `effect`, `eslint-config-next`)                                                                               | 02, 05     |
| **P0-4**  | NextAuth v5 **en beta** (`5.0.0-beta.25`) corriendo en producción                                                                                                                      | 02, 03     |
| **P0-5**  | Lockfile vs `node_modules` local desincronizado: Next 16 + React 19 instalado vs Next 14 + React 18 declarado → 607 TS errors locales vs CI verde                                      | 02, 07     |
| **P0-6**  | Migration tracked `20260306082705_add_welcome_message` rota (referencia `"Community"` en lugar de `"communities"`)                                                                     | 04         |
| **P0-7**  | 3 archivos untracked en `prisma/migrations/` (recording_transcription, welcome_message duplicate, social_hub_layout stray)                                                             | 04         |
| **P0-8**  | Tipo `Session.user.role` declarado en NextAuth augmentation pero **`role` NO existe en `User` Prisma model** → cualquier check basado en `session.user.role` lee `undefined`           | 03, 04     |
| **P0-9**  | `/api/sessions/[sessionId]/route.ts` archivo VACÍO (solo `force-dynamic` sin handlers)                                                                                                 | 08         |
| **P0-10** | `/api/admin/make-super-admin/` carpeta vacía — si alguien la termina sin auth fuerte, abre escalada de privilegios                                                                     | 01, 08     |
| **P0-11** | `/api/webhooks/clerk/` legacy de un intento Clerk previo — eliminar                                                                                                                    | 08         |
| **P0-12** | CSP `script-src 'unsafe-eval' 'unsafe-inline'` + `unpkg.com` permitido → XSS-vulnerable si hay injection                                                                               | 05         |
| **P0-13** | CI lint y format-check con `continue-on-error: true` → 293 warnings se acumulan sin presión, incluido al menos un `react-hooks/rules-of-hooks called conditionally` que es bug runtime | 07         |
| **P0-14** | CI no corre `next build` → errores que pasan tsc pero rompen build solo se descubren en Vercel deploy                                                                                  | 07         |
| **P0-15** | `react-hooks/rules-of-hooks called conditionally` en al menos un componente → bug runtime real                                                                                         | 07         |
| **P0-16** | `app/[locale]/dashboard/camera-test/page.tsx` untracked, ejecuta `getUserMedia` sin guard de env                                                                                       | 01, 08, 09 |
| **P0-17** | `ARCHITECTURE.md` documenta carpetas `server/`/`types/`/`config/` que **no existen** + branding "Mentorly" — repo público da impresión de inconsistencia                               | 01         |
| **P0-18** | `eslint-config-next@16.0.6` y `eslint@9.39.1` instalados (vs `^14.2.28` / `^8.57.0` declarados) → `npm ci` reproducible en riesgo                                                      | 02         |

## Top 15 findings P1 más impactantes

1. **22 API routes sin auth import**: auditar cada una; algunas son legítimas (webhooks, cron, signup) pero `my-communities`, `/api/user/onboarding`, `/api/push/subscribe` son sospechosas. Reporte 03.
2. **Rate limit solo en 5/47 API routes** (~10%). Extender a `ai/chat`, `email/send`, `reports`, posts CREATE, etc. Reportes 03, 05, 08.
3. **Zod validation solo en 3/47 API routes** (~6%). Reporte 08.
4. **`@stripe/stripe-js` 4.x → 9.x** (5 majors atrás). Reporte 02.
5. **Prisma 5 → 7** (2 majors atrás). Reporte 02.
6. **Client sprawl: 190 archivos `"use client"`** vs ~30-40 que realmente necesitan hooks/state. Reporte 06.
7. **32 routes con `force-dynamic`** → mata cache y SEO. Auditar y migrar a `revalidate = N` donde aplique. Reporte 06.
8. **`@excalidraw/excalidraw` (1 MB) sin dynamic import** → carga en todos los bundles. Reporte 06.
9. **Solo 3 `<Suspense>` boundaries en toda la app** → sin streaming. Reporte 06.
10. **Tres librerías de toast instaladas** (`react-hot-toast`, `@radix-ui/react-toast`, `sonner`) — sonner es la activa. Eliminar las otras dos. Reporte 09.
11. **`GamificationWidget.tsx` duplicado** (dashboard/ y gamification/). Consolidar. Reporte 09.
12. **`components/visual-builder/` vs `components/section-builder/`**: dos builders — uno legacy. Identificar y eliminar el muerto. Reporte 09.
13. **Server actions duplicados**: `buddy.ts`/`buddy-enhanced.ts`, `analytics.ts`/`analytics-extended.ts`, `sessions.ts`/`session-core.ts`. Reporte 08.
14. **CSP `Permissions-Policy: camera=*, microphone=*, autoplay=*`** wide-open. Restringir a self + LiveKit. Reporte 05.
15. **`Recording.transcription` no existe en schema** pero migration untracked sugería implementarla; verificar si `components/sessions/SessionTranscript.tsx` (huérfano) referencia campos que no existen → bug latente. Reportes 04, 09.

## Propuesta de Sprint 1 (5 phases discretas)

### Phase 0 — Higiene crítica (½ día)

Objetivo: dejar el repo en estado limpio antes de tocar features.

- (5 min) `rm -rf node_modules && npm ci` para alinear instalación con lockfile.
- (15 min) Borrar `lint-after.txt`, `lint-errors.txt`, `BANNER.txt`, `CLAUDE.md` (0 B), `check-file.js`, `tsconfig.tsbuildinfo` (si tracked), carpeta `/web/`, carpeta `app/api/admin/make-super-admin/`, `app/api/webhooks/clerk/` (si existe), `app/api/sessions/[sessionId]/route.ts` (vacío).
- (15 min) Borrar 3 migrations untracked en `prisma/migrations/`.
- (30 min) Decidir destino de `COMO_MAPEAR_CAPITULOS.md`, `GUIA_PRODUCCION_VIDEOS.md`, `app/[locale]/dashboard/camera-test/page.tsx` (mover a `docs/internal/` y `app/(debug)/` respectivamente o eliminar).
- (1 hora) Mover `ARCHITECTURE.md`, `LOCALIZATION_AUDIT.md`, `QUICKSTART.md` a `docs/archive/` (preservar histórico) y reescribir un README/ARCHITECTURE mínimo nuevo.
- (1 hora) Sincronizar `package.json` con versiones reales de eslint/eslint-config-next/typescript (o downgrade local). Re-correr `tsc --noEmit` y reportar errores reales.

**LOC**: -150 KB de repo (lint outputs, BANNER, web/), -3 carpetas vacías.

### Phase 1 — Seguridad bloqueante (1-2 días)

- (1 hora) Cambiar `CRON_SECRET` check: `if (cronSecret !== process.env.CRON_SECRET) return 401` sin fallback. Si la env var falta en prod, mejor que la app falle a que sea pública.
- (30 min) Cambiar `package.json:build` de `prisma db push --skip-generate && next build` a `prisma migrate deploy && next build` (o sólo `next build` y mover migrations a un step manual de release).
- (medio día) Migrar `.eslintrc.json` a `eslint.config.js` (flat config) compatible con ESLint 9. Quitar `continue-on-error: true` en CI lint.
- (1 hora) Añadir job `build` al CI (`npm run build`).
- (1 hora) Auditar 22 API routes sin `auth()` import una por una. Priorizar `my-communities`, `/api/user/onboarding`, `/api/push/subscribe`. Reporte 03/08.
- (1 hora) Resolver el `react-hooks/rules-of-hooks called conditionally` (encontrar archivo en `lint-errors.txt` y fixear).
- (½ día) `npm audit fix` sin `--force`. Documentar lo que queda y plan de upgrade. Migrar `@uploadthing/react` a 6.x (breaking pero contained).

### Phase 2 — Migrations + schema cleanup (1 día)

- (1 hora) Crear migration `0042_fix_welcome_message_table_case` que arregle el bug de PascalCase.
- (1 hora) Decidir destino de `SOCIAL_HUB` layout (añadir al enum + migration formal, o descartar).
- (1 hora) Audit del field `Session.user.role` en NextAuth augmentation: o eliminar del tipo, o añadir al `User` Prisma model.
- (½ día) Plan de cleanup de migrations huérfanas (3 archivos untracked ya marcados en Phase 0).
- (2 horas) Decidir política soft-delete (deletedAt en todos los modelos relevantes vs eliminar y hacer hard delete consistente).

### Phase 3 — Performance & UX (2-3 días)

- (½ día) Audit "use client": migrar `components/community/layouts/*`, `components/community/sections/*` a server donde no usan hooks/state.
- (1 hora) Dynamic import de `@excalidraw/excalidraw` y `@livekit/components-react` en sus consumers (componentes Excalidraw/LiveKit son lazy).
- (1 hora) Eliminar 3 libs de toast → solo sonner. Patch ~30 KB.
- (1 hora) Consolidar `GamificationWidget` duplicado.
- (1 día) Audit huérfanos con `npx knip` o `ts-unused-exports`. Eliminar componentes confirmados huérfanos (~10-15).
- (2 horas) Auditar `force-dynamic` en 32 archivos: migrar a `revalidate = N` donde aplique.
- (1 hora) Añadir Suspense boundaries en dashboard home y community/[slug].
- (½ día) Eliminar 7 deps huérfanas (`@trpc/*`, `svix`, `superjson`, `@hello-pangea/dnd`).

### Phase 4 — Testing y CI maduración (2 días)

- (½ día) Migrar `.eslintrc.json` → flat config (si no se hizo en Phase 1).
- (1 hora) Quitar `continue-on-error: true` de `format-check`.
- (1 hora) Añadir job `e2e` Playwright al CI (con headless chromium, contra el dev server).
- (1 hora) Añadir `gitleaks` GitHub Action al CI.
- (1 hora) Añadir `dependabot.yml` o `renovate.json` para auto-bump de minors/patches.
- (1 día) Escribir 10-15 unit tests para los server actions más críticos (`communities.ts`, `posts.ts`, `messages.ts`, `stripe.ts` flows).
- (½ día) E2E Stripe checkout test (con Stripe test mode).

### Phase 5 — Seguridad de runtime (1-2 días, en paralelo)

- (1 día) Reescritura del **CSP** con dominios cerrados. `script-src` sin `unsafe-eval`, `connect-src` con whitelist, `unpkg.com` eliminado. Test exhaustivo (LiveKit, Stripe, Pusher, Excalidraw).
- (3 horas) Extender zod validation a top-10 API routes con body POST.
- (2 horas) Extender rate-limit a top-10 endpoints sensibles.
- (½ día) Restringir `Permissions-Policy: camera=(self "https://*.livekit.cloud"), microphone=...`.

**Total Sprint 1 estimado**: ~10-12 días-persona si se trabaja secuencial. ~5-7 días si paralelizan 2 personas.

## Dependencias críticas entre findings

- **P0-1 (db push)** bloquea P0-7 (migrations untracked): si seguís corriendo `db push` en build, las migrations no importan. Resolver P0-1 ANTES de hacer cleanup de migrations.
- **P0-5 (lockfile drift)** bloquea P0-15 (rules-of-hooks bug): el dev ve 607 errores que ocultan el problema real. Resolver P0-5 antes de cazar bugs.
- **P0-18 (eslint config drift)** y **P0-13 (CI lint continue-on-error)** son lo mismo: migrar a flat config resuelve ambos.
- **P0-3 (8 vulns HIGH)** y **P1-4 (Stripe-js outdated)** y **P1-5 (Prisma outdated)** son del mismo problema (deps atrasadas). Plan global de upgrades.
- **P0-2 (CRON_SECRET fallback)** y **P0-9 (sessions/[sessionId] vacío)** y **P0-10 (admin/make-super-admin vacía)** son los más rápidos de cerrar (≤30 min cada uno).
- **P1-15 (Recording.transcription)** depende del audit del schema (reporte 04): si confirma drift, P1-15 implica grep masivo en código.

## **PRIMERA ACCIÓN** recomendada (antes de cualquier Sprint)

**No es** "borrar X" ni "fixear Y". **Es**:

> `rm -rf node_modules && npm ci`

Razón: el estado actual local (Next 16, React 19) **no coincide** con lo que corre en CI o Vercel (Next 14, React 18). Hasta no alinear, **cualquier tsc/lint local da resultados engañosos**. Es lo más barato, lo más rápido (~3 min), y desbloquea todo el resto del audit (uno puede creer que está fixeando un TS error real cuando solo está fixeando una API change de Next 15+ que no se va a aplicar a prod).

**Después de eso** (Phase 0 entera del Sprint, ~½ día), el repo queda en estado en el que se pueden empezar las decisiones de producto.

**No** se requiere rotation de credenciales por leak histórico — git history está limpio.

**Sí** se debería revisar Vercel env vars antes de aplicar `prisma migrate deploy` por primera vez: confirmar que `DATABASE_URL` apunta a la DB real, que `DIRECT_URL` está configurada, y que `CRON_SECRET` está seteada (porque después de Phase 1, los crons fallarán si no lo está — eso es lo que querés).

## Estado: listo para Sprint 1 una vez Phase 0 esté hecha

El producto **no está en estado de bloqueo de launch**. La mayoría de los P0 son higiene + procesos, no bugs visibles para usuario. Pero **antes de cualquier marketing push o user growth**, ejecutar al menos Phase 0 + Phase 1 + Phase 2 es prudente — son ~3 días de trabajo y eliminan la mayoría de los P0.
