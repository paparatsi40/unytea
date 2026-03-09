# Análisis del Problema de i18n en Rutas /auth/*

## Resumen Ejecutivo

Las páginas de autenticación (`/auth/signin`, `/auth/signup`, `/auth/forgot-password`) no tienen acceso a las traducciones de next-intl porque el middleware está configurado para saltar estas rutas del sistema de internacionalización. Esto resulta en errores `MISSING_MESSAGE` en la consola.

---

## Archivos Involucrados

### 1. Middleware Principal
**Archivo:** `middleware.ts`
```typescript
// Líneas críticas: 19-35
if (pathname.startsWith("/api") || 
    pathname.startsWith("/auth") ||  // ← SALTA i18n PARA AUTH
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/onboarding")) {
  return NextResponse.next()  // No aplica i18n middleware
}
```

**Función:** El middleware intercepta todas las peticiones y decide si aplica el i18n middleware de next-intl. Actualmente salta `/auth/*`, `/dashboard/*`, `/onboarding/*` y `/api/*`.

---

### 2. Configuración de i18n
**Archivo:** `src/i18n.ts`
```typescript
import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale) locale = "en";
  return {
    locale,
    messages: (await import(`../locales/${locale}.json`)).default,
  };
});
```

**Función:** Configura cómo next-intl carga las traducciones basándose en el locale detectado por el middleware.

---

### 3. Layout Raíz
**Archivo:** `app/layout.tsx`
```typescript
export default async function RootLayout({
  children,
  params: { locale }
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string };
}>) {
  const messages = await getMessages();
  return (
    <html lang={locale}>
      <NextIntlClientProvider messages={messages} locale={locale}>
        {children}
      </NextIntlClientProvider>
    </html>
  );
}
```

**Problema:** El layout raíz espera recibir `locale` en `params`, pero las rutas que no están dentro de `[locale]/` no reciben este parámetro.

---

### 4. Archivo de Traducciones
**Archivo:** `locales/en.json`
```json
{
  "navigation": {
    "back": "Back"
  },
  "common": {
    "featureInDevelopment": "Feature in Development",
    "needHelp": "Need help?",
    "contactSupport": "Contact our support team for assistance."
  },
  "auth": {
    "resetPassword": "Reset Password",
    "passwordResetComingSoon": "Password reset functionality is coming soon!"
  }
}
```

**Estado:** Las traducciones EXISTEN en el archivo, pero no son accesibles porque no hay contexto de i18n.

---

### 5. Páginas de Auth
**Archivos:**
- `app/auth/forgot-password/page.tsx`
- `app/auth/signin/page.tsx`
- `app/auth/signup/page.tsx`
- `app/auth/signin/signin-content.tsx`

**Uso:** Todas usan `useTranslations()` de next-intl:
```typescript
import { useTranslations } from "next-intl"
const t = useTranslations()
```

---

## Diagrama del Flujo

```
Usuario visita /auth/forgot-password
         ↓
┌─────────────────────────────────────┐
│  middleware.ts                     │
│  Detecta: pathname.startsWith("/auth") │
│  → Retorna NextResponse.next()      │
│  → NO aplica intlMiddleware         │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  app/layout.tsx                      │
│  Intenta: getMessages()             │
│  Falla: No hay locale establecido   │
│  → Usa fallback 'en'                │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  forgot-password/page.tsx            │
│  Llama: useTranslations()            │
│  → No hay contexto i18n             │
│  → Error: MISSING_MESSAGE          │
└─────────────────────────────────────┘
```

---

## Intentos Previos y Resultados

### Intento 1: Aplicar i18n a todas las rutas
**Cambio:** Modificar middleware para no saltar `/auth/*`
**Resultado:** Rutas de auth funcionaron, pero el dashboard dio 404

### Intento 2: Crear layout específico para auth
**Cambio:** `app/auth/layout.tsx` con provider
**Resultado:** Errores de Server Components

### Intento 3: Usar localePrefix: "never"
**Cambio:** Middleware sin prefijo de URL
**Resultado:** App completamente rota, todos los routes daban 404

### Intento 4: Mover archivos fuera de [locale]
**Intento:** Eliminar `app/[locale]/`
**Resultado:** Cancelado - reestructuración muy invasiva

---

## Soluciones Potenciales

### Opción A: Modificar middleware (Riesgo Alto)
```typescript
// Aplicar i18n a auth pero mantener dashboard excluido
if (pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding")) {
  // Solo saltar dashboard, no auth
  return NextResponse.next()
}
```
**Riesgo:** Puede romper dashboard o causar inconsistencias de routing

### Opción B: Layout client-side para auth (Riesgo Medio)
```typescript
// app/auth/layout.tsx
"use client"
import { NextIntlClientProvider } from 'next-intl'
import messages from '@/locales/en.json'

export default function AuthLayout({ children }) {
  return (
    <NextIntlClientProvider messages={messages} locale="en">
      {children}
    </NextIntlClientProvider>
  )
}
```
**Riesgo:** Hydration mismatches, no soporta cambio de idioma en auth

### Opción C: Cargar traducciones dinámicamente (Riesgo Bajo)
```typescript
// forgot-password/page.tsx
import { useTranslations } from "next-intl"

const safeT = (t, key, fallback) => {
  try { return t(key) } catch { return fallback }
}

export default function Page() {
  const t = useTranslations()
  return (
    <h1>{safeT(t, "auth.resetPassword", "Reset Password")}</h1>
  )
}
```
**Riesgo:** Texto hardcodeado como fallback (rechazado por usuario)

### Opción D: Estructura [locale]/auth (Riesgo Medio-Alto)
Mover `app/auth/` → `app/[locale]/auth/`
**Riesgo:** Requiere cambiar todas las referencias a `/auth/*` en la app

---

## Recomendación

El problema existe porque la arquitectura de next-intl con `next-auth` crea conflictos cuando:
1. next-intl espera un patrón de URL con locale (`[locale]/`)
2. next-auth tiene rutas fijas en `/auth/*`
3. El middleware no puede satisfacer ambos requisitos simultáneamente

**Solución mínima viable:**
Aceptar que `/auth/*` usa inglés por defecto sin soporte de cambio de idioma, o implementar el manejo de errores en `useTranslations()` sin hardcodear textos (cargar traducciones manualmente en el componente).

---

## Estado Actual

- ✅ Dashboard funciona
- ✅ Auth funciona (con errores en consola)
- ✅ Traducciones existen en `locales/en.json`
- ❌ next-intl no está activo en rutas `/auth/*`
- ❌ Errores `MISSING_MESSAGE` en consola
