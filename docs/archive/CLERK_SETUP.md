# 🔐 Clerk Authentication Setup Guide

## 🎯 Overview

Clerk provides enterprise-grade authentication with:

- ✅ Email/Password
- ✅ Social logins (Google, GitHub, Twitter, etc.)
- ✅ Magic links
- ✅ 2FA support
- ✅ User management dashboard
- ✅ Session management

**Time:** 10-15 minutes

---

## 📝 Step 1: Create Clerk Account

### 1.1 Sign Up

Go to: **https://clerk.com**

- Click "Start Building For Free"
- Sign up with email or GitHub
- Verify your email

### 1.2 Create Application

- Click "Create Application"
- **Application Name:** `Mentorly`
- **Select authentication methods:**
  - ✅ Email (required)
  - ✅ Google OAuth (recommended)
  - ✅ GitHub OAuth (optional)
  - ✅ Any others you want

- Click "Create Application"

---

## 🔑 Step 2: Get API Keys

### 2.1 Copy Your Keys

After creating the application, you'll see your API keys:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### 2.2 Update .env.local

Open `web/.env.local` and replace the placeholders:

```env
# Clerk Authentication Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_KEY_HERE
CLERK_SECRET_KEY=sk_test_YOUR_ACTUAL_KEY_HERE

# Clerk URLs (Already configured)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/onboarding
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

**Important:**

- ⚠️ Never commit the `.env.local` file (it's in `.gitignore`)
- ⚠️ The public key (`pk_test_`) is safe to expose
- ⚠️ The secret key (`sk_test_`) must stay private

---

## ⚙️ Step 3: Configure Clerk Dashboard

### 3.1 Setup Redirect URLs

In your Clerk Dashboard:

1. Go to **"Paths"** section
2. Configure these URLs:

```
Sign in page:     /sign-in
Sign up page:     /sign-up
Home URL:         /dashboard
After sign in:    /onboarding
After sign up:    /onboarding
```

### 3.2 Enable Social Logins (Optional)

For Google OAuth:

1. Go to **"Social Connections"** → Google
2. Click "Enable"
3. Use Clerk's shared credentials (development)
4. Later: Add your own OAuth credentials for production

For GitHub:

1. Go to **"Social Connections"** → GitHub
2. Click "Enable"
3. Use Clerk's shared credentials

---

## 🚀 Step 4: Test Authentication

### 4.1 Start Development Server

```bash
npm run dev
```

### 4.2 Test Sign Up Flow

1. Open: http://localhost:3000
2. Click "Start Free" or "Get Started"
3. Should redirect to: http://localhost:3000/sign-up
4. Create an account:
   - ✅ Try email/password
   - ✅ Try Google OAuth
   - ✅ Try GitHub OAuth
5. After sign up → Redirects to `/onboarding`
6. Complete onboarding → Redirects to `/dashboard`

### 4.3 Test Sign In Flow

1. Sign out from user menu
2. Go to: http://localhost:3000/sign-in
3. Sign in with your credentials
4. Should redirect to `/onboarding` or `/dashboard`

### 4.4 Test Protected Routes

Try accessing without being logged in:

- http://localhost:3000/dashboard → Should redirect to `/sign-in`
- http://localhost:3000/onboarding → Should redirect to `/sign-in`

---

## ✅ Verification Checklist

- [ ] Clerk account created
- [ ] Application "Mentorly" created
- [ ] API keys copied to `.env.local`
- [ ] Dev server running (`npm run dev`)
- [ ] Can sign up with email
- [ ] Can sign up with Google (if enabled)
- [ ] Onboarding flow works
- [ ] Dashboard loads after onboarding
- [ ] Can sign out
- [ ] Can sign in again
- [ ] Protected routes redirect to sign-in

---

## 🎨 What We Built

### Files Created:

```
web/
├── middleware.ts                      ← Protects routes
├── app/
│   ├── layout.tsx                    ← ClerkProvider wrapper
│   ├── (auth)/
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   ├── sign-up/[[...sign-up]]/page.tsx
│   │   └── layout.tsx
│   └── (dashboard)/
│       ├── dashboard/
│       │   ├── layout.tsx           ← Sidebar + Header
│       │   └── page.tsx             ← Main dashboard
│       └── onboarding/page.tsx      ← 3-step onboarding
└── components/
    └── dashboard/
        ├── sidebar.tsx              ← Navigation
        └── header.tsx               ← User menu
```

### Routes:

| Route          | Description          | Protected |
| -------------- | -------------------- | --------- |
| `/`            | Landing page         | No        |
| `/sign-in`     | Login page           | No        |
| `/sign-up`     | Registration page    | No        |
| `/onboarding`  | First-time setup     | Yes       |
| `/dashboard`   | Main dashboard       | Yes       |
| `/dashboard/*` | All dashboard routes | Yes       |

---

## 🔧 Troubleshooting

### Error: "Clerk: Missing publishableKey"

**Solution:**

- Check that `.env.local` exists
- Check that keys are correct
- Restart dev server: `npm run dev`

### Error: "Invalid publishable key"

**Solution:**

- Make sure you copied the FULL key
- Check for extra spaces
- Get fresh keys from Clerk Dashboard

### Sign up button doesn't work

**Solution:**

- Check browser console for errors
- Make sure Clerk keys are set
- Check that routes are configured in Clerk Dashboard

### Infinite redirect loop

**Solution:**

- Check `middleware.ts` is correct
- Check redirect URLs in `.env.local`
- Clear browser cache/cookies

### Social login doesn't work

**Solution:**

- Check that provider is enabled in Clerk Dashboard
- For production, you'll need your own OAuth credentials
- Development uses Clerk's shared credentials

---

## 📊 Current State

### ✅ Completed:

- Clerk integration
- Sign in/up pages
- Protected routes
- Dashboard layout
- Onboarding flow
- User menu
- Navigation sidebar

### 🔄 Next Steps:

1. **User Sync with Database** (webhook)
2. **Profile page** implementation
3. **Communities** CRUD
4. **Posts & Comments** features

---

## 🎯 Production Checklist (For Later)

When going to production:

- [ ] Use production Clerk keys (`pk_live_...` and `sk_live_...`)
- [ ] Setup custom OAuth apps (Google, GitHub)
- [ ] Configure custom email templates
- [ ] Add email verification
- [ ] Enable 2FA
- [ ] Setup webhooks for user sync
- [ ] Add organization support (if needed)
- [ ] Configure session settings
- [ ] Add custom JWT claims

---

## 💡 Pro Tips

### Custom Theming

Clerk components already match your design system via the `appearance` prop in `layout.tsx`:

```tsx
<ClerkProvider
  appearance={{
    variables: {
      colorPrimary: "hsl(263 70% 50%)",
      // ... more customization
    }
  }}
>
```

### User Data

Access user data anywhere:

```tsx
import { useUser } from "@clerk/nextjs";

function MyComponent() {
  const { user } = useUser();

  return <div>Hello {user?.firstName}!</div>;
}
```

### Server-side Auth

Protect server components:

```tsx
import { auth } from "@clerk/nextjs/server";

async function MyServerComponent() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // ... fetch data
}
```

---

## 🚀 Ready to Continue?

Once Clerk is working, we'll build:

1. **User Sync** - Webhook to sync Clerk users → Prisma DB
2. **Profile Page** - Edit bio, avatar, settings
3. **Communities** - Create and manage communities
4. **Posts** - Content creation and engagement

---

**Time to complete:** ~10-15 minutes
**Difficulty:** Easy
**Blockers:** None (all setup is in Clerk Dashboard)

**Let's go! 🔥**
