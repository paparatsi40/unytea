# 06 — Performance

## Resumen

- ⚠️ **190 archivos con `"use client"`** vs 146 componentes totales — sumando pages, hooks y wrappers, eso es ~70%+ del frontend marcado como client. **Significativo client sprawl.**
- Solo **3 boundaries de `<Suspense>`** detectados en toda la app — limitando los beneficios de streaming.
- **`export const dynamic = "force-dynamic"`** en 32 archivos: muchas pages se renderizan dinámicas siempre, anulando ISR/cache.
- **`revalidatePath`/`revalidateTag`/`unstable_cache`** referenciadas en 55 archivos — uso decente de invalidación, pero hay que verificar que sea consistente con el `force-dynamic`.
- Solo **2 `<img>` tags** vs **18 archivos con `next/image`** — buena adopción de Next Image.
- `optimizePackageImports` limitado a `lucide-react` y `@radix-ui/react-icons` — extender.
- Bundle pesados sin lazy: `framer-motion` (15+ files), `recharts`, `@excalidraw/excalidraw`, `@livekit/components-react`, `lottie-react`, `@tiptap/*`. Muchos se cargan en marketing/dashboard común.

## "Use client" sprawl

```
"use client" files (.ts/.tsx)           : 190
"use server" files (.ts/.tsx)           :  44
Total components (.tsx in components/)  : 146
Components in components/ui/            :  18 (9 client, 9 server — bien balanceado)
```

### Detectados como **client sin necesidad clara** (no usan hooks/handlers/router)

Muestra (primeros 10 encontrados con `grep -L "useState|useEffect|useRef|useReducer|onClick|onChange|onSubmit|usePathname|useRouter"` sobre archivos client):

- `components/achievements/AchievementStats.tsx`
- `components/ai/AIWidgetProvider.tsx`
- `components/auditorium/MemberAvatar.tsx`
- `components/community/layouts/AcademyLayout.tsx`
- `components/community/layouts/DashboardLayout.tsx`
- `components/community/layouts/MinimalistLayout.tsx`
- `components/community/layouts/ModernGridLayout.tsx`
- `components/community/sections/AboutSection.tsx`
- `components/community/sections/CTASection.tsx`
- `components/community/sections/CustomHTMLSection.tsx`

Esto **probablemente sea inexacto** (algunos importan motion/icons que ellos sí re-exportan client, lo que justifica). Pero los **community/layouts/\*** y **community/sections/\*** parecen perfectos candidatos a server: son layouts estáticos que renderizan branding + contenido server-fetched. Marcarlos client significa que toda esa rama del árbol pierde SSR streaming y se hidrata en cliente.

**Acción**: revisar manualmente cada uno con `npx next-unused` o similar, o ir uno a uno con un thinking pass.

## Caching y rendering strategy

```
revalidate/unstable_cache/dynamic exports: 55 archivos
force-dynamic exports:                     32 archivos
```

Hay **32 pages/routes con `force-dynamic`** — significa que esas vistas NUNCA se pre-renderizan ni cachean. Para una landing/marketing y rutas como `/c/[slug]` (community page pública), `force-dynamic` mata SEO + perf. Auditar:

- `app/api/communities/[slug]/landing/route.ts` (visto) usa `export const dynamic = "force-dynamic"` — para una landing route que retorna JSON con datos públicos es defendible, pero podría ser `revalidate = 60`.
- Verificar si las páginas `[locale]/community/[slug]/page.tsx` y `[locale]/c/[slug]/page.tsx` están también force-dynamic. Si sí, oportunidad enorme de speed.

## Suspense boundaries

Solo **3** detectados. Sin Suspense:

- Streaming en Next 14 no entrega chunks parciales.
- En pages con varios data fetches, una sola query lenta bloquea todo el render.

Recomendación: añadir `<Suspense fallback={<Skeleton/>}>` alrededor de secciones con datos independientes.

## Bundle: imports pesados sin lazy

| Librería                    | Tamaño (approx) | Archivos que la importan             | Dynamic import?                                               |
| --------------------------- | --------------- | ------------------------------------ | ------------------------------------------------------------- |
| `framer-motion`             | ~80 KB gz       | 15+                                  | ❌                                                            |
| `recharts`                  | ~250 KB gz      | `components/analytics/*` (varios)    | ❌                                                            |
| `@excalidraw/excalidraw`    | **~1 MB** gz    | 1 archivo (`SessionWhiteboard`)      | ❌                                                            |
| `@livekit/components-react` | ~150 KB gz      | `EnhancedVideoCall`, `LivePoll`, etc | ❌ (en client component sí, pero la página completa lo carga) |
| `lottie-react`              | ~100 KB gz      | 1-3 archivos                         | ❌                                                            |
| `@tiptap/*`                 | ~100 KB gz      | `RichTextEditor`                     | ❌                                                            |
| `html-to-image`             | ~30 KB gz       | 1 archivo (`ShareableMetrics`)       | ❌                                                            |

**Recomendación**: `dynamic(() => import("..."), { ssr: false })` para Excalidraw y video call. Esos componentes solo se montan cuando el user llega a las vistas correspondientes, no antes.

## `next/image` adoption

- **2 `<img>` tags raw** detectados — excelente, casi todo usa `next/image`.
- 18 archivos importan `from "next/image"` — la regla de ESLint `@next/next/no-img-element: "warn"` está activa.

`next.config.mjs` configura `formats: ["image/webp", "image/avif"]`, `minimumCacheTTL: 1 año`, deviceSizes y imageSizes razonables, remote patterns para 7 dominios (utfs.io, uploadthing, clerk (legacy!), googleusercontent, githubusercontent, discordapp, unsplash).

⚠️ **`hostname: "img.clerk.com"`** — vestigio del intento Clerk (auth) que fue reemplazado por NextAuth. Eliminar para reducir lista.

## Database access patterns (señales de N+1)

Búsqueda rápida `await prisma.X` dentro de `.map`/`.forEach`/`for...of` con grep. Resultados:

- `app/actions/ai-recommendations.ts:65` y siguientes — varias queries seguidas pero no claramente en loop sin verificar.
- `app/actions/buddy.ts:55`, `buddy-enhanced.ts:85` — queries individuales, OK aparentemente.
- `app/actions/messages.ts:435`, `:489` — bulk lookups, OK.

No detecto N+1 obvios pero **no fue un escaneo exhaustivo**. Recomendar añadir Prisma query logging en dev + audit manual de los endpoints más usados.

## Database queries: optimizaciones obvias

- ✅ `User`, `Community`, `Member`, `Post` tienen indexes razonables.
- ✅ `Post @@index([communityId, createdAt])` — perfecto para feed paginado.
- ✅ `Member @@index([role])` — útil para list-by-role.
- ⚠️ `Comment` indexes son razonables pero queries en feeds podrían beneficiarse de un `@@index([postId, createdAt])` para sort de recientes.

## Otros

### `optimizePackageImports`

En `next.config.mjs`:

```js
experimental: {
  optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
}
```

Solo 2 packages. Agregar candidatos:

- `date-fns` (cada import sin tree-shake mete 80 KB+)
- `lodash` si se usa
- `framer-motion`
- `@livekit/components-react` (parece soportarlo)
- `lucide-react` ya está

### `next-intl` runtime

Marketing pages se cachean en CDN (middleware bypassea auth) — ✅.
Pero `next-intl` actualmente requiere recargar el JSON namespace en cada SSR. Si `locales/*.json` crecen mucho (~22 KB actual), agregar overhead. OK para el tamaño actual.

### Streaming / Edge runtime

No detecté uso de `export const runtime = "edge"` en API routes. Para endpoints rápidos (livekit/token, push/vapid, og), Edge runtime acelera cold start. Considerar.

## Findings

1. **[P1] Client sprawl: 190 archivos `"use client"`**: muchos componentes server-friendly están marcados client. Audit y migrar a server donde no se necesite interactividad. Beneficio: bundles más chicos + streaming + SSR real.
2. **[P1] 32 routes con `force-dynamic`**: mata cache y SEO. Investigar cada caso, cambiar a `revalidate = N` donde se pueda.
3. **[P1] Solo 3 `<Suspense>` boundaries**: añadir alrededor de fetches independientes en pages largas (dashboard home, community page).
4. **[P1] `@excalidraw/excalidraw` (1 MB) cargado sin dynamic import**: usuario carga el bundle al entrar a la app aunque nunca abra el whiteboard. `dynamic(import, {ssr:false})`.
5. **[P1] `@livekit/components-react` cargado en bundles donde no se usa video**: similar a Excalidraw — lazy load.
6. **[P2] `optimizePackageImports`** limitado a 2 packages: extender a `date-fns`, `framer-motion`, otros.
7. **[P2] Posibles N+1 en `app/actions/`**: no detectados con grep automático pero merece audit profundo con Prisma logging activo.
8. **[P2] `img.clerk.com` en remotePatterns**: legacy de cuando se intentó Clerk auth. Eliminar.
9. **[P2] No hay `runtime = "edge"` en endpoints rápidos**: `/api/og`, `/api/push/vapid`, `/api/livekit/token` son candidatos.
10. **[P2] No hay bundle-analyzer configurado**: instalar `@next/bundle-analyzer` (devDep) para verificar el tamaño real de bundles por route.
11. **[P2] `recharts` cargado en pages de analytics**: si las pages de analytics solo cargan cuando el user va a `/analytics`, OK. Verificar que no esté en bundle global.
12. **[P2] Marketing landing es client por `generate_landing.py`**: el script genera `app/[locale]/page.tsx` con `"use client"` al inicio. Una landing como esta debería ser un Server Component que renderiza SSR estático. Convertir.
13. **[P2] No detecto uso de React Query SSR hydration**: si pages SSR fetch data y luego React Query la re-fetch en cliente, gasto duplicado. Verificar.

## Próximas acciones (Sprint 1)

- (medio día) Audit de "use client" en `components/community/layouts/` y `sections/`: migrar a server donde no haya interactividad.
- (1 hora) Dynamic import de `@excalidraw/excalidraw` y `@livekit/components-react` en sus consumidores.
- (2 horas) Audit de `force-dynamic` en 32 archivos: cambiar a `revalidate = 60` donde aplique.
- (2 horas) Añadir Suspense boundaries en dashboard home y community/[slug] pages.
- (30 min) Instalar `@next/bundle-analyzer`, correr `ANALYZE=true npm run build`, reportar top-10 bundles.
- (30 min) Eliminar `img.clerk.com` de remotePatterns.
- (1 hora) Extender `optimizePackageImports` con date-fns y framer-motion.
- (medio día) Convertir landing `app/[locale]/page.tsx` a Server Component.
