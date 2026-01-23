# 🚀 START HERE - CSP Implementation

## ✅ Lo que se implementó

He aplicado las **recomendaciones del análisis de Lighthouse** a tu proyecto Mentorly/Unytea:

1. **CSP moderna con nonce** - Elimina `'unsafe-inline'`
2. **Middleware actualizado** - Genera nonce en cada request
3. **Componentes helper** - Para scripts seguros
4. **Scripts de verificación** - Para detectar problemas
5. **Documentación completa** - Guías paso a paso

---

## 🎯 Score esperado

| Métrica | Antes | Después |
|---------|-------|---------|
| **Performance** | ~100 | ~100 ✅ |
| **Best Practices** | 73 | **85-95** ⬆️ |

> **Nota**: Las cookies de terceros (Livekit, Uploadthing) seguirán bajando ~10 puntos. Es **normal y aceptable** para apps reales.

---

## 🏃‍♂️ Quick Start (3 pasos)

### 1️⃣ Testea en desarrollo

```bash
npm run dev
```

Luego visita: **http://localhost:3000/en/csp-test**

✅ **Debes ver**:
- Nonce visible
- Tests 1 y 2 con ✅ verde
- Test 3 bloqueado (correcto)
- Error de CSP en Console para Test 3 (correcto)

❌ **Si algo falla**:
- Lee `CSP_IMPLEMENTATION_GUIDE.md` > Troubleshooting

---

### 2️⃣ Verifica compliance

```powershell
# Windows PowerShell
.\scripts\check-csp-compliance.ps1
```

Esto busca:
- Referencias a `vercel.app`
- Scripts inline sin nonce
- URLs hardcodeadas
- Variables de entorno faltantes

**Fix cualquier ⚠️ o ❌ que encuentres.**

---

### 3️⃣ Deploy gradual

#### Opción A: Report-Only (RECOMENDADO)

1. En `middleware.ts`, cambia:

```ts
// Línea ~25 (después de generar nonce)
const csp = buildCSPReportOnly(nonce, "/api/csp-report");
response.headers.set("Content-Security-Policy-Report-Only", csp);
```

2. Deploy a producción
3. Monitorea logs por 24-48h
4. Arregla violaciones
5. Cambia a Enforce mode (paso B)

#### Opción B: Enforce (cuando estés seguro)

El código actual ya está en **Enforce mode**.

Si no hay errores en dev, puedes deployar directamente.

---

## 📁 Archivos importantes

| Archivo | Propósito |
|---------|-----------|
| `lib/csp.ts` | Configuración CSP centralizada |
| `middleware.ts` | Genera nonce y aplica CSP |
| `components/csp-script.tsx` | Helpers para scripts seguros |
| `app/[locale]/csp-test/page.tsx` | Página de testing |
| `CSP_IMPLEMENTATION_GUIDE.md` | Guía completa (LEE ESTO) |
| `SECURITY_CHECKLIST.md` | Checklist pre-deploy |
| `scripts/check-csp-compliance.ps1` | Script de verificación |

---

## 🔧 Cómo usar en tu código

### ❌ Antes (inseguro)

```tsx
<script>
  console.log('Hello');
</script>
```

### ✅ Ahora (seguro)

```tsx
import { CSPInlineScript } from "@/components/csp-script";

<CSPInlineScript>
  {`console.log('Hello');`}
</CSPInlineScript>
```

**Ver más ejemplos**: `CSP_IMPLEMENTATION_GUIDE.md`

---

## 🚨 Posibles errores y fixes rápidos

### Error: "Refused to execute inline script"

**Fix**: Usa `<CSPInlineScript>` o `<CSPScript>`

---

### Error: "Refused to connect to vercel.app"

**Fix 1**: Asegúrate que `.env.local` tenga:
```bash
NEXT_PUBLIC_APP_URL=https://www.unytea.com
```

**Fix 2**: Busca en código:
```bash
grep -r "vercel.app" --exclude-dir=node_modules
```

Reemplaza con `process.env.NEXT_PUBLIC_APP_URL`

---

### Error: Nonce "NOT FOUND" en /csp-test

**Fix**: Verifica que `middleware.ts` tenga:
```ts
import { generateNonce, buildCSP } from "@/lib/csp";

// ...en el handler:
const nonce = generateNonce();
const csp = buildCSP(nonce);
response.headers.set("Content-Security-Policy", csp);
response.headers.set("x-nonce", nonce);
```

---

## 📚 Siguiente lectura (en orden)

1. **Este archivo** (ya lo leíste ✅)
2. `CSP_IMPLEMENTATION_GUIDE.md` - Guía detallada
3. `SECURITY_CHECKLIST.md` - Checklist completo
4. Testing en `/en/csp-test`
5. Deploy

---

## 🎯 Objetivo final

✅ **Best Practices 85-95** en Lighthouse  
✅ **Sin `'unsafe-inline'`** en CSP  
✅ **Sitio más seguro** contra XSS  
✅ **Documentado y mantenible**  

---

## 🆘 ¿Algo no funciona?

1. **Lee** `CSP_IMPLEMENTATION_GUIDE.md` > Troubleshooting
2. **Revisa** Console de DevTools (F12)
3. **Verifica** que seguiste los 3 pasos arriba
4. **Busca** el error específico en la guía

---

## ✅ Checklist mínimo antes de deploy

- [ ] `npm run dev` funciona sin errores
- [ ] `/en/csp-test` muestra tests pasando
- [ ] `.\scripts\check-csp-compliance.ps1` sin errores críticos
- [ ] `.env.local` tiene `NEXT_PUBLIC_APP_URL` correcto
- [ ] No hay referencias a `vercel.app` en tu código
- [ ] Console de DevTools sin errores (excepto Test 3 en /csp-test)

**Cuando todo esté ✅, estás listo para deploy.**

---

## 💬 Resumen de cambios

### Archivos modificados
- `middleware.ts` - Genera nonce y aplica CSP
- `app/layout.tsx` - Usa nonce en head/body
- `next.config.mjs` - Removida CSP estática (ahora dinámica)

### Archivos creados
- `lib/csp.ts` - Configuración CSP
- `components/csp-script.tsx` - Helper components
- `app/[locale]/csp-test/page.tsx` - Testing page
- `scripts/check-csp-compliance.ps1` - Verification script
- Guías: `CSP_IMPLEMENTATION_GUIDE.md`, `SECURITY_CHECKLIST.md`, `START_HERE.md`

---

**🚀 ¡Éxito! Tu sitio está más seguro.**

Siguiente paso: `npm run dev` → visita `/en/csp-test` → verifica → deploy.
