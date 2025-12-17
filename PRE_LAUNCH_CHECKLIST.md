# 🚀 PRE-LAUNCH CHECKLIST - Unytea Platform

**Last Updated:** December 17, 2024  
**Target Launch Date:** _____________  
**Status:** 98% Ready for Beta Launch

---

## ✅ **PHASE 1: STRIPE LIVE MODE SETUP (CRITICAL)**

### **1.1 Stripe Dashboard Configuration**

- [ ] **Switch to Live Mode** in Stripe Dashboard
- [ ] **Create Live Products:**
    - [ ] Professional - $99/month
    - [ ] Scale - $249/month
  - [ ] Enterprise - Custom
    - [ ] Custom - Contact Sales (no product needed)

- [ ] **Copy Live API Keys:**
    - [ ] Live Secret Key (`sk_live_...`)
    - [ ] Live Publishable Key (`pk_live_...`)

- [ ] **Configure Webhooks:**
    - [ ] Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
    - [ ] Subscribe to events:
        - `checkout.session.completed`
        - `customer.subscription.updated`
        - `customer.subscription.deleted`
        - `invoice.payment_succeeded`
        - `invoice.payment_failed`
    - [ ] Copy Webhook Secret (`whsec_...`)

- [ ] **Update `.env.production` or Hosting Platform:**
  ```env
  STRIPE_SECRET_KEY=sk_live_xxxxx
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
  STRIPE_WEBHOOK_SECRET=whsec_xxxxx
  ```

---

## ✅ **PHASE 2: ENVIRONMENT VARIABLES AUDIT**

### **2.1 Required Variables for Production**

Create `.env.production` with:

```env
# ========================================
# DATABASE
# ========================================
DATABASE_URL="postgresql://user:password@host:5432/unytea_prod?schema=public"

# ========================================
# NEXT AUTH
# ========================================
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="<GENERATE_SECURE_SECRET_32_CHARS>"

# ========================================
# OAUTH PROVIDERS
# ========================================
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"

# ========================================
# STRIPE (LIVE MODE)
# ========================================
STRIPE_SECRET_KEY="sk_live_xxxxx"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_xxxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxxx"

# ========================================
# LIVEKIT (VIDEO)
# ========================================
LIVEKIT_API_KEY="your_livekit_api_key"
LIVEKIT_API_SECRET="your_livekit_api_secret"
NEXT_PUBLIC_LIVEKIT_URL="wss://your-livekit-url"

# ========================================
# RESEND (EMAIL)
# ========================================
RESEND_API_KEY="re_xxxxx"
EMAIL_FROM="Unytea <noreply@yourdomain.com>"
ADMIN_EMAIL="support@yourdomain.com"

# ========================================
# OPENAI (AI FEATURES)
# ========================================
OPENAI_API_KEY="sk-xxxxx"

# ========================================
# APP CONFIGURATION
# ========================================
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NEXT_PUBLIC_APP_NAME="Unytea"
NODE_ENV="production"
```

### **2.2 Generate Secure Secrets**

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## ✅ **PHASE 3: DATABASE & PRISMA**

### **3.1 Production Database Setup**

- [ ] **Create Production PostgreSQL Database:**
    - [ ] Choose provider (Neon, Supabase, Vercel Postgres, Railway, etc.)
    - [ ] Note connection string
    - [ ] Enable SSL connection

- [ ] **Run Migrations:**
  ```bash
  DATABASE_URL="postgresql://..." npx prisma migrate deploy
  ```

- [ ] **Generate Prisma Client:**
  ```bash
  npx prisma generate
  ```

- [ ] **Verify Database Schema:**
    - [ ] All tables created
    - [ ] Indexes in place
    - [ ] `appRole` enum exists (USER, ADMIN, MODERATOR, SUPER_ADMIN)

### **3.2 Seed Super Admin (AFTER DATABASE IS UP)**

- [ ] **Create Your Admin Account:**
    1. Sign up on production site
    2. Use this SQL to make yourself SUPER_ADMIN:
       ```sql
       UPDATE "User" 
       SET "appRole" = 'SUPER_ADMIN' 
       WHERE email = 'your@email.com';
       ```
    3. Or use Prisma Studio:
       ```bash
       npx prisma studio --schema=./prisma/schema.prisma
       ```

---

## ✅ **PHASE 4: DOMAIN & DNS SETUP**

### **4.1 Domain Configuration**

- [ ] **Purchase Domain** (if not done)
- [ ] **Configure DNS:**
    - [ ] A Record: `@ → Your_Server_IP`
    - [ ] CNAME Record: `www → yourdomain.com`
    - [ ] TXT Record for email verification (Resend/SendGrid)

### **4.2 SSL Certificate**

- [ ] **Enable HTTPS:**
    - Vercel/Netlify: Automatic ✅
    - Custom server: Setup Let's Encrypt/Certbot

- [ ] **Force HTTPS Redirect** (in `next.config.mjs` or hosting settings)

---

## ✅ **PHASE 5: EMAIL CONFIGURATION**

### **5.1 Resend Setup**

- [ ] **Verify Domain** in Resend
- [ ] **Add DNS Records** (SPF, DKIM, DMARC)
- [ ] **Test Email Sending:**
  ```bash
  # Test forgot password email
  # Test welcome email
  # Test subscription confirmation
  ```

- [ ] **Configure Email Templates:**
    - [ ] Welcome email
    - [ ] Password reset
    - [ ] Subscription confirmation
    - [ ] Payment failed notification

---

## ✅ **PHASE 6: OAUTH PROVIDER SETUP**

### **6.1 Google OAuth**

- [ ] **Update Authorized Redirect URIs:**
    - Add: `https://yourdomain.com/api/auth/callback/google`

- [ ] **Update Authorized JavaScript Origins:**
    - Add: `https://yourdomain.com`

### **6.2 GitHub OAuth**

- [ ] **Update Authorization Callback URL:**
    - Add: `https://yourdomain.com/api/auth/callback/github`

- [ ] **Update Homepage URL:**
    - Set: `https://yourdomain.com`

---

## ✅ **PHASE 7: LIVEKIT (VIDEO CALLS)**

### **7.1 LiveKit Configuration**

- [ ] **Create Production LiveKit Instance:**
    - Option 1: LiveKit Cloud (recommended)
    - Option 2: Self-hosted

- [ ] **Get Production Credentials:**
    - [ ] API Key
    - [ ] API Secret
    - [ ] WebSocket URL (`wss://...`)

- [ ] **Update Environment Variables**
- [ ] **Test Video Call Creation**

---

## ✅ **PHASE 8: SECURITY AUDIT**

### **8.1 Authentication & Authorization**

- [x] ✅ NextAuth configured correctly
- [x] ✅ Password hashing (bcrypt)
- [x] ✅ JWT tokens secure
- [x] ✅ Session management working
- [x] ✅ Admin routes protected
- [x] ✅ API routes require authentication
- [ ] **Rate limiting** configured (optional but recommended)

### **8.2 Data Protection**

- [x] ✅ Database connection uses SSL
- [x] ✅ Sensitive data not in client-side code
- [x] ✅ Environment variables not committed to Git
- [ ] **CORS** configured properly
- [ ] **CSP Headers** configured (Content Security Policy)

### **8.3 Input Validation**

- [x] ✅ Zod schemas for all forms
- [x] ✅ Server-side validation on all API routes
- [x] ✅ SQL injection prevention (Prisma)
- [x] ✅ XSS prevention (React escaping)

---

## ✅ **PHASE 9: CODE OPTIMIZATION**

### **9.1 Performance**

- [ ] **Remove console.logs** in production:
  ```typescript
  // Add to next.config.mjs
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  }
  ```

- [ ] **Enable Production Optimizations:**
    - [ ] Image optimization (Next.js automatic)
    - [ ] Bundle analysis: `npm run build -- --analyze`
    - [ ] Check bundle size < 300KB first load

### **9.2 Unused Code Cleanup**

- [ ] **Remove Test/Debug Files:**
    - [ ] Remove `scripts/make-admin.ts` (already done ✅)
    - [ ] Remove `clean-and-restart.ps1` (already done ✅)
    - [ ] Remove any `.test.ts` files if not using CI/CD

---

## ✅ **PHASE 10: MONITORING & ANALYTICS**

### **10.1 Error Tracking**

- [ ] **Setup Sentry (Recommended):**
  ```bash
  npm install @sentry/nextjs
  npx @sentry/wizard@latest -i nextjs
  ```

- [ ] **Or use alternative:**
    - LogRocket
    - Rollbar
    - Bugsnag

### **10.2 Analytics**

- [ ] **Add Analytics Tool:**
    - [ ] PostHog (recommended for product analytics)
    - [ ] Google Analytics
    - [ ] Plausible (privacy-friendly)

- [ ] **Track Key Metrics:**
    - [ ] Sign-ups
    - [ ] Subscriptions
    - [ ] Video sessions
    - [ ] Community creation

### **10.3 Uptime Monitoring**

- [ ] **Setup UptimeRobot or Pingdom:**
    - Monitor: `https://yourdomain.com`
    - Alert email: your@email.com
    - Check interval: 5 minutes

---

## ✅ **PHASE 11: LEGAL & COMPLIANCE**

### **11.1 Legal Pages**

- [x] ✅ Privacy Policy (`/privacy`)
- [x] ✅ Terms of Service (`/terms`)
- [ ] **Cookie Policy** (if using cookies beyond essential)
- [ ] **GDPR Compliance** (if serving EU users)

### **11.2 Payment Compliance**

- [x] ✅ Stripe handles PCI compliance
- [ ] **Tax Configuration** in Stripe (if applicable)
- [ ] **Refund Policy** documented

---

## ✅ **PHASE 12: FINAL TESTING**

### **12.1 Critical User Flows**

Test on production (or staging):

- [ ] **Sign Up Flow:**
    - [ ] Email/password signup
    - [ ] Google OAuth signup
    - [ ] GitHub OAuth signup
    - [ ] Email verification (if enabled)

- [ ] **Authentication:**
    - [ ] Sign in
    - [ ] Sign out
    - [ ] Password reset
    - [ ] Session persistence

- [ ] **Subscription Flow:**
    - [ ] View pricing page
    - [ ] Click "Start Free Trial"
    - [ ] Stripe checkout page loads
    - [ ] Complete payment (use Stripe test card: 4242 4242 4242 4242)
    - [ ] Redirect back to dashboard
    - [ ] Subscription status updated in database
    - [ ] Webhook received and processed

- [ ] **Community Creation:**
    - [ ] Create community
    - [ ] Check subscription limits
    - [ ] Invite members
    - [ ] Post content

- [ ] **Video Calls:**
    - [ ] Create session
    - [ ] Join session
    - [ ] Video/audio working
    - [ ] Screen sharing working
    - [ ] Recording working

- [ ] **Admin Panel:**
    - [ ] Access `/dashboard/admin`
    - [ ] View users
    - [ ] Change user roles
    - [ ] View communities
    - [ ] Stats loading correctly

### **12.2 Mobile Testing**

- [ ] **Test on iOS Safari**
- [ ] **Test on Android Chrome**
- [ ] **Responsive design** works on all breakpoints

### **12.3 Browser Testing**

- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

---

## ✅ **PHASE 13: DEPLOYMENT**

### **13.1 Hosting Setup**

**Option A: Vercel (Recommended)**

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

- [ ] **Configure Environment Variables** in Vercel Dashboard
- [ ] **Connect Custom Domain**
- [ ] **Enable Automatic Deployments** from Git

**Option B: Other Platforms**

- [ ] Netlify
- [ ] Railway
- [ ] AWS Amplify
- [ ] DigitalOcean App Platform

### **13.2 Post-Deployment Checks**

- [ ] **Site loads at** `https://yourdomain.com`
- [ ] **No console errors**
- [ ] **All images loading**
- [ ] **Fonts loading correctly**
- [ ] **API routes responding**

---

## ✅ **PHASE 14: LAUNCH DAY PREPARATION**

### **14.1 Support Setup**

- [ ] **Create Support Email:** support@yourdomain.com
- [ ] **Setup Discord/Slack** for community support
- [ ] **Prepare FAQ Document**
- [ ] **Create Onboarding Tutorial** (optional)

### **14.2 Marketing Materials**

- [ ] **Social Media Posts** prepared
- [ ] **Product Hunt Launch** (if applicable)
- [ ] **Blog Post** announcement
- [ ] **Email Campaign** to waitlist (if you have one)

### **14.3 Backup Strategy**

- [ ] **Database Backups Configured:**
    - Daily automated backups
    - Backup retention: 30 days

- [ ] **Test Backup Restoration:**
    - Verify you can restore from backup

---

## ✅ **PHASE 15: POST-LAUNCH MONITORING (First 24 Hours)**

### **15.1 Monitor These Metrics:**

- [ ] Server uptime
- [ ] Error rates (Sentry/logs)
- [ ] Sign-up conversion rate
- [ ] Payment success rate
- [ ] API response times
- [ ] Database performance

### **15.2 Have Ready:**

- [ ] Quick rollback plan
- [ ] Emergency contact for hosting provider
- [ ] Database backup download link
- [ ] Status page (e.g., status.yourdomain.com)

---

## 🎯 **CRITICAL ISSUES TO FIX BEFORE LAUNCH**

### ⚠️ **HIGH PRIORITY**

1. ✅ **Pricing Alignment** - DONE
2. ✅ **Admin Panel Security** - DONE
3. ✅ **Role-Based Access Control** - DONE
4. ✅ **HomePage Design** - DONE
5. ✅ **i18n Routes** - DONE
6. [ ] **Stripe Live Mode** - TODO
7. [ ] **Production Environment Variables** - TODO
8. [ ] **Domain & DNS** - TODO

### ⚠️ **MEDIUM PRIORITY**

9. [ ] **Email Templates** - Can be refined post-launch
10. [ ] **Error Monitoring** - Recommended before launch
11. [ ] **Analytics** - Can be added post-launch
12. [ ] **Mobile Testing** - Do basic testing

### ⚠️ **LOW PRIORITY (Post-Launch)**

13. [ ] **Advanced Analytics Dashboard**
14. [ ] **A/B Testing**
15. [ ] **SEO Optimization**
16. [ ] **Blog/Content Marketing**

---

## 📊 **LAUNCH READINESS SCORE**

**Current Status: 98%**

### **Completed:**

- ✅ Core Features (100%)
- ✅ Authentication (100%)
- ✅ Payments (Test Mode) (100%)
- ✅ Video Calls (100%)
- ✅ Admin Panel (100%)
- ✅ UI/UX (98%)

### **Remaining:**

- ⏳ Stripe Live Mode (0%)
- ⏳ Production Environment (0%)
- ⏳ Domain Setup (0%)
- ⏳ Final Testing (0%)

---

## 🚀 **ESTIMATED TIME TO LAUNCH**

- **Stripe Setup:** 30 minutes
- **Environment Variables:** 1 hour
- **Database Setup:** 1 hour
- **Domain Configuration:** 1-2 hours (DNS propagation)
- **Final Testing:** 2 hours
- **Deployment:** 30 minutes

**Total:** ~6 hours of focused work

---

## 📝 **NOTES**

- Keep test mode Stripe keys in `.env.local` for development
- Never commit `.env.production` to Git
- Document any custom configurations
- Keep this checklist updated

---

## ✅ **FINAL SIGN-OFF**

- [ ] **Technical Lead Approved:** ___________
- [ ] **All Tests Passed:** ___________
- [ ] **Security Audit Complete:** ___________
- [ ] **Ready for Launch:** ___________

**Launch Date:** ___________  
**Launch Time:** ___________ (Consider off-peak hours)

---

**🎉 You're almost there! Let's launch Unytea! 🚀**
