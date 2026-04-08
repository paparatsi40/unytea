# 🔄 CLERK TO NEXTAUTH MIGRATION CHECKLIST

## ✅ COMPLETED

- [x] `/lib/auth.ts` - NextAuth configuration
- [x] `/lib/auth-utils.ts` - Server-side helpers
- [x] `/hooks/use-current-user.ts` - Client hook
- [x] `/app/api/auth/[...nextauth]/route.ts` - API route
- [x] `/app/api/auth/signup/route.ts` - Signup endpoint
- [x] `/app/auth/signin/page.tsx` - Sign in page
- [x] `/app/auth/signup/page.tsx` - Sign up page
- [x] `/app/auth/forgot-password/page.tsx` - Forgot password
- [x] `/middleware.ts` - Route protection
- [x] `/app/layout.tsx` - Root layout (SessionProvider)
- [x] `/components/dashboard/header.tsx` - Dashboard header
- [x] `/components/ui/dropdown-menu.tsx` - UI component
- [x] `/components/ui/avatar.tsx` - UI component
- [x] `/app/onboarding/page.tsx` - Onboarding (updated)
- [x] `/app/api/user/onboarding/route.ts` - Onboarding API
- [x] `/app/actions/communities.ts` - Communities actions

## ⏳ PENDING

### Server Actions

- [ ] `/app/actions/posts.ts` - Replace clerkId with user.id
- [ ] `/app/actions/reactions.ts` - Replace useUser with useCurrentUser

### Client Components

- [ ] `/components/community/CommunityFeedClient.tsx`
- [ ] `/components/community/CommunityLayoutClient.tsx`
- [ ] `/components/community/CommunitiesClient.tsx`
- [ ] `/components/community/PostFeed.tsx`
- [ ] `/components/community/PremiumPostFeed.tsx`
- [ ] `/components/community/PostReactions.tsx`
- [ ] `/components/community/CommunityActions.tsx`

### Pages

- [ ] `/app/(dashboard)/dashboard/communities/new/page.tsx`
- [ ] `/app/(dashboard)/dashboard/communities/explore/page.tsx`
- [ ] `/app/(dashboard)/dashboard/settings/profile/page.tsx`
- [ ] `/app/c/[slug]/members/page.tsx`

### API Routes

- [ ] `/app/api/communities/route.ts`

### Cleanup

- [ ] Remove `/app/api/webhooks/clerk/route.ts`
- [ ] Remove `/lib/clerk.ts`

## 🔍 PATTERN TO REPLACE

### Server-side (Server Actions, API Routes)

```typescript
// OLD
import { auth } from "@clerk/nextjs/server"
const { userId } = await auth()

const user = await prisma.user.findUnique({
  where: { clerkId: userId }
})

// NEW
import { getCurrentUserId } from "@/lib/auth-utils"
const userId = await getCurrentUserId()

// User ID is already the DB user ID, no need for lookup
```

### Client-side (Components)

```typescript
// OLD
import { useUser } from "@clerk/nextjs"
const { user } = useUser()
const userId = user?.id // This is Clerk ID

// NEW
import { useCurrentUser } from "@/hooks/use-current-user"
const { user } = useCurrentUser()
const userId = user?.id // This is DB user ID
```

### User Fields Mapping

```typescript
// OLD (Clerk)
user.id → clerkId
user.firstName
user.lastName
user.emailAddresses[0].emailAddress
user.imageUrl

// NEW (NextAuth)
user.id → database user ID
user.name → full name
user.email
user.image
```

## 🎯 NEXT STEPS

1. Update `/app/actions/posts.ts`
2. Update `/app/actions/reactions.ts`
3. Update all community components
4. Update dashboard pages
5. Test everything
6. Delete Clerk files
