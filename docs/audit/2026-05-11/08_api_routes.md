# 08 — API routes y Server Actions

## Resumen

- **47 API routes** (`route.ts`) + **44 server actions** (archivos con `"use server"`).
- De los 47 endpoints: **~30 chequean auth** (auth() / requireAuth / getCurrentUser), **17 no chequean** (la mayoría legítimas: webhooks, cron, signup, login, public discovery). 
- ⚠️ **`/api/sessions/[sessionId]/route.ts` está VACÍO** (solo tiene `export const dynamic = 'force-dynamic'` sin handlers GET/POST/etc.). Endpoint muerto.
- ⚠️ **`/api/admin/make-super-admin/` es una carpeta vacía** (sin `route.ts`). Endpoint admin nunca implementado.
- ⚠️ **`/api/cron/autopilot/` declarada como cron pero NO listada en `vercel.json`** (sólo `/sessions` y `/session-reminders` lo están). O se trigerea externamente, o se olvidó.
- ✅ Webhooks Stripe + LiveKit y NextAuth no chequean `auth()` porque tienen su propio mecanismo (signature/secret).
- Validación zod activa solo en ~3 routes. Rate limit activo solo en ~5. Patrón inconsistente.

## Inventory completo (47 route.ts)

Formato: `auth-check | métodos | ruta | observaciones`

### Pública intencional (legítimas sin auth)

| Auth | Métodos | Ruta | OK |
|---|---|---|---|
| – | (handlers) | `/api/auth/[...nextauth]` | NextAuth maneja todo ✅ |
| – | POST | `/api/auth/signup` | Rate-limit + zod + email enumeration prevention ✅ |
| – | POST | `/api/auth/forgot-password` | (no inspeccionado en detalle — verificar rate limit) ⚠️ |
| – | POST | `/api/auth/reset-password` | (idem) ⚠️ |
| – | GET | `/api/push/vapid` | Retorna `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (pública por diseño) ✅ |
| – | POST | `/api/stripe/webhook` | Signature verify (asumido, no auditado) ⚠️ |
| – | GET, POST | `/api/webhooks/livekit` | LiveKit signature verify (asumido) ⚠️ |
| – | (handlers) | `/api/uploadthing` | uploadthing maneja auth internamente ✅ |
| – | GET, POST | `/api/cron/sessions` | CRON_SECRET check (con fallback peligroso — ver reporte 03) ⚠️ |
| – | GET, POST | `/api/cron/session-reminders` | Idem ⚠️ |
| – | GET, POST | `/api/cron/autopilot` | Idem + **no listado en `vercel.json`** ⚠️ |
| – | GET | `/api/explore/feed` | Discovery público de comunidades ✅ |
| – | POST | `/api/explore/events` | **Analytics endpoint público** — solo loguea con `console.info` y retorna success. Sin persistencia ni queue. ⚠️ |

### Auth-protected (con `auth()`/`requireAuth`)

| Métodos | Ruta | Validación zod | Rate limit |
|---|---|---|---|
| GET | `/api/achievements/recent` | – | – |
| POST | `/api/ai/chat` | – | – ⚠️ (LLM call sin rate limit) |
| GET, POST | `/api/communities` | – | – |
| GET | `/api/communities/my-communities` | – | – |
| GET, PATCH | `/api/communities/[slug]` | – | – |
| GET, PATCH | `/api/communities/[slug]/landing` | – | – |
| GET, PUT | `/api/communities/[slug]/payments` | – | – |
| GET | `/api/communities/[slug]/posts` | – | – |
| GET | `/api/courses/[courseId]` | – | – |
| GET | `/api/courses/[courseId]/purchase-status` | – | – |
| GET | `/api/courses/progress` | – | – |
| GET | `/api/dashboard/activity` | – | – |
| GET | `/api/dashboard/events` | – | – |
| GET | `/api/dashboard/metrics` | – | – |
| POST | `/api/email/send` | – | – ⚠️ (puede enviar spam si no rate-limit) |
| GET | `/api/events/upcoming` | – | – |
| GET | `/api/feed/posts` | – | – |
| POST | `/api/livekit/token` | – | – |
| DELETE, POST | `/api/push/subscribe` | – | – |
| POST, PUT | `/api/pusher` | – | – |
| GET, POST | `/api/reports` | – | – |
| GET | `/api/search` | – | – |
| POST | `/api/stripe/checkout` | – | – |
| POST | `/api/stripe/community-checkout` | – | – |
| GET | `/api/stripe/community-checkout-start` | – | – |
| POST | `/api/stripe/connect/onboard` | – | – |
| GET | `/api/stripe/connect/status` | – | – |
| POST | `/api/stripe/course-checkout` | – | – |
| POST | `/api/stripe/portal` | – | – |
| GET | `/api/user/gamification-stats` | – | – |
| POST | `/api/user/onboarding` | – | – |
| GET | `/api/user/streak` | – | – |
| GET | `/api/user/subscription` | – | – |

### Rotas / Vacías

| Estado | Ruta | Acción |
|---|---|---|
| **EMPTY** | `/api/sessions/[sessionId]/route.ts` | Archivo tiene solo `export const dynamic = 'force-dynamic'` — sin GET/POST/etc. **Borrar** o terminar la implementación. |
| **EMPTY FOLDER** | `/api/admin/make-super-admin/` | Carpeta sin `route.ts`. **Borrar** o implementar (riesgo de seguridad si se implementa: requeriría validación estricta). |

### Webhooks

- `/api/webhooks/livekit/route.ts` — manejo de eventos LiveKit (recording started/ended, participant events). No inspeccionado en detalle. ⚠️ Verificar signature validation.
- `/api/webhooks/clerk/` — visto en `find` pero **probable LEGACY**: el proyecto migró de Clerk a NextAuth. Si existe el folder/route.ts, **eliminar**.

## Server Actions (`app/actions/*.ts`)

42 archivos (no 41 como dice ARCHITECTURE.md):

```
achievements.ts        ai-content.ts          ai-moderation.ts
ai-recommendations.ts  analytics-extended.ts  analytics.ts
autopilot.ts           buddy-enhanced.ts      buddy.ts
certificates.ts        channels.ts            comments.ts
communities.ts         community-builder.ts   community-feed.ts
courses.ts             dashboard.ts           gamification.ts
knowledge-library.ts   live-gamification.ts   livekit.ts
members.ts             messages.ts            notifications.ts
onboarding.ts          posts.ts               public-content.ts
public-sessions.ts     quizzes.ts             reactions.ts
recording.ts           reports.ts             resources.ts
search.ts              session-ai.ts          session-core.ts
session-course.ts      session-feedback.ts    session-jobs.ts
sessionNotes.ts        sessions.ts            settings.ts
webhooks.ts
```

⚠️ **`sessionNotes.ts` vs `session-*.ts`**: el resto usa kebab-case (`session-core`, `session-ai`), `sessionNotes` rompe convención. Consolidar nombres.

⚠️ **`sessions.ts` vs `session-core.ts`**: presumiblemente uno es legacy y otro nuevo. Investigar y consolidar.

⚠️ **`buddy.ts` vs `buddy-enhanced.ts`**: clásico smell de "old vs new". Consolidar.

⚠️ **`analytics.ts` vs `analytics-extended.ts`**: idem.

### Auth check en server actions

Búsqueda rápida: `grep -l "requireAuth\|getCurrentUserId\|auth()"` en `app/actions/*.ts` → la mayoría sí (no contado uno a uno). Para los críticos como `messages.ts`, `posts.ts`, `comments.ts`, `members.ts`, `stripe`, `livekit`, asumir que **TODOS** deben hacer auth check. Audit profundo recomendado.

### Server action sin verificar caller

`webhooks.ts` como server action es **inusual** — los webhooks no deberían ser server actions (no se llaman vía form action). Inspeccionar qué hace.

## Rutas debug en `app/(dashboard)/dashboard/`

- `/dashboard/ai-test` — playground IA
- `/dashboard/test-video` — test de video
- `/dashboard/video-test` — duplicado del anterior?
- `/dashboard/camera-test` (en `[locale]/dashboard`) — untracked

**No están protegidas por env flag**. Cualquier user logueado puede llegar. Riesgo:
- Costos: si `ai-test` invoca `/api/ai/chat` sin restricción, un usuario malicioso puede gastar tokens de OpenAI.
- Recursos: `camera-test` activa cámara/mic.

Consolidar bajo `app/(dashboard)/(debug)/*` con un guard por env (`NODE_ENV === "development"` o flag explícito).

## /og route

`/app/og/` es la dynamic OG image route (vista en commits `ae81d1d2 feat(seo): add Unytea logo to dynamic OG image`). Está fuera de `[locale]/` y se excluye del intl middleware (`og$` en el matcher line 187). Esto es correcto y un fix reciente.

## Findings

1. **[P0] `/api/sessions/[sessionId]/route.ts` vacío**: el archivo existe pero no exporta GET/POST/PATCH/DELETE. Si algún caller frontend hace fetch, recibe 404/405. Probable bug latente. Borrar o implementar.
2. **[P0] `/api/admin/make-super-admin/` carpeta sin handler**: si alguien implementa este endpoint sin auth/RBAC fuerte, abre escalada de privilegios. **Borrar la carpeta o documentar las restricciones que tendrá**.
3. **[P0] `/api/webhooks/clerk/` legacy**: si existe (vimos referencia en folder list), eliminar — Clerk no se usa.
4. **[P1] `/api/cron/autopilot` no en `vercel.json`**: o se invoca externamente (¿con qué secret?), o quedó huérfano. Resolver.
5. **[P1] `/api/ai/chat` sin rate limit**: cualquier user logueado puede spamear LLM. Aplicar `rateLimiters.ai.check(userId)`.
6. **[P1] `/api/email/send` sin rate limit**: spam-vector si se expone a flow non-admin. Verificar quién lo invoca y limitar.
7. **[P1] `/api/explore/events` analytics público que solo `console.info`**: no persiste. Si era para tracking, falta. Si era debug, eliminar.
8. **[P1] Server actions duplicados** (`sessions.ts`/`session-core.ts`, `buddy.ts`/`buddy-enhanced.ts`, `analytics.ts`/`analytics-extended.ts`): consolidar — un dev nuevo no sabe cuál usar.
9. **[P1] Rate limit aplicado solo a 5 routes**: extender a `/api/ai/chat`, `/api/communities/[slug]/posts`, `/api/reports`, `/api/email/send`.
10. **[P1] Zod validation solo en 3 routes**: extender a todas las que aceptan POST/PUT/PATCH body.
11. **[P1] Debug routes en dashboard accesibles a todo usuario logueado** (`ai-test`, `test-video`, `video-test`, `camera-test`): proteger con env flag o eliminar.
12. **[P2] Convención de nombres mixta en server actions**: `sessionNotes.ts` (camelCase) entre `session-*.ts` (kebab). Renombrar.
13. **[P2] `webhooks.ts` como server action**: investigar si tiene sentido o se debe migrar a API route.

## Próximas acciones (Sprint 1)

- (15 min) Borrar `/api/sessions/[sessionId]/route.ts` vacío (o implementar GET con auth + verify session participation).
- (5 min) Borrar `/api/admin/make-super-admin/` (carpeta vacía).
- (5 min) Verificar y borrar `/api/webhooks/clerk/` si existe.
- (30 min) Decidir destino de `/api/cron/autopilot` (incluir en vercel.json o eliminar).
- (1 hora) Añadir rate limit a `/api/ai/chat`, `/api/email/send`, otros endpoints públicos POST.
- (2 horas) Auditar server actions duplicados y consolidar.
- (2 horas) Migrar debug pages a `(debug)/` route group con env flag.
- (1 día) Plan: zod schemas para todos los endpoints POST.
