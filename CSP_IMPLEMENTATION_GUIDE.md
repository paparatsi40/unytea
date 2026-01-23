# 🛡️ CSP Moderna con Nonce - Guía de Implementación

## 🎯 Qué hemos implementado

Hemos migrado de una **CSP débil con `'unsafe-inline'`** a una **CSP moderna con nonce**, eliminando los problemas que viste en el reporte de Lighthouse.

### ✅ Mejoras implementadas

1. **Nonce dinámico** - Generado en cada request
2. **Sin `'unsafe-inline'` en scripts** - Mayor seguridad contra XSS
3. **CSP centralizada** - Fácil de mantener en `lib/csp.ts`
4. **Compatible con Next.js 15** - Server Components + Middleware
5. **Redirección de Vercel** - Ya implementada en middleware

---

## 📁 Archivos creados/modificados

### ✨ Nuevos archivos

1. **`lib/csp.ts`** - Configuración CSP con nonce
2. **`components/csp-script.tsx`** - Helper components para scripts
3. **Este archivo** - Guía de implementación

### 🔧 Archivos modificados

1. **`middleware.ts`** - Genera nonce y aplica CSP
2. **`app/layout.tsx`** - Usa nonce en head y body
3. **`next.config.mjs`** - Removida CSP estática (ahora es dinámica)

---

## 🧪 Fase 1: Testing en desarrollo

### 1. Verifica que todo funcione

```bash
npm run dev
```

### 2. Abre las DevTools de Chrome

1. Ve a **Console**
2. Busca errores de CSP (aparecen en rojo)
3. Ve a **Network** > **Headers** de cualquier request
4. Verifica que veas:
   - `Content-Security-Policy` header
   - `x-nonce` header

### 3. Busca violaciones de CSP

```
Refused to execute inline script because it violates the following Content Security Policy directive...
```

Si ves esto:
- **En código tuyo**: usa `<CSPScript>` o `<CSPInlineScript>`
- **En librerías de terceros**: puede que necesites ajustar la CSP

---

## 🔧 Cómo usar scripts con nonce

### ❌ Antes (inseguro)

```tsx
export default function MyComponent() {
  return (
    <>
      <script>
        {`console.log('Hello');`}
      </script>
    </>
  );
}
```

### ✅ Ahora (seguro)

```tsx
import { CSPInlineScript } from "@/components/csp-script";

export default function MyComponent() {
  return (
    <>
      <CSPInlineScript>
        {`console.log('Hello');`}
      </CSPInlineScript>
    </>
  );
}
```

### Para scripts externos

```tsx
import { CSPExternalScript } from "@/components/csp-script";

export default function Analytics() {
  return (
    <CSPExternalScript 
      src="https://analytics.example.com/script.js"
      strategy="afterInteractive"
    />
  );
}
```

---

## 🚨 Errores comunes y soluciones

### Error 1: "Refused to execute inline script"

**Causa**: Script sin nonce

**Solución**:
```tsx
// ❌ Mal
<script>{`console.log('test');`}</script>

// ✅ Bien
<CSPInlineScript>{`console.log('test');`}</CSPInlineScript>
```

### Error 2: "Refused to connect to 'vercel.app'"

**Causa**: Código conectando a Vercel en producción

**Solución**: Busca en tu código:

```bash
grep -r "vercel.app" --exclude-dir=node_modules
```

Reemplaza con:

```tsx
// ❌ Mal
const url = "https://myapp.vercel.app";

// ✅ Bien
const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
```

### Error 3: Librería de terceros bloqueada

**Solución**: Agregar dominio a `lib/csp.ts`

Ejemplo para Stripe:

```ts
// En buildCSP(), línea de script-src:
`script-src 'self' 'nonce-${nonce}' 'unsafe-eval' https://js.stripe.com`,
```

---

## 🎛️ Ajustar CSP para servicios adicionales

Si usas servicios como:

- **Google Analytics**: Agregar `https://*.google-analytics.com`
- **Stripe**: Agregar `https://js.stripe.com`
- **Sentry**: Agregar `https://*.sentry.io`
- **Posthog**: Agregar tu dominio de Posthog

### Ejemplo: Agregar Google Analytics

Edita `lib/csp.ts`:

```ts
// Línea de script-src
`script-src 'self' 'nonce-${nonce}' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com`,

// Línea de connect-src
"connect-src 'self' https://www.google-analytics.com",
```

---

## 📊 Monitoreo de violaciones CSP

### Opción 1: Console del navegador (dev)

Simplemente abre DevTools > Console

### Opción 2: CSP Report-Only mode (producción segura)

Para testear en producción SIN romper nada:

1. Edita `middleware.ts`:

```ts
import { buildCSPReportOnly } from "@/lib/csp";

// En lugar de:
const csp = buildCSP(nonce);
response.headers.set("Content-Security-Policy", csp);

// Usa:
const cspReportOnly = buildCSPReportOnly(nonce, "/api/csp-report");
response.headers.set("Content-Security-Policy-Report-Only", cspReportOnly);
```

2. Crea endpoint de reporte `pages/api/csp-report.ts`:

```ts
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const report = req.body;
  
  // Log a consola (o envía a Sentry/otro servicio)
  console.error("CSP Violation:", JSON.stringify(report, null, 2));

  return res.status(204).end();
}
```

3. Despliega y monitorea logs por 24-48 horas
4. Ajusta CSP según reportes
5. Cuando no haya errores, cambia a modo enforce

---

## 🚀 Checklist de deploy

Antes de desplegar a producción:

- [ ] Testeado en localhost sin errores de CSP
- [ ] Verificado que no hay fetch/connect a `vercel.app`
- [ ] Revisado que `NEXT_PUBLIC_APP_URL` apunta a dominio correcto
- [ ] Testeado con Report-Only mode primero (recomendado)
- [ ] Monitoreado reportes por 24-48h
- [ ] No hay violaciones de CSP críticas
- [ ] Cambiado a enforce mode

---

## 🎯 Impacto esperado en Lighthouse

### Antes (tu CSP anterior)
- **Best Practices**: ~73
- **Problemas**: `'unsafe-inline'`, cookies de terceros, CSP débil

### Después (CSP con nonce)
- **Best Practices**: ~85-95
- **Mejoras**: 
  - ✅ Sin `'unsafe-inline'` en scripts
  - ✅ Nonce dinámico
  - ✅ CSP moderna
  - ⚠️ Cookies de terceros seguirán (decisión de negocio)

---

## 🔍 Debugging avanzado

### Ver CSP aplicada

En DevTools > Network > (cualquier documento HTML) > Headers:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-ABC123XYZ'...
```

### Ver nonce usado

En DevTools > Elements > (busca tag `<script>` o `<head>`):

```html
<head nonce="ABC123XYZ">
  <script nonce="ABC123XYZ">...</script>
</head>
```

### Validar CSP online

1. Copia tu CSP de DevTools
2. Ve a: https://csp-evaluator.withgoogle.com/
3. Pega y analiza

---

## 🧠 Estrategia de migración gradual

### Fase 1 (actual): Report-Only
- Deploy con `Content-Security-Policy-Report-Only`
- Monitorea violaciones
- No rompe nada

### Fase 2: Fix violations
- Arregla errores reportados
- Actualiza CSP según necesites
- Re-testea

### Fase 3: Enforce
- Cambia a `Content-Security-Policy`
- CSP ahora bloquea violaciones
- Sitio más seguro

---

## 🆘 Troubleshooting

### "Everything is broken"

1. Rollback: Quita CSP del middleware temporalmente
2. Identifica qué se rompió (Console)
3. Agrega excepciones específicas a CSP
4. Re-deploy

### "Nonce no funciona"

Verifica que:
1. `getNonce()` retorne un valor
2. El nonce sea el mismo en header y en tags
3. El middleware se ejecute antes de render

### "Librería externa no carga"

1. Identifica dominio en Network tab
2. Agrégalo a la directiva correcta en `lib/csp.ts`
3. Re-deploy

---

## 📚 Recursos adicionales

- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [Next.js Security Headers](https://nextjs.org/docs/app/api-reference/next-config-js/headers)
- [CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)

---

## ✅ Conclusión

Has implementado una **CSP moderna y robusta** que:

- 🛡️ Protege contra XSS
- 🚀 Mejora tu score de Lighthouse
- 🔧 Es fácil de mantener
- 📊 Es auditable
- 🎯 Sigue las best practices 2025

**Siguiente paso**: Testear en dev, luego deploy con Report-Only mode.

¿Dudas? Revisa la sección de Troubleshooting o el código en `lib/csp.ts`.
