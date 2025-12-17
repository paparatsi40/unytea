# 🌍 Internationalization (i18n) Documentation

This document explains how internationalization works in Unytea and how to add new languages.

## 📋 Table of Contents

- [Overview](#overview)
- [Current Setup](#current-setup)
- [File Structure](#file-structure)
- [How It Works](#how-it-works)
- [Adding a New Language](#adding-a-new-language)
- [Using Translations](#using-translations)
- [Best Practices](#best-practices)

## Overview

Unytea uses **next-intl** for internationalization, supporting multiple languages with automatic
route prefixing and translation loading.

**Currently Supported Languages:**

- 🇺🇸 English (`en`) - Default
- 🇪🇸 Spanish (`es`)
- 🇧🇷 Portuguese (`pt`)
- 🇫🇷 French (`fr`)

## Current Setup

### Configuration Files

1. **`web/i18n.ts`** - Main i18n configuration
2. **`web/middleware.ts`** - Handles locale detection and routing
3. **`web/locales/[lang]/home.json`** - Translation files per language
4. **`web/app/[locale]/layout.tsx`** - Provides translations to pages
5. **`web/components/LanguageSwitcher.tsx`** - UI component for language selection

## File Structure

```
web/
├── i18n.ts                           # i18n configuration
├── middleware.ts                     # Locale routing middleware
├── app/
│   ├── [locale]/                     # Localized routes
│   │   ├── layout.tsx               # NextIntl provider
│   │   ├── page.tsx                 # Home page (translated)
│   │   ├── auth/
│   │   ├── contact/
│   │   └── ...
├── locales/
│   ├── en/
│   │   └── home.json                # English translations
│   ├── es/
│   │   └── home.json                # Spanish translations
│   ├── pt/
│   │   └── home.json                # Portuguese translations
│   └── fr/
│       └── home.json                # French translations
└── components/
    ├── HomeNav.tsx                   # Uses translations
    └── LanguageSwitcher.tsx          # Language selector component
```

## How It Works

### 1. **Route Structure**

All public pages are under `/[locale]/`:

- `/en` → English home page
- `/es` → Spanish home page
- `/pt` → Portuguese home page
- `/fr` → French home page

### 2. **Middleware**

The middleware (`web/middleware.ts`) automatically:

- Detects the user's preferred language from browser settings
- Redirects `/` to `/en` (or user's preferred language)
- Validates locale prefixes in URLs
- Skips API routes and static files

### 3. **Translation Files**

Each language has a JSON file in `web/locales/[lang]/home.json` with this structure:

```json
{
  "nav": {
    "features": "Features",
    "pricing": "Pricing",
    ...
  },
  "hero": {
    "badge": "Text here",
    "headline1": "Text here",
    ...
  },
  ...
}
```

### 4. **Using Translations in Components**

**Server Components:**

```typescript
import { getTranslations } from 'next-intl/server';

export default async function Page() {
  const t = await getTranslations('home');
  
  return <h1>{t('hero.headline1')}</h1>;
}
```

**Client Components:**

```typescript
'use client';
import { useTranslations } from 'next-intl';

export function Component() {
  const t = useTranslations('home.nav');
  
  return <button>{t('signin')}</button>;
}
```

## Adding a New Language

### Step 1: Add Locale to Configuration

Edit `web/i18n.ts`:

```typescript
export const locales = ['en', 'es', 'pt', 'fr', 'de'] as const; // Add 'de' for German
export const defaultLocale = 'en' as const;
```

### Step 2: Create Translation File

1. Copy an existing translation file:
   ```bash
   cp web/locales/en/home.json web/locales/de/home.json
   ```

2. Translate all strings in the new file

### Step 3: Add Language to Switcher

Edit `web/components/LanguageSwitcher.tsx`:

```typescript
const languages = {
  en: { name: "English", flag: "🇺🇸" },
  es: { name: "Español", flag: "🇪🇸" },
  pt: { name: "Português", flag: "🇧🇷" },
  fr: { name: "Français", flag: "🇫🇷" },
  de: { name: "Deutsch", flag: "🇩🇪" },  // Add this line
} as const;
```

### Step 4: Test

1. Start development server:
   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:3000/de`

3. Verify all translations appear correctly

## Using Translations

### In Server Components

```typescript
import { getTranslations } from 'next-intl/server';

export default async function Page() {
  const t = await getTranslations('home');
  
  return (
    <div>
      <h1>{t('hero.headline1')}</h1>
      <p>{t('hero.description')}</p>
    </div>
  );
}
```

### In Client Components

```typescript
'use client';
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('home.nav');
  
  return (
    <nav>
      <a href="#features">{t('features')}</a>
      <a href="#pricing">{t('pricing')}</a>
    </nav>
  );
}
```

### Accessing Raw Values (Arrays, Objects)

```typescript
const features = t.raw('pricingSection.plans.professional.features') as string[];

features.map(feature => <li key={feature}>{feature}</li>)
```

### Dynamic Keys

```typescript
const keys = ['noVideo', 'noCustomization', 'noEngagement'];

keys.map(key => (
  <div key={key}>
    <h3>{t(`failingSection.points.${key}.title`)}</h3>
    <p>{t(`failingSection.points.${key}.problem`)}</p>
  </div>
))
```

## Best Practices

### ✅ DO:

- **Keep translations in JSON files** - Never hardcode user-facing text
- **Use descriptive keys** - `hero.headline1` not `text1`
- **Organize by section** - Group related translations together
- **Test all languages** - Verify layouts don't break with longer text
- **Use consistent formatting** - Follow the established JSON structure

### ❌ DON'T:

- **Don't hardcode text** - Always use translation keys
- **Don't mix languages** - Keep each file in one language only
- **Don't break structure** - Maintain consistent JSON structure across languages
- **Don't forget plurals** - Consider plural forms when needed
- **Don't skip testing** - Always test new translations in the UI

## Translation File Structure

All translation files should follow this structure:

```json
{
  "nav": { ... },           // Navigation items
  "hero": { ... },          // Hero section
  "priceComparison": { ... },  // Price comparison cards
  "failingSection": { 
    "points": { ... }       // Nested objects for complex sections
  },
  "featuresSection": { ... },
  "comparisonSection": { ... },
  "pricingSection": { 
    "plans": { ... }        // Nested plans with arrays
  },
  "migrationSection": { ... },
  "footer": { ... }
}
```

## Troubleshooting

### Translation Not Showing

1. **Check the key path** - Ensure it matches the JSON structure exactly
2. **Verify file exists** - Make sure `locales/[lang]/home.json` exists
3. **Check console** - Look for next-intl errors in browser console
4. **Restart dev server** - Sometimes needed after adding new translations

### Layout Breaking

- **Check text length** - Some languages are longer (German, French)
- **Use responsive classes** - `text-base sm:text-lg md:text-xl`
- **Test truncation** - Use `truncate` or `line-clamp` classes

### Middleware Not Working

- **Check route patterns** - Ensure routes match middleware matcher
- **Verify locale prefix** - Should be `/[locale]/...` format
- **Check API routes** - API routes should be excluded from locale middleware

## Resources

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Next.js i18n Routing](https://nextjs.org/docs/advanced-features/i18n-routing)
- [ISO 639-1 Language Codes](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes)

---

**Need Help?** Check the [next-intl GitHub](https://github.com/amannn/next-intl) or ask in the team
chat.
