# 02 — Dependencias, vulnerabilidades, paquetes huérfanos

## Resumen

- 64 dependencies + 26 devDependencies en `package.json`. Node 20.x, npm ≥9. Package manager: **npm** (`package-lock.json` presente).
- **11 vulnerabilidades** (1 low, 2 moderate, **8 high**). 60 paquetes outdated. 7+ paquetes claramente huérfanos.
- **Prisma 5.22.0** (latest 7.8.0 → 2 majors atrás). **next-auth 5.0.0-beta.25** — beta corriendo en producción. **Next.js 14.2.28** (latest 16.x). **Stripe-js 4.x** (latest 9.x).
- 4 paquetes `@trpc/*` instalados con **0 imports** en el código — tRPC nunca fue conectado. `svix`, `superjson`, `@hello-pangea/dnd` también huérfanos.
- ⚠️ Drift: `eslint` instalado a 9.39.1 pero declarado `^8.57.0`; `eslint-config-next` instalado a 16.0.6 pero declarado `^14.2.28`. El lockfile difiere del `package.json` → próximo `npm ci` limpio puede romper builds.
- Una nota: durante el audit se corrió `npm audit` y `npm outdated` sin `npm install` previo (todo ya estaba instalado). **NO se ejecutó `npm install`** ni se modificó `node_modules`.

## Versiones clave (de `package.json`)

| Paquete | Versión declarada | Instalada | Latest | Distancia |
|---|---|---|---|---|
| `next` | `^14.2.28` | 14.2.28 | 16.2.6 | 2 majors |
| `react` | `^18.3.1` | 18.3.1 | 19.2.x | 1 major |
| `react-dom` | `^18.3.1` | 18.3.1 | 19.2.x | 1 major |
| `typescript` (devDep) | `^5.6.3` | 5.6.x | 5.x latest | OK |
| `prisma` (devDep) | `^5.22.0` | 5.22.0 | 7.8.0 | 2 majors |
| `@prisma/client` | `^5.22.0` | 5.22.0 | 7.8.0 | 2 majors |
| `next-auth` | `^5.0.0-beta.25` | 5.0.0-beta.25 | 5.0.0-beta.x | **beta** |
| `@auth/prisma-adapter` | `^2.7.2` | 2.7.2 | 2.11.2 | menor |
| `next-intl` | `^4.8.3` | — | — | (no en outdated list) |
| `stripe` | `^17.3.1` | — | — | reciente |
| `@stripe/stripe-js` | `^4.8.0` | 4.10.0 | 9.4.0 | **5 majors** |
| `eslint` (devDep) | `^8.57.0` | **9.39.1** | 10.3.0 | **drift!** |
| `eslint-config-next` (devDep) | `^14.2.28` | **16.0.6** | 16.2.6 | **drift!** |
| `vitest` (devDep) | `^4.1.3` | 4.1.3 | latest | OK |
| `@playwright/test` (devDep) | `^1.48.0` | — | — | recent |

`engines.node = "20.x"` — coincide con Vercel default y con CI (`node-version: "20.x"`). No hay `.nvmrc` — recomendable añadirlo.

## `npm audit` — vulnerabilidades

Total: **11 vulnerabilities (1 low, 2 moderate, 8 high)**.

| Paquete | Severidad | Vía | CVE / Issue | Fix |
|---|---|---|---|---|
| `next` | **HIGH** (×6 advisories) | direct | Information exposure dev server (GHSA-3h52-269p-cp9r), cache poisoning, SSRF, etc. | `next@16.2.6` (breaking) |
| `glob` | high | `@next/eslint-plugin-next` → glob | GHSA-5j98-mcp5-4vw2 (command injection vía `-c/--cmd`) | upgrade eslint-config-next |
| `@next/eslint-plugin-next` | high | dev-only (transitive) | hereda glob | `eslint-config-next@16.2.6` |
| `eslint-config-next` | high | dev | idem | idem |
| `@uploadthing/react` | high | direct | hereda effect | `@uploadthing/react@6.6.0` (breaking) |
| `@uploadthing/shared` | high | transitive | idem | idem |
| `effect` | high | via uploadthing | GHSA-38f7-945m-qr2g (AsyncLocalStorage contamination bajo carga) | upgrade uploadthing |
| `uploadthing` | high | direct | idem | upgrade |
| `postcss` | moderate | via next | GHSA-qx2v-qp2m-jg93 (XSS via `</style>`) | upgrade next |
| `icu-minify` | low | transitive (probable next-intl) | GHSA-r27j-894h-3w3p (DoS via prototype) | auto fix disponible |
| (otro moderate) | moderate | — | — | — |

`npm audit fix` (sin `--force`) resolvería al menos el low. El resto requiere `npm audit fix --force` que upgradea `next` a 16 (breaking) y `uploadthing` a 6 (breaking). **No correr en este audit**.

## `npm outdated` — 60 paquetes

Highlights (categorías):

**Mayors atrasados (riesgo de breaking si se actualizan, pero crítico)**:
- `next` 14.2.28 → 16.2.6
- `react`, `react-dom`, `@types/react`, `@types/react-dom` → 19.x
- `prisma`, `@prisma/client` 5.22.0 → 7.8.0
- `@stripe/stripe-js` 4.10.0 → 9.4.0
- `bcryptjs` 2.4.3 → 3.0.3
- `eslint` 9.39.1 → 10.3.0
- `framer-motion` 11.18.2 → 12.38.0
- `@tiptap/*` 2.27.x → 3.23.1
- `zustand` 5.0.9 → 5.0.13 (minor — fácil)

**Patches/minors faciles (sin breaking)**:
- `@livekit/components-react` → 2.9.21 (patch)
- `@tanstack/react-query` → 5.100.10 (minor)
- `@auth/prisma-adapter` → 2.11.2 (minor)
- `geist` 1.5.1 → 1.7.0
- `autoprefixer` → 10.5.0
- `@typescript-eslint/*` → 8.59.3
- `@types/node` → 22.19.19 (patch)
- `zustand` → 5.0.13

## Paquetes huérfanos (instalados pero NO importados en ningún `.ts/.tsx`)

Búsqueda: `grep -rln "from [\"']<pkg>"` excluyendo `node_modules`, `.next`, `.git`, `web`.

| Paquete | Hits | Razón posible |
|---|---|---|
| `@trpc/server` | **0** | tRPC nunca fue conectado al proyecto |
| `@trpc/client` | **0** | idem |
| `@trpc/next` | **0** | idem |
| `@trpc/react-query` | **0** | idem |
| `svix` | **0** | Webhook signature lib — probablemente intentado pero nunca usado |
| `superjson` | **0** | Suele acompañar tRPC — huérfano |
| `@hello-pangea/dnd` | **0** | El proyecto usa `@dnd-kit/*` en su lugar — DUPLICATE drag-and-drop |

Eliminar los 7 ahorra **~4 MB** de `node_modules` y elimina superficie de ataque. Verificar antes de borrar: pueden estar usados en algún archivo .mjs/.cjs o config.

Sospechosos que conviene verificar (encontró 1 hit cada uno, puede ser un archivo único o puede ser legacy):

| Paquete | Hits | Verificar |
|---|---|---|
| `html-to-image` | 1 | Probablemente usado en `components/dashboard/ShareableMetrics.tsx` — OK |
| `lottie-react` | (no testeado, verificar) | Si solo se usa para una animación, evaluar dynamic import |
| `excalidraw` | (verificar) | Componente colaborativo de pizarra — confirmar que está activo |

## Lockfile health

- ✅ `package-lock.json` presente (477 KB) — npm.
- ❌ No `pnpm-lock.yaml` ni `yarn.lock`.
- ❌ No `.nvmrc` (sólo `engines.node` en package.json).
- ⚠️ **Drift entre `package.json` y lockfile**:
  - `eslint` declarado `^8.57.0`, lockfile/instalado `9.39.1` — ¡major mismatch!
  - `eslint-config-next` declarado `^14.2.28`, instalado `16.0.6` — major mismatch.
  Esto significa que alguien corrió `npm install eslint@latest` o `npm install eslint-config-next@latest` sin actualizar `package.json`. **`npm ci` en CI puede comportarse distinto que `npm install` local** dependiendo del estado del lockfile.

## Análisis de imports en código vs `package.json`

Búsqueda inversa (importados pero no declarados): no se detectaron casos obvios. La build de Next se quejaría si faltara algo.

## CI / Vercel coincidencia

- CI `.github/workflows/ci.yml` usa `node-version: "20.x"` — coincide con `engines.node`.
- CI corre `npm ci` — si el drift de eslint causa conflicto, fallaría.
- CI lint y format-check tienen `continue-on-error: true` (cosmético, ver reporte 07).

## Findings

1. **[P0] 8 vulnerabilidades HIGH activas**. Las directas críticas son `next` (varios CVEs) y `@uploadthing/react`. El upgrade de `next` a 16 es breaking pero **el repo es público** — cualquiera puede ver los CVEs. Plan: upgradar `next` a la última 14.x patch primero (14.2.x latest) para limpiar parte sin breaking, después planear migración a 15/16.
2. **[P0] `next-auth@5.0.0-beta.25` en producción**: la rama beta puede tener cambios de API. Plan: o quedarse en una versión beta congelada documentada, o esperar GA. Para repo público es señal de inmadurez.
3. **[P1] Drift `eslint` y `eslint-config-next` entre `package.json` y lockfile**: `npm ci` reproducible está en riesgo. Sincronizar `package.json` con las versiones reales del lockfile o re-instalar para alinear.
4. **[P1] 7 paquetes huérfanos** (`@trpc/*` ×4, `svix`, `superjson`, `@hello-pangea/dnd`): eliminar de `package.json`. Reduce bundle, lockfile churn y superficie de ataque.
5. **[P1] `@stripe/stripe-js` 4.x → 9.x** (5 majors): Stripe API moderno. Planear upgrade en Sprint 1 con prueba de checkout end-to-end.
6. **[P1] Prisma 5 → 7**: dos majors atrás. 5→6 introduce nueva binary target / runtime; 6→7 ajusta tipos. Riesgo alto si se rompe `prisma generate` en Vercel build.
7. **[P2] No hay `.nvmrc`**: añadir uno con `20` o `20.18.0` para consistencia local. `engines.node = "20.x"` ya lo cubre parcialmente.
8. **[P2] Bundle: librerías pesadas a evaluar para dynamic-import**: `framer-motion`, `@excalidraw/excalidraw`, `recharts`, `lottie-react`, `html-to-image`. Ver reporte 06.
9. **[P2] `optimizePackageImports`** en `next.config.mjs` está limitado a `lucide-react` y `@radix-ui/react-icons`. Agregar `date-fns`, `lodash`-like libraries si se introducen.
10. **[P2] `@radix-ui/*`** — 16 paquetes Radix instalados directamente. shadcn/ui usa estos por debajo. Algunos pueden ser huérfanos directos (verificar). Migrar a una sola dep `@radix-ui/react-*` no es posible (cada uno es package separado por diseño), pero auditar cuáles están usados.
11. **[P2] `script: "build"`** corre `prisma db push --skip-generate` en cada deploy: este push aplica el schema **sin migrations**. **Cualquier divergencia en local entre `schema.prisma` y la DB se sincronizaría silenciosamente en cada deploy a producción** — esto es alto riesgo para una DB con datos reales. Ver reporte 04. Alternativa: `prisma migrate deploy`.

## Próximas acciones (Sprint 1)

- (30 min) Eliminar 7 paquetes huérfanos del `package.json` y correr `npm install` para regenerar lockfile.
- (1 hora) Sincronizar `eslint` + `eslint-config-next` en `package.json` con lockfile o degradar instalación a versiones declaradas.
- (2 horas) `npm audit fix` sin `--force` y revisar lo que quedó.
- (medio día) Plan de upgrade de `next` a `14.x` latest patch (no a 15/16 todavía).
- (medio día) Plan de upgrade `@stripe/stripe-js` 4→9 (con regression test de checkout).
- (1 día) Plan de upgrade Prisma 5→6→7 paso a paso.
- (1 hora) Reemplazar `prisma db push` por `prisma migrate deploy` en script `build`.
- (15 min) Crear `.nvmrc` con `20.18.0`.
