# 🌍 Solución de Internacionalización (i18n) - CORREGIDA

**Fecha:** 15 de Diciembre, 2024  
**Problema:** Los idiomas cambiaban la URL pero el contenido no se traducía  
**Estado:** ✅ RESUELTO  
**Versiones:** Next.js 16.0.10, React 19.2.3, next-intl 4.5.8

---

## 🔍 Problemas Identificados

### 1. **Estructura de Archivos Inconsistente**
- ❌ `i18n.ts` cargaba mensajes de DOS carpetas: `locales/` y `messages/`
- ❌ Archivos de traducción incompletos en `pt` y `fr`
- ❌ Duplicación de layouts HTML/body

### 2. **Configuración de Layouts Incorrecta**
- ❌ El `app/layout.tsx` tenía `lang="en"` hardcodeado
- ❌ El `app/[locale]/layout.tsx` duplicaba tags HTML/body
- ❌ Los Providers no estaban correctamente anidados

### 3. **Middleware Deficiente**
- ❌ Locale hardcodeado con regex estático
- ❌ Headers `x-next-intl-locale` innecesarios
- ❌ No aplicaba intl middleware correctamente

### 4. **Dependencias Desactualizadas**

- ❌ Next.js 14.2.33 (incompatible con next-intl 3.x+)
- ❌ React 18.3.1 (desactualizado)
- ❌ Conflictos de webpack y server components

---

## ✅ Soluciones Implementadas

### 1. **Actualización de Dependencias**

Se actualizaron todas las dependencias principales:

```json
{
  "next": "^16.0.10",
  "react": "^19.2.3",
  "react-dom": "^19.2.3",
  "next-intl": "^4.5.8"
}
```

**Comando usado:**
```bash
npm install next@latest react@latest react-dom@latest
```

### 2. **Unificación de Archivos de Mensajes** (`i18n.ts`)

**ANTES (next-intl 3.x):**
```typescript
export default getRequestConfig(async ({ locale }) => {
  const messages = {
    home: (await import(`./locales/${locale}/home.json`)).default,
    dashboard: (await import(`./messages/${locale}/dashboard.json`)).default
  };
  return { locale, messages };
});
```

**DESPUÉS (next-intl 4.x):**
```typescript
export default getRequestConfig(async ({ requestLocale }) => {
  // En next-intl 4.x, requestLocale es una Promise
  let locale = await requestLocale;
  
  if (!locale || !locales.includes(locale as any)) {
    locale = defaultLocale;
  }

  const messages = await import(`./locales/${locale}/home.json`).then(
    (module) => module.default
  );

  return { locale, messages };
});
```

**Cambios clave:**

- `locale` → `requestLocale` (ahora es una Promise)
- Un solo punto de carga desde `locales/`
- Validación explícita con fallback

### 3. **Reorganización de Layouts (Next.js 15+ compatible)**

#### **`app/layout.tsx` (Root)**
```typescript
// Solo maneja HTML/body y fuentes - SIN locale
export default function RootLayout({ children }) {
  return (
    <html suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
```

#### **`app/[locale]/layout.tsx` (Locale)**
```typescript
// ⚠️ IMPORTANTE: En Next.js 15+, params es una Promise
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>; // ← Promise en Next.js 15+
}) {
  // Await params antes de desestructurar
  const { locale } = await params;
  
  if (!locales.includes(locale as any)) {
    notFound();
  }

  return (
    <NextIntlClientProvider locale={locale}>
      <Providers>{children}</Providers>
    </NextIntlClientProvider>
  );
}
```

**Beneficio:** Compatible con Next.js 15+ donde `params` es asíncrono.

### 4. **Middleware Optimizado**

**ANTES:**
```typescript
const pathnameWithoutLocale = pathname.replace(/^\/(en|es|pt|fr)/, "") || "/";
```

**DESPUÉS:**
```typescript
const localeRegex = new RegExp(`^/(${locales.join('|')})(/|$)`);
const localeMatch = pathname.match(localeRegex);
const locale = localeMatch ? localeMatch[1] : defaultLocale;
```

**Beneficio:** Regex dinámico basado en el array de locales, más mantenible.

---

## 📁 Estructura de Archivos Final

```
web/
├── app/
│   ├── layout.tsx              # Root layout (HTML/body)
│   ├── page.tsx                # Redirect root
│   └── [locale]/
│       ├── layout.tsx          # Locale provider + params async
│       ├── page.tsx            # Home con traducciones
│       ├── dashboard/
│       ├── auth/
│       └── ...
├── locales/
│   ├── en/
│   │   └── home.json           # ✅ Traducción completa
│   ├── es/
│   │   └── home.json           # ✅ Traducción completa
│   ├── pt/
│   │   └── home.json           # ✅ Traducción completa
│   └── fr/
│       └── home.json           # ✅ Traducción completa
├── components/
│   ├── HomeNav.tsx             # Usa useTranslations("home.nav")
│   └── LanguageSwitcher.tsx    # Cambia idioma sin recargar
├── i18n.ts                     # Configuración next-intl 4.x
└── middleware.ts               # Maneja rutas + locales
```

---

## 🎯 Cómo Usar las Traducciones

### **En Server Components:**
```typescript
import { getTranslations } from 'next-intl/server';

export default async function Page({ 
  params 
}: { 
  params: Promise<{ locale: string }> // ← Promise en Next.js 15+
}) {
  const { locale } = await params; // ← Await params
  const t = await getTranslations('home');
  
  return <h1>{t('hero.title')}</h1>;
}
```

### **En Client Components:**
```typescript
"use client";
import { useTranslations } from 'next-intl';

export function Component() {
  const t = useTranslations('home.nav');
  
  return <button>{t('signin')}</button>;
}
```

### **Acceder a arrays:**
```typescript
const features = t.raw('featuresSection.features') as string[];
```

---

## 🔧 Comandos de Actualización

```bash
# 1. Actualizar dependencias
cd web
npm install next@latest react@latest react-dom@latest

# 2. Limpiar caché completamente
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules
npm install

# 3. Reiniciar servidor
npm run dev
```

---

## 📋 Checklist de Verificación

- [x] URLs con locale funcionan (`/en`, `/es`, `/pt`, `/fr`)
- [x] Selector de idioma cambia contenido
- [x] Traducciones se cargan correctamente
- [x] No hay duplicación de HTML/body
- [x] Middleware redirige correctamente
- [x] Auth preserva locale
- [x] Links internos incluyen locale
- [x] Fallback a inglés funciona
- [x] Compatible con Next.js 15+/16+ (params async)
- [x] Compatible con next-intl 4.x (requestLocale)

---

## 🐛 Problemas Resueltos

### ✅ "Cannot read properties of undefined (reading 'call')"

**Causa:** Versión incompatible de Next.js 14.2.33 con next-intl 3.x y webpack loaders  
**Solución:** Actualizar a Next.js 16.0.10 + React 19 + next-intl 4.x

### ✅ "El contenido no cambia al cambiar idioma"
**Causa:** Carga incorrecta de mensajes en i18n.ts  
**Solución:** Unificar a una sola carpeta (locales/) y usar requestLocale

### ✅ "Las redirecciones pierden el locale"
**Causa:** Middleware no aplicaba intlMiddleware consistentemente  
**Solución:** Aplicar intlMiddleware en todos los casos

### ✅ "Invalid source map / params error"

**Causa:** Next.js 15+ cambió params a Promise  
**Solución:** Await params antes de desestructurar

---

## 🚀 Cambios Importantes Next.js 15+

### **Params ahora son Promises**

```typescript
// ❌ ANTES (Next.js 14)
export default async function Page({ params: { locale } }) {
  // ...
}

// ✅ AHORA (Next.js 15+)
export default async function Page({ params }) {
  const { locale } = await params;
  // ...
}
```

### **next-intl 4.x usa requestLocale**

```typescript
// ❌ ANTES (next-intl 3.x)
export default getRequestConfig(async ({ locale }) => {
  // ...
});

// ✅ AHORA (next-intl 4.x)
export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  // ...
});
```

---

## 📚 Referencias

- [Next.js 15 Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-15)
- [next-intl 4.x Documentation](https://next-intl.dev/)
- [Next.js i18n Routing](https://nextjs.org/docs/app/building-your-application/routing/internationalization)
- [App Router con i18n](https://next-intl.dev/docs/getting-started/app-router)

---

**✨ El sistema de i18n ahora funciona correctamente con Next.js 16 y next-intl 4.x. Los usuarios
pueden cambiar de idioma y ver el contenido traducido instantáneamente.**
