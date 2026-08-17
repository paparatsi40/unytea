# Handoff — Unytea

Documento de continuidad para arrancar una sesión nueva de Claude Code sin
perder el contexto de trabajo. Actualizado: **2026-08-17**.

Léelo entero antes de tocar nada. La sección de directivas no es negociable.

---

## 1. Directivas permanentes de Carlos

Estas rigen **todas** las tareas, no solo la actual. Están en vigor hasta que
Carlos diga lo contrario.

- **`no shortcuts, no patches — root-cause fixes with tests.`** Es la directiva
  madre. Si la solución obvia es un parche, el trabajo no está hecho.
- **Rama nueva por tarea. No toques `main`. Carlos hace el push.** Todo el
  trabajo de git es local. Nunca `git push`.
- **Nunca escribas en la base de datos de producción** (Neon). Ni migraciones,
  ni seeds, ni acciones que escriban.
- **Nunca corras `npm run build` ni `npm run analyze`** — pegan a la DB de Neon.
  Usa **`npx next build`**. Para medir bundle, lee `.next/static` directamente.
- **Paridad exacta de locales `en` / `es` / `fr`** en cada cambio de strings.
  Mismo conjunto de claves en los tres.
- **Nunca imprimas secretos**: `LIVEKIT_API_SECRET`, claves secretas de Stripe,
  `AUTH_SECRET`, `DATABASE_URL`. Las `NEXT_PUBLIC_*` sí son públicas.
- **Si el arreglo correcto requiere un refactor grande** (mover árboles de
  rutas, cambiar el límite cliente/servidor), **PARA y reporta el alcance**
  antes de ejecutarlo.

### Formato de reporte

Todo reporte **abre con un encabezado** y **cierra diciendo si queda algún
proceso corriendo**.

---

## 2. Los cinco gates

Todos verdes antes de entregar. Sin excepciones.

```bash
npm run type-check          # tsc --noEmit
npm run test                # vitest — 1146 tests, 40 archivos
npx next build              # NO npm run build (falla en prisma migrate: no hay DB local)
npm audit --omit=dev        # 0 vulnerabilities
npm run lint                # 0 errores; el baseline actual es 167 warnings
```

Más `npx prettier --check` sobre los archivos tocados.

**Cuenta los warnings de lint antes y después.** El baseline es **167**. Si tu
cambio sube ese número, es deuda nueva y hay que justificarla o quitarla.

---

## 3. Estado del repositorio

`main` está en **`a16408ee`** (_Merge fix/pricing-integrity_), sincronizado con
`origin/main`.

### Ramas pendientes del turno de merge de Carlos

| Rama                        | Commits sobre main | Qué es                                          |
| --------------------------- | ------------------ | ----------------------------------------------- |
| `chore/canonical-apex-host` | 1                  | Canonicalización del host al ápice `unytea.com` |
| `fix/oauth-provider-gating` | 2                  | Gateo de providers OAuth + enlace por email     |

Ya está en `main`: `fix/csp-partial-wildcards`, `fix/join-render-mutation`,
`fix/logout-single-click`, `fix/webhook-idempotent-membership`,
`perf/livekit-bandwidth`, `ux/01`…`ux/05`, `remediation/02-trigger-block`,
`fix/pricing-integrity`, `fix/room-reconnect-loop`.

> Hay ~40 ramas locales viejas que `git branch --no-merged main` lista como
> pendientes. Son falsos positivos: se mergearon como squash en GitHub. **No
> asumas que una rama está pendiente solo porque aparece ahí** — comprueba
> `git rev-list --count main..<rama>`.

### El merge, cuando Carlos lo pida

Patrón fijo: `git branch backup/pre-merge-<x> main` → fetch read-only → si
`origin/main` se movió, **PARA y reporta** → `git merge --no-ff` (nunca squash)
→ re-correr los cinco gates → conservar la rama → **no hacer push**.

---

## 4. Lo último que se hizo

`fix/oauth-provider-gating`, commits **`d0aa86eb`** y **`f4b2bf70`**: los
botones de Google y GitHub se mostraban aunque faltaran sus credenciales, y el
usuario descubría el fallo en el handshake (Google: `invalid_client`; GitHub:
después de teclear su contraseña).

Las non-null assertions eran lo que lo escondía: `process.env.GOOGLE_CLIENT_ID!`
le decía al compilador que el valor estaba, así que `undefined` llegaba al
provider y el error salía lejos de su causa.

- **`lib/auth-providers.ts`** es la fuente única. `oauthCredentials()` devuelve
  el par validado o `null`; exige las dos mitades y trata `""` o solo espacios
  como ausente.
- **`lib/auth.ts`** solo registra un provider si tiene credenciales. Sin ellas
  no existe: ni en `/api/auth/providers`, ni ruta de callback. Credentials va
  siempre.
- **La UI deriva los botones** de `configuredOAuthProviders()` — la misma
  función — resuelta en el servidor, no con `getProviders()`, para que el
  conjunto correcto salga en el primer paint. Eso convirtió
  `app/auth/signin/page.tsx` y `signup/page.tsx` en Server Components alrededor
  de sus cuerpos cliente. `components/auth/OAuthButtons.tsx` no renderiza nada,
  divisor incluido, cuando la lista está vacía.
- **Google lleva `allowDangerousEmailAccountLinking`** y ningún otro provider.
  Sin él, quien se registró por correo y luego pulsaba "Continue with Google"
  chocaba con `OAuthAccountNotLinked` para siempre. Google verifica la propiedad
  del email, así que enlazar por ahí es la configuración estándar; para un
  provider que no la verifica sería una vía de apropiación de cuenta.
  `auth-security.test.ts` prohibía el flag por completo: la prohibición se
  estrechó, no se quitó.

Ojo al desplegar: `/[locale]/auth/signin` y `/signup` se **prerenderizan**, así
que la lista de botones se congela en build time mientras `lib/auth.ts` lee las
variables al arrancar. Añadir credenciales en Vercel **exige redesplegar** para
que aparezca el botón.

Tests: `tests/unit/oauth-provider-gating.test.tsx` (20 tests). Los que fijan
ambos bugs fallan contra el código sin arreglar — verificado con `git stash`.

### Antes de eso

`fix/room-reconnect-loop`, commit **`04afe79c`**: la sala en vivo
(`/dashboard/sessions/[sessionId]/room`) se desconectaba y reconectaba sin fin.

Dos defectos independientes, **ninguno** regresión del commit de adaptiveStream:

1. `components/sessions/VideoRoom.tsx` pedía el token en un efecto con
   dependencias `[sessionId, t]`. `t` es el traductor de next-intl, memoizado
   contra el contexto intl, que se reconstruye con un objeto `messages`
   recién deserializado cada vez que se re-entrega el payload RSC. Identidad
   nueva de `t` → efecto re-ejecutado → `setLoading(true)` → `<LiveKitRoom>`
   desmontado → `room.disconnect()` en el cleanup → remontaje con token y
   `Room` nuevos → que vuelve a llamar la Server Action. Se sostenía solo.
2. `components/sessions/VideoRoomUI.tsx` llamaba `switchActiveDevice` al montar
   para adivinar una "cámara externa preferida", tras un ref que se reinicia
   con el montaje. Cada reconexión reiniciaba la pista publicada.

Test: `tests/unit/room-reconnect.test.tsx` (6 tests; los 6 fallan contra el
código sin arreglar — verificado con `git stash`).

---

## 5. Decisiones abiertas de Carlos

**No arranques ninguna de estas sin que él lo pida.** Están reportadas y
esperando su visto bueno.

- Reubicar `app/(dashboard)` bajo `[locale]` (refactor grande; el locale hoy se
  resuelve server-side desde cookie vía `lib/locale.ts`).
- `PLAN_LIMITS.START.maxCommunities` — límite de comunidades del plan gratuito.
- Consolidar `/dashboard/upgrade` contra `/dashboard/settings/billing`.
- Borrar `ShareableMetrics` e `ImageGallery` (código muerto).
- ~18 dependencias sin usar.
- Enganchar el feedback de sesión al `PostSessionFlow` de `/room`: desde que se
  borró `/video` **nada recoge feedback**.
- Añadir `https://js.pusher.com` al `script-src` **enforced** (hoy solo está en
  el Report-Only).
- Persistir la cámara elegida en `localStorage` (tras quitar el auto-switch,
  quien use cámara externa la elige en cada sesión).
- Checklist de despliegue del host ápice: dominios en Vercel, variables de
  entorno, callback URLs de OAuth, URL del webhook de Stripe.

---

## 6. Trampas conocidas de este repo

Cosas que ya han costado tiempo. No las redescubras.

- **Vitest no hace type-check.** Los tests pueden estar verdes con `tsc` en
  rojo. Corre siempre `npm run type-check` aparte.
- **Tests estructurales que escanean código fuente deben quitar los comentarios
  primero.** Un comentario que documenta el patrón prohibido lo cita
  literalmente y hace fallar el test. El repo ya tiene un helper `code()`
  estándar para esto — copia el de `tests/unit/livekit-room-options.test.ts`.
- **Después de borrar rutas**, `.next/types/validator.ts` queda rancio:
  `rm -rf .next` y reconstruye.
- **`tests/setup.ts` mockea `@/lib/auth` globalmente.** Cualquier diagnóstico de
  auth dentro de vitest devuelve `undefined`.
- **Heredocs de Python destrozan `\s` y `\n`.** Usa las tools Write/Edit o
  `node -e`.
- **`require("@/…")` no resuelve dentro de vitest.** El alias `@` solo se aplica
  a imports ESM. En los tests, importa estático arriba del archivo.
- **Los providers de NextAuth guardan lo que les pasas en `options`.**
  `Google({clientId})` devuelve `{id, name, type, issuer, style, options}` — el
  `clientId` está en `options`, no en la raíz. Un test que lo busque arriba lee
  `undefined`.
- **Los mocks que rechazan tienen que rechazar donde el código realmente
  llama.** Un mock que rechaza en `$transaction` pasa vacuamente contra código
  que nunca abre una transacción.
- **`use-` como prefijo activa `react-hooks/rules-of-hooks`.** Un helper que no
  es hook no puede llamarse `useAlgo`.
- **Toda server action pasa por `defineAction`** (identidad → rate limit → Zod →
  autorización de tenant → paywall). ESLint lo exige (`no-bare-server-action`).
  El seam re-lanza los errores de control de flujo de Next (`NEXT_REDIRECT`,
  `NEXT_NOT_FOUND`) — no los tragues.
- **`localeCookie: false` en `proxy.ts` tiene que quedarse así** (bug de caché
  de CDN).
- **Los Server Components nunca mutan en GET.** El prefetch de Next es un GET.

### Módulos de fuente única — úsalos, no dupliques

`lib/plans.ts` (precios y comisión), `lib/site-url.ts`, `lib/auth-cookies.ts`,
`lib/auth-providers.ts` (qué OAuth está configurado), `lib/locale.ts`,
`lib/prisma-errors.ts`, `lib/livekit/room-options.ts`,
`lib/hooks/useAccessibleDialog.ts`.

---

## 7. Stack

Next.js 16 App Router (Turbopack) · React 19 · TypeScript strict · Prisma 5 +
PostgreSQL (Neon) · NextAuth v5 beta · Stripe · LiveKit · Pusher · UploadThing ·
Resend · next-intl · Sentry · Vitest · Vercel.
