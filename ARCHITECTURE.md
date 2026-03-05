# 🏗️ Mentorly Architecture Documentation

## Overview

Mentorly is built as a modern, scalable web application using Next.js 14 with the App Router,
TypeScript, and a robust database layer with Prisma and PostgreSQL.

---

## Architecture Principles

1. **Type Safety First**: Strict TypeScript across the entire stack, with tRPC for end-to-end type
   safety
2. **Performance**: Sub-second load times, optimistic updates, and efficient caching
3. **Scalability**: Designed to handle growth from 10 to 10M users without major rewrites
4. **Developer Experience**: Fast hot reload, clear error messages, and intuitive APIs
5. **Security**: Built-in protection against common vulnerabilities (XSS, CSRF, SQL injection)

---

## Technology Stack

### Frontend Layer

```
┌─────────────────────────────────────────┐
│         Next.js 14 (App Router)         │
│  ┌─────────────────────────────────┐   │
│  │   React 18 + Server Components  │   │
│  └─────────────────────────────────┘   │
│  ┌───────────��─────────────────────┐   │
│  │  Tailwind CSS + shadcn/ui       │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Framer Motion (Animations)     │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

- **Framework**: Next.js 14 with App Router for modern React patterns
- **UI Library**: shadcn/ui for accessible, customizable components
- **Styling**: Tailwind CSS with custom design tokens
- **Animations**: Framer Motion for smooth, performant animations
- **State Management**: Zustand for global state, React Query for server state
- **Forms**: React Hook Form with Zod validation

### API Layer

```
┌─────────────────────────────────────────┐
│              tRPC Server                │
│  ┌─────────────────────────────────┐   │
│  │   Type-safe API Procedures      │   │
│  │   (queries & mutations)         │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │   Middleware (auth, rate limit) │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

- **API Framework**: tRPC for full type safety between client and server
- **Validation**: Zod schemas for runtime validation
- **Authentication**: Clerk for user management
- **Authorization**: Role-based access control (RBAC)

### Data Layer

```
┌─────────────────────────────────────────┐
│         Prisma ORM + PostgreSQL         │
│  ┌─────────────────────────────────┐   │
│  │   Type-safe Database Client     │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │   Migrations & Schema           │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │   Connection Pooling            │   │
│  └───────────────────────────���─────┘   │
└─────────────────────────────────────────┘
```

- **Database**: PostgreSQL for reliability and performance
- **ORM**: Prisma for type-safe database access
- **Caching**: Redis for session storage and rate limiting
- **Search**: PostgreSQL full-text search (later: Elasticsearch)

### External Services

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│    Clerk     │  │   Stripe     │  │   Livekit    │
│   (Auth)     │  │ (Payments)   │  │   (Video)    │
└──────────────┘  └──────────────┘  └──────────────┘
        │                 │                 │
        └─────────────────┴─────────────────┘
                          │
                ┌─────────┴─────────┐
                │   Mentorly App    │
                └───────────────────┘
```

---

## Database Schema Overview

### Core Entities

#### User

- Central entity for all user data
- Links to Clerk for authentication
- Stores profile, preferences, and gamification data

#### Community

- Main container for content and members
- Supports custom branding (theme JSON)
- Flexible pricing structure

#### Member

- Junction table between User and Community
- Stores role, permissions, and community-specific data

#### Post & Comment

- Content creation with rich text support
- Nested comments for discussions
- Reactions and mentions

#### Session (Mentoring)

- Scheduling and management of 1-on-1 sessions
- Integration with Livekit for video calls
- Notes and recording URLs

#### Course & Lesson

- Learning content structure
- Progress tracking per user
- Flexible content types (video, text, quiz)

### Key Design Decisions

1. **Flexible JSON Fields**: Used for settings, theme, and criteria to allow evolution without
   migrations
2. **Composite Indexes**: Optimized for common query patterns
3. **Soft Deletes**: Cascade deletes for clean data management
4. **Timestamps**: All entities have createdAt and updatedAt for audit trails

---

## Folder Structure

```
web/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Authentication routes
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (dashboard)/             # Protected dashboard
│   │   ├── communities/
│   │   ├── sessions/
│   │   └── settings/
│   ├── (marketing)/             # Public pages
│   │   ├── page.tsx            # Landing page
│   │   ├── pricing/
│   │   └── about/
│   ├── api/                     # API routes
│   │   ├── trpc/               # tRPC handler
│   │   ├── webhooks/           # Stripe, Clerk webhooks
│   │   └── auth/               # Auth callbacks
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Global styles
│
├── components/                   # React components
│   ├── ui/                      # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── forms/                   # Form components
│   ├── layouts/                 # Layout components
│   ├── community/               # Community-specific
│   ├── session/                 # Session/video components
│   └── marketing/               # Marketing components
│
├── lib/                         # Utilities
│   ├── db.ts                   # Prisma client singleton
│   ├── trpc.ts                 # tRPC client setup
│   ├── utils.ts                # Helper functions
│   └── validations.ts          # Zod schemas
│
├── server/                      # Backend code
│   ├── routers/                # tRPC routers
│   │   ├── user.ts
│   │   ├── community.ts
│   │   ├── post.ts
│   │   └── session.ts
│   ├── services/               # Business logic
│   │   ├── community-service.ts
│   │   ├── payment-service.ts
│   │   └── video-service.ts
│   └── middleware/             # Server middleware
│       ├── auth.ts
│       └── rate-limit.ts
│
├── prisma/                      # Database
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Migration files
│
├── public/                      # Static assets
│   ├── images/
│   └── fonts/
│
└── types/                       # TypeScript types
    ├── api.ts
    └── entities.ts
```

---

## Data Flow

### Client-Side Rendering (CSR)

```
User Action
    ↓
React Component
    ↓
tRPC Client Hook
    ↓
HTTP Request (POST /api/trpc)
    ↓
tRPC Server Handler
    ↓
Router Procedure
    ↓
Service Layer (Business Logic)
    ↓
Prisma Client
    ↓
PostgreSQL Database
    ↓
Response (Type-safe)
    ↓
React Query Cache
    ↓
UI Update
```

### Server-Side Rendering (SSR)

```
Page Request
    ↓
Next.js Server Component
    ↓
Direct Database Query (Prisma)
    ↓
Render HTML
    ↓
Stream to Client
    ↓
Hydrate on Client
```

---

## Authentication Flow

```
1. User visits /sign-in
2. Clerk widget loads
3. User authenticates (email, Google, etc.)
4. Clerk creates session
5. Webhook fires to /api/webhooks/clerk
6. Server creates/updates User in database
7. User redirected to /dashboard
8. All subsequent requests include Clerk session token
9. Middleware validates token on each request
```

---

## Video Call Flow (Livekit)

```
1. User schedules session
2. Cron job creates Livekit room 10 min before
3. User clicks "Join Session"
4. Server generates Livekit token
5. Client connects to Livekit WebRTC
6. Video call proceeds
7. Recording saved to S3
8. Transcription via OpenAI Whisper
9. Session marked as completed
```

---

## Deployment Architecture

### Production Setup

```
┌─────────────────────────────────────────────────┐
│                  Cloudflare CDN                 │
│          (DDoS protection, caching)             │
└─────────────────┬───────────────────────────────┘
                  │
         ┌────────┴────────┐
         ↓                 ↓
┌─────────────────┐  ┌──────────────────┐
│  Vercel Edge    │  │  Vercel Serverless│
│  (Static Pages) │  │  (API Routes)     │
└─────────────────┘  └────────┬──────────┘
                              │
                 ┌────────────┴────────────┐
                 ↓                         ↓
        ┌─────────────────┐      ┌─────────────────┐
        │  Supabase       │      │  Redis Cloud    │
        │  (PostgreSQL)   │      │  (Cache/Queue)  │
        └─────────────────┘      └─────────────────┘
```

### Scalability Considerations

1. **Horizontal Scaling**: Serverless functions scale automatically
2. **Database**: Connection pooling with Prisma Accelerate
3. **Caching**: Redis for hot data, Cloudflare for static assets
4. **CDN**: Global edge network for fast asset delivery
5. **Video**: Livekit Cloud handles WebRTC scaling

---

## Security Measures

### Application Level

- ✅ Strict Content Security Policy (CSP)
- ✅ HTTPS only (enforced)
- ✅ HTTP Strict Transport Security (HSTS)
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff

### API Level

- ✅ Rate limiting (100 req/min per IP)
- ✅ Input validation (Zod schemas)
- ✅ SQL injection prevention (Prisma ORM)
- ✅ XSS prevention (React sanitization)
- ✅ CSRF protection (SameSite cookies)

### Authentication

- ✅ Clerk secure session management
- ✅ JWT tokens (short-lived)
- ✅ Refresh token rotation
- ✅ Multi-factor authentication (MFA)

### Data Protection

- ✅ Encryption at rest (database)
- ✅ Encryption in transit (TLS 1.3)
- ✅ Sensitive data hashing (bcrypt)
- ✅ PII data minimization
- ✅ GDPR compliance ready

---

## Performance Optimization

### Bundle Size

- Code splitting per route
- Dynamic imports for heavy components
- Tree shaking (automatic with Next.js)
- Image optimization (next/image)

### Rendering Strategy

- Server Components for static content
- Client Components for interactive UI
- Streaming for large pages
- Incremental Static Regeneration (ISR)

### Database

- Connection pooling (Prisma)
- Indexed queries
- Pagination for large datasets
- Caching frequent queries (Redis)

### Monitoring

- Vercel Analytics for Web Vitals
- Sentry for error tracking
- PostHog for product analytics
- Lighthouse CI for performance regression

---

## Future Enhancements

### Phase 2

- [ ] GraphQL API (alongside tRPC)
- [ ] WebSocket for real-time features
- [ ] ElasticSearch for advanced search
- [ ] ML-based recommendations

### Phase 3

- [ ] Microservices for video/AI
- [ ] Multi-region deployment
- [ ] Edge computing for global speed
- [ ] Advanced observability (OpenTelemetry)

---

## Development Workflow

```
1. Feature branch from main
2. Local development with hot reload
3. Type check + lint + format
4. Create PR on GitHub
5. Automated checks (CI)
   - Type check
   - Lint
   - Build
   - Tests
6. Preview deployment (Vercel)
7. Review + approval
8. Merge to main
9. Auto-deploy to production
```

---

## Conclusion

Mentorly's architecture is designed for rapid iteration while maintaining production-grade quality.
The use of modern tools like Next.js 14, Prisma, and tRPC ensures type safety and developer
productivity, while the infrastructure choices enable seamless scaling as the platform grows.

**Built to shine from day one. Built to scale to millions.**
