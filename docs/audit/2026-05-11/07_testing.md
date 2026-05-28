# 07 — Tests, lint, TypeScript, CI

## Resumen

- **🚨 Lockfile vs `node_modules` localmente DESINCRONIZADO** — esto es crítico y se descubrió durante el audit:
  - Lockfile: `next@14.2.28`. **Instalado: `next@16.0.10`** (¡2 majors arriba!).
  - Lockfile: `react@18.3.1`. **Instalado: `react@19.2.3`**.
  - Esto explica las **607 TS errors reales** que aparecen al correr `npx tsc --noEmit` localmente.
- **`npm run type-check` localmente revienta** con esos 607 errores, pero **CI pasa** porque corre `npm ci` (instala desde lockfile, Next 14). Esto es **inconsistencia local↔CI gravísima**: hay 0 confidence en que un dev pueda detectar regresiones type-level en su máquina.
- ESLint genera **293 warnings** (registrados en `lint-errors.txt`/`lint-after.txt` commiteados). Mayoría: `no-explicit-any`, `react-hooks/exhaustive-deps`.
- CI tiene **`continue-on-error: true` en lint Y format-check** — esos jobs son cosméticos, no bloquean PRs.
- Cobertura E2E mínima (4 specs Playwright). Tests unit mínimos (4 archivos: auth-security, cron-security, rate-limit, signup). No hay tests para los 47 API routes ni para los 44 server actions.

## TypeScript health

### Configuración (`tsconfig.json`)

```json
"strict": true,
"noUnusedLocals": true,
"noUnusedParameters": true,
"noImplicitReturns": true,
"noFallthroughCasesInSwitch": true,
"forceConsistentCasingInFileNames": true
```

Configuración estricta — **muy buena**. Es la razón por la que aparecen 607 errores: si fuera lax, los esconde.

### TS errors detectados (`npx tsc --noEmit`)

| Tipo                                                    | Count   |
| ------------------------------------------------------- | ------- |
| TS2339 Property does not exist                          | 319     |
| TS2353 Object literal may only specify known properties | 107     |
| TS2551 Property does not exist (suggestion)             | 72      |
| TS7006 Parameter has implicit 'any'                     | 27      |
| TS2307 Cannot find module                               | 20      |
| TS2322 Type not assignable                              | 17      |
| TS2305 Module has no exported member                    | 14      |
| TS7031 Binding element has implicit 'any'               | 12      |
| TS18048 Possibly undefined                              | 5       |
| TS7053 Element implicitly has 'any'                     | 4       |
| **Total**                                               | **607** |

(Excluí 100+ errors adicionales del `.next/dev/types/validator.ts` que son stale — referencian pages que ya no existen bajo `[locale]/dashboard/` después del rename a `(dashboard)/`).

### Causa raíz

La instalación local tiene **Next 16 + React 19**, pero el código está escrito en **Next 14 + React 18** style:

- Next 15+ cambió `{ params }: { params: { slug: string } }` a `{ params }: { params: Promise<{ slug: string }> }` (params es async). Todas las API routes y dynamic pages dan TS2322 contra Next 16.
- React 19 cambió tipos de `ReactNode`/`children` — varios `Layout` components fallan.

**Hipótesis**: alguien corrió `npm install next@latest react@latest react-dom@latest` recientemente (probablemente investigando upgrade) y no revirtió ni committeó `package.json`. Como `package-lock.json` sí quedó parcialmente actualizado pero el lockfile que se commiteó al main branch sigue siendo el de Next 14, **`npm ci` en CI recupera Next 14**, y CI pasa. El dev ve un caos local.

**Recomendación inmediata**: `rm -rf node_modules && npm ci` para sincronizar con lockfile commiteado, y luego decidir cuándo se planea el upgrade real (ver reporte 02).

### `tsconfig.tsbuildinfo`

3.4 MB en root (commiteado al repo en versiones anteriores; `.gitignore` actual lo cubre con `*.tsbuildinfo`). Verificar `git ls-files` — si está rastreado, hacer `git rm --cached`.

## ESLint

### Configuración (`.eslintrc.json`)

Extiende `next/core-web-vitals` + `next/typescript`. Rules custom razonables: la mayoría es "warn" (no "error"). Ignora `.next/**`, `out/**`, `build/**`, `tests/e2e/**/*.spec.ts`.

### Resultado actual

`lint-errors.txt` (47 KB) y `lint-after.txt` (42 KB) son outputs commiteados. Hoy:

- **293 entries** que matchean `Warning:|Error:` en lint-errors.
- Top issues (sample):
  - `@typescript-eslint/no-explicit-any`: ~100+ instances (cualquier `any` explícita)
  - `react-hooks/exhaustive-deps`: ~50+ instances (dependency arrays con missing deps)
  - `react-hooks/rules-of-hooks` called conditionally: al menos 1 instance — **esto es un bug real**, no warning estético
  - `react/display-name`, `@next/next/no-img-element` — minoritarios

Estos archivos parecen ser snapshots de runs previas (manuales). Borrar tras commiteo (`git rm`).

### `eslint-config-next` desactualizado

Declarado `^14.2.28` pero instalado `16.0.6`. La config 16 introduce reglas nuevas que generan más warnings que la 14. Otra causa de inconsistencia local↔CI.

## CI (`.github/workflows/ci.yml`)

```yaml
jobs:
  test: # vitest, ✅ blocking
  type-check: # tsc --noEmit, ✅ blocking
  lint: # next lint, ⚠️ continue-on-error: true
  format-check: # prettier --check, ⚠️ continue-on-error: true
```

### Issues

1. **`lint` con `continue-on-error: true`**: CI **no bloquea** PRs con warnings de lint. El comentario dice "TODO: quitar cuando se modernice la config" (problema "Invalid Options: useEslintrc, extensions"). Razón: `eslint-config-next@16` con `eslint@9` usa flat config; `eslintrc.json` usa legacy format. Cuando se migre `.eslintrc.json` → `eslint.config.js`, este TODO se cierra.

2. **`format-check` con `continue-on-error: true`**: Prettier check no bloquea. Acumula deuda de formato.

3. **Type-check sí es blocking**: la PR #23 ("type-check passes") menciona que lo enforzaron. Pero como CI usa Next 14 (lockfile) y el dev local usa Next 16, el dev no detecta lo que CI vería.

4. **Falta**: build job. CI no corre `next build`. Si el código rompe el build pero compila tipos, no se detecta en CI. Solo se detecta cuando Vercel intenta deploy.

5. **Falta**: e2e (Playwright). `npm run test:e2e` no corre en CI. Las E2E specs no se ejecutan.

6. **Falta**: scan de secretos (`gitleaks`/`trufflehog`).

7. **Falta**: dependabot.yml o renovate.json — sin updates automáticos. Por eso hay 60 packages outdated.

### CI env

Variables dummy bien manejadas:

```yaml
DATABASE_URL: "postgresql://ci:ci@localhost:5432/ci?schema=public"
DIRECT_URL: idem
NEXTAUTH_SECRET: "ci-dummy-secret-not-used-in-runtime"
NEXTAUTH_URL: "http://localhost:3000"
```

`prisma generate` (en `postinstall`) usa solo el schema, no DB. ✅

## Playwright (E2E)

`playwright.config.ts`:

- `testDir: ./tests/e2e`
- Projects: chromium, firefox, mobile-chrome (3) — bien
- `webServer: npm run dev` con `reuseExistingServer: !CI`
- Timeout 30s, expect 5s — defaults Playwright

### Specs presentes

```
tests/e2e/auth.spec.ts        — flow de auth (signup, login)
tests/e2e/community.spec.ts   — crear/explorar comunidades
tests/e2e/navigation.spec.ts  — links principales
tests/e2e/fixtures.ts         — shared fixtures
```

**Cobertura mínima**. No hay specs para:

- Onboarding completo (signup → onboarding → dashboard)
- Crear sesión en vivo + unirse (LiveKit)
- Stripe checkout flow
- Pago/cancelar suscripción
- Crear comunidad + invitar miembro
- Course creation/enrollment
- Push notifications subscribe
- Messages send/receive (Pusher)

### Ejecución en CI

**No se ejecutan en CI**. `package.json` define `test:e2e` pero el workflow no lo invoca.

## Vitest (Unit)

`vitest.config.ts`:

- environment: jsdom
- coverage: v8, include `lib/**`, `app/api/**`, `app/actions/**`

### Tests presentes

```
tests/unit/auth-security.test.ts  — checks defensivos NextAuth (timing attack mitigation, etc)
tests/unit/cron-security.test.ts  — checks de CRON_SECRET (probablemente)
tests/unit/rate-limit.test.ts     — rate limiter behavior
tests/unit/signup.test.ts         — signup endpoint logic
```

**Excellent foco**: 4 tests, todos sobre superficie de seguridad. Pero cobertura de código real es mínima:

- 0 tests para los 44 server actions
- 0 tests para los 47 API routes (excepto los 4 de arriba)
- 0 tests para componentes React
- 0 tests para hooks
- 0 tests para `lib/authorization.ts` (RBAC en server actions)

### Coverage

No se corre con coverage en CI (`npm test` no incluye `--coverage`). El reporter está configurado pero sin un threshold.

## Findings

1. **[P0] Desincronización local↔CI por drift en `node_modules`**: la máquina del dev tiene Next 16 + React 19 pero CI corre Next 14 + React 18. Resultado: dev ve 607 TS errors locales que CI nunca ve. Acción inmediata: `rm -rf node_modules && npm ci` para alinear, y decidir cuándo se hace el upgrade real con `package.json` actualizado.
2. **[P0] CI lint NO bloquea**: 293 warnings actuales se acumulan sin presión. Migrar `.eslintrc.json` a flat config (eslint 9) y remover `continue-on-error: true`.
3. **[P0] CI no corre `next build`**: errores que pasan tsc pero rompen build (ej. imports circulares en bundle) solo se descubren en Vercel deploy. Añadir `build` job.
4. **[P1] CI no corre E2E**: las 4 specs Playwright son inertes. Correr al menos en main + PR.
5. **[P1] `react-hooks/rules-of-hooks called conditionally`** — al menos 1 instance en lint-errors.txt. **Esto es un bug runtime** (no warning estético). Fixear antes de cualquier release.
6. **[P1] Cobertura unit tests mínima** (4 archivos). Priorizar: tests para `lib/authorization.ts`, `app/actions/communities.ts`, `app/actions/posts.ts`, `app/actions/messages.ts`, `app/api/stripe/webhook/route.ts`.
7. **[P1] No hay test E2E del Stripe checkout flow** — riesgo alto para una plataforma de monetización.
8. **[P1] No hay test E2E de LiveKit join session**: el core del producto sin smoke test.
9. **[P2] `format-check continue-on-error: true`**: idem, eliminar.
10. **[P2] `lint-errors.txt` y `lint-after.txt` commiteados (89 KB)**: borrar.
11. **[P2] No hay `dependabot.yml` ni `renovate.json`**: sin auto-updates → packages se atrasan (ver reporte 02).
12. **[P2] CI sin scan de secretos**: agregar gitleaks action.
13. **[P2] Coverage threshold no enforced**: añadir `--coverage --reporter=json-summary` y fallar si `<X%` en archivos críticos (`lib/auth*`, `lib/authorization`, server actions de pago).
14. **[P2] Pruebas e2e con `webServer: npm run dev`** en lugar de prod build: dev incluye HMR, Strict Mode double-render, etc. Para smoke tests OK; para validación de prod conviene un job extra con `npm run start` después del build.

## Próximas acciones (Sprint 1)

- (5 min) **AHORA MISMO**: `rm -rf node_modules && npm ci` para que el dev esté alineado con CI. Re-correr type-check y reportar el delta.
- (1 hora) Quitar `continue-on-error: true` de `lint` y `format-check`, después de resolver los 293 warnings o reducirlos a 0 con `--fix`.
- (2 horas) Migrar `.eslintrc.json` a `eslint.config.js` (flat config) compatible con ESLint 9.
- (30 min) Añadir job `build` al `ci.yml`.
- (1 hora) Añadir job `e2e` al `ci.yml` que corra `npm run test:e2e` con headless chromium.
- (medio día) Resolver el `react-hooks/rules-of-hooks called conditionally` (encontrar archivo y fixear).
- (1 día) Plan de tests unit: 10 tests para los server actions más críticos.
- (medio día) Stripe checkout e2e flow con test mode.
- (30 min) Borrar `lint-after.txt`, `lint-errors.txt` y añadir a `.gitignore`.
