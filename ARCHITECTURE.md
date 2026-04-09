# 🏗️ Mentorly Architecture Documentation

## Overview

Mentorly is built as a modern, scalable web application using Next.js 14 with the App Router,
TypeScript, and a robust database layer with Prisma and PostgreSQL. The platform leverages a rich
ecosystem of modern tools for real-time communication, video sessions, AI integration, and advanced
UI capabilities.

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
│  ┌─────────────────────────────────┐   │
│  │  Tailwind CSS + shadcn/ui       │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Framer Motion (Animations)     │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Rich Text & Collaboration      │   │
│  │  (TipTap, Excalidraw)           │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

- **Framework**: Next.js 14 with App Router for modern React patterns
- **UI Library**: shadcn/ui for accessible, customizable components
- **Styling**: Tailwind CSS with custom design tokens and animations
- **Animations**: Framer Motion for smooth, performant animations
- **State Management**: Zustand for global state, React Query for server state
- **Forms**: React Hook Form with Zod validation
- **Rich Text Editor**: TipTap (React) with extensions for images, links, placeholders
- **Whiteboarding**: Excalidraw for collaborative drawing
- **Drag & Drop**: dnd-kit and hello-pangea/dnd for flexible drag-and-drop
- **Internationalization**: next-intl for multi-language support (en, es, fr)
- **Charts**: Recharts for data visualization
- **PWA**: Service worker and web-push for push notifications

### API Layer

```
┌─────────────────────────────────────────┐
│         Next.js API Routes              │
│  ┌─────────────────────────────────┐   │
│  │   Server Actions (41 total)     │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │   REST API Routes (45 total)    │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │   Middleware (auth, rate limit) │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

- **API Framework**: Native Next.js API routes and server actions
- **Validation**: Zod schemas for runtime validation
- **Authentication**: NextAuth v5 (next-auth@5.0.0-beta.25) with @auth/prisma-adapter
- **Authorization**: Role-based access control (RBAC)

### Data Layer

```
┌─────────────────────────────────────────┐
│         Prisma ORM + PostgreSQL         │
│  ┌─────────────────────────────────┐   │
│  │   Type-safe Database Client     │   │
│  │   (49 models, 22 enums)         │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │   Migrations & Schema           │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │   Connection Pooling            │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

- **Database**: PostgreSQL for reliability and performance
- **ORM**: Prisma for type-safe database access
- **Search**: Prisma contains queries for basic search (PostgreSQL full-text search ready for future)
- **Rate Limiting**: Upstash Redis REST API for distributed rate limiting (fetch-based, no npm package)

### External Services

```
┌──────────────────┐  ┌──────────────┐  ┌──────────────┐
│   NextAuth v5    │  │   Stripe     │  │   LiveKit    │
│   (Auth)         │  │ (Payments)   │  │   (Video)    │
└──────────────────┘  └──────────────┘  └──────────────┘
        │                 │                     │
        │        ┌────────┴──────────┐          │
        │        ↓                   ↓          │
        │   ┌──────────────┐  ┌──────────┐     │
        │   │ Stripe       │  │ Stripe   │     │
        │   │ Connect      │  │ webhooks │     │
        │   └──────────────┘  └──────────┘     │
        │                                       │
┌───────┴────────────────────────────────────┬─┴──────┐
│                                            │        │
│         ┌─────────────────┐       ┌────────┴────┐   │
│         │   Pusher        │       │   OpenAI    │   │
│         │   (Real-time)   │       │   (AI)      │   │
│         └─────────────────┘       └─────────────┘   │
│                                                     │
│              Mentorly Application                   │
└─────────────────────────────────────────────────────┘
```

- **Authentication**: NextAuth v5 with Prisma adapter
- **Payments**: Stripe for subscription management, Stripe Connect for creator payouts
- **Real-time Communication**: Pusher for live chat and notifications
- **Video Sessions**: LiveKit with recording, transcription via OpenAI
- **AI Features**: OpenAI SDK for chat, moderation, recommendations
- **Email**: Resend for transactional emails

---

## Database Schema Overview

### Core Models (49 total)

#### User Management
- **User**: Central entity with profile, preferences, gamification data
- **Account**: NextAuth account records
- **Session**: NextAuth session management
- **Buddy**: Buddy system connections between users

#### Communities
- **Community**: Main container with custom branding, theme configuration
- **Member**: User-community junction with roles and permissions
- **MemberRole**: Flexible role definitions
- **Invitation**: Community invitations with custom codes

#### Content
- **Post**: Rich text posts with mentions and reactions
- **Comment**: Nested threaded comments
- **Course**: Learning content structure
- **Lesson**: Course lessons with multiple content types
- **Quiz**: Assessments with questions and scoring
- **Certificate**: Completion certificates
- **Resource**: Shared learning resources

#### Learning & Gamification
- **UserProgress**: Course and lesson progress tracking
- **Point**: Gamification points system
- **Level**: User level progression
- **Streak**: Activity streak tracking
- **Achievement**: Badge and achievement system
- **Leaderboard**: Community leaderboard entries

#### Sessions & Interactions
- **Session**: 1-on-1 mentoring sessions with LiveKit integration
- **Recording**: Session recordings with transcriptions
- **Message**: Direct and group messaging
- **Notification**: User notifications

#### Commerce
- **Subscription**: Community subscription plans
- **Invoice**: Payment invoices
- **Payment**: Payment records linked to Stripe
- **StripeEvent**: Stripe webhook event tracking

#### Content Building
- **SectionBuilder**: Custom landing page sections
- **Section**: Individual section instances

### Key Design Decisions

1. **Flexible JSON Fields**: Used for settings, theme, and criteria to allow evolution without
   migrations
2. **Composite Indexes**: Optimized for common query patterns
3. **Soft Deletes**: Cascade deletes for clean data management
4. **Timestamps**: All entities have createdAt and updatedAt for audit trails
5. **Enum Types**: 22 enums for type-safe status fields (roles, session status, etc.)

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
│   │   ├── buddies/
│   │   ├── quizzes/
│   │   ├── resources/
│   │   └── settings/
│   ├── (marketing)/             # Public pages
│   │   ├── page.tsx            # Landing page
│   │   ├── pricing/
│   │   └── about/
│   ├── api/                     # API routes (45 total)
│   │   ├── auth/               # NextAuth configuration
│   │   ├── webhooks/           # Stripe, Pusher webhooks
│   │   ├── sessions/           # Session management
│   │   ├── users/              # User endpoints
│   │   ├── communities/        # Community endpoints
│   │   ├── content/            # Content endpoints
│   │   └── payments/           # Payment endpoints
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Global styles
│
├── components/                   # React components (144 total)
│   ├── ui/                      # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── forms/                   # Form components with Zod validation
│   ├── layouts/                 # Layout components
│   ├── community/               # Community-specific components
│   ├── session/                 # Video session & LiveKit components
│   ├── chat/                    # Real-time chat with Pusher
│   ├── editor/                  # TipTap rich text editor
│   ├── whiteboard/              # Excalidraw integration
│   ├── gamification/            # Points, levels, achievements
│   ├── quiz/                    # Quiz components
│   ├── section-builder/         # Landing page builder
│   └── marketing/               # Marketing components
│
├── lib/                         # Utilities
│   ├── db.ts                   # Prisma client singleton
│   ├── auth.ts                 # NextAuth configuration
│   ├── utils.ts                # Helper functions
│   └── validations.ts          # Zod schemas
│
├── server/                      # Backend code
│   ├── actions/                # Server actions (41 total)
│   │   ├── user-actions.ts
│   │   ├── community-actions.ts
│   │   ├── content-actions.ts
│   │   └── payment-actions.ts
│   ├── services/               # Business logic
│   │   ├── community-service.ts
│   │   ├── payment-service.ts
│   │   ├── video-service.ts
│   │   ├── ai-service.ts
│   │   └── gamification-service.ts
│   └── middleware/             # Server middleware
│       ├── auth.ts
│       ├── rate-limit.ts
│       └── validation.ts
│
├── prisma/                      # Database
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Migration files
│
├── public/                      # Static assets
│   ├── images/
│   ├── fonts/
│   └── icons/
│
├── hooks/                       # Custom React hooks
│   ├── useAuth.ts
│   ├── useSession.ts
│   └── ...
│
├── types/                       # TypeScript types
│   ├── api.ts
│   ├── entities.ts
│   └── next-auth.d.ts
│
└── config/                      # Configuration
    ├── site.ts
    ├── nav.ts
    └── constants.ts
```

---

## Data Flow

### Server Action Flow

```
User Action (Click, Form Submit)
    ↓
React Component
    ↓
Server Action Call
    ↓
NextAuth Session Validation
    ↓
Rate Limit Check (Upstash Redis)
    ↓
Zod Input Validation
    ↓
Business Logic Service Layer
    ↓
Prisma Client Operations
    ↓
PostgreSQL Database
    ↓
Revalidate Cache (Next.js)
    ↓
Return Type-safe Response
    ↓
UI Update with React Query
```

### Real-time Communication Flow

```
User Action
    ↓
Pusher Client Event
    ↓
Pusher Server Broadcast
    ↓
Subscribe Channel
    ↓
WebSocket Callback
    ↓
Zustand State Update
    ↓
Component Re-render
```

### Video Session Flow

```
Session Created
    ↓
LiveKit Room Provisioned
    ↓
User Joins Session
    ↓
LiveKit Token Generated
    ↓
WebRTC Connection Established
    ↓
Video/Audio Stream
    ↓
Optional: Recording Started
    ↓
Session Ends
    ↓
Recording Processed & Stored
    ↓
Transcription via OpenAI Whisper
    ↓
Session Marked Complete
```

### AI Integration Flow

```
User Request (Chat, Moderation, Recommendation)
    ↓
Server Action
    ↓
Build OpenAI Prompt
    ↓
Call OpenAI API
    ↓
Stream Response (if applicable)
    ↓
Process & Validate Output
    ↓
Store in Database
    ↓
Return to Client
```

---

## Authentication Flow

```
1. User visits /sign-in
2. NextAuth sign-in page loads
3. User authenticates (email, OAuth providers)
4. NextAuth creates session
5. @auth/prisma-adapter stores in database
6. User redirected to /dashboard
7. All subsequent requests include NextAuth session
8. Middleware validates session on each request
9. Access control enforced via RBAC
```

---

## Video & Real-time Collaboration Flow

### LiveKit Video Sessions

```
1. User schedules mentoring session
2. Session created in database
3. User clicks "Join Session"
4. Server generates LiveKit token
5. LiveKit React components initialize
6. Client connects to LiveKit WebRTC
7. Video/audio streaming
8. Optional recording captured
9. Session ends
10. Recording transcribed via OpenAI
11. Transcript and metadata saved
```

### Real-time Chat (Pusher)

```
1. User opens chat
2. Pusher client subscribes to channel
3. User sends message
4. Message saved to database
5. Server broadcasts via Pusher
6. Other subscribers receive event
7. Zustand store updates
8. Component re-renders with new message
9. Optional notification via Pusher
```

---

## Payment & Creator Economy Flow

### Subscription Management (Stripe)

```
1. User chooses subscription plan
2. Redirect to Stripe Checkout
3. User completes payment
4. Stripe webhook fires
5. Server creates Subscription record
6. User gains member access
7. Subscription renewal handled by Stripe
```

### Creator Payouts (Stripe Connect)

```
1. Creator registers Stripe Connect account
2. Earnings accumulated from subscriptions
3. Automated payout processing
4. Stripe Connect transfers funds
5. Creator receives in bank account
```

---

## Gamification System

The platform includes a comprehensive gamification system:

- **Points**: Awarded for activities (posts, comments, quiz completion, etc.)
- **Levels**: User progression through level tiers
- **Streaks**: Track consecutive days of activity
- **Achievements**: Unlockable badges for milestones
- **Leaderboard**: Community-based ranking and competition

---

## Deployment Architecture

### Development Environment

```
Docker dev environment with:
- PostgreSQL database
- Node.js runtime
- Volume mounts for code
- Network isolation
```

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
        │  PostgreSQL     │      │  Upstash Redis  │
        │  (Database)     │      │  (Rate Limiting)│
        └─────────────────┘      └─────────────────┘
                 │
        ┌────────┴──────────┐
        ↓                   ↓
   ┌─────────┐         ┌──────────┐
   │  Stripe │         │  LiveKit │
   │ Connect │         │  Cloud   │
   └─────────┘         └──────────┘
```

### Scalability Considerations

1. **Horizontal Scaling**: Serverless functions scale automatically with Vercel
2. **Database**: Connection pooling with Prisma
3. **Rate Limiting**: Upstash Redis for distributed rate limiting
4. **CDN**: Global edge network via Cloudflare for asset delivery
5. **Video**: LiveKit Cloud handles WebRTC scaling and routing
6. **Real-time**: Pusher handles concurrent connections and message delivery
7. **AI**: OpenAI API handles language model inference

---

## Security Measures

### Application Level

- ✅ Strict Content Security Policy (CSP)
- ✅ HTTPS only (enforced)
- ✅ HTTP Strict Transport Security (HSTS)
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ NextAuth CSRF protection

### API Level

- ✅ Rate limiting (via Upstash Redis)
- ✅ Input validation (Zod schemas)
- ✅ SQL injection prevention (Prisma ORM)
- ✅ XSS prevention (React sanitization)
- ✅ CORS configuration

### Authentication & Authorization

- ✅ NextAuth v5 session management
- ✅ JWT tokens with secure defaults
- ✅ Role-based access control (RBAC)
- ✅ Multi-factor authentication support (MFA)
- ✅ Prisma adapter for session storage

### Data Protection

- ✅ Encryption at rest (database)
- ✅ Encryption in transit (TLS 1.3)
- ✅ Sensitive data hashing (bcrypt)
- ✅ PII data minimization
- ✅ GDPR compliance ready
- ✅ Content moderation via OpenAI

---

## Performance Optimization

### Bundle Size

- Code splitting per route (Next.js automatic)
- Dynamic imports for heavy components
- Tree shaking (automatic with Next.js)
- Image optimization (next/image)
- Route-based lazy loading

### Rendering Strategy

- Server Components for static content
- Client Components for interactive UI
- Streaming for large pages
- Incremental Static Regeneration (ISR)
- Optimistic updates with React Query

### Database

- Connection pooling (Prisma)
- Indexed queries with composite indexes
- Pagination for large datasets
- Selective field queries (Prisma select)
- Caching via React Query

### Monitoring & Testing

- Unit Tests: Vitest + Testing Library
- E2E Tests: Playwright (being added)
- Performance monitoring
- Error tracking
- Usage analytics

---

## Features Overview

### Core Features

- **User Authentication**: NextAuth v5 with multiple providers
- **Communities**: Create and manage communities with custom branding
- **Member Management**: Invite users, assign roles, manage permissions
- **Content Creation**: Rich text posts with TipTap, comments with threading

### Learning & Mentoring

- **Courses & Lessons**: Structured learning content with progress tracking
- **Quizzes**: Assessments with automatic grading
- **Certificates**: Completion certificates for courses
- **Mentoring Sessions**: 1-on-1 video sessions with LiveKit
- **Session Recordings**: Automatic recording and transcription

### Collaboration

- **Real-time Chat**: Live messaging with Pusher
- **Whiteboarding**: Collaborative drawing with Excalidraw
- **Buddy System**: Connect users for peer mentoring
- **Resource Library**: Share and organize learning resources

### Gamification

- **Points System**: Earn points for activities
- **Levels & Progression**: Unlock higher levels
- **Streaks**: Track activity streaks
- **Achievements**: Unlock badges and milestones
- **Leaderboards**: Community rankings and competition

### Creator Economy

- **Stripe Connect**: Creator payouts and earnings management
- **Subscription Plans**: Flexible pricing models
- **Payment Processing**: Stripe integration for secure payments
- **Invoice Management**: Automatic invoice generation

### Admin & Customization

- **Section Builder**: Custom landing page creation
- **Theme Customization**: Community-specific theming
- **User Management**: Admin controls for moderation
- **Analytics**: Community and content analytics

### Internationalization

- **Multi-language Support**: English, Spanish, French (via next-intl)
- **Locale-aware Formatting**: Dates, numbers, currency

---

## Testing & Quality

### Unit Testing

- Vitest for fast unit test execution
- React Testing Library for component tests
- Comprehensive test coverage

### End-to-End Testing

- Playwright for cross-browser E2E tests
- Automated user flow testing

### Code Quality

- TypeScript strict mode for type safety
- ESLint for code standards
- Prettier for consistent formatting
- Pre-commit hooks for quality gates

---

## Development Workflow

```
1. Feature branch from main
2. Local development with hot reload (Docker dev env)
3. Type check + lint + format
4. Write unit tests (Vitest)
5. Create PR on GitHub
6. Automated checks (CI)
   - Type check
   - Lint
   - Build
   - Unit tests
7. Manual testing / E2E tests
8. Code review + approval
9. Merge to main
10. Auto-deploy to production (Vercel)
```

---

## Project Statistics

- **Components**: 144 total
- **Pages**: 67 total
- **Server Actions**: 41 total
- **API Routes**: 45 total
- **Database Models**: 49 total
- **Database Enums**: 22 total
- **Languages Supported**: 3 (en, es, fr)

---

## Conclusion

Mentorly's architecture is designed for rapid iteration while maintaining production-grade quality.
The platform integrates modern technologies for real-time collaboration, video communication, AI-powered
features, and creator economy monetization. TypeScript, Prisma, and NextAuth ensure type safety and
developer productivity, while the infrastructure choices enable seamless scaling to millions of users.

**Built for collaboration. Built for learning. Built to scale.**
