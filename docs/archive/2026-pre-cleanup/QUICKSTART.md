# 🚀 Mentorly - Quick Start Guide

Get Mentorly up and running in under 5 minutes.

---

## Prerequisites

Before you begin, ensure you have:

- ✅ **Node.js 18+** ([Download](https://nodejs.org/))
- ✅ **npm 9+** (comes with Node.js)
- ✅ **Git** ([Download](https://git-scm.com/))
- ✅ **PostgreSQL** (or use a cloud provider)

---

## Step 1: Clone & Install

```bash
# Clone the repository
git clone https://github.com/yourusername/mentorly.git
cd mentorly/web

# Install dependencies (this will take ~2 minutes)
npm install
```

---

## Step 2: Set Up Database

### Option A: Local PostgreSQL

```bash
# Make sure PostgreSQL is running
# Create a database
createdb mentorly

# Set your DATABASE_URL
# In .env file:
DATABASE_URL="postgresql://yourusername:yourpassword@localhost:5432/mentorly"
```

### Option B: Cloud Database (Recommended)

**Using Supabase (Free):**

1. Go to [Supabase](https://supabase.com)
2. Create a new project
3. Copy the "Connection Pooling" URL
4. Paste it in your `.env` file

**Using Railway (Free):**

1. Go to [Railway.app](https://railway.app)
2. Create a new PostgreSQL database
3. Copy the DATABASE_URL
4. Paste it in your `.env` file

---

## Step 3: Environment Variables

```bash
# Copy the example env file
cp .env.example .env
```

Edit `.env` and fill in the required values:

```env
# Database (REQUIRED)
DATABASE_URL="postgresql://..."

# Clerk Auth (Sign up at https://clerk.com - Free tier available)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Optional (can skip for now)
STRIPE_SECRET_KEY="sk_test_..."
LIVEKIT_API_KEY="..."
OPENAI_API_KEY="..."
```

### Getting Clerk Keys (Required for Auth)

1. Go to [clerk.com](https://clerk.com) and sign up (free)
2. Create a new application
3. Go to "API Keys"
4. Copy the keys to your `.env` file

---

## Step 4: Initialize Database

```bash
# Push the Prisma schema to your database
npm run db:push

# This creates all tables and relationships
```

---

## Step 5: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**You should see the beautiful Mentorly landing page! 🎉**

---

## Next Steps

### 1. Explore the Landing Page

The homepage showcases:

- ✅ Modern, premium UI
- ✅ Feature comparison with Skool
- ✅ Pricing plans
- ✅ Smooth animations

### 2. Sign Up for an Account

Click "Sign Up" and create an account using Clerk's authentication.

### 3. Explore the Database

```bash
# Open Prisma Studio (visual database explorer)
npm run db:studio
```

This opens `http://localhost:5555` where you can see and edit all your data.

### 4. Code Structure Tour

```
web/
├── app/                 # Pages & routing
│   ├── page.tsx        # 👈 Start here - Landing page
│   ├── layout.tsx      # Root layout
│   └── globals.css     # Global styles
├── components/         # Reusable components
├── lib/               # Utilities
├── prisma/            # Database schema
│   └── schema.prisma  # 👈 All database tables
└── public/            # Static files
```

---

## Development Workflow

### Running Commands

```bash
# Start dev server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format

# Database operations
npm run db:push      # Push schema changes
npm run db:studio    # Visual database explorer
npm run db:migrate   # Create migration
```

### Making Changes

1. **Edit `app/page.tsx`** to modify the landing page
2. **Add new routes** in the `app/` directory
3. **Create components** in the `components/` directory
4. **Modify database** in `prisma/schema.prisma`

Hot reload is enabled - changes appear instantly! ⚡

---

## Troubleshooting

### "Cannot connect to database"

**Solution:**

- Check your `DATABASE_URL` in `.env`
- Make sure PostgreSQL is running
- Verify the credentials are correct

### "Clerk is not defined"

**Solution:**

- Make sure you have Clerk keys in `.env`
- Restart the dev server after adding env variables

### "Module not found"

**Solution:**

```bash
rm -rf node_modules
rm package-lock.json
npm install
```

### TypeScript Errors

**Solution:**

```bash
npm run type-check
```

This will show you exact errors to fix.

---

## What's Included? ✨

### ✅ Already Built

- **Landing Page**: Premium, responsive, animated
- **Database Schema**: Complete data model for communities, users, sessions, courses
- **Design System**: Tailwind + custom tokens + shadcn/ui
- **Type Safety**: TypeScript strict mode everywhere
- **Authentication Ready**: Clerk integration prepared
- **Payment Ready**: Stripe integration prepared
- **Video Ready**: Livekit integration prepared

### 🚧 To Be Built (Next Steps)

- Authentication pages (sign-in, sign-up)
- Dashboard layout
- Community creation flow
- Video call interface
- Courses builder
- Analytics dashboard

---

## Adding Features

### Example: Create a New Page

```bash
# Create a new route
mkdir -p app/about
touch app/about/page.tsx
```

```tsx
// app/about/page.tsx
export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-20">
      <h1 className="text-4xl font-bold">About Mentorly</h1>
      <p className="mt-4 text-xl text-muted-foreground">
        We're building the future of community platforms.
      </p>
    </div>
  );
}
```

Now visit [http://localhost:3000/about](http://localhost:3000/about)

### Example: Add a Database Model

```prisma
// prisma/schema.prisma

model Event {
  id          String   @id @default(cuid())
  title       String
  description String?
  date        DateTime
  createdAt   DateTime @default(now())
  
  communityId String
  community   Community @relation(fields: [communityId], references: [id])
  
  @@map("events")
}
```

Then:

```bash
npm run db:push  # Updates the database
```

---

## Deployment (When Ready)

### Deploy to Vercel (Recommended)

1. Push code to GitHub
2. Import to [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy!

### Environment Variables for Production

Make sure to set these in Vercel:

- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- All others as needed

---

## Learning Resources

### Next.js

- [Next.js Docs](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)

### Prisma

- [Prisma Docs](https://www.prisma.io/docs)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)

### Tailwind CSS

- [Tailwind Docs](https://tailwindcss.com/docs)
- [Tailwind UI Components](https://tailwindui.com/)

### TypeScript

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

---

## Getting Help

### Issues?

1. Check the [README](./README.md)
2. Check the [Architecture docs](./ARCHITECTURE.md)
3. Search existing GitHub issues
4. Create a new issue with:
    - What you tried to do
    - What happened
    - Error messages
    - Your environment (OS, Node version)

---

## Pro Tips 💡

1. **Use TypeScript autocomplete** - It knows everything about your database!
2. **Hot reload is your friend** - No need to restart the server
3. **Use Prisma Studio** - Visual way to manage your database
4. **Format on save** - Set up your editor to run Prettier automatically
5. **Check the console** - Helpful error messages appear there

---

## Success Checklist ✅

After following this guide, you should have:

- [x] Project installed and running
- [x] Database connected and initialized
- [x] Dev server running at localhost:3000
- [x] Landing page looking beautiful
- [x] Clerk authentication set up
- [x] Prisma Studio accessible

---

## What's Next?

Now you're ready to start building! Here are some suggested next steps:

1. **Customize the landing page** - Make it yours
2. **Add authentication pages** - Sign-in and sign-up flows
3. **Build the dashboard** - Where users manage their communities
4. **Add community features** - Posts, comments, members
5. **Implement video calls** - The killer feature!

---

**Welcome to the Mentorly development team! Let's build something amazing. 🚀**

Have questions? Open an issue or reach out to the team.

Happy coding! 💜
