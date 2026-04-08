# 🛠️ UNYTEA - DOCUMENTACIÓN TÉCNICA COMPLETA

**Fecha:** 8 de Enero, 2025  
**Proyecto:** Unytea (Mentorly)  
**Nivel Técnico:** Intermedio-Avanzado

---

## 📋 **ÍNDICE**

1. [Stack Tecnológico Frontend](#1-frontend-)
2. [Stack Tecnológico Backend](#2-backend-)
3. [Patrones y Técnicas](#3-patrones-y-técnicas-)
4. [Técnicas Avanzadas](#4-técnicas-avanzadas-)
5. [Servicios Externos](#5-servicios-externos-)
6. [Herramientas de Desarrollo](#6-herramientas-de-desarrollo-)
7. [Técnicas Específicas del Proyecto](#7-técnicas-específicas-del-proyecto-)
8. [Patrones de Diseño](#8-patrones-de-diseño-)
9. [Recursos de Aprendizaje](#9-recursos-de-aprendizaje-)

---

## 🛠️ **STACK TECNOLÓGICO COMPLETO**

### **1. FRONTEND** 🎨

#### **Framework Principal**

**Next.js 14 (App Router)**

- Framework React con SSR (Server-Side Rendering)
- SSG (Static Site Generation)
- ISR (Incremental Static Regeneration)
- API Routes integradas
- File-based routing
- Middleware para auth y redirects
- Edge Runtime disponible
- Image optimization automática

**React 18**

- Librería UI declarativa
- Server Components (RSC)
- Client Components
- Concurrent rendering
- Suspense para data fetching
- Transitions API
- useTransition, useDeferredValue

**TypeScript**

- Type safety en todo el código
- Interfaces y types para props
- Generics para componentes reutilizables
- Prisma types auto-generados
- Strict mode enabled

---

#### **Estilos y UI**

**Tailwind CSS**

- Utility-first CSS framework
- JIT (Just-In-Time) compilation
- Custom theme configuration
- Responsive design utilities
- Dark mode support (configurado)
- Custom colors y spacing

```javascript
// tailwind.config.js
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { /* custom colors */ },
        secondary: { /* custom colors */ },
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"],
        roboto: ["Roboto", "sans-serif"],
      },
    },
  },
};
```

**CSS Modules**

- Scoped styles cuando es necesario
- Evita conflictos de nombres
- Co-located con componentes

**Tailwind Variants**

- Variantes de componentes
- Class variance authority (CVA)

**clsx / cn()**

- Conditional class names
- Merge de Tailwind classes
- Utility function personalizada

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

#### **Componentes UI**

**Radix UI**

- Componentes accesibles sin estilos (headless)
- WAI-ARIA compliant
- Keyboard navigation
- Componentes usados:
    - `@radix-ui/react-dialog` - Modals
    - `@radix-ui/react-dropdown-menu` - Dropdowns
    - `@radix-ui/react-accordion` - Accordions
    - `@radix-ui/react-tabs` - Tabs
    - `@radix-ui/react-select` - Selects
    - `@radix-ui/react-popover` - Popovers
    - `@radix-ui/react-tooltip` - Tooltips

**Lucide React**

- Iconos modernos y ligeros
- Tree-shakeable (solo importas lo que usas)
- Consistentes con Feather Icons
- +1000 iconos disponibles

```tsx
import { User, Settings, LogOut } from "lucide-react";

<User className="w-4 h-4" />
```

**Custom Components**

- Ubicados en `web/components/ui/`
- Button, Input, Label, Textarea
- Card, Badge, Avatar
- Dialog, Dropdown, Tabs
- Todos con TypeScript + Tailwind

---

#### **Animaciones**

**Framer Motion**

- Animaciones declarativas
- Spring physics
- Gestures (drag, pan, hover)
- Layout animations
- Exit animations

```tsx
import { motion } from "framer-motion";

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
>
  {children}
</motion.div>
```

**CSS Transitions**

- Transiciones nativas CSS
- `transition-all duration-300 ease-in-out`
- Hover effects
- Transform transitions

**3D Transforms**

- Para el carrusel 3D
- `perspective: 1000px`
- `transform: rotateY() translateZ()`
- Hardware acceleration con `transform3d`

```css
.carousel-container {
  perspective: 1000px;
  transform-style: preserve-3d;
}

.carousel-card {
  transform: rotateY(60deg) translateZ(350px);
  transition: transform 0.7s ease-out;
}
```

---

### **2. BACKEND** ⚙️

#### **Framework**

**Next.js API Routes**

- Endpoints RESTful en `/app/api/`
- Handlers: GET, POST, PUT, DELETE, PATCH
- Request/Response con Web APIs
- Middleware support
- Edge Runtime opcional

```typescript
// app/api/communities/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  
  const communities = await prisma.community.findMany({
    where: { name: { contains: query } }
  });
  
  return NextResponse.json(communities);
}
```

**Server Actions**

- Functions server-side en `/app/actions/`
- Mutations desde el cliente sin API routes
- `"use server"` directive
- Type-safe con TypeScript
- Automatic CSRF protection
- Progressive enhancement

```typescript
// app/actions/communities.ts
"use server";

export async function createCommunity(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  
  const data = {
    name: formData.get("name") as string,
    slug: formData.get("slug") as string,
    ownerId: session.user.id,
  };
  
  const community = await prisma.community.create({ data });
  revalidatePath("/communities");
  redirect(`/c/${community.slug}`);
}
```

**Edge Runtime**

- Para rutas que necesitan baja latencia
- Deploy en edge locations globalmente
- Limitaciones: No todos los Node.js APIs disponibles

```typescript
export const runtime = "edge";
```

---

#### **Autenticación**

**NextAuth.js v5 (Auth.js)**

- Sistema completo de autenticación
- Session management
- Adapters para múltiples DBs
- Prisma adapter incluido

**OAuth Providers**

- Google OAuth 2.0
- GitHub OAuth
- Extensible a más providers

**JWT Sessions**

- Tokens seguros
- Stored en cookies httpOnly
- Automatic refresh
- Custom claims (userId, role, etc.)

**Middleware**

- Protected routes automáticas
- Redirect a signin si no autenticado
- Public routes configurables

```typescript
// middleware.ts
export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
```

---

#### **Base de Datos**

**PostgreSQL**

- Base de datos relacional
- ACID compliant
- JSON support (para campos flexibles)
- Full-text search
- Transacciones

**Prisma ORM**

- Type-safe database client
- Auto-generated types
- Migration system
- Introspection
- Query builder declarativo

```prisma
// prisma/schema.prisma
model Community {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  description String?
  ownerId     String
  owner       User     @relation(fields: [ownerId], references: [id])
  members     Member[]
  posts       Post[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([slug])
  @@index([ownerId])
}
```

**Prisma Client**

```typescript
import { prisma } from "@/lib/prisma";

const community = await prisma.community.findUnique({
  where: { slug: "my-community" },
  include: {
    owner: true,
    members: { take: 10 },
    _count: { select: { posts: true, members: true } },
  },
});
```

**Prisma Studio**

- GUI para visualizar y editar datos
- `npx prisma studio` → http://localhost:5555
- Browse tables, edit records, run queries

**Migrations**

- Control de versiones del schema
- `npx prisma migrate dev --name add_field`
- Rollback support
- Production migrations con `prisma migrate deploy`

---

### **3. PATRONES Y TÉCNICAS** 🏗️

#### **Arquitectura de Capas**

```
┌─────────────────────────────────────────────┐
│  ARQUITECTURA DE CAPAS - UNYTEA            │
├─────────────────────────────────────────────┤
│  1. PRESENTATION LAYER (UI)                │
│     ├─ Pages (Next.js App Router)          │
│     ├─ Components (React Server/Client)    │
│     ├─ Layouts (Shared UI)                 │
│     └─ Styles (Tailwind CSS)               │
├─────────────────────────────────────────────┤
│  2. BUSINESS LOGIC LAYER                   │
│     ├─ Server Actions (Mutations)          │
│     ├─ API Routes (REST endpoints)         │
│     ├─ Utility Functions                   │
│     └─ Validation (Zod schemas)            │
├─────────────────────────────────────────────┤
│  3. DATA ACCESS LAYER                      │
│     ├─ Prisma Client                       │
│     ├─ Database Queries                    │
│     ├─ Transactions                        │
│     └─ Caching (React Cache)               │
├─────────────────────────────────────────────┤
│  4. EXTERNAL SERVICES LAYER                │
│     ├─ UploadThing (CDN)                   │
│     ├─ NextAuth (Auth)                     │
│     ├─ LiveKit (Video - planeado)          │
│     ├─ OpenAI (AI - planeado)              │
│     └─ Socket.io (Real-time - planeado)    │
└─────────────────────────────────────────────┘
```

---

#### **Patrones de React**

**1. Server Components (RSC)**

- Por defecto en Next.js 14 App Router
- Renderizados en el servidor
- No envían JavaScript al cliente
- Pueden hacer data fetching directamente
- No pueden usar hooks (useState, useEffect)

```tsx
// Server Component (default)
export default async function CommunitiesPage() {
  const communities = await prisma.community.findMany({
    include: { _count: { select: { members: true } } },
  });
  
  return (
    <div>
      {communities.map(community => (
        <CommunityCard key={community.id} community={community} />
      ))}
    </div>
  );
}
```

**2. Client Components**

- Con directive `"use client"`
- Renderizados en el cliente
- Pueden usar hooks y eventos
- Interactividad completa
- Necesario para useState, useEffect, onClick, etc.

```tsx
"use client";

export function InteractiveButton() {
  const [count, setCount] = useState(0);
  
  return (
    <button onClick={() => setCount(count + 1)}>
      Clicks: {count}
    </button>
  );
}
```

**3. Compound Components**

- Componentes que trabajan juntos
- API declarativa y flexible
- Context interno para compartir estado

```tsx
<Dialog>
  <Dialog.Trigger>Open Modal</Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Title>Title</Dialog.Title>
    <Dialog.Description>Description</Dialog.Description>
    <Dialog.Close>Close</Dialog.Close>
  </Dialog.Content>
</Dialog>
```

**4. Render Props**

- Funciones como children
- Compartir lógica sin HOCs
- Flexibilidad en renderizado

```tsx
<DataProvider>
  {(data, loading, error) => {
    if (loading) return <Spinner />;
    if (error) return <Error />;
    return <Content data={data} />;
  }}
</DataProvider>
```

**5. Custom Hooks**

- Lógica reutilizable
- Composición de hooks
- Naming convention: `use*`

```typescript
function useUser() {
  const { data: session } = useSession();
  return session?.user;
}

function useCommunity(slug: string) {
  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch(`/api/communities/${slug}`)
      .then(res => res.json())
      .then(data => {
        setCommunity(data);
        setLoading(false);
      });
  }, [slug]);
  
  return { community, loading };
}
```

---

#### **Patrones de State Management**

**1. useState** - State local simple

```tsx
const [count, setCount] = useState(0);
const [text, setText] = useState("");
const [user, setUser] = useState<User | null>(null);
```

**2. useReducer** - State complejo con múltiples acciones

```tsx
type Action = 
  | { type: "ADD_ELEMENT"; element: Element }
  | { type: "UPDATE_ELEMENT"; id: string; updates: Partial<Element> }
  | { type: "DELETE_ELEMENT"; id: string };

function reducer(state: Element[], action: Action) {
  switch (action.type) {
    case "ADD_ELEMENT":
      return [...state, action.element];
    case "UPDATE_ELEMENT":
      return state.map(el => 
        el.id === action.id ? { ...el, ...action.updates } : el
      );
    case "DELETE_ELEMENT":
      return state.filter(el => el.id !== action.id);
  }
}

const [elements, dispatch] = useReducer(reducer, []);
```

**3. React Context** - State compartido sin props drilling

```tsx
const UserContext = createContext<User | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  
  return (
    <UserContext.Provider value={user}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
```

**4. Server State** - Con Prisma + React Cache

```tsx
import { cache } from "react";

export const getUser = cache(async (id: string) => {
  return await prisma.user.findUnique({ where: { id } });
});
```

**5. URL State** - Con searchParams

```tsx
// Server Component
export default function Page({ searchParams }: { searchParams: { q: string } }) {
  const query = searchParams.q;
  // ...
}

// Client Component
const searchParams = useSearchParams();
const query = searchParams.get("q");
```

---

#### **Patrones de Data Fetching**

**1. Server Actions** - Mutations desde el cliente

```tsx
// Server Action
"use server";
export async function createPost(formData: FormData) {
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  
  await prisma.post.create({ data: { title, content } });
  revalidatePath("/posts");
}

// Client Component
"use client";
export function CreatePostForm() {
  return (
    <form action={createPost}>
      <input name="title" />
      <textarea name="content" />
      <button type="submit">Create</button>
    </form>
  );
}
```

**2. API Routes** - REST endpoints tradicionales

```tsx
// API Route
export async function POST(request: Request) {
  const body = await request.json();
  const post = await prisma.post.create({ data: body });
  return NextResponse.json(post);
}

// Client fetch
const response = await fetch("/api/posts", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ title, content }),
});
```

**3. Parallel Data Fetching** - Con Promise.all

```tsx
export default async function Dashboard() {
  const [user, communities, posts] = await Promise.all([
    getUserData(),
    getCommunities(),
    getRecentPosts(),
  ]);
  
  return (
    <div>
      <UserProfile user={user} />
      <CommunitiesList communities={communities} />
      <PostsFeed posts={posts} />
    </div>
  );
}
```

**4. Streaming con Suspense**

```tsx
export default function Page() {
  return (
    <div>
      <Suspense fallback={<Skeleton />}>
        <SlowComponent />
      </Suspense>
      <FastComponent />
    </div>
  );
}
```

---

### **4. TÉCNICAS AVANZADAS** 🚀

#### **Performance Optimization**

**1. Code Splitting** - Dynamic imports

```tsx
import dynamic from "next/dynamic";

const VisualBuilder = dynamic(() => import("./VisualBuilder"), {
  loading: () => <Spinner />,
  ssr: false, // Disable SSR para componentes pesados
});
```

**2. Image Optimization** - Next.js Image component

```tsx
import Image from "next/image";

<Image 
  src="/hero.jpg" 
  alt="Hero" 
  width={1200} 
  height={600}
  priority // Para above-the-fold images
  placeholder="blur" // Blur placeholder mientras carga
/>
```

**3. Lazy Loading** - React.lazy + Suspense

```tsx
const HeavyComponent = React.lazy(() => import("./HeavyComponent"));

<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

**4. Memoization**

```tsx
// useMemo - Expensive calculations
const sortedData = useMemo(() => {
  return data.sort((a, b) => a.name.localeCompare(b.name));
}, [data]);

// useCallback - Stable function references
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// React.memo - Prevent re-renders
const MemoizedComponent = React.memo(ExpensiveComponent);
```

**5. Debouncing** - Para search y inputs

```tsx
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
}

// Uso
const [searchTerm, setSearchTerm] = useState("");
const debouncedSearchTerm = useDebounce(searchTerm, 500);

useEffect(() => {
  // API call con debouncedSearchTerm
}, [debouncedSearchTerm]);
```

---

#### **Seguridad**

**1. CSRF Protection**

- NextAuth built-in
- Server Actions tienen CSRF automático
- SameSite cookies

**2. SQL Injection Prevention**

- Prisma usa parameterized queries
- Nunca usar string concatenation en queries

```tsx
// ✅ SEGURO (Prisma)
await prisma.user.findMany({
  where: { name: { contains: userInput } }
});

// ❌ INSEGURO (Raw SQL sin sanitizar)
await prisma.$queryRaw`SELECT * FROM users WHERE name = ${userInput}`;
```

**3. XSS Prevention**

- React escaping automático
- Evitar `dangerouslySetInnerHTML`
- Sanitizar HTML con DOMPurify si es necesario

```tsx
// ✅ SEGURO
<div>{userInput}</div>

// ❌ PELIGROSO
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

**4. Auth Middleware**

- Protected routes automáticas
- Session validation
- Role-based access control (RBAC)

```typescript
export async function auth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}
```

**5. Rate Limiting** (Pendiente de implementar)

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for");
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return new Response("Too Many Requests", { status: 429 });
  }
  
  // ... handle request
}
```

**6. Input Validation** - Zod schemas

```typescript
import { z } from "zod";

const createCommunitySchema = z.object({
  name: z.string().min(3).max(50),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(true),
});

type CreateCommunityInput = z.infer<typeof createCommunitySchema>;

export async function createCommunity(input: CreateCommunityInput) {
  const validated = createCommunitySchema.parse(input); // Throws if invalid
  // ... create community
}
```

---

#### **SEO**

**1. Metadata API** - Next.js 14

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Community - Unytea",
  description: "Join our amazing community of learners",
  openGraph: {
    title: "My Community",
    description: "Join our amazing community",
    images: ["/og-image.jpg"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "My Community",
    description: "Join our amazing community",
    images: ["/og-image.jpg"],
  },
};
```

**2. Dynamic Metadata**

```tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const community = await getCommunity(params.slug);
  
  return {
    title: `${community.name} - Unytea`,
    description: community.description,
    openGraph: {
      images: [community.coverImage],
    },
  };
}
```

**3. Server-Side Rendering (SSR)**

- Para contenido público que cambia frecuentemente
- Good for SEO
- Fetch data en cada request

**4. Static Site Generation (SSG)**

- Para páginas estáticas
- Build time rendering
- Fastest performance

```tsx
export async function generateStaticParams() {
  const communities = await prisma.community.findMany();
  
  return communities.map((community) => ({
    slug: community.slug,
  }));
}
```

**5. Dynamic Sitemap** (Pendiente)

```tsx
// app/sitemap.ts
export default async function sitemap() {
  const communities = await prisma.community.findMany();
  
  return [
    { url: "https://unytea.com", lastModified: new Date() },
    ...communities.map((c) => ({
      url: `https://unytea.com/c/${c.slug}`,
      lastModified: c.updatedAt,
    })),
  ];
}
```

---

### **5. SERVICIOS EXTERNOS** ☁️

#### **CDN & Storage**

**UploadThing**

- File uploads + CDN global
- Integración con Next.js
- Type-safe uploads
- React hooks incluidos

```tsx
import { UploadButton } from "@/lib/uploadthing";

<UploadButton
  endpoint="imageUploader"
  onClientUploadComplete={(res) => {
    console.log("Files: ", res);
    setImageUrl(res[0].url);
  }}
  onUploadError={(error: Error) => {
    alert(`ERROR! ${error.message}`);
  }}
/>
```

**Features:**

- Images, avatars, logos, covers
- 2GB storage free tier
- 2GB bandwidth free tier
- Automatic image optimization
- Presigned URLs

---

#### **Deployment**

**Vercel**

- Hosting optimizado para Next.js
- CI/CD automático desde Git
- Edge network global
- Automatic HTTPS
- Preview deployments por cada PR
- Environment variables
- Analytics incluido

**Features:**

- Zero configuration deployment
- Instant rollbacks
- Custom domains
- Serverless functions
- Edge functions
- Web Analytics
- Speed Insights

---

#### **Database**

**Supabase / Neon**

- PostgreSQL managed
- Connection pooling
- Backups automáticos
- Point-in-time recovery
- Replication
- SSL connections

**Supabase adicional:**

- Auth integrado (no usamos, usamos NextAuth)
- Storage (no usamos, usamos UploadThing)
- Realtime subscriptions (planeado para chat)

---

#### **Servicios Planeados**

**LiveKit** - Video calls

- WebRTC infrastructure
- 1-on-1 video calls
- Group calls (hasta 50 participantes)
- Auditorium View (1000+ viewers)
- Screen sharing
- Recording
- Transcription
- React SDK disponible

**OpenAI** - AI Assistant

- GPT-3.5-turbo / GPT-4
- Chat completions
- Context-aware responses
- Streaming responses
- Function calling

**Socket.io** - Real-time chat

- WebSocket server
- Real-time messaging
- Typing indicators
- Online/offline status
- Room-based communication
- Fallback to polling

**Resend / SendGrid** - Email

- Transactional emails
- Email templates
- Welcome emails
- Weekly digests
- Announcement broadcasts
- React Email para templates

---

### **6. HERRAMIENTAS DE DESARROLLO** 🛠️

#### **Linting & Formatting**

**ESLint**

- Linting JavaScript/TypeScript
- Next.js config preset
- React Hooks rules
- Accessibility rules

```json
// .eslintrc.json
{
  "extends": ["next/core-web-vitals", "prettier"],
  "rules": {
    "react/no-unescaped-entities": "off",
    "@typescript-eslint/no-unused-vars": "warn"
  }
}
```

**Prettier**

- Code formatting automático
- Consistent style
- Pre-commit hooks con Husky (opcional)

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": false,
  "printWidth": 100,
  "tabWidth": 2
}
```

**TypeScript**

- Type checking
- `strict: true` enabled
- Path aliases configurados

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./app/*"],
      "@/components/*": ["./components/*"],
      "@/lib/*": ["./lib/*"]
    }
  }
}
```

---

#### **Version Control**

**Git**

- Control de versiones
- Branch strategy (feature branches)
- Conventional commits (opcional)

**GitHub / GitLab**

- Repositorio remoto
- Pull Requests / Merge Requests
- Code review
- CI/CD pipelines

---

#### **Database Tools**

**Prisma Studio**

- GUI para visualizar datos
- `npx prisma studio` → http://localhost:5555
- Browse tables
- Edit records
- Run queries
- Relationship visualization

**Prisma Migrate**

- Database migrations
- Version control para schema
- Development vs Production workflows

```bash
# Desarrollo
npx prisma migrate dev --name add_user_field

# Producción
npx prisma migrate deploy
```

**Prisma Generate**

- Type generation automática
- Después de cada cambio en schema

```bash
npx prisma generate
```

---

#### **Package Manager**

**npm**

- Gestión de dependencias
- Scripts definidos en `package.json`

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:push": "prisma db push",
    "db:studio": "prisma studio"
  }
}
```

---

### **7. TÉCNICAS ESPECÍFICAS DEL PROYECTO** 💡

#### **Carrusel 3D**

```tsx
// components/dashboard/CommunitiesClient.tsx

// CSS 3D Transforms
const carousel3DStyle = {
  perspective: "1000px",
  transformStyle: "preserve-3d" as const,
};

const cardStyle = (index: number, activeIndex: number) => {
  const totalCards = 6;
  const anglePerCard = 360 / totalCards;
  const currentAngle = ((activeIndex - index) * anglePerCard);
  
  return {
    transform: `
      rotateY(${currentAngle}deg) 
      translateZ(350px)
      translateY(-100px)
    `,
    transition: "transform 0.7s ease-out",
  };
};
```

**Características:**

- 6 cards en círculo 3D
- Rotación automática cada 4 segundos
- Click para saltar a cualquier card
- Navegación con flechas
- Efecto de perspectiva realista

---

#### **Drag & Drop (HTML5 Native)**

```tsx
// components/visual-builder/VisualBuilder.tsx

// Elemento arrastrable
<div
  draggable
  onDragStart={(e) => {
    e.dataTransfer.setData("elementType", type);
    e.dataTransfer.effectAllowed = "copy";
  }}
>
  {icon} {label}
</div>

// Área de drop
<div
  onDragOver={(e) => {
    e.preventDefault(); // Permitir drop
    e.dataTransfer.dropEffect = "copy";
  }}
  onDrop={(e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("elementType");
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    addElement(type, x, y);
  }}
>
  Canvas Area
</div>
```

**Ventajas HTML5 Drag & Drop:**

- Nativo del browser (no necesita librería)
- Performance óptimo
- Cross-browser compatible
- Menos JavaScript bundle size

---

#### **Image Upload (Dual Mode)**

```tsx
// components/ui/image-uploader.tsx

export function ImageUploader({ onUploadComplete }: Props) {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const { startUpload, isUploading } = useUploadThing("imageUploader");
  
  // Mode 1: Upload from PC
  const handleFileUpload = async (file: File) => {
    const [result] = await startUpload([file]);
    onUploadComplete(result.url);
  };
  
  // Mode 2: Paste URL
  const handleUrlSubmit = (url: string) => {
    onUploadComplete(url);
  };
  
  return (
    <Tabs value={mode} onValueChange={setMode}>
      <TabsList>
        <TabsTrigger value="upload">Upload from PC</TabsTrigger>
        <TabsTrigger value="url">Use URL</TabsTrigger>
      </TabsList>
      
      <TabsContent value="upload">
        <input type="file" onChange={(e) => handleFileUpload(e.target.files[0])} />
      </TabsContent>
      
      <TabsContent value="url">
        <input type="url" onBlur={(e) => handleUrlSubmit(e.target.value)} />
      </TabsContent>
    </Tabs>
  );
}
```

---

#### **Server Actions Pattern**

```tsx
// app/actions/communities.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createCommunity(formData: FormData) {
  // 1. Authentication
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  
  // 2. Validation
  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  
  if (!name || !slug) {
    throw new Error("Name and slug are required");
  }
  
  // 3. Business Logic
  const community = await prisma.community.create({
    data: {
      name,
      slug,
      ownerId: session.user.id,
    },
  });
  
  // 4. Side Effects
  await prisma.member.create({
    data: {
      userId: session.user.id,
      communityId: community.id,
      role: "OWNER",
      status: "ACTIVE",
    },
  });
  
  // 5. Cache Revalidation
  revalidatePath("/communities");
  revalidatePath(`/c/${slug}`);
  
  // 6. Redirect
  redirect(`/c/${slug}`);
}

// Client Component
"use client";

export function CreateCommunityForm() {
  const [pending, setPending] = useState(false);
  
  async function handleSubmit(formData: FormData) {
    setPending(true);
    try {
      await createCommunity(formData);
    } catch (error) {
      console.error(error);
      setPending(false);
    }
  }
  
  return (
    <form action={handleSubmit}>
      <input name="name" required />
      <input name="slug" required />
      <button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create Community"}
      </button>
    </form>
  );
}
```

---

#### **Optimistic Updates**

```tsx
"use client";

export function JoinButton({ communityId }: Props) {
  const [joined, setJoined] = useState(false);
  const [optimistic, setOptimistic] = useState(false);
  
  async function handleJoin() {
    // 1. Optimistic update (inmediato)
    setOptimistic(true);
    
    try {
      // 2. Server action (asíncrono)
      await joinCommunity(communityId);
      
      // 3. Success - actualizar estado real
      setJoined(true);
      setOptimistic(false);
    } catch (error) {
      // 4. Error - revertir optimistic update
      setOptimistic(false);
      alert("Failed to join");
    }
  }
  
  const isJoined = joined || optimistic;
  
  return (
    <button onClick={handleJoin} disabled={optimistic}>
      {isJoined ? "Joined ✓" : "Join"}
    </button>
  );
}
```

---

#### **Parallel Rendering con Suspense**

```tsx
export default function CommunityPage({ params }: Props) {
  return (
    <div>
      {/* Hero - Renders inmediatamente */}
      <Hero slug={params.slug} />
      
      {/* Posts - Suspende hasta que termine */}
      <Suspense fallback={<PostsSkeleton />}>
        <RecentPosts slug={params.slug} />
      </Suspense>
      
      {/* Members - Suspende independientemente */}
      <Suspense fallback={<MembersSkeleton />}>
        <TopMembers slug={params.slug} />
      </Suspense>
      
      {/* Stats - Ya disponibles del cache */}
      <Stats slug={params.slug} />
    </div>
  );
}

// Componente async que suspende
async function RecentPosts({ slug }: { slug: string }) {
  // Simula delay de 2s
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const posts = await prisma.post.findMany({
    where: { community: { slug } },
    take: 10,
  });
  
  return <PostsList posts={posts} />;
}
```

---

### **8. PATRONES DE DISEÑO** 🎯

**1. Repository Pattern**

- Abstracción de acceso a datos
- Implementado en Server Actions

```typescript
// repositories/communityRepository.ts
export const communityRepository = {
  async findBySlug(slug: string) {
    return await prisma.community.findUnique({ where: { slug } });
  },
  
  async create(data: CreateCommunityInput) {
    return await prisma.community.create({ data });
  },
  
  async update(id: string, data: UpdateCommunityInput) {
    return await prisma.community.update({ where: { id }, data });
  },
};
```

**2. Factory Pattern**

- Para crear elementos del Visual Builder

```typescript
type ElementType = "text" | "image" | "button" | "bio" | "stats";

function createElementFactory(type: ElementType, x: number, y: number) {
  const baseElement = {
    id: `element-${Date.now()}`,
    x,
    y,
  };
  
  switch (type) {
    case "text":
      return { ...baseElement, type: "text", content: "New Text", width: 200, height: 100 };
    case "image":
      return { ...baseElement, type: "image", url: "", width: 300, height: 200 };
    case "button":
      return { ...baseElement, type: "button", label: "Click Me", width: 150, height: 50 };
    // ... más tipos
  }
}
```

**3. Observer Pattern**

- Con React state y useEffect

```tsx
function ChatRoom() {
  const [messages, setMessages] = useState([]);
  
  useEffect(() => {
    // Subscribe to new messages
    const unsubscribe = socket.on("message", (message) => {
      setMessages(prev => [...prev, message]);
    });
    
    // Cleanup on unmount
    return () => unsubscribe();
  }, []);
  
  return <MessageList messages={messages} />;
}
```

**4. Singleton Pattern**

- Prisma client instance

```typescript
// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

**5. Composition over Inheritance**

- Componentes de React

```tsx
// Composition
function Card({ children }) {
  return <div className="card">{children}</div>;
}

function CardHeader({ children }) {
  return <div className="card-header">{children}</div>;
}

function CardBody({ children }) {
  return <div className="card-body">{children}</div>;
}

// Uso
<Card>
  <CardHeader>Title</CardHeader>
  <CardBody>Content</CardBody>
</Card>
```

**6. Higher-Order Component (HOC)**

- Menos común en hooks era, pero aún útil

```tsx
function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { data: session, status } = useSession();
    
    if (status === "loading") return <Loading />;
    if (!session) return <Redirect to="/signin" />;
    
    return <Component {...props} />;
  };
}

// Uso
const ProtectedPage = withAuth(DashboardPage);
```

---

### **9. RECURSOS DE APRENDIZAJE** 📚

#### **Documentación Oficial**

**Next.js 14**

- Docs: https://nextjs.org/docs
- Learn: https://nextjs.org/learn (Tutorial interactivo)
- Examples: https://github.com/vercel/next.js/tree/canary/examples
- App Router: https://nextjs.org/docs/app

**React 18**

- Docs: https://react.dev
- Learn: https://react.dev/learn
- Reference: https://react.dev/reference/react
- Server Components: https://react.dev/reference/rsc/server-components

**Prisma**

- Docs: https://www.prisma.io/docs
- Guides: https://www.prisma.io/docs/guides
- Prisma with Next.js: https://www.prisma.io/nextjs
- Schema Reference: https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference

**Tailwind CSS**

- Docs: https://tailwindcss.com/docs
- Components: https://tailwindui.com
- Cheat Sheet: https://nerdcave.com/tailwind-cheat-sheet

**NextAuth.js**

- Docs: https://authjs.dev
- Guides: https://authjs.dev/guides
- Prisma Adapter: https://authjs.dev/reference/adapter/prisma

---

#### **Tutoriales Relevantes**

**Next.js App Router**

- https://nextjs.org/learn
- https://www.youtube.com/watch?v=gSSsZReIFRk (Lee Robinson)

**Prisma with Next.js**

- https://www.prisma.io/nextjs
- https://www.youtube.com/watch?v=qCLV0Iaq9zU

**Server Actions**

- https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
- https://www.youtube.com/watch?v=dDpZfOQBMaU

**TypeScript**

- https://www.typescriptlang.org/docs/handbook/intro.html
- https://react-typescript-cheatsheet.netlify.app/

---

#### **Libros Recomendados**

1. **"Learning React" by Alex Banks & Eve Porcello**
    - Modern React patterns
    - Hooks deep dive

2. **"Effective TypeScript" by Dan Vanderkam**
    - TypeScript best practices
    - Type system mastery

3. **"Design Patterns: Elements of Reusable Object-Oriented Software"**
    - Classic patterns aplicables a React

---

#### **Videos y Cursos**

**YouTube Channels:**

- **Vercel** - Next.js official channel
- **Web Dev Simplified** - React y Next.js tutorials
- **Jack Herrington** - TypeScript y React avanzado
- **Theo - t3.gg** - Full-stack Next.js

**Cursos:**

- **Next.js 14 & React - The Complete Guide** (Udemy)
- **The Complete Next.js Developer** (Zero To Mastery)
- **Prisma Fundamentals** (Prisma.io)

---

#### **Blogs y Newsletters**

- **Next.js Blog:** https://nextjs.org/blog
- **Vercel Blog:** https://vercel.com/blog
- **Prisma Blog:** https://www.prisma.io/blog
- **This Week in React:** https://thisweekinreact.com/
- **React Status:** https://react.statuscode.com/

---

## 🎯 **RESUMEN EJECUTIVO**

### **Stack Principal:**

```
┌────────────────────────────────────────┐
│  FRONTEND                              │
│  ⚛️  React 18 + Next.js 14            │
│  🎨 Tailwind CSS + Radix UI           │
│  📦 TypeScript                         │
├────────────────────────────────────────┤
│  BACKEND                               │
│  🗄️  PostgreSQL + Prisma              │
│  🔐 NextAuth.js                        │
│  ⚙️  Server Actions + API Routes       │
├────────────────────────────────────────┤
│  SERVICES                              │
│  ☁️  Vercel (Hosting)                  │
│  📁 UploadThing (CDN)                  │
│  🎥 LiveKit (Video - planeado)         │
│  🤖 OpenAI (AI - planeado)             │
│  💬 Socket.io (Chat - planeado)        │
└────────────────────────────────────────┘
```

---

### **Técnicas Clave:**

1. **Server Components + Client Components** - Arquitectura híbrida
2. **Server Actions** - Mutations type-safe sin API routes
3. **Drag & Drop nativo HTML5** - Performance óptimo
4. **CSS 3D Transforms** - Carrusel 3D sin librerías
5. **Optimistic Updates** - UX fluida
6. **Type-safe Database** - Prisma ORM
7. **Parallel Data Fetching** - Promise.all + Suspense
8. **Image Optimization** - Next.js Image + UploadThing CDN

---

### **Nivel Técnico:** **Intermedio-Avanzado** 🚀

**Requiere conocimiento de:**

- React fundamentals (useState, useEffect, hooks)
- TypeScript basics
- Next.js App Router
- Async/await y Promises
- REST APIs
- SQL y databases

**Incluye conceptos avanzados:**

- Server Components vs Client Components
- Server Actions pattern
- Prisma ORM con relaciones complejas
- 3D CSS transforms
- Optimistic UI updates
- Performance optimization

---

## 📞 **CONTACTO Y SOPORTE**

**Documentación del proyecto:**

- `web/README.md` - Setup instructions
- `web/UNYTEA_STATUS_REPORT.md` - Estado completo del proyecto
- `web/TECH_STACK_DOCUMENTATION.md` - Este documento

**Community:**

- Next.js Discord: https://nextjs.org/discord
- Prisma Slack: https://slack.prisma.io
- Stack Overflow: Tags `nextjs`, `prisma`, `react`

---

**Última actualización:** 8 de Enero, 2025  
**Mantenido por:** Equipo de Desarrollo Unytea  
**Versión:** 1.0

🚀 **¡Happy Coding!**