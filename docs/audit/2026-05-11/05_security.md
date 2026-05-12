# 05 — Seguridad (repo PÚBLICO)

## Resumen

- ✅ **NO se detectaron secretos commiteados** en git history: `.env` nunca fue trackeado, no aparecen `sk_live_`/`sk_test_` (Stripe), `DATABASE_URL` con `postgres://`, ni `neondb_owner` con credenciales. Buen housekeeping histórico.
- ✅ `.gitignore` cubre `.env`, `.env.*.local`, `.env.production.local`, `.next`, `.vercel`, `*.tsbuildinfo`, `coverage/`, archivos build.
- ✅ Headers de seguridad razonables en `next.config.mjs` (HSTS, X-Frame-Options, CSP, Referrer-Policy, X-Content-Type-Options).
- ⚠️ **CSP relajado**: `script-src` permite `'unsafe-eval'` y `'unsafe-inline'` para soportar LiveKit y Vercel Live. Estos vectores abren XSS si hay injection. Considerar nonces para inline scripts y un Strict CSP.
- ⚠️ **`Permissions-Policy: camera=*, microphone=*, autoplay=*`** — sin restricciones. Para una app multi-tenant es permisivo. OK si se justifica con LiveKit; mejor mantener `self` + dominios específicos.
- ⚠️ **8 vulnerabilidades HIGH npm** (ver reporte 02). Repo público → cualquiera ve los CVEs.
- ⚠️ Rate limiting solo en **5 de 47 API routes** (10%). Validación zod en **3 de 47** (6%).
- 🔒 Scripts en raíz (`reset-postgres-password.ps1` etc) **no contienen credenciales hardcodeadas**. Una referencia a path legacy `Mentorly` — cosmético.

## A. Historia de secretos en git

Comandos ejecutados (read-only):

```bash
git log --all --full-history --name-only --diff-filter=AD -- '.env' '.env.local' '.env.production'
git log --all -p -S "DATABASE_URL=" --oneline
git log --all -p -S "neondb_owner" --oneline
git log --all -p -S "postgres://" --oneline
git log --all -p -S "postgresql://" --oneline
git log --all -p -S "sk_live_" --oneline
git log --all -p -S "sk_test_" --oneline
git log --all -p -S "NEXTAUTH_SECRET=" --oneline
git ls-files | grep ".env"
```

**Resultados**:
- `.env`/`.env.local`/`.env.production` nunca fueron añadidos al repo. ✅
- `DATABASE_URL` aparece en `.env.example` (que es lo correcto — placeholder).
- `postgres://`, `postgresql://`: 0 hits con valores reales en history.
- `sk_live_`/`sk_test_`: 0 hits con valor real (solo strings tipo `sk_creator_placeholder` en seed).
- `NEXTAUTH_SECRET=`: commits `795194d1` y `6f316099` cambiaron `.env.example` con el placeholder `your-secret-here` — OK.
- `git ls-files | grep .env` retorna solo `.env.example` — ✅.

**Tag `pre-i18n-backup`** también escaneado vía `git log --all`: limpio.

✅ **Conclusión**: el git history aparenta estar libre de secretos. No se requiere rotation de credenciales por leak histórico.

> **Caveat**: este escaneo es por **strings literales en diffs**. Una credencial codificada en base64, o partida en variables, o presente solo en un build artifact pasado a `.next/cache` no se detecta. Para confidence completa: correr `trufflehog` o `gitleaks` sobre el repo entero antes de cualquier launch público adicional.

## B. `.gitignore`

```
# excerpts relevantes
/node_modules
/.next/
/out/
/build
/coverage
*.pem
*.tsbuildinfo
.env
.env*.local
.env.local
.env.development.local
.env.test.local
.env.production.local
.vercel
.DS_Store
build-*.txt
build-*.log
/temp-push/
*.draft.md
```

✅ Cubre lo crítico (.env, builds, vercel local).
❌ **No cubre**: `.idea/`, `.vscode/` están listados, pero `*.log`, `*.swp`, `coverage`, `lint-*.txt`, `BANNER.txt` no. Los archivos `lint-after.txt`/`lint-errors.txt` están commiteados como evidencia.

Sugerencia adicional al `.gitignore`:
```
# audit outputs
audit-*.txt
*-debug.txt
lint-*.txt
.env.audit
```

## C. Env vars audit

Búsqueda: `grep -rEoh "process\.env\.[A-Z_][A-Z0-9_]+"` en `*.ts/*.tsx/*.mjs/*.js`.

### Server-only (no expuestas al cliente)

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Prisma datasource (pooled) |
| `DIRECT_URL` | Prisma direct connection |
| `NEXTAUTH_URL` | NextAuth absolute URL |
| `NEXTAUTH_SECRET` | NextAuth JWT signing (implícita) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth Google |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | OAuth GitHub |
| `STRIPE_SECRET_KEY` | Stripe server-side |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verify |
| `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL` | LiveKit server SDK |
| `OPENAI_API_KEY` | OpenAI SDK |
| `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER` | Pusher server |
| `RESEND_API_KEY` | Email |
| `EMAIL_FROM` | Sender |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Rate limit |
| `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Push notifications |
| `CRON_SECRET` | Cron endpoints |
| `AUTO_START_RECORDING` | Feature flag |
| `NODE_ENV`, `CI` | Standard |

### Públicas (NEXT_PUBLIC_*)

| Variable | Es OK que sea pública? |
|---|---|
| `NEXT_PUBLIC_APP_URL` | ✅ sí (URL canonical) |
| `NEXT_PUBLIC_LIVEKIT_URL` | ✅ sí (URL WebRTC) |
| `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER` | ✅ sí (Pusher key es pública por diseño) |
| `NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID`, `NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID`, `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`, `NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID`, `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID` | ✅ price IDs son públicos |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | ✅ pública por diseño (push notifications) |
| `NEXT_PUBLIC_EXCALIDRAW_ASSET_PATH` | ✅ |

⚠️ **Inconsistencia**: `.env.example` lista `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` y `NEXT_PUBLIC_APP_NAME` y `NEXT_PUBLIC_POSTHOG_KEY`/`HOST`, pero el código **NO referencia** estas variables. Son env vars muertas en el ejemplo (o features no implementadas).

⚠️ **Stripe publishable key (`pk_live_`/`pk_test_`)** NO aparece referenciada en el código pese a estar en `.env.example`. Si el frontend hace checkout vía Stripe.js, debería estar usándola. Investigar si `@stripe/stripe-js` se inicializa con un valor hardcoded o si el checkout es 100% server-side.

✅ **No detecté secrets prefijados accidentalmente como `NEXT_PUBLIC_`**.

## D. `next.config.mjs` — headers de seguridad

```js
"Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload"  ✅
"X-Frame-Options": "SAMEORIGIN"                                              ✅ (mejor DENY si no se embebe en iframes)
"X-Content-Type-Options": "nosniff"                                          ✅
"X-XSS-Protection": "1; mode=block"                                          ⚠️ obsoleto (CSP lo reemplaza)
"Referrer-Policy": "strict-origin-when-cross-origin"                         ✅
"Permissions-Policy": "camera=*, microphone=*, autoplay=*"                   ⚠️ ver más abajo
"Content-Security-Policy": [...]                                             ⚠️ ver más abajo
```

### CSP detallado

```
default-src 'self'
base-uri 'self'
form-action 'self'
frame-ancestors 'self'
object-src 'none'
worker-src 'self' blob:
script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://*.vercel.app
            https://*.livekit.cloud https://*.livekit.io https://unpkg.com
style-src 'self' 'unsafe-inline'
img-src 'self' data: blob: https:
media-src 'self' blob: https:
font-src 'self' data: https:
frame-src 'self' https://vercel.live
connect-src 'self' https: ws: wss:
```

**Problemas**:
- `script-src 'unsafe-eval' 'unsafe-inline'` ← XSS-vulnerable. Cualquier `<script>injection</script>` en una vista corre.
- `script-src ... https://unpkg.com` ← carga arbitraria de scripts third-party desde unpkg. Si compromete unpkg, comprometen tu app. Investigar **qué carga de unpkg** (Excalidraw quizás) y limitar a dominio + subpath.
- `connect-src 'self' https: ws: wss:` ← wide open: **cualquier endpoint HTTPS/WS**. Pierde valor el CSP para data exfiltration. Restringir a dominios conocidos: `https://*.livekit.cloud https://*.pusher.com https://api.stripe.com https://api.openai.com` etc.
- `frame-ancestors 'self'` ← OK si la app no se embebe; alternativamente `'none'`.
- `style-src 'unsafe-inline'` ← Tailwind genera estilos inline. Necesario en práctica pero amplía superficie. Mitigar con nonces.

### Permissions-Policy

`camera=*, microphone=*, autoplay=*` permite a **cualquier origen** que la página embeba/abra acceder a cámara, mic, autoplay. Recomendación:

```
Permissions-Policy: camera=(self "https://*.livekit.cloud"), microphone=(self "https://*.livekit.cloud"), autoplay=(self)
```

## E. `vercel.json`

```json
{
  "crons": [
    { "path": "/api/cron/sessions", "schedule": "0 * * * *" },
    { "path": "/api/cron/session-reminders", "schedule": "*/5 * * * *" }
  ]
}
```

✅ Solo crons declarados. Sin headers, sin rewrites, sin env, sin secrets en el JSON.

⚠️ `/api/cron/autopilot` también es endpoint cron (visto en código) pero **no está en `vercel.json`** — o se trigger-ea externamente, o se está olvidando.

## F. Cookies y sesiones

(Ver reporte 03 para detalle de cookies de session.)
- `httpOnly`, `secure`, `sameSite=lax`, `__Secure-` prefix en prod. ✅
- JWT con `maxAge: 30 días` sin rotation. ⚠️
- No hay cookies adicionales seteadas que detecté. Next-intl `localeCookie` está **disabled** en middleware (línea 17) — decisión consciente para CDN cache. ✅

## G. API routes — validación e auth

| Práctica | Coverage |
|---|---|
| Importa `auth()` | 25 / 47 (53%) — 22 sin import (ver reporte 03, algunos legítimos) |
| Importa zod | 3 / 47 (6%) |
| Importa rate-limit | 5 / 47 (10%) |
| Maneja errors con try/catch | mayoría sí (no contado exhaustivamente) |

**P1**: solo 6% de las routes validan input con zod. Para una API que recibe JSON de clientes públicos, esto es bajo. Aplicar zod a todas las rutas con POST/PUT/PATCH.

## H. Scripts del repo (verificación de hardcoded creds)

| Script | Hardcoded creds | Otros riesgos |
|---|---|---|
| `clean-restart.ps1` | No | Mata procesos `node` sin discriminar (puede afectar otros proyectos Node corriendo en la sesión del dev) |
| `restart-clean.bat` | No | Idem |
| `reset-postgres-password.ps1` | No | **Cambia `pg_hba.conf` a `trust`** (autenticación sin password) y reinicia el servicio Postgres. Esto deja al Postgres local del dev **sin password durante un tiempo**. Si el dev tiene Postgres expuesto a la red, riesgo alto. Para dev local-only, OK pero requiere awareness. Referencia path legacy `C:\Users\calfaro\AndroidStudioProjects\Mentorly\web` — solo cosmético. |
| `check_translations.py` | No | Lee `locales/en.json`, imprime keys. Inocuo. |
| `generate_landing.py` | No | Sobrescribe `app/[locale]/page.tsx` (la landing) sin warning. Si un dev edita la landing y otro corre el script, se pierden cambios. |
| `check-file.js` | No | Trivial, lee 10 líneas de la landing. Inocuo. |

## I. Otros

### Headers en respuestas — Vary

`middleware.ts:158-167` appende `Accept-Encoding` al Vary para evitar cache poisoning entre clientes con/sin gzip. ✅ Bien pensado, defensa en profundidad.

### tRPC / superjson / svix

Instalados pero no usados (ver reporte 02). Cada paquete instalado es una potencial cadena de supply-chain attack. Eliminar para reducir superficie.

### Stripe webhook

`app/api/stripe/webhook/route.ts` — no inspeccionado en detalle pero confirma:
- Modelo `ProcessedStripeEvent` existe para idempotencia ✅
- `STRIPE_WEBHOOK_SECRET` referenciado en código ✅

Recomendación: verificar que se usa `stripe.webhooks.constructEvent()` para validar signature (NO solo `JSON.parse(body)`).

### Uploadthing

`@uploadthing/react@7.3.3` con CVE high (effect). Bundle se carga si hay upload pesado. **Mitigación rápida**: dynamic import del componente de upload para que CVE solo aplica cuando user llega a la vista.

## Findings

1. **[P0] CSP `script-src 'unsafe-eval' 'unsafe-inline'` + `https://unpkg.com`**: la combinación abre XSS si hay injection en cualquier vista. Auditar qué scripts inline necesita la app, migrar a nonces, eliminar `unpkg.com` o restringir a subpath conocido.
2. **[P0] CRON_SECRET fallback inseguro** (descrito en reporte 03): si la env var falta, los cron endpoints quedan públicos.
3. **[P0] 8 vulnerabilidades npm HIGH activas** (reporte 02). Repo público → atacantes ven CVEs. Plan de upgrade urgente.
4. **[P1] Rate limit solo en 5/47 API routes** (~10%): expandir a todas las rutas que aceptan input de usuario (signup, login, password reset ✅; communities/[slug]/posts CREATE, messages/send, reports/submit, ai/chat etc).
5. **[P1] Zod validation solo en 3/47 API routes**: tipos TS en código no validan input JSON arbitrario. Cualquier POST puede enviar shape inesperada.
6. **[P1] `Permissions-Policy: camera=*, microphone=*, autoplay=*`**: restringir a `self` + LiveKit domain.
7. **[P1] `connect-src 'self' https: ws: wss:`** ← exfiltración a cualquier endpoint. Restringir.
8. **[P1] CSP `unpkg.com` permitido**: identificar qué carga, limitar.
9. **[P1] No hay scan automático de secretos en CI** (no `trufflehog`/`gitleaks` action). Repo público → recomendable agregar.
10. **[P1] `reset-postgres-password.ps1` cambia pg_hba a `trust`**: documentar warning visible en el script o requerir `--yes-i-know` flag.
11. **[P2] X-XSS-Protection** ya está obsoleta (browsers la ignoran o han removido). Reemplazar con CSP correcto. No daña, solo es ruido.
12. **[P2] No verifico que `/api/stripe/webhook` use `constructEvent`** (no leído en detalle) — auditarlo.
13. **[P2] `NEXT_PUBLIC_*` muertas en `.env.example`** (`NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_POSTHOG_*`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`): limpiar `.env.example`.
14. **[P2] `lib/audit-log.ts`** existe (visto en `ls lib/`) — confirmar que está activo y qué eventos audita (no inspeccionado en detalle).
15. **[P2] No hay CORS explícito en API routes**: confiar en mismo-origin via cookie sameSite es OK. Si en futuro se abre API a clientes mobile, agregar CORS check.

## Próximas acciones (Sprint 1)

- (1 día) **Reescritura del CSP** con dominios cerrados: `script-src` sin `unsafe-eval`, `connect-src` con whitelist explícita, `style-src` con nonces o `unsafe-inline` solo si Tailwind exige (probable). Test exhaustivo en cada page (LiveKit, Pusher, Stripe, Excalidraw).
- (1 hora) Cambiar CRON_SECRET fallback (reporte 03).
- (3 horas) Añadir zod validation a las top-10 API routes con POST/PUT body.
- (2 horas) Expandir rate-limit a todas las rutas que aceptan input.
- (30 min) Limpiar `.env.example` de variables muertas.
- (1 hora) Añadir `gitleaks` o `trufflehog` action al CI workflow.
- (2 horas) Auditar `/api/stripe/webhook` para confirmar signature verification.
- (medio día) Restringir `Permissions-Policy` a self+LiveKit.
- (continuo) Plan de upgrades npm (reporte 02 — vincula directo).
