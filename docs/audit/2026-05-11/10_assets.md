# 10 — Assets estáticos

## Resumen

- `public/` total: ~3.6 MB con 26 archivos. **`excalidraw-assets/` solo aporta 3.1 MB** — vendor JS + 5 fuentes Excalidraw.
- 10 íconos PWA (72→512 px, incluye 2 maskable) bien dimensionados — 232 KB total.
- `unytea-logo.png` 208 KB — pesa para un logo. Convertir a SVG si es vector original; sino, optimizar.
- `manifest.json` completo y bien configurado (start_url, theme, categories, shortcuts).
- `robots.ts` y `sitemap.ts` dinámicos, well-formed: incluyen 3 locales (en/es/fr), blog posts, public sessions, hreflang.
- No detecté **assets con branding "Mentorly"** en `public/` (✅). Solo el logo unytea + íconos genéricos.
- 4 SVGs default de Next.js (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`) — bloatware del template inicial. Eliminar.

## Inventario `public/`

```
public/
├── excalidraw-assets/        3.1 MB total
│   ├── Assistant-Bold.woff2          ~28 KB
│   ├── Assistant-Medium.woff2        ~28 KB
│   ├── Assistant-Regular.woff2       ~28 KB
│   ├── Assistant-SemiBold.woff2      ~28 KB
│   ├── Cascadia.woff2                ~50 KB
│   ├── Virgil.woff2                  ~50 KB
│   ├── vendor-XXXX.js                ~3 MB ⚠️
│   └── vendor-XXXX.js.LICENSE.txt
├── icons/                    232 KB total
│   ├── icon-72x72.png
│   ├── icon-96x96.png
│   ├── icon-128x128.png
│   ├── icon-144x144.png
│   ├── icon-152x152.png
│   ├── icon-192x192.png
│   ├── icon-384x384.png
│   ├── icon-512x512.png
│   ├── icon-maskable-192x192.png
│   └── icon-maskable-512x512.png
├── file.svg                  391 B  ⚠️ template default
├── globe.svg                 1 KB   ⚠️ template default
├── next.svg                  1.4 KB ⚠️ template default
├── vercel.svg                128 B  ⚠️ template default
├── window.svg                385 B  ⚠️ template default
├── manifest.json             2.2 KB ✅
├── sw.js                     6 KB   ✅ service worker
└── unytea-logo.png           208 KB ⚠️ (PNG, no SVG)
```

## Archivos pesados (>500 KB)

| Archivo                                   | Tamaño | Comentario                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/excalidraw-assets/vendor-XXXX.js` | ~3 MB  | **Bundle Excalidraw vendored**. Se sirve solo cuando el componente Excalidraw monta. El problema: vive en `public/` y se versiona en git. Cada cambio de versión Excalidraw mete 3 MB en git history. Lo correcto sería que `@excalidraw/excalidraw` lo cargue por sí mismo desde `node_modules`, no que esté en `public/`. |

## Branding remnants

`grep -r "Mentorly\|mentorly"` en `public/`:

- 0 hits. ✅

Logo: `unytea-logo.png` (208 KB) — usado en OG image dinámica (commit `ae81d1d2 feat(seo): add Unytea logo to dynamic OG image`).

⚠️ **No detecté favicon.ico personalizado** (a nivel root `/c/unytea/app/favicon.ico` existe — Next App Router lo sirve automático). Verificar que sea el correcto y no el default de Next.

⚠️ **No detecté OG images estáticas** — todo se genera dinámicamente vía `/app/og/`. OK.

## Fuentes

`grep "next/font|geist"`:

- `app/layout.tsx` la única referencia.

`package.json` tiene `"geist": "^1.3.1"` — instalada como dependency.

`public/excalidraw-assets/*.woff2` — fuentes específicas de Excalidraw (no de la app). 6 fonts, ~210 KB combinados.

**No detecté fuentes propias del sitio en `public/fonts/`**. Si la app usa Geist via `next/font` (importado en layout), ese flow es óptimo (auto-subset, preload).

## PWA setup

- ✅ `manifest.json` válido con 10 íconos + 2 maskable + 3 shortcuts (Dashboard, Communities, Sessions).
- ✅ Service worker en `sw.js` con custom Cache-Control header en `next.config.mjs:81-91` (no cache, must-revalidate, Service-Worker-Allowed: /).
- ✅ `manifest` linkeado desde `app/layout.tsx` (asumido por convención App Router).
- `theme_color: #7c3aed` (violeta) coincide con Tailwind primary asumido.
- ⚠️ `screenshots: []` está vacío. Para PWA install prompt en mobile Chrome/Edge, agregar 2-3 screenshots ayuda mucho a UX.

## SEO setup

### `robots.ts` (App Router metadata API)

```ts
{
  userAgent: "*",
  allow: "/",
  disallow: ["/api/", "/dashboard/", "/onboarding/", "/auth/", "/_next/", "/*?*"]
}
```

- ✅ Bloquea las rutas privadas/auth correctamente.
- ✅ `/*?*` evita indexar URLs con query params (duplicate content control).
- `BASE_URL = "https://www.unytea.com"` hardcoded — confirmar que coincide con producción.

### `sitemap.ts`

- Genera entries multi-locale (en/es/fr) con hreflang `alternates.languages` ← buen SEO.
- Static paths: `/`, `/explore`, `/blog`, `/changelog`, `/documentation`, `/library`, `/privacy`, `/terms`, `/cookies`, `/contact`.
- Dinámico: blog posts via `getAllPosts()`, public sessions via `getPublicSessionsForSEO()`.
- `BASE_URL = "https://www.unytea.com"` consistente con robots.

⚠️ **No incluye communities públicas en sitemap** (`/c/[slug]` o `/community/[slug]`). Si comunidades públicas existen, el sitemap pierde el long-tail SEO de comunidades destacadas. Comparar contra el commit `5f97...` o el equivalente que añadió blog/changelog/contact a SEO.

## OG image dinámica

`app/og/` es Next dynamic OG route. Commits recientes:

- `ae81d1d2 feat(seo): add Unytea logo to dynamic OG image`
- `003b1099 fix(middleware): exclude /og from intl matcher (was causing 404 on dynamic OG image)`

Excelente: la ruta funciona y produce OG con logo Unytea. ✅

## Otros assets

### `next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg`

Default template assets. ¿Están referenciados desde algún componente? Verificar — si no, **borrar todos**. Para una app que NO es la landing Next template, no agregan valor.

### `sw.js` (service worker)

6 KB. Configurado con Cache-Control: no-cache via `next.config.mjs:84-90` ✅. No inspeccionado el contenido en detalle (caching strategies, install/fetch handlers).

## Findings

1. **[P1] `public/excalidraw-assets/vendor-XXXX.js` (3 MB) versionado en git**: cada update de Excalidraw mete 3 MB al history. Configurar Excalidraw para cargar assets desde su propio `node_modules` (la env `NEXT_PUBLIC_EXCALIDRAW_ASSET_PATH` está seteada a `"/"` en `next.config.mjs:45` — sugiere que apuntó a `/excalidraw-assets/` y por eso quedó en public). Investigar si se puede dejar que Excalidraw cargue assets desde su CDN o por dynamic import.
2. **[P2] `unytea-logo.png` 208 KB**: si el original es vectorial, convertir a SVG. Si raster, optimizar con `pngquant` o pasarlo a WebP. Para un logo que se usa en OG, navbar, manifest, hay valor en reducir.
3. **[P2] 5 SVGs default de template Next** (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`): probablemente huérfanos. Borrar.
4. **[P2] `manifest.json.screenshots: []` vacío**: agregar 2-3 screenshots para PWA install prompt mejorado.
5. **[P2] Sitemap no incluye `/c/[slug]` y `/community/[slug]`**: comunidades públicas no se indexan. Si quieren SEO de long-tail de comunidades destacadas, añadir.
6. **[P2] `BASE_URL` hardcoded** en `robots.ts` y `sitemap.ts`: usar `process.env.NEXT_PUBLIC_APP_URL` para consistency y para que staging tenga distinto URL.
7. **[P2] No hay archivo `.well-known/security.txt`**: para repo público con tier "production", buena práctica añadir contact + acknowledgments.

## Próximas acciones (Sprint 1)

- (30 min) Verificar uso de los 5 SVGs default (`file.svg` etc.) — borrar si no referenciados.
- (30 min) Optimizar `unytea-logo.png` a SVG o WebP.
- (1 hora) Investigar configuración Excalidraw para cargar assets desde node_modules — eliminar `public/excalidraw-assets/` del repo (3 MB).
- (15 min) Reemplazar `BASE_URL` hardcoded con `process.env.NEXT_PUBLIC_APP_URL ?? "https://www.unytea.com"`.
- (30 min) Añadir 2 screenshots al `manifest.json` (mobile + desktop).
- (1 hora) Decidir si añadir `/c/[slug]` al sitemap.ts.
