# 09 — Componentes React

## Resumen

- **146 archivos `.tsx`** en `components/` distribuidos en 35 subdirectorios.
- **18 componentes en `components/ui/`** (button, card, input, dialog, etc.) — pattern shadcn/ui pero **NO hay `components.json` de shadcn CLI**. Probablemente copy-paste manual.
- **~28 componentes huérfanos** (defined pero nunca importados) detectados con heurística mejorada — incluye 5 community layouts y varios "test/debug" components.
- **`GamificationWidget.tsx` duplicado**: existe en `components/dashboard/` y `components/gamification/`. Bug latente: cualquiera de los dos puede tener divergencia silenciosa.
- **`components/sessions/backup/`** subdirectorio sospechoso — "backup" no debería estar versionado en producto.
- **`app/[locale]/dashboard/camera-test/page.tsx`** (untracked) usa APIs `navigator.mediaDevices.getUserMedia` — página de debug que pide cámara/mic.

## Inventario

```
components/
├── achievements/
├── ai/
├── analytics/
├── auditorium/
├── buddy/
├── calendar/
├── chat/
├── community/
│   ├── layouts/        (5 archivos — MODERN_GRID, CLASSIC_FORUM, ACADEMY, DASHBOARD, MINIMALIST)
│   └── sections/       (11 archivos — Hero, About, Stats, etc.)
├── courses/
├── dashboard/
├── editor/             (RichTextEditor con TipTap)
├── explore/
├── gamification/
├── gdpr/
├── knowledge-library/
├── library/
├── live-session/
├── members/
├── messages/
├── notifications/
├── onboarding/
├── public-content/
├── pwa/                (push notification manager)
├── section-builder/    (Visual builder antiguo? — ver visual-builder/)
│   └── sections/
├── sessions/
│   └── backup/         ⚠️ subdirectorio "backup"
├── settings/
├── theme/
├── ui/                 18 archivos base
├── upload/
├── video-call/
└── visual-builder/     ⚠️ ¿reemplazado por section-builder?
```

## Librería de UI

### Base: shadcn-style en `components/ui/`

```
avatar.tsx          (client)
badge.tsx           (server)
button.tsx          (server)
card.tsx            (server)
checkbox.tsx        (client)
dialog.tsx          (client)
dropdown-menu.tsx   (client)
error-boundary.tsx  (client)  ⚠️ ORPHAN según búsqueda
image-uploader.tsx  (server)
input.tsx           (server)
label.tsx           (server)
progress.tsx        (server)
radio-group.tsx     (client)
scroll-area.tsx     (client)
select.tsx          (client)
skeleton.tsx        (server)
tabs.tsx            (client)
textarea.tsx        (server)
```

**Sin `components.json`** → shadcn CLI no se inició. Si se agregan nuevos componentes shadcn (popover, command, calendar, etc.) hay que copy-paste manual.

**Faltantes típicos de shadcn**:

- `command.tsx` (search palette) — no presente
- `popover.tsx` — sí está como `@radix-ui/react-popover` instalado, pero **no hay wrapper en `components/ui/`**
- `calendar.tsx` — `react-day-picker` instalado pero sin wrapper UI
- `toast.tsx` — `@radix-ui/react-toast` y `sonner` instalados (dos toast libraries)

### Dual toast library

`package.json` tiene **AMBOS**:

- `@radix-ui/react-toast@^1.2.2`
- `sonner@^2.0.7`
- `react-hot-toast@^2.4.1` (¡tres!)

Commit `aa881a43 fix(toast): mount sonner Toaster — 26 files were firing invisible toasts` indica que migraron a sonner pero las otras dos librerías siguen instaladas. **3 librerías para toasts** es un costo bundle innecesario.

## Componentes huérfanos (sample, ~28 detectados)

Heurística: nombre de archivo (sin .tsx) no aparece en ningún otro `.ts/.tsx` del proyecto.

| Componente                                 | Tamaño aprox | Sospecha                                                                                                               |
| ------------------------------------------ | ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `community/layouts/AcademyLayout.tsx`      | grande       | Layout type ACADEMY definido en enum pero el switch que monta el layout puede estar inline en una page con condicional |
| `community/layouts/ClassicForumLayout.tsx` | idem         | Idem                                                                                                                   |
| `community/layouts/MinimalistLayout.tsx`   | idem         | Idem                                                                                                                   |
| `community/layouts/ModernGridLayout.tsx`   | idem         | Idem                                                                                                                   |
| `community/CommunityFeedClient.tsx`        | mediano      | Posible legacy de community feed                                                                                       |
| `community/CommunityLayoutClient.tsx`      | mediano      | Idem                                                                                                                   |
| `auditorium/MemberAvatar.tsx`              | pequeño      | Posible reemplazo por `<Avatar>` UI                                                                                    |
| `courses/CourseProgress.tsx`               | mediano      | Posible legacy                                                                                                         |
| `courses/QuizBuilder.tsx`                  | grande       | El feature Quiz tiene UI sin uso?                                                                                      |
| `courses/QuizPlayer.tsx`                   | grande       | Idem                                                                                                                   |
| `dashboard/ShareableMetrics.tsx`           | grande       | Detectado en grep — confirmar                                                                                          |
| `editor/RichTextEditor.tsx`                | grande       | TipTap editor — ¿se usa? Si no, las deps `@tiptap/*` son orphan                                                        |
| `notifications/NotificationDropdown.tsx`   | mediano      | Reemplazado por NotificationCenter?                                                                                    |
| `pwa/PushNotificationManager.tsx`          | mediano      | PWA setup que no se monta                                                                                              |
| `sessions/CameraDebug.tsx`                 | mediano      | Debug component sin uso                                                                                                |
| `sessions/CopyInviteLinkButton.tsx`        | pequeño      | Posible legacy                                                                                                         |
| `sessions/EditSessionDialog.tsx`           | mediano      | Edit flow incompleto?                                                                                                  |
| `sessions/JoinSessionCTA.tsx`              | mediano      | CTA legacy                                                                                                             |
| `sessions/SessionCard.tsx`                 | mediano      | Card legacy                                                                                                            |
| `sessions/SessionLayout.tsx`               | mediano      | Layout legacy                                                                                                          |
| `sessions/SessionTranscript.tsx`           | mediano      | **Si Recording.transcription no existe en schema, este UI está roto** (ver reporte 04)                                 |
| `settings/SettingsNav.tsx`                 | pequeño      | Nav legacy                                                                                                             |
| `upload/ImageGallery.tsx`                  | mediano      | Gallery legacy                                                                                                         |
| `visual-builder/VisualBuilder.tsx`         | grande       | El builder anterior, reemplazado por section-builder                                                                   |
| `ui/error-boundary.tsx`                    | mediano      | ⚠️ **PREOCUPANTE**: si nadie envuelve con ErrorBoundary, todos los errores client crash full page                      |

⚠️ **Caveat**: la heurística puede dar **falsos positivos** si:

- El componente se importa con `dynamic(() => import(...))` (el name aparece literal en código pero el grep lo cuenta).
- El componente se referencia con un alias diferente.
- El componente se monta vía un map/registry (e.g. layouts registrados por enum value).

**Verificación recomendada**: usar `npx ts-unused-exports tsconfig.json` para detección precisa.

## Duplicados detectados

| Componente                                       | Locations                                                                                                           | Posible razón                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `GamificationWidget.tsx`                         | `components/dashboard/` y `components/gamification/`                                                                | Refactor abandonado a medias                                         |
| `BuddyDashboard.tsx`, `buddy/BuddyDashboard.tsx` | (BuddyDashboard marca como orphan pero `components/buddy/BuddyDashboard.tsx` puede existir en multiple) — verificar |
| Layouts/Sections                                 | `community/sections/` y `section-builder/sections/`                                                                 | Dos directorios "sections" — uno legacy, uno nuevo (Section Builder) |
| Builders                                         | `visual-builder/` y `section-builder/`                                                                              | Confirmar cuál vive                                                  |

## Componente especial: `app/[locale]/dashboard/camera-test/page.tsx` (untracked, 203 líneas)

Contenido inspeccionado:

- `"use client"`
- Usa `useState`, `useRef`
- Llama `navigator.mediaDevices.getUserMedia({ video: {ideal 1280x720, facingMode: "user"}, audio: true })`
- Implementa start/stop/toggle de video
- Muestra logs en pantalla con timestamps

Es un **test de cámara/mic** debug, probablemente creado para diagnosticar issues de LiveKit. **No es un feature del producto**. Recomendaciones:

- Mover a `(debug)/camera-test/` con guard `process.env.NODE_ENV === "development"`.
- O eliminar — ya hay `components/sessions/CameraDebug.tsx` (también orphan) con propósito similar.

## Tipado de props

No se hizo audit exhaustivo, pero spot-check de archivos `.tsx` muestra:

- Mayoría usa `interface Props { ... }` pattern — bien.
- Algunos componentes inline params: `function X({a, b}: {a: string; b: number})` — válido.
- Tipos `any` siguen apareciendo (ver lint warnings — `@typescript-eslint/no-explicit-any` es la #1).

## Findings

1. **[P1] ~28 componentes huérfanos**: confirmar con `ts-unused-exports`. Eliminar los que están confirmados muertos. Ahorra ~10-20% del bundle de componentes.
2. **[P1] `GamificationWidget` duplicado** entre `dashboard/` y `gamification/`: consolidar a uno y actualizar imports.
3. **[P1] `components/sessions/backup/` subdirectorio**: archivos de backup no van en repo. Eliminar.
4. **[P1] `components/visual-builder/` vs `components/section-builder/`**: confirmar cuál es activo. Eliminar el legacy.
5. **[P1] `components/ui/error-boundary.tsx` huérfano**: si no se está envolviendo, los crashes client no se aíslan. Wrap routes críticas con ErrorBoundary.
6. **[P1] `editor/RichTextEditor.tsx` puede ser huérfano**: si confirma, eliminar las 5 dependencies `@tiptap/*` (~100 KB).
7. **[P1] Tres librerías de toast instaladas** (`react-hot-toast`, `@radix-ui/react-toast`, `sonner`): post-commit `aa881a43` el winner es sonner. Eliminar las otras dos del `package.json`.
8. **[P2] No hay `components.json` (shadcn CLI)**: si querés añadir más componentes shadcn, inicializar con `npx shadcn@latest init`.
9. **[P2] `community/layouts/*Layout.tsx` huérfanos según heurística**: verificar el switch/registry que monta layouts por `community.layoutType`. Si no se monta, el feature está roto silenciosamente.
10. **[P2] Falta wrappers shadcn comunes** (popover, command, calendar): si la app las necesita, copy-paste los componentes; si no, evaluar si las deps Radix son orphan.
11. **[P2] Sessions tienen 7-8 componentes huérfanos** (CameraDebug, CopyInviteLinkButton, EditSessionDialog, JoinSessionCTA, SessionCard, SessionLayout, SessionTranscript): el feature mentor session ha tenido varios refactors visibles. Limpiar.
12. **[P2] `app/[locale]/dashboard/camera-test/`**: ya cubierto en reporte 01 y 08 — eliminar o mover a debug group.

## Próximas acciones (Sprint 1)

- (30 min) Correr `npx ts-unused-exports` o `npx knip` para detección precisa de huérfanos.
- (1 hora) Consolidar `GamificationWidget` duplicado.
- (15 min) Eliminar `components/sessions/backup/`.
- (1 hora) Decidir entre `visual-builder/` y `section-builder/`. Eliminar el legacy.
- (1 hora) Eliminar `react-hot-toast` y `@radix-ui/react-toast` deps si sonner es definitivo.
- (medio día) Audit del feature sessions: identificar componentes huérfanos y limpiar.
- (1 hora) Envolver `app/(dashboard)/dashboard/` y `app/[locale]/c/[slug]/` con ErrorBoundary.
