# Stripe products setup (Fase C)

**Status**: required before going live with new pricing. Carlos executes
once per environment (test mode + production).

**Inputs**: Stripe account access (live mode + test mode), Vercel env
var write access.

## Strategy

Pre-launch with 0 paying users → clean slate. Archive any legacy products
from older Unytea pricing iterations (Founder/Practice/Studio,
Professional/Premium, Start tier). Create 3 new products (Creator,
Business, Pro), each with 2 prices (monthly + annual).

## Manual steps (Stripe dashboard)

1. Login to Stripe dashboard. Switch to TEST mode first for verification.
2. Products → Add product
   a. **Creator** — Description: "Para creators emergentes lanzando su
   primera comunidad"
   b. **Business** — Description: "Para hosts establecidos creciendo su
   comunidad"
   c. **Pro** — Description: "Para teams scaling múltiples comunidades"
3. For each product, add 2 prices:
   - Monthly: $15 / $49 / $149 (Creator / Business / Pro), recurring,
     bill every 1 month
   - Annual: $150 / $490 / $1490, recurring, bill every 1 year
4. After all 6 prices created, copy each price ID (starts with `price_`)
5. Set Vercel env vars (Project settings → Environment Variables):
   - `NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID` = monthly Creator price ID
   - `NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID` = monthly Business price ID
   - `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` = monthly Pro price ID
   - `NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID_YEARLY` = annual Creator price ID
   - `NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID_YEARLY` = annual Business price ID
   - `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_YEARLY` = annual Pro price ID
   - Apply to: Production + Preview + Development environments
6. Also update local `.env.local` with the same 6 vars (use test mode IDs
   for local dev, live mode IDs for production deploys).
7. Run `npx tsx scripts/seed-stripe-products.ts --verify` to confirm
   env vars resolve to valid Stripe price objects (script created in
   this commit).
8. Archive legacy products in Stripe dashboard:
   - Look for any products named "Start", "Founder", "Practice", "Studio",
     "Professional", "Premium" → Archive (don't delete; preserves history).

## Optional: automated setup via script

If you prefer automation over manual clicks, run:

```
npx tsx scripts/seed-stripe-products.ts
```

This creates the 3 products + 6 prices via Stripe API (idempotent — won't
duplicate if products exist). Reads `STRIPE_SECRET_KEY` from env. Outputs
the price IDs at the end for manual copy to Vercel env vars.

## Verification

After setup, the following should work:

- `prisma/seed-subscription-plans.ts` runs without `price_*_placeholder`
  warnings
- Checkout flow in `/dashboard/upgrade` initializes Stripe checkout
  session successfully
- Stripe dashboard shows 3 active products + 6 active prices

## Re-running

This setup runs ONCE per environment (test + production). Re-running is
safe because the script is idempotent. Manual steps don't need re-doing
unless prices change (which would itself be a strategic decision requiring
doc updates).
