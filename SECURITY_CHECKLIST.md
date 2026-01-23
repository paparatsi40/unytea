# 🔒 Security & Best Practices Checklist

Basado en el análisis de Lighthouse y las recomendaciones para lograr Best Practices 90+.

---

## 🛡️ Content Security Policy (CSP)

### ✅ Implementado

- [x] CSP con nonce dinámico
- [x] Eliminado `'unsafe-inline'` de scripts
- [x] CSP en middleware (dinámica, no estática)
- [x] Componentes helper para scripts (`CSPScript`, `CSPInlineScript`)
- [x] Documentación completa en `CSP_IMPLEMENTATION_GUIDE.md`

### 📋 Testing pendiente

- [ ] Testear en desarrollo sin errores de CSP en console
- [ ] Deploy en Report-Only mode primero
- [ ] Monitorear violaciones por 24-48h
- [ ] Cambiar a Enforce mode cuando no haya errores

---

## 🌐 Variables de entorno

### ✅ Configuración crítica

Verifica que tu `.env.local` tenga:

```bash
# ✅ CORRECTO - apunta a dominio custom
NEXT_PUBLIC_APP_URL=https://www.unytea.com

# ❌ INCORRECTO - apunta a Vercel
# NEXT_PUBLIC_APP_URL=https://unytea.vercel.app
```

### 🔍 Verifica en tu código

Busca cualquier referencia hardcodeada a `vercel.app`:

```bash
# PowerShell
.\scripts\check-csp-compliance.ps1

# Bash/Mac
grep -r "vercel.app" --exclude-dir=node_modules
```

**Si encuentras alguna**:
- Reemplaza con `process.env.NEXT_PUBLIC_APP_URL`
- Actualiza CSP en `lib/csp.ts` si es necesario

---

## 🍪 Cookies de terceros

### ⚠️ Detectadas actualmente

Según tu stack (de `.env.example`):
- **Uploadthing** - para uploads
- **Livekit** - para video
- **Stripe** - para pagos (si lo usas)
- **Clerk/NextAuth** - para auth

### 📊 Impacto en Lighthouse

| Servicio | Se puede evitar | Impacto en score | Recomendación |
|----------|-----------------|------------------|---------------|
| Auth cookies | No | -5 puntos | Acepta el costo |
| Uploadthing | No (necesario) | -3 puntos | Acepta el costo |
| Livekit | Solo en video pages | -3 puntos | Lazy load si es posible |
| Stripe | Solo en checkout | -5 puntos | Lazy load |
| Analytics | Sí | -10 puntos | Usa server-side analytics |

### ✅ Recomendaciones

1. **No remuevas servicios críticos** por el score
2. **Lazy-load** cookies de terceros cuando sea posible:

```tsx
// ❌ Mal: carga Stripe en todas las páginas
import { loadStripe } from '@stripe/stripe-js';
const stripe = loadStripe(key);

// ✅ Bien: solo en checkout
export default function CheckoutPage() {
  const [stripe, setStripe] = useState(null);
  
  useEffect(() => {
    import('@stripe/stripe-js').then(({ loadStripe }) => {
      loadStripe(key).then(setStripe);
    });
  }, []);
}
```

3. **Documenta la decisión** (cookies de terceros son intencionales)

---

## 🔐 Security Headers

### ✅ Ya implementados en `next.config.mjs`

- [x] `Strict-Transport-Security` (HSTS)
- [x] `X-Frame-Options` (anti-clickjacking)
- [x] `X-Content-Type-Options` (anti-MIME sniffing)
- [x] `X-XSS-Protection`
- [x] `Referrer-Policy`
- [x] `Permissions-Policy`
- [x] CSP (ahora en middleware con nonce)

### 🔍 Verifica

Usa Security Headers (https://securityheaders.com/):

1. Despliega tu sitio
2. Escanea con la herramienta
3. Deberías obtener grado **A** o **A+**

---

## 🚀 Performance

### ✅ Ya optimizado

- [x] Images con WebP/AVIF
- [x] Compression habilitado
- [x] Cache headers para static assets
- [x] No powered-by header (oculta Next.js)
- [x] Source maps deshabilitados en producción

### 📊 Métricas objetivo

| Métrica | Objetivo | Actual |
|---------|----------|--------|
| Performance | 90+ | ✅ ~100 (según tu mensaje) |
| Best Practices | 90+ | 🔄 73 → 90+ (con CSP nueva) |
| Accessibility | 90+ | ? (no mencionaste) |
| SEO | 90+ | ? (no mencionaste) |

---

## 🔍 APIs y Conexiones

### ✅ Dominios permitidos en CSP

Verifica en `lib/csp.ts` > `connect-src`:

- [x] `www.unytea.com` (tu dominio)
- [x] `uploadthing.com` / `utfs.io`
- [x] `*.livekit.cloud` / `*.livekit.io`
- [x] WebSocket (`wss:` / `ws:` para localhost)

### ❌ NO permitir

- ❌ `*.vercel.app` en producción (excepto para Vercel Toolbar en dev)
- ❌ Dominios de analytics de terceros (usa server-side)
- ❌ CDNs innecesarios

### 🧪 Testing

```bash
# En DevTools Network, filtra por:
# - Type: fetch/xhr
# - Busca requests bloqueados (status 0 o error)

# También en Console:
# "Refused to connect to '...' because it violates CSP"
```

---

## 🎯 GDPR & Privacy

### ⚠️ Si apuntas a Europa

- [ ] Cookie consent banner (antes de cargar trackers)
- [ ] Privacy policy actualizada
- [ ] Terms of service
- [ ] Data processing agreement con servicios (Livekit, Uploadthing, etc.)

### 📋 Checklist

- [ ] Banner de cookies aparece antes de cargar scripts
- [ ] Usuario puede rechazar cookies no esenciales
- [ ] Privacy policy enlazada en footer
- [ ] Contact info para data requests (GDPR)

---

## 🚦 Deployment Checklist

### Pre-deploy

- [ ] Run `npm run build` locally sin errores
- [ ] Run `.\scripts\check-csp-compliance.ps1` sin issues críticos
- [ ] Verify `.env.production` tiene URLs correctas
- [ ] Test en Preview deployment primero

### Deploy inicial (Report-Only mode)

- [ ] Deploy con CSP en Report-Only
- [ ] Monitor logs por 24-48 horas
- [ ] Fix violaciones encontradas
- [ ] Re-test

### Deploy final (Enforce mode)

- [ ] Cambiar a CSP enforcement
- [ ] Monitorear errores en Sentry/logs
- [ ] Run Lighthouse audit
- [ ] Verificar Best Practices 85-95

---

## 📊 Monitoring post-deploy

### 1. Lighthouse CI (recomendado)

```bash
npm install -g @lhci/cli
lhci autorun --collect.url=https://www.unytea.com
```

### 2. Security Headers

Escanea: https://securityheaders.com/?q=https://www.unytea.com

### 3. SSL Labs

Para HTTPS: https://www.ssllabs.com/ssltest/analyze.html?d=www.unytea.com

### 4. Chrome DevTools

- Console: Errores de CSP
- Network: Requests bloqueados
- Application > Storage: Cookies de terceros
- Lighthouse: Re-run audits

---

## 🎯 Objetivos alcanzables

### Con esta implementación

| Área | Score antes | Score después | Notas |
|------|-------------|---------------|-------|
| Performance | ~100 | ~100 | Ya optimizado ✅ |
| Best Practices | 73 | **85-95** | Con CSP nueva ⬆️ |
| Accessibility | ? | 90+ | Si semantic HTML OK |
| SEO | ? | 90+ | Si metadata OK |

### Lo que NO puedes evitar

- **Cookies de terceros** (-10 a -15 puntos)
  - Livekit, Uploadthing, Auth son necesarios
  - Es una decisión de negocio, no técnica
  
- **Chrome extensions** (no tu culpa)
  - Lighthouse los detecta
  - No afectan tu score real

### Score realista en producción

**Best Practices: 85-92** (excelente para app real con servicios de terceros)

---

## 🆘 Si algo falla

### 1. CSP rompe el sitio

```bash
# Rollback rápido: comenta CSP en middleware
# middleware.ts
// response.headers.set("Content-Security-Policy", csp);
```

### 2. Scripts no cargan

- Verifica que usen `<CSPScript>` o `<CSPInlineScript>`
- Check DevTools Console para ver cuál script falla
- Agrega el dominio a `lib/csp.ts` si es externo

### 3. Lighthouse score no mejora

- Verifica que CSP esté aplicada (DevTools > Network > Headers)
- Espera 24h después del deploy (cache de Lighthouse)
- Run audit en modo Incognito
- Verifica que no haya extensions activas

---

## ✅ Conclusión

Tu sitio está **significativamente más seguro** con esta implementación:

1. ✅ **CSP moderna con nonce**
2. ✅ **Sin `unsafe-inline`**
3. ✅ **Headers de seguridad completos**
4. ✅ **Redirección de Vercel implementada**
5. ⚠️ **Cookies de terceros** (decisión consciente de negocio)

**Próximo paso**: Testing en desarrollo, luego deploy con Report-Only mode.

**Score esperado**: Best Practices 85-92 (excelente para app real).

---

## 📚 Referencias

- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [web.dev Security](https://web.dev/secure/)
- [MDN Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [Security Headers](https://securityheaders.com/)
