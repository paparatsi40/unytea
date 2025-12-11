# ⚡ STRIPE QUICK START - 15 MINUTOS

**Para hacer funcionar los pagos AHORA**

---

## 🚨 **ANTES DE EMPEZAR:**

```
✅ Tienes cuenta Stripe (gratis en stripe.com)
✅ Tienes acceso al dashboard
✅ Proyecto web corriendo en local
```

---

## 📝 **PASO A PASO (15 MIN):**

### **1️⃣ Crear Productos (5 min)**

1. Abre: https://dashboard.stripe.com/test/products
2. Click "Add product" (3 veces, uno por plan)

**Professional:**

```
Name: Unytea Professional
Description: For serious creators
Pricing: Recurring
Price: $129
Billing period: Monthly
```

✅ Click "Save product"  
📋 **COPIA EL PRICE ID** (ej: `price_1ABC123xyz`)

**Scale:**

```
Name: Unytea Scale
Description: For growing communities  
Pricing: Recurring
Price: $249
Billing period: Monthly
```

✅ Click "Save product"  
📋 **COPIA EL PRICE ID**

**Enterprise:**

```
Name: Unytea Enterprise
Description: For businesses
Pricing: Recurring
Price: $499
Billing period: Monthly
```

✅ Click "Save product"  
📋 **COPIA EL PRICE ID**

---

### **2️⃣ Actualizar Código (2 min)**

Abre: `web/app/(dashboard)/dashboard/upgrade/page.tsx`

**Línea 21:** Reemplaza el `priceId`

```typescript
priceId: "price_1ABC123xyz", // ← TU PRICE ID DE PROFESSIONAL
```

**Línea 45:** Reemplaza el `priceId`

```typescript
priceId: "price_1DEF456abc", // ← TU PRICE ID DE SCALE
```

**Línea 69:** Reemplaza el `priceId`

```typescript
priceId: "price_1GHI789def", // ← TU PRICE ID DE ENTERPRISE
```

✅ Guarda el archivo

---

### **3️⃣ Configurar Stripe CLI (5 min)**

**Windows:**

```powershell
# Descarga desde: https://github.com/stripe/stripe-cli/releases/latest
# O con Scoop:
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

**Mac/Linux:**

```bash
brew install stripe/stripe-cli/stripe
```

**Login:**

```bash
stripe login
# Se abrirá el browser para autorizar
```

**Forward webhooks a localhost:**

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

✅ **COPIA EL WEBHOOK SECRET** que aparece (empieza con `whsec_`)

**Ejemplo output:**

```
> Ready! Your webhook signing secret is whsec_abc123xyz...
```

---

### **4️⃣ Configurar .env (1 min)**

Abre: `web/.env`

Agrega estas líneas (o actualiza si ya existen):

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_abc123xyz  # ← DEL PASO ANTERIOR

# NextAuth URL
NEXTAUTH_URL=http://localhost:3000
```

**¿Dónde encuentro las keys?**

- Ve a: https://dashboard.stripe.com/test/apikeys
- Copia "Secret key" y "Publishable key"

✅ Guarda `.env`

---

### **5️⃣ Reiniciar Servidor (1 min)**

**Terminal 1 (Web server):**

```bash
cd web
npm run dev
```

**Terminal 2 (Stripe webhooks):**

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

✅ Ambos corriendo

---

### **6️⃣ TESTING (1 min)**

1. Abre: http://localhost:3000/dashboard/upgrade
2. Click "Choose Plan" en **Scale**
3. Deberías ver Stripe Checkout
4. Usa tarjeta de prueba: `4242 4242 4242 4242`
    - Expiry: cualquier fecha futura
    - CVC: cualquier 3 dígitos
    - ZIP: cualquier 5 dígitos
5. Click "Subscribe"

**✅ ÉXITO SI:**

- Redirects a `/dashboard/settings/billing?success=true`
- En terminal 2 ves: "✅ Platform subscription activated"
- Tu user ahora tiene `subscriptionPlan: "SCALE"`

---

## 🎯 **VERIFICAR QUE FUNCIONA:**

### **En Stripe Dashboard:**

```
1. Ve a: https://dashboard.stripe.com/test/payments
2. Deberías ver el pago de $249.00
3. Status: Succeeded ✅
```

### **En tu App:**

```
1. Ve a: /dashboard/settings/billing
2. Deberías ver:
   - Current Plan: Scale
   - Limits: 2,000 members, 60 video hours
   - Usage: 0 de 2,000 members
```

### **En Database:**

```sql
-- Verifica en tu DB:
SELECT 
  subscriptionPlan,
  subscriptionStatus,
  stripeCustomerId,
  stripeSubscriptionId
FROM "User"
WHERE email = 'tu@email.com';

-- Debería mostrar:
-- subscriptionPlan: "SCALE"
-- subscriptionStatus: "ACTIVE"
-- stripeCustomerId: "cus_xxxxx"
-- stripeSubscriptionId: "sub_xxxxx"
```

---

## 🐛 **TROUBLESHOOTING:**

### **Error: "No signature"**

```bash
# Asegúrate que Stripe CLI está corriendo:
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Y que STRIPE_WEBHOOK_SECRET está en .env
```

### **Error: "Invalid price ID"**

```
# Verifica que copiaste los Price IDs correctos
# Deben empezar con "price_" no "prod_"
```

### **No redirects después del pago**

```
# Verifica que NEXTAUTH_URL está en .env:
NEXTAUTH_URL=http://localhost:3000
```

### **Webhook no se recibe**

```
# En Terminal 2 (Stripe CLI) deberías ver:
# "POST http://localhost:3000/api/webhooks/stripe [200]"
# Si ves [400] o [500], revisa logs del servidor
```

---

## 📋 **CHECKLIST FINAL:**

```
□ 3 productos creados en Stripe
□ 3 Price IDs copiados y actualizados en código
□ Stripe CLI instalado
□ stripe login ejecutado
□ stripe listen corriendo
□ Webhook secret copiado a .env
□ Secret key y Publishable key en .env
□ NEXTAUTH_URL configurado
□ Servidor web reiniciado
□ Test purchase completado ✅
□ User subscriptionPlan actualizado
□ Billing page muestra plan correcto
```

---

## 🎉 **¡LISTO!**

**Ahora puedes:**

- ✅ Aceptar pagos reales (en test mode)
- ✅ Ver subscripciones en Stripe Dashboard
- ✅ Tracking de uso en tiempo real
- ✅ Upgrades/downgrades automáticos

---

## 🚀 **PARA PRODUCTION:**

Cuando estés listo para ir live:

1. **Crear productos en LIVE mode** (mismos pasos)
2. **Actualizar Price IDs** en código
3. **Configurar webhook en Stripe Dashboard:**
    - URL: `https://your-domain.com/api/webhooks/stripe`
    - Events: (mismos que local)
4. **Actualizar .env con LIVE keys:**
   ```bash
   STRIPE_SECRET_KEY=sk_live_xxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # Del webhook endpoint
   NEXTAUTH_URL=https://your-domain.com
   ```
5. **Deploy + Test**

---

**¿Problemas? Revisa `STRIPE_CHECKOUT_IMPLEMENTATION.md` para más detalles.**

**¡Suerte! 💰**