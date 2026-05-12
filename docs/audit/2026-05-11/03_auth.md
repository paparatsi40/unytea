# 03 — Sistema de autenticación

## Resumen

- **NextAuth v5** (`next-auth@5.0.0-beta.25`) con `@auth/prisma-adapter@2.7.2`. Estrategia de sesión: **JWT** (no DB-backed session), maxAge 30 días. Providers: Google, GitHub, Credentials (email/password con bcryptjs).
- Modelos NextAuth en `prisma/schema.prisma`: `Account`, `Session`, `VerificationToken`, `PasswordResetToken`. Modelo `User` (de app) está extendido con campos de profile, gamification, billing.
- Middleware (`middleware.ts`, 189 líneas) protege `/dashboard/*` y `/onboarding/*`, redirige a `/auth/signin`. Bypass auth en rutas de marketing (decisión consciente para cachear en CDN). i18n con next-intl integrado en el mismo middleware.
- Cookie session: `__Secure-next-auth.session-token` en prod, `httpOnly`, `sameSite=lax`, `secure=true`. Buen baseline.
- Mitigación de **user enumeration** vía timing attacks: corren `bcrypt.compare` contra un hash dummy aunque el user no exista (en `lib/auth.ts:87-88`). Buen práctica.
- ⚠️ Riesgos: **NextAuth v5 está en BETA** corriendo en prod. JWT en `Session` se cachea pero el modelo `Session` (DB) no se usa (drift entre adapter setup y estrategia). Email verification no parece estar enforced. Migración a OAuth crea user con `emailVerified = new Date()` automáticamente sin verificación real.

## Librería detectada

`lib/auth.ts` (194 líneas) — fuente de verdad:
- Import: `next-auth` v5 beta, `@auth/prisma-adapter`, providers `Google`, `GitHub`, `Credentials`.
- Export: `{ handlers, auth, signIn, signOut }` (forma estándar de NextAuth v5).
- Type augmentation para `Session.user.{id, username, isOnboarded, role, firstName, lastName}`.

`app/api/auth/[...nextauth]/route.ts` expone los handlers (no inspeccionado en detalle pero asumido como `{ GET, POST } = handlers`).

## Modelo de usuario y sincronización

```
User (app DB)            Account (NextAuth)        Session (NextAuth, NO usado)
├─ id                    ├─ provider               
├─ email (unique)        ├─ providerAccountId      
├─ emailVerified         ├─ access_token           
├─ password (nullable)   ├─ refresh_token          
├─ image                 └─ → user.id              
├─ isOnboarded                                     
├─ role? (no in schema)  
└─ ...                   
```

**Observación importante**: el modelo `Session` de NextAuth está en el schema pero como la estrategia es JWT, **NO se inserta nada en `sessions` table**. El adapter Prisma sigue siendo necesario para OAuth account linking (crea entradas en `accounts`). Esto es válido pero confuso para devs nuevos.

**Sincronización user-provider → user-DB** (de `lib/auth.ts:120-141`):
- `signIn` callback: si provider es google/github y user no existe, **crea User con `isOnboarded: false` y `emailVerified: new Date()`**.
- ⚠️ **`emailVerified` se setea inmediato sin verificar el email**: para OAuth está OK (Google/GitHub ya verifican email). Para Credentials no se aplica.
- `User` table tiene un campo `password?` — para usuarios OAuth queda `null`. La verificación constant-time (linea 87-89) usa un hash dummy si `password` es null o user no existe → previene enumeration.

## Flujo de autenticación

```
1. GET /auth/signin  → renderiza page con providers
2. POST /api/auth/[...nextauth]/credentials  
     └→ Credentials.authorize() valida con bcrypt
     └→ retorna user object o null
3. NextAuth firma JWT y setea cookie __Secure-next-auth.session-token
4. middleware.ts en cada request:
     - Marketing routes bypass auth()  → CDN-cacheable
     - /dashboard, /onboarding → auth() en middleware
     - Si no isLoggedIn → 302 a /auth/signin
     - Si isLoggedIn y va a /auth → 302 a /dashboard
5. Server Component / Server Action: usa `auth()` o helpers (`requireAuth()`)
```

## Helpers de auth

### `lib/auth-utils.ts` (helper de páginas/SC)

```
requireAuth()       → redirige a /auth/signin si no hay sesión
getCurrentUser()    → session.user | null
getCurrentUserId()  → id | null
isAuthenticated()   → boolean
getFullUser()       → prisma user completo
```

### `lib/authorization.ts` (RBAC)

```
requireAuth()                                  → throw "Unauthorized" si no logueado
requireCommunityMember(userId, communityId)    → throw si no member o status!=ACTIVE
requireCommunityRole(userId, communityId, …)   → check de role enum
```

**⚠️ Duplicación**: `requireAuth()` existe en AMBOS módulos con comportamiento distinto:
- `auth-utils.requireAuth()` → `redirect()` (para páginas)
- `authorization.requireAuth()` → `throw new Error()` (para server actions)

Confuso. Recomendación: renombrar uno a `requireAuthRedirect` / `requireAuthOrThrow` o consolidar.

## Cookies y sesión

De `lib/auth.ts:42-52`:

```ts
cookies: {
  sessionToken: {
    name: process.env.NODE_ENV === "production"
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token",
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    },
  },
}
```

- ✅ `httpOnly` → no accesible vía JS.
- ✅ `secure` en prod (`__Secure-` prefix lo refuerza).
- ✅ `sameSite=lax` (default razonable, permite navegación cross-site GET).
- ⚠️ No tiene `maxAge` explícito en la cookie (usa el del JWT: 30 días).
- ⚠️ No hay rotation key configurada (`session.updateAge`) — el token se firma una vez y dura 30 días.

## OAuth providers

`Google`, `GitHub` — env vars esperadas:
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

En `lib/auth.ts:61-67` se usa `!` non-null assertion → si las env vars no están definidas en prod, la build no falla pero el provider se rompe en runtime. Sin fallback. **Sugerencia**: validar env vars al boot con un module top-level check.

## Signup con email/password

`app/api/auth/signup/route.ts` (route, no server action):
- ✅ Rate limit via `rateLimiters.auth.check(\`signup:\${ip}\`)`.
- ✅ Validación zod (name min 1, email format, password min 8).
- ✅ Anti-enumeration: si el email ya existe, retorna mensaje genérico "If this email is available...".
- ✅ Envía welcome email via `lib/email.ts` (Resend).
- ⚠️ Crea User con `emailVerified` NULL — pero no hay flujo que envíe un verification email al signup (sólo welcome). Verificar si esto es deliberado.

## Password reset

Modelo `PasswordResetToken` existe (id, email, token unique, expires, createdAt) — el flujo está implementado en:
- `app/api/auth/forgot-password/route.ts` (genera token, manda email)
- `app/api/auth/reset-password/route.ts` (valida token, actualiza password)

⚠️ No inspeccionado en detalle — recomendable revisar:
- ¿Token es criptográficamente fuerte? (probablemente nanoid)
- ¿Expira en tiempo razonable (≤15 min)?
- ¿Se invalida tras uso?
- ¿Rate-limit en `/api/auth/forgot-password`?

## Email verification

⚠️ No detecté un flujo activo de verificación de email:
- `VerificationToken` existe en schema (parte de NextAuth) — usado para magic links si se habilitara EmailProvider, pero no lo veo en `lib/auth.ts`.
- Credentials provider acepta login sin chequear `emailVerified`.
- OAuth setea `emailVerified` en true automáticamente (OK).

**Si lanzás sin email verification para Credentials**: cuentas con email no verificado pueden interactuar igual que verificadas. Bajo riesgo de spam/abuso.

## Protección de rutas

### Por middleware

`middleware.ts:30-43` — `routeNeedsAuth(pathname)`:
- True para paths que arrancan con `/auth`, `/dashboard`, `/onboarding`.
- False para todo lo demás (marketing) → bypass auth para cachear en CDN.

`authMiddleware` (`middleware.ts:47`) corre `auth()` para:
- Si `/dashboard/*` o `/onboarding/*` y no logueado → redirect a `/auth/signin`.
- Si `/auth/*` y logueado (y no es callback) → redirect a `/dashboard`.
- Lógica especial para preservar locale (`Referer` header detection) — bien pensado.

### Por server action / API route

47 API routes totales:
- **25 importan `auth`** desde `@/lib/auth` (53%).
- **22 NO importan** auth:
  - Públicas legítimas: `/api/auth/*` (4), `/api/cron/*` (3, usan CRON_SECRET), `/api/webhooks/livekit` y `/api/stripe/webhook` (signature verification), `/api/uploadthing` (uploadthing maneja auth interno).
  - **Sospechosas** (deberían verificarse):
    - `/api/communities/route.ts` — listado de comunidades, debe ser público pero confirmar
    - `/api/communities/my-communities/route.ts` — **"my-" implica que requiere user**, pero no importa `auth`. ⚠️
    - `/api/communities/[slug]/route.ts`, `/api/communities/[slug]/landing/route.ts`, `/api/communities/[slug]/payments/route.ts`, `/api/communities/[slug]/posts/route.ts`
    - `/api/explore/events/route.ts`, `/api/explore/feed/route.ts` — explore puede ser público OK
    - `/api/push/subscribe/route.ts` — requiere user
    - `/api/push/vapid/route.ts` — solo retorna VAPID public key, OK
    - `/api/sessions/[sessionId]/route.ts` — ⚠️ acceso a sesión por ID; debería chequear que el user sea participante
    - `/api/user/onboarding/route.ts` — ⚠️ requiere user

Importar `auth` no garantiza que se llame; pero la ausencia de import sí garantiza que no hay session check.

## Tests de seguridad existentes

`tests/unit/auth-security.test.ts` y `tests/unit/signup.test.ts` están presentes. No inspeccionados en detalle pero son señal positiva de que hay cobertura mínima.

## Findings

1. **[P0] NextAuth v5 en beta** corriendo en producción (`5.0.0-beta.25`). En cualquier momento puede haber un breaking change. Documentar la versión pinned o esperar a GA y migrar.
2. **[P0] `/api/communities/my-communities/route.ts` y otras "my-" sin auth import**: el nombre sugiere recurso por-usuario pero no hay check. **Verificar uno por uno y agregar `await auth()` o `await requireAuth()`** (ver reporte 08).
3. **[P0] `/api/sessions/[sessionId]/route.ts` sin auth**: acceso a datos de sesión por ID. Si la ruta solo expone públicos via `slug` ya hay otro endpoint. Confirmar que esta ruta verifica membership/role.
4. **[P0] CRON_SECRET check tiene fallback peligroso**: `if (expectedSecret && cronSecret !== expectedSecret)` — si `CRON_SECRET` no está seteada, **la verificación se salta** y cualquiera puede invocar las cron jobs (`/api/cron/sessions`, `/api/cron/session-reminders`, `/api/cron/autopilot`). Si Vercel pierde la var, expones jobs internos. Recomendación: lanzar 500 si `CRON_SECRET` no está definida.
5. **[P1] Email verification para signup vía Credentials no está enforced**: los usuarios pueden crearse y actuar sin verificar email. OK para MVP, P1 si ya lanzaron.
6. **[P1] Duplicación de `requireAuth`** entre `lib/auth-utils.ts` (redirect) y `lib/authorization.ts` (throw): consolidar nombres.
7. **[P1] OAuth: si `GOOGLE_CLIENT_ID` o `GITHUB_CLIENT_ID` están vacías**, los providers se rompen silenciosamente en runtime (el `!` evita error de tipo). Validar al boot.
8. **[P1] Session model definido pero no usado**: la tabla `sessions` está creada vía Prisma pero como estrategia es JWT, queda muerta. Ahorra: o eliminar el modelo (si JWT se mantiene), o cambiar a `session.strategy = "database"` (más seguro: revocable inmediato).
9. **[P1] Session sin rotation**: el JWT tiene `maxAge: 30 días` sin `updateAge`. Si un token se filtra dura un mes. Considerar `updateAge: 24h` para refresh automático.
10. **[P2] `lib/auth.ts` linea 37**: `adapter: PrismaAdapter(prisma) as any` — el cast `as any` oculta type drift. Si actualizan `@auth/prisma-adapter` o NextAuth, este cast lo enmascara.
11. **[P2] Sin MFA / TOTP**: ARCHITECTURE.md menciona "Multi-factor authentication support (MFA)" pero no veo implementación. Documentación inflada.
12. **[P2] No hay logout server-side de todas las sesiones**: con estrategia JWT no hay forma de revocar tokens emitidos. Si un user pide "logout en todos los dispositivos" no se puede. Caso de uso real en suspensión de cuenta.

## Próximas acciones (Sprint 1)

- (medio día) Auditar las 22 rutas API sin `auth` import una por una y agregar checks faltantes. Priorizar `my-communities`, `/api/sessions/[sessionId]`, `/api/user/onboarding`, `/api/push/subscribe`.
- (1 hora) Cambiar el check de CRON_SECRET para que falle 500 si la env var no está definida en prod.
- (2 horas) Decisión: ¿implementar email verification para Credentials? Si sí, añadir a flow de signup.
- (1 hora) Consolidar `requireAuth` en uno solo y actualizar callers.
- (1 hora) Validar env vars OAuth al boot (`if (!GOOGLE_CLIENT_ID) throw`).
- (4 horas) Revisión profunda del flow de password reset (token entropy, expiry, single-use, rate limit).
- (1 día) Plan: ¿quedarse en NextAuth 5 beta o migrar a GA? Una vez que GA salga, ventana de migración corta.
