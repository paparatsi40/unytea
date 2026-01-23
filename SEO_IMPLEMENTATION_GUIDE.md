# 🚀 SEO Implementation Guide - Unytea/Mentorly

## ✅ What Was Implemented

Complete SEO infrastructure for maximum visibility in search engines.

---

## 📋 Implemented Features

### 1️⃣ **Technical SEO**

#### ✅ Sitemap (Dynamic)
- **File**: `app/sitemap.ts`
- **URL**: `https://www.unytea.com/sitemap.xml`
- **Features**:
  - Multi-language support (en, es)
  - Automatic lastModified dates
  - Priority and changeFrequency
  - Ready for dynamic pages (communities, courses)

#### ✅ Robots.txt (Dynamic)
- **File**: `app/robots.ts`
- **URL**: `https://www.unytea.com/robots.txt`
- **Features**:
  - Blocks private pages (dashboard, auth)
  - Allows public pages
  - Blocks AI crawlers (optional)
  - Links to sitemap

#### ✅ Web Manifest (PWA)
- **File**: `public/site.webmanifest`
- **Features**:
  - App name and description
  - Theme colors (brand purple)
  - Icons for all sizes
  - Shortcuts to key features
  - PWA-ready

---

### 2️⃣ **Structured Data (JSON-LD)**

#### ✅ Organization Schema
Rich snippet for brand info in search results.

#### ✅ Website Schema
Enables site search in Google.

#### ✅ SoftwareApplication Schema
SaaS listing with ratings.

#### ✅ Additional Schemas Available:
- `BreadcrumbSchema` - Navigation hierarchy
- `FAQSchema` - FAQ sections
- `CourseSchema` - Individual courses
- `VideoSchema` - Video content

**File**: `components/seo/structured-data.tsx`

---

### 3️⃣ **Metadata Helper**

#### ✅ Centralized SEO Configuration
- **File**: `lib/seo.ts`
- **Function**: `generateMetadata()`

**Features**:
- Open Graph tags
- Twitter Cards
- Multi-language alternates
- Canonical URLs
- Keywords
- Robots directives

---

## 🎯 How to Use

### For Static Pages

1. **Create metadata file** (e.g., `pricing/metadata.ts`):

```ts
import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "Pricing",
  description: "Choose your plan",
  keywords: ["pricing", "plans"],
  path: "/pricing",
});
```

2. **Export in page** (`pricing/page.tsx`):

```ts
export { metadata } from "./metadata";

export default function PricingPage() {
  // ...
}
```

---

### For Dynamic Pages

For communities, courses, user profiles:

```ts
// app/[locale]/c/[slug]/page.tsx
import { generateDynamicMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: Props) {
  const community = await getCommunity(params.slug);
  
  return generateDynamicMetadata({
    title: community.name,
    description: community.description,
    image: community.imageUrl,
    author: community.owner.name,
    tags: community.tags,
    path: `/c/${params.slug}`,
  });
}
```

---

### Adding Structured Data

In any page, import and use:

```tsx
import { FAQSchema } from "@/components/seo/structured-data";

export default function Page() {
  return (
    <>
      <FAQSchema items={[
        { question: "What is Unytea?", answer: "..." },
        { question: "How does it work?", answer: "..." },
      ]} />
      
      {/* Your page content */}
    </>
  );
}
```

---

## 📊 SEO Checklist

### ✅ Already Done

- [x] Sitemap.xml (dynamic)
- [x] Robots.txt (dynamic)
- [x] Structured Data (JSON-LD)
- [x] Open Graph tags
- [x] Twitter Cards
- [x] Canonical URLs
- [x] Multi-language support
- [x] Web Manifest (PWA)
- [x] Security headers (CSP)
- [x] HTTPS enforced
- [x] Mobile responsive

### 🔄 To Do (Recommended)

- [ ] Add metadata to all public pages
- [ ] Implement dynamic sitemap for communities
- [ ] Add FAQ section with FAQSchema
- [ ] Create blog (if applicable)
- [ ] Submit sitemap to Google Search Console
- [ ] Submit sitemap to Bing Webmaster Tools
- [ ] Set up Google Analytics 4
- [ ] Implement page speed optimizations
- [ ] Add breadcrumbs with BreadcrumbSchema
- [ ] Create video sitemap (if videos)

---

## 🔍 Testing & Validation

### 1. Test Sitemap

```bash
# Visit in browser
https://www.unytea.com/sitemap.xml

# Should show XML with all pages
```

### 2. Test Robots.txt

```bash
# Visit in browser
https://www.unytea.com/robots.txt

# Should show directives
```

### 3. Test Structured Data

1. Go to: https://search.google.com/test/rich-results
2. Enter your URL
3. Should show all schemas

### 4. Test Open Graph

1. Go to: https://www.opengraph.xyz/
2. Enter your URL
3. Check preview

### 5. Test Performance

```bash
npm run build
npm run start

# Then run Lighthouse
```

---

## 📈 Expected Lighthouse Scores

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| **Performance** | ~100 | ~100 | 90+ |
| **Accessibility** | ? | ? | 90+ |
| **Best Practices** | 85-95 | 85-95 | 85+ |
| **SEO** | ? | **95-100** | 90+ |

---

## 🎯 Priority Actions

### Immediate (Do Today)

1. **Add metadata to public pages**:
   - `/pricing` ✅ (already created)
   - `/contact` ✅ (already created)
   - `/privacy` (create metadata.ts)
   - `/terms` (create metadata.ts)

2. **Verify URLs**:
   - Check `NEXT_PUBLIC_APP_URL` in `.env.local`
   - Should be: `https://www.unytea.com`

3. **Test locally**:
   ```bash
   npm run build
   npm run start
   # Visit http://localhost:3000/sitemap.xml
   # Visit http://localhost:3000/robots.txt
   ```

### After Deploy

1. **Google Search Console**:
   - Add property: `https://www.unytea.com`
   - Verify ownership
   - Submit sitemap: `https://www.unytea.com/sitemap.xml`

2. **Bing Webmaster Tools**:
   - Add site
   - Submit sitemap

3. **Monitor**:
   - Check indexing status weekly
   - Review search performance
   - Fix any errors

---

## 🔧 Customization

### Add More Languages

Edit `i18n.ts` and `app/sitemap.ts`:

```ts
// i18n.ts
export const locales = ["en", "es", "fr", "pt"];

// sitemap.ts will automatically include all
```

### Block AI Crawlers

Already configured in `app/robots.ts`:

```ts
{
  userAgent: 'GPTBot',
  disallow: ['/'],
},
```

Remove if you want AI to train on your content.

### Add Community Pages to Sitemap

Uncomment in `app/sitemap.ts`:

```ts
const communities = await prisma.community.findMany({ 
  where: { isPublic: true } 
});

communities.forEach((community) => {
  urls.push({
    url: `${baseUrl}/c/${community.slug}`,
    lastModified: community.updatedAt,
    priority: 0.7,
  });
});
```

---

## 📚 SEO Best Practices

### Content

- ✅ Unique titles per page
- ✅ Descriptions 150-160 characters
- ✅ Keywords naturally in content
- ✅ Headers hierarchy (h1 > h2 > h3)
- ✅ Alt text for images

### Technical

- ✅ Fast loading (< 3s)
- ✅ Mobile responsive
- ✅ HTTPS enforced
- ✅ No broken links
- ✅ Proper redirects (308 permanent)
- ✅ Sitemap updated regularly

### Off-Page

- ⏳ Backlinks from quality sites
- ⏳ Social media presence
- ⏳ Guest posting
- ⏳ Community engagement

---

## 🆘 Troubleshooting

### Sitemap not showing

1. Build production:
   ```bash
   npm run build
   ```

2. Check file exists:
   ```bash
   # Should generate .next/server/app/sitemap.xml
   ```

3. Visit: `http://localhost:3000/sitemap.xml`

### Structured Data not validating

1. Check console for JSON errors
2. Validate JSON: https://jsonlint.com/
3. Test: https://search.google.com/test/rich-results

### Pages not indexing

1. Check `robots.txt` - not blocking
2. Submit sitemap to Google Search Console
3. Wait 48-72 hours
4. Request indexing manually (GSC)

---

## 📊 Monitoring Tools

### Required

- **Google Search Console** - https://search.google.com/search-console
- **Google Analytics 4** - https://analytics.google.com/

### Recommended

- **Ahrefs** - Backlinks, keywords
- **SEMrush** - Competitor analysis
- **Screaming Frog** - Technical SEO audit
- **PageSpeed Insights** - Performance

---

## ✅ Quick Wins

### 1. Update Social Media

Add to `components/seo/structured-data.tsx`:

```ts
sameAs: [
  "https://twitter.com/unytea",
  "https://www.linkedin.com/company/unytea",
  "https://www.facebook.com/unytea",    // ADD
  "https://www.instagram.com/unytea",   // ADD
  "https://www.youtube.com/@unytea",    // ADD
],
```

### 2. Add FAQ Section

On homepage or pricing:

```tsx
<FAQSchema items={[
  {
    question: "What is Unytea?",
    answer: "Unytea is a professional mentorship platform..."
  },
  // Add 5-10 FAQs
]} />
```

### 3. Optimize Images

- Use WebP format (already in next.config)
- Add descriptive alt text
- Compress images < 200KB

### 4. Internal Linking

Link between pages naturally:
- Home → Pricing
- Pricing → Features
- Blog → Related posts

---

## 🎓 Resources

- [Google SEO Starter Guide](https://developers.google.com/search/docs/beginner/seo-starter-guide)
- [Schema.org Documentation](https://schema.org/)
- [Next.js SEO](https://nextjs.org/learn/seo/introduction-to-seo)
- [Ahrefs Blog](https://ahrefs.com/blog/)

---

## ✨ Summary

Your site now has **enterprise-grade SEO infrastructure**:

- 🗺️ **Dynamic sitemap** with multi-language
- 🤖 **Smart robots.txt** blocking private pages
- 📊 **Rich structured data** for search results
- 🏷️ **Comprehensive metadata** system
- 📱 **PWA-ready** manifest
- 🔒 **Secure** with CSP headers

**Expected SEO Score**: **95-100/100** in Lighthouse

**Next step**: Deploy and submit sitemap to Google Search Console!

---

**Questions?** Check the Troubleshooting section or review `lib/seo.ts` code.
