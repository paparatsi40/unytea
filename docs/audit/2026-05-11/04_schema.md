# 04 — Schema Prisma + Neon

## Resumen

- **49 modelos** en `prisma/schema.prisma` (1450 líneas). **26 enums**. Provider PostgreSQL en Neon (`url` pooled + `directUrl` directo).
- 20 carpetas de migrations + 4 SQL sueltos en `prisma/migrations/`. **3 archivos UNTRACKED críticos**: dos migration folders y un `.sql` stray.
- ⚠️ **`script: "build"` corre `prisma db push --skip-generate`** en cada deploy a Vercel — **NO usa migrations** en prod. Cualquier divergencia local en `schema.prisma` se push-ea silenciosamente. Alto riesgo de drift / pérdida de datos por columnas droppeadas.
- ⚠️ **Conflicto entre `20251210173306_add_recording_transcription` (untracked) y el schema actual**: la migration crea tablas `session_recordings`/`session_transcriptions` con estructura *distinta* a los modelos `Recording` (table `recordings`) y `SessionNote` (table `session_notes`) que están en `schema.prisma`. Si se aplica, rompe.
- ⚠️ **Migration tracked `20260306082705_add_welcome_message`** referencia tabla `"Community"` (PascalCase) pero la tabla real es `"communities"` (mapped). **Esa migration está rota** — si se reaplica falla, y probablemente quedó al ejecutar contra una DB nueva (que `prisma db push` ya había sincronizado, escondiendo el error).
- No hay evidencia de RLS de Postgres (Neon no lo hace por default y no veo `pgRLS` extension activada). Hay triggers/funciones también — no evidentes.

## Stack DB

```
generator client { provider = "prisma-client-js" }
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")     ← Neon pooled (-pooler)
  directUrl = env("DIRECT_URL")        ← Neon directo (sin pool, para migrate/db push)
}
```

`.env.example` confirma Neon (`*.aws.neon.tech`) y separa pooled vs direct conn.

## Migrations (orden cronológico)

Carpetas en `prisma/migrations/`:

| # | Fecha | Nombre | Estado | Tracked |
|---|---|---|---|---|
| 1 | 2025-03-13 | `202503130116_add_community_id_to_mentor_session` | Aplicada | ✅ |
| 2 | 2025-12-05 | `20251205012223_add_community_page_builder` | Aplicada | ✅ |
| 3 | 2025-12-08 | `20251208160126_add_owner_bio_and_custom_content` | Aplicada | ✅ |
| 4 | 2025-12-09 | `20251209212656_add_landing_layout` | Aplicada | ✅ |
| 5 | 2025-12-09 | `20251209231417_add_video_room_name_to_mentor_sessions` | Aplicada | ✅ |
| 6 | 2025-12-09 | `20251209232740_add_session_participation_gamification` | Aplicada | ✅ |
| 7 | 2025-12-09 | `20251209233754_add_session_feedback` | Aplicada | ✅ |
| 8 | **2025-12-10** | **`20251210173306_add_recording_transcription/`** | ❌ **UNTRACKED** | ❌ |
| 9 | **2025-12-16** | **`20251216_add_welcome_message/`** | ❌ **UNTRACKED** | ❌ |
| 10 | 2026-03-06 | `20260306082705_add_welcome_message` | Aplicada (rota: ver findings) | ✅ |
| 11 | 2026-03-12 | `20260312000000_add_session_series` | Aplicada | ✅ |
| 12 | 2026-03-12 | `20260312000001_add_session_mode` | Aplicada | ✅ |
| 13 | 2026-03-12 | `20260312000002_add_recording_and_events` | Aplicada | ✅ |
| 14 | 2026-03-12 | `20260312000003_add_visibility_role_resources` | Aplicada | ✅ |
| 15 | 2026-04-07 | `20260407000000_add_streaks_and_daily_activity` | Aplicada | ✅ |
| 16 | 2026-04-07 | `20260407100000_add_quizzes_and_certificates` | Aplicada | ✅ |
| 17 | 2026-04-07 | `20260407200000_add_push_subscriptions` | Aplicada | ✅ |
| 18 | 2026-04-08 | `20260408010000_add_password_reset_tokens` | Aplicada | ✅ |
| 19 | 2026-04-08 | `20260408020000_add_deleted_at_columns` | Aplicada | ✅ |

Más 4 archivos SQL sueltos (NO son migrations Prisma estándar):
- `add_resource_library.sql` (7 KB) — tracked, parece data/setup script
- `add_social_hub_layout.sql` (125 B) — **UNTRACKED** — ver abajo
- `check_resource_library.sql` (759 B) — tracked, query de verificación
- `full_schema.sql` (81 KB) — tracked, snapshot del schema completo
- `migration_lock.toml`

## Análisis de las 3 untracked migrations

### `20251210173306_add_recording_transcription/migration.sql` — ⚠️ CONFLICTO

Crea 3 tablas nuevas:
- `session_recordings` con columnas `id, sessionId, recordingUrl, thumbnailUrl, duration, fileSize, status (RecordingStatus), startedAt, completedAt, egressId, roomId, processingError, retryCount, createdAt, updatedAt`. FK a `mentor_sessions(id)`.
- `session_transcriptions` con `id, recordingId, fullText, segments(JSONB), summary, keyPoints, actionItems, topics, language, confidence, wordCount, status, processingError, ...`. FK a `session_recordings(id)`.
- `session_notes` con `id, sessionId, userId, content, timestamp, isShared, ...`. FK a `mentor_sessions(id)` y `users(id)`.
- Define enum `TranscriptionStatus` (PROCESSING/READY/ERROR).
- Define enum `RecordingStatus` (PROCESSING/READY/ERROR).

**Conflictos con `schema.prisma` actual:**
- `schema.prisma` define `Recording` con `@@map("recordings")` — table **`recordings`** singular distinta de **`session_recordings`** de la migration.
- `schema.prisma`.`Recording` tiene columnas DIFERENTES: `url, durationSeconds, egressId @unique, fileSize, storageProvider, storageBucket, storageKey, processingStartedAt, processingEndedAt, errorMessage`. La migration tiene `recordingUrl, duration, thumbnailUrl, retryCount, roomId, processingError`.
- `schema.prisma`.`SessionNote` con `@@map("session_notes")` tiene **columnas distintas**: `content, summary, keyInsights, resources, lastEditedBy` (rich-text notes). La migration crea una tabla `session_notes` para notas con `timestamp` y `isShared` (más bien notas en-vivo por participante).
- `schema.prisma` define `enum RecordingStatus { PROCESSING, READY, FAILED }` — la migration usa `ERROR` (no `FAILED`).
- `schema.prisma` NO tiene modelo de transcripción (sí tiene `session_transcriptions`? — **No**. No existe).

**Interpretación**: alguien empezó una implementación de transcription en Dic 2025, generó la migration, **no la committeó**, y después se cambió el approach (los `20260312000002_add_recording_and_events` y siguientes refactorizaron toda esta área). Esta migration es **abandonada**. Si se aplicara hoy, crearía tablas extra que el cliente Prisma no conoce y rompería la consistencia.

**Recomendación**: borrar la carpeta. No aplicar.

### `20251216_add_welcome_message/migration.sql` — ⚠️ SUPERSEDED PARCIALMENTE

```sql
ALTER TABLE "communities" ADD COLUMN "welcomeMessage" TEXT,
                          ADD COLUMN "showWelcomeMessage" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "members"     ADD COLUMN "welcomeMessageSeen" BOOLEAN NOT NULL DEFAULT false;
```

vs `20260306082705_add_welcome_message/migration.sql`:

```sql
ALTER TABLE "Community" ADD COLUMN "welcomeMessage" TEXT;
```

**Diferencias**:
- Migration de Diciembre añade **3 columnas** (`welcomeMessage`, `showWelcomeMessage`, `welcomeMessageSeen`) en 2 tablas.
- Migration de Marzo añade **solo `welcomeMessage`** en 1 tabla.
- Schema actual tiene **solo `welcomeMessage` en `Community`** (línea 184) — coincide con la de Marzo.

**Interpretación**: la migration de Diciembre fue intento original más completo, abandonado. La de Marzo fue un do-over reducido. La de Diciembre quedó untracked como recordatorio.

**Si quieren la funcionalidad full**: aplicar las columnas `showWelcomeMessage` y `welcomeMessageSeen` con una migration nueva limpia que arregle también el bug de la de Marzo (ver siguiente).

### `add_social_hub_layout.sql` (raíz de migrations, untracked)

```sql
ALTER TYPE "CommunityLayoutType" ADD VALUE IF NOT EXISTS 'SOCIAL_HUB';
```

**Schema actual** define `enum CommunityLayoutType { MODERN_GRID, CLASSIC_FORUM, ACADEMY, DASHBOARD, MINIMALIST }` — no incluye `SOCIAL_HUB`.

**Interpretación**: alguien quiso añadir un layout `SOCIAL_HUB` pero quedó solo el SQL stray. El componente `components/community/layouts/` no lo tiene como un opción documentada (verificar). Si la feature se descartó: borrar el `.sql`. Si está pendiente: añadir al enum del `schema.prisma` y generar una migration formal.

## Bug en la migration tracked `20260306082705_add_welcome_message`

```sql
ALTER TABLE "Community" ADD COLUMN "welcomeMessage" TEXT;
```

⚠️ Usa `"Community"` (PascalCase) pero el modelo en Prisma tiene `@@map("communities")` → la tabla real se llama **`communities`** lowercase. Esa migration, ejecutada contra una DB real, debería haber fallado con `relation "Community" does not exist`. Sin embargo está commiteada como aplicada.

**Hipótesis**: la DB de prod fue inicialmente sincronizada con `prisma db push` (que el `build` script ejecuta), por lo que la columna ya existía cuando alguien generó esta migration "para registrar el cambio". Como `db push` no necesita corrrer migrations, nunca se ejecutó este SQL. Pero queda como dueda técnica: si alguien restaura desde migrations limpio, falla.

**Recomendación**: corregir la migration a `"communities"` o re-generarla limpia.

## Modelos (49) — overview

Agrupados por dominio. La lista completa está en `schema.prisma`. Highlights:

**NextAuth + Auth** (4): Account, Session, VerificationToken, PasswordResetToken
**User & social** (1+): User
**Communities** (4): Community, Member, Channel, CommunitySection
**Content** (3): Post, Comment, Reaction
**Messaging** (3): DirectMessage, Conversation, ChannelMessage, ChannelMember
**Mentoring/Sessions** (8): MentorSession, SessionSeries, SessionNote, SessionResource, Recording, SessionEvent, SessionParticipation, SessionFeedback, Availability
**Courses & Learning** (7): Course, Module, Lesson, Enrollment, CoursePurchase, LessonProgress, Quiz, QuizQuestion, QuizAttempt, Certificate
**Buddy system** (3): BuddyPartnership, BuddyCheckIn, BuddyGoal
**Monetization** (3): SubscriptionPlan, Subscription, ProcessedStripeEvent
**Gamification** (4): Achievement, UserAchievement, Notification, DailyActivity
**Resource library** (4): Resource, ResourceCategory, ResourceProgress, ResourceLike
**PWA** (1): PushSubscription
**Moderation** (1): Report

## Enums (26)

`PlatformPlan`, `MemberRole`, `MemberStatus`, `PostContentType`, `SessionStatus`, `SessionMode`, `SessionFrequency`, `RecordingStatus`, `SessionEventType`, `SessionVisibility`, `ParticipationRole`, `SessionResourceType`, `LessonContentType`, `BillingInterval`, `SubscriptionStatus`, `ReactionType`, `NotificationType`, `BuddyStatus`, `CommunityLayoutType`, `CommunitySectionType`, `ResourceType`, `ResourceStatus`, `QuizQuestionType`, `ReportReason`, `ReportStatus`, `ReportTargetType`.

⚠️ **Casing inconsistente** entre enums:
- `SessionMode { VIDEO, AUDIO }` — SCREAMING_SNAKE
- `SessionVisibility { community, public, unlisted }` — lowercase
- `ParticipationRole { host, speaker, listener }` — lowercase
- `SessionResourceType { link, pdf, slide, doc, image, video, other }` — lowercase

Mezclar casing es un riesgo cuando Prisma genera tipos TS — los strings se exportan literal y un dev que compara `if (mode === "video")` vs `if (mode === "VIDEO")` falla silenciosamente. Normalizar a SCREAMING_SNAKE.

## RLS, Triggers, Functions

`grep` rápido del `schema.prisma`: no aparecen `@@policy` ni RLS via Prisma. Neon Postgres **NO activa RLS por default** y no es common-practice en Prisma stacks (Prisma maneja autorización en código). OK para este modelo, pero **importante** documentarlo: cualquier query desde una conexión con el `DATABASE_URL` tiene acceso total a todas las tablas. Si comprometen el connection string, comprometen toda la DB.

No detecto triggers/functions declarados via Prisma (raw SQL en migrations no escaneé exhaustivamente).

## Drift entre código TS y schema

Spot-check rápido:
- `Member.points`, `Member.level` — usados en gamification: OK.
- `User.points`, `User.level`, `User.currentStreak`, `User.longestStreak` — OK.
- `User.role` aparece en `Session.user.role` (en `lib/auth.ts:17`) pero **NO existe en `User` model**. ⚠️ — el callback session no popula `role` realmente, pero el tipo lo declara. Tipo mentiroso.
- `User.email` aparece referenciado por NextAuth callbacks con `user.email!` (non-null) — el field es `String @unique` (not null) — OK.
- `Recording` tiene `transcription`? — **No**, la migration untracked sugería transcription pero nunca llegó al schema. Si hay código que la espera, romperá.

## Diseño: smells

1. **Algunos campos `points`, `level`, `currentStreak` duplicados** entre `User` y `Member` — ¿gamification por user o por community? Si la idea es ambos, OK. Si es uno solo, hay drift entre quién es la fuente de verdad.
2. **Soft delete inconsistente**: `User.deletedAt`, `Community.deletedAt`, `Post.deletedAt`, `Resource.deletedAt` existen pero otros modelos (Comment, Message, Channel) NO. Las queries probablemente filtran por `deletedAt IS NULL` solo en algunos casos. Inconsistencia → bugs.
3. **JSON fields sin schema** (`Community.theme`, `Community.pricing`, `Community.settings`, `Community.landingLayout`, etc.): valida con zod al guardar; documentar la forma esperada. Sin esto, drift entre features.
4. **`CoursePurchase` tiene `status` como `String @default("pending")`** en vez de enum. Comparado con `Subscription.status: SubscriptionStatus` — inconsistente. Convertir a enum.
5. **`BuddyCheckIn.mood`** comenta "Valid range: 1-10. Application-level validation required" — no hay constraint en DB. Si alguien escribe un `50` rompe la app. Sería mejor `@db.SmallInt` con CHECK constraint via migration raw.
6. **FKs sin índice explícito**: muchos modelos tienen `@@index([fkField])` correcto pero verificar exhaustivamente (no realizado en este audit por tiempo).

## Findings

1. **[P0] `prisma db push` en cada build de prod**: `package.json` línea 7: `"build": "prisma generate && prisma db push --skip-generate && next build"`. Esto **sincroniza el schema de prod silenciosamente** sin migrations. Cualquier cambio local en `schema.prisma` (incluyendo *drops de columna*) se aplicaría a prod en el siguiente push. **Cambiar a `prisma migrate deploy`** y dejar `db push` solo para dev local. Es un P0 crítico para una DB con datos reales.
2. **[P0] Migration tracked `20260306082705_add_welcome_message` está rota**: usa `"Community"` (PascalCase) en lugar de `"communities"` (mapeada). Si alguien corre `prisma migrate reset` falla. Regenerar migration limpia.
3. **[P0] 3 archivos untracked en `prisma/migrations/`**: ver análisis arriba. Decisión: descartar las 2 untracked, decidir destino de `add_social_hub_layout.sql`.
4. **[P0] Tipo `Session.user.role` declarado en NextAuth augmentation pero el campo `role` NO existe en `User` model**: cualquier código que lea `session.user.role` lee `undefined` y puede bypassear checks. Verificar callers de `role` y, o bien, añadir el campo al modelo o eliminar del tipo augmentation.
5. **[P1] Enum casing inconsistente**: `SessionMode { VIDEO }` vs `SessionVisibility { community }`. Normalizar.
6. **[P1] `CoursePurchase.status` como String suelto** vs `SubscriptionStatus` enum. Inconsistencia. Migrar a enum.
7. **[P1] `Recording`/`SessionNote` schema vs migration untracked**: confirmar que el código NO referencia campos que no existen (`recording.transcription`, `sessionNote.timestamp`, etc.) Si hay imports rotos, encontrar y fixear.
8. **[P1] Soft delete inconsistente** entre modelos. Decidir política (todos los modelos relevantes con `deletedAt`, o eliminar `deletedAt` y hacer hard-delete).
9. **[P2] JSON fields sin validación zod ni TS type**: `Community.theme`, `Community.pricing`, `Community.settings`, `Community.landingLayout`, `Community.customImages`, `Community.ownerLinks`, `MentorSession.exceptionData`, `SessionEvent.payload`, etc. Definir types y validar al guardar.
10. **[P2] `BuddyCheckIn.mood` sin CHECK constraint**: rango 1-10 documentado pero no enforced.
11. **[P2] `User.deletedAt` definido sin política clara**: ¿soft-delete cascade? ¿solo marcar y filtrar en queries? Documentar.
12. **[P2] Duplicación de gamification (`points`, `level`) en User vs Member**: clarificar fuente de verdad.
13. **[P2] `User.lastActiveAt`** se actualiza en cada signIn (event hook) — bien. ¿Cuándo se invalida? ¿Mostrar "última conexión" pública o privada? GDPR-relevante.

## Próximas acciones (Sprint 1)

- (15 min) Borrar carpetas untracked `20251210173306_add_recording_transcription` y `20251216_add_welcome_message`.
- (15 min) Decidir destino de `add_social_hub_layout.sql` (borrar o añadir SOCIAL_HUB al enum y crear migration formal).
- (30 min) Cambiar `build` script a `prisma generate && next build` (sin `db push`). Pipeline de migrations vía `prisma migrate deploy` en step separado o GitHub Action.
- (1 hora) Regenerar `20260306082705_add_welcome_message` con el nombre de tabla correcto, o crear migration de catch-up que vuelva la tabla consistente.
- (1 hora) Audit del field `role` en `Session.user`: o se elimina del tipo o se añade al schema.
- (3 horas) Normalizar enums a SCREAMING_SNAKE en una migration de rename (cuidadoso con datos existentes).
- (medio día) Reescribir el JSON shape de `Community.theme`, `pricing`, `settings`, `landingLayout` con zod schemas en `lib/validations/`.
