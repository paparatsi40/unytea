# 01 — Estructura y organización del repo

## Resumen

- App Router de Next.js 14 en uso (`app/`), con i18n route group `[locale]/` para pages públicas y route groups `(dashboard)/`, `(public)/` sin prefijo de locale.
- 146 archivos `.tsx` en `components/` (18 en `components/ui/`), 47 API routes, 44 archivos con `"use server"`, 49 modelos Prisma.
- **Inconsistencia mayor**: la carpeta `server/` mencionada en `ARCHITECTURE.md` NO existe; toda la lógica de servidor vive en `app/actions/` (42 archivos). `ARCHITECTURE.md` está desincronizado.
- Referencias legacy a **"Mentorly"** persisten en 3 docs root (`ARCHITECTURE.md`, `LOCALIZATION_AUDIT.md`, `QUICKSTART.md`), 38 docs en `docs/archive/`, y en el path del script `reset-postgres-password.ps1`. **0 referencias en código TS/TSX** fuera de docs.
- 8+ archivos sueltos en raíz no deberían estar versionados o tienen propósito poco claro.

## Árbol (2 niveles, sin node_modules/.next/.git)

```
/c/unytea
├── app/                      App Router
│   ├── (dashboard)/          Protected routes (sin prefijo de locale)
│   │   └── dashboard/        achievements, agenda, ai-test, analytics, c, calendar,
│   │                         communities, courses, knowledge-library, messages,
│   │                         notifications, recordings, sessions, settings,
│   │                         test-video, upgrade, video-test
│   ├── (public)/             /sessions/[slug] público
│   ├── [locale]/             en/es/fr — marketing + dashboard mirror + community/[slug] +
│   │                         dashboard/camera-test (UNTRACKED), _home (con underscore?)
│   ├── actions/              42 server actions (achievements, ai-*, autopilot, buddy,
│   │                         certificates, channels, comments, communities, courses,
│   │                         dashboard, gamification, knowledge-library, livekit, members,
│   │                         messages, notifications, onboarding, posts, quizzes,
│   │                         reactions, recording, reports, resources, search,
│   │                         session-*, settings, webhooks)
│   ├── api/                  47 route.ts (achievements, ai/chat, auth, communities,
│   │                         courses, cron, dashboard, email, events, explore, feed,
│   │                         livekit, push, pusher, reports, search, sessions, stripe,
│   │                         uploadthing, user, webhooks; admin/make-super-admin/ VACÍO)
│   ├── auth/                 signin, signup, forgot-password, reset-password
│   ├── certificates/verify
│   ├── offline/              PWA offline page
│   ├── og/                   Dynamic OG image route (afuera de [locale] a propósito)
│   ├── onboarding/
│   ├── layout.tsx, globals.css, robots.ts, sitemap.ts, favicon.ico
├── components/               35 subdirs, 146 .tsx (ui/=18)
├── docs/                     archive/ (38 archivos legacy Mentorly), audit/ (este reporte)
├── hooks/                    use-current-user, use-mobile, use-pusher, use-toast,
│                             useSessionDataChannel (5 archivos — vs 9 que se importan en código)
├── lib/                      api/, seo/, subscription-limits/, validations/ + 19 .ts
├── locales/                  en.json, es.json, fr.json (~20-22 KB c/u)
├── prisma/                   schema.prisma + migrations/ (20 carpetas + 4 SQL sueltos)
├── public/                   26 archivos. icons/ (10 PWA), excalidraw-assets/ (pesado)
├── scripts/                  check-db.ts (1 solo archivo)
├── src/                      i18n.ts (solo el plug-in de next-intl)
├── tests/                    e2e/ (4 specs Playwright) + unit/ (4 tests Vitest)
├── web/                      ⚠️ subdir misteriosa
└── (root files)
```

## Confirmaciones de stack

- ✅ App Router en uso (no Pages Router).
- ✅ Route groups: `(dashboard)/` y `(public)/` — sin prefijo de locale; `[locale]/` para marketing/multi-lang.
- ✅ Carpetas estándar: `app/`, `components/`, `lib/`, `hooks/`, `locales/`, `public/`, `prisma/`, `scripts/`, `src/`, `tests/`.
- ❌ Carpeta `server/` NO existe (ARCHITECTURE.md la documenta como si existiera).
- ❌ Carpeta `types/` NO existe en root (ARCHITECTURE.md la lista).
- ❌ Carpeta `config/` NO existe en root.

## Detalle archivo por archivo: anomalías en la raíz

### Archivos UNTRACKED detectados (`git status`)

| Archivo                                                         | Tamaño            | Propósito                                                                                                  | Acción sugerida                                                                                                                                                    |
| --------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `COMO_MAPEAR_CAPITULOS.md`                                      | 8.3 KB            | Doc en español sobre mapear capítulos (probablemente video editing)                                        | Mover a `docs/internal/` o eliminar si es scratch                                                                                                                  |
| `GUIA_PRODUCCION_VIDEOS.md`                                     | 15.8 KB           | Guía de producción de videos                                                                               | Idem — no es código del producto                                                                                                                                   |
| `app/[locale]/dashboard/camera-test/page.tsx`                   | 8 KB / 203 líneas | Página de debug que llama `navigator.mediaDevices.getUserMedia` — para probar permisos de cámara/micrófono | **Mover a `app/dashboard/test-video/` o `(debug)/` y proteger con env flag, o eliminar (las páginas `ai-test`, `test-video`, `video-test` ya están en dashboard)** |
| `prisma/migrations/20251210173306_add_recording_transcription/` | migration.sql     | Ver reporte 04 — **CONFLICTO con schema actual**                                                           | Decidir: aplicar/descartar                                                                                                                                         |
| `prisma/migrations/20251216_add_welcome_message/`               | migration.sql     | Ver reporte 04 — superseded parcialmente                                                                   | Descartar                                                                                                                                                          |
| `prisma/migrations/add_social_hub_layout.sql`                   | 125 B             | SQL stray fuera del esquema de migrations                                                                  | Ver reporte 04                                                                                                                                                     |

### Archivos commiteados que NO deberían estar versionados

| Archivo                | Tamaño | Por qué                                                                                                                                    |
| ---------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `lint-after.txt`       | 42 KB  | Output de `next lint` capturado a archivo — debería ser efímero                                                                            |
| `lint-errors.txt`      | 47 KB  | Idem                                                                                                                                       |
| `BANNER.txt`           | 8.5 KB | ASCII art / banner para terminal — uso desconocido, no referenciado                                                                        |
| `CLAUDE.md`            | 0 B    | Vacío — eliminar o llenar con instrucciones para Claude Code                                                                               |
| `check-file.js`        | 307 B  | Script trivial de 7 líneas para imprimir las primeras 10 líneas de la landing — herramienta one-off                                        |
| `tsconfig.tsbuildinfo` | 3.4 MB | Build cache de TypeScript — `.gitignore` lo ignora con `*.tsbuildinfo` pero ya estaba commiteado antes del rule (verificar `git ls-files`) |

### Scripts en root (verificar propósito)

| Script                        | Plataforma         | Propósito                                                                                           | Hardcoded creds?                                                                                                                                           |
| ----------------------------- | ------------------ | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clean-restart.ps1`           | PowerShell         | Mata Node, borra `.next`, `node_modules/.cache`, `tsbuildinfo`, arranca `npm run dev`               | No                                                                                                                                                         |
| `restart-clean.bat`           | CMD                | Mismo que arriba pero en `.bat`                                                                     | No                                                                                                                                                         |
| `reset-postgres-password.ps1` | PowerShell (admin) | Resetea password de PostgreSQL local modificando `pg_hba.conf`                                      | No (es para Postgres local del dev) — **pero referencia el path legacy `C:\Users\calfaro\AndroidStudioProjects\Mentorly\web`**                             |
| `check_translations.py`       | Python             | Imprime keys del namespace `landing` de `en.json`                                                   | No                                                                                                                                                         |
| `generate_landing.py`         | Python (17 KB)     | **Genera `app/[locale]/page.tsx` desde plantilla** — escribe la landing en disco con `f.write(...)` | No — pero es un workflow inusual: la landing del producto se "compila" de Python. **Investigar si esto sigue siendo la fuente de verdad o quedó obsoleto** |

## La carpeta `/web/` (raíz)

Contiene **solo** 3 entradas:

```
web/
├── node_modules/      (con tamaño completo)
├── package-lock.json  (54 KB)
└── package.json       (332 B, sin nombre/private flag)
```

`web/package.json` lista dependencies aisladas:

- `@livekit/components-react ^2.9.17`, `livekit-client ^2.16.0`, `livekit-server-sdk ^2.14.2`
- `@radix-ui/react-label ^2.1.8`
- `express-rate-limit ^8.2.1`, `helmet ^8.1.0`, `joi ^18.0.2` ← **estas NO se usan en el proyecto principal**
- `openai ^6.10.0`, `react-confetti ^6.4.0`

Interpretación más probable: vestigio de un intento de monorepo o backend Express paralelo. **El proyecto principal no importa nada de aquí**. Las deps `express-rate-limit`, `helmet`, `joi` son típicas de un server Express — sugieren que alguien empezó un servidor aparte y abandonó. Recomendación: **eliminar la carpeta entera** (es ~puro node_modules + un package.json de 332 B). Ahorra espacio en disco y elimina ambigüedad.

## Referencias legacy a "Mentorly"

`grep -r "Mentorly|mentorly"` con extensiones de código y docs (excluyendo `node_modules`, `.git`, `.next`, `web`):

- **166 hits totales** en 41 archivos.
- **38 archivos están en `docs/archive/`** — históricos, OK ignorarlos.
- **3 docs en raíz** (`ARCHITECTURE.md`, `LOCALIZATION_AUDIT.md`, `QUICKSTART.md`) — visibles en repo público, dan impresión de proyecto inconsistente.
- **0 archivos `.ts/.tsx/.js/.jsx/.json` con `Mentorly`** fuera de docs/archive (positivo — el rebrand del código está completo).
- 1 script PowerShell con un path hardcodeado a la carpeta vieja `AndroidStudioProjects\Mentorly\web`.

## Findings

1. **[P1] ARCHITECTURE.md desincronizado y con branding viejo**: documenta carpetas `server/`, `types/`, `config/` que no existen, dice "Mentorly" en lugar de unytea, lista "144 componentes" (hoy hay 146), "45 API routes" (hoy 47). Para repo público da mala impresión. Acción: reescribir o marcar como histórico.
2. **[P1] LOCALIZATION_AUDIT.md commiteado con header "Mentorly Web (Unytea)"**: idem, reescribir o mover a `docs/archive/`.
3. **[P1] QUICKSTART.md con Mentorly**: idem.
4. **[P2] Carpeta `/web/` huérfana en raíz**: 3 archivos + node_modules entero. Eliminar.
5. **[P2] Archivos `lint-after.txt` y `lint-errors.txt` (89 KB combinados) commiteados**: outputs de lint, no deberían estar en repo. Borrar y añadir glob al `.gitignore`.
6. **[P2] `BANNER.txt` (8.5 KB)** sin referencia ni propósito documentado.
7. **[P2] `CLAUDE.md` vacío (0 bytes)**: o se llena con instrucciones útiles para Claude Code, o se borra.
8. **[P2] `check-file.js`** script trivial que parece haber quedado tras un debug — borrar.
9. **[P2] `generate_landing.py` (17 KB)**: genera `app/[locale]/page.tsx` desde Python. Workflow inusual y peligroso (un dev que edita el .tsx puede perder cambios si alguien regenera). Confirmar si es la fuente de verdad o legacy; documentar o eliminar.
10. **[P2] 3 docs raíz con branding "Mentorly"** visible en el README del repo público.
11. **[P2] `reset-postgres-password.ps1` referencia path legacy `AndroidStudioProjects\Mentorly\web`**: actualizar mensajes o eliminar el script (solo se usa para Postgres local).
12. **[P2] Carpeta `app/api/admin/make-super-admin/` vacía** (sin `route.ts`): residuo de un endpoint en desarrollo o borrado a medias. Eliminar la carpeta o terminar la implementación.
13. **[P2] `app/[locale]/_home/`** carpeta con underscore — no es ruta de Next (los `_` no son convención del App Router). Verificar propósito; si es scratch, mover a `components/` o eliminar.
14. **[P2] Múltiples rutas debug en dashboard** (`ai-test/`, `test-video/`, `video-test/`, `camera-test/`): consolidar bajo un `(debug)/` route group y gatear con env var, o eliminar las que ya no se usan.

## Próximas acciones (Sprint 1)

- (1 hora) Borrar `lint-*.txt`, `BANNER.txt`, `CLAUDE.md`, `check-file.js`, `tsconfig.tsbuildinfo`, `web/`, `app/api/admin/make-super-admin/` (carpeta vacía).
- (30 min) Decidir destino de `COMO_MAPEAR_CAPITULOS.md` y `GUIA_PRODUCCION_VIDEOS.md` (mover a `docs/internal/` o eliminar).
- (30 min) Decidir destino de `camera-test/page.tsx` (consolidar con otras rutas debug).
- (2 horas) Reescribir `ARCHITECTURE.md` para reflejar realidad actual o moverlo a `docs/archive/` y crear uno mínimo nuevo.
- (1 hora) Mover `ARCHITECTURE.md`/`LOCALIZATION_AUDIT.md`/`QUICKSTART.md` con header "Mentorly" a `docs/archive/` o reescribir.
- (30 min) Documentar (o eliminar) `generate_landing.py`.
