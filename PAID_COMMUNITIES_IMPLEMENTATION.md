# 💳 Paid Communities - Stripe Integration

## ✅ IMPLEMENTACIÓN COMPLETA

### 🎯 **Flujo de Usuario:**

```
1. Usuario no-miembro visita comunidad de paga
   ↓
2. Ve preview page con banner "Join for $X/month"
   ↓
3. Click en "Join" → Redirect a Stripe Checkout
   ↓
4. Completa pago en Stripe
   ↓
5. Stripe webhook crea membership y subscription
   ↓
6. Usuario es redirigido a community feed con acceso completo
```

---

## 📁 **Archivos Modificados/Creados:**

### **1. API Routes**

#### **`/api/communities/[slug]/checkout/route.ts`** ✅ NUEVO

- Crea sesión de Stripe Checkout
- Maneja Stripe Connect para community owners
- Cobra 10% platform fee
- Soporta subscripciones mensuales
- Success URL: `/dashboard/communities/{slug}?payment=success`
- Cancel URL: `/dashboard/communities/{slug}?payment=cancelled`

#### **`/api/communities/[slug]/join/route.ts`** ✅ ACTUALIZADO

- Maneja join gratuito o con aprobación
- Retorna error 402 para comunidades de paga (redirect a checkout)

#### **`/api/webhooks/stripe/route.ts`** ✅ ACTUALIZADO

- Procesa `checkout.session.completed` para comunidades
- Crea membership con status ACTIVE
- Crea registro de subscription
- Incrementa memberCount
- Usa metadata.userId para identificación

---

### **2. Componentes UI**

#### **`JoinCommunityBanner.tsx`** ✅ ACTUALIZADO

**Features:**

- Detecta si comunidad es de paga (`isPaid`)
- Botón muestra precio: "Join for $X/mo"
- Icono CreditCard para comunidades de paga
- Redirect a Stripe Checkout
- Maneja URL params `?payment=success` y `?payment=cancelled`
- Toast notifications para success/error/cancellation

#### **`CommunityPreview.tsx`** ✅ ACTUALIZADO

- Pasa prop `locale` al banner

---

### **3. Páginas Protegidas**

#### **`[slug]/feed/page.tsx`** ✅ ACTUALIZADO

- Verifica membership antes de mostrar feed
- Redirect no-miembros a preview page

#### **`[slug]/courses/page.tsx`** ✅ ACTUALIZADO

- Verifica membership antes de mostrar cursos
- Redirect no-miembros a preview page

#### **`[slug]/chat/page.tsx`** ✅ ACTUALIZADO

- Convertido a Server Component con verificación
- Usa `CommunityChatClient` para UI
- Redirect no-miembros a preview page

#### **`[slug]/layout.tsx`** ✅ ACTUALIZADO

- Muestra sidebar solo para miembros/owners
- Layout simple (sin sidebar) para preview page
- Permite acceso a comunidades públicas

---

## 🔧 **Configuración Requerida:**

### **1. Stripe Dashboard**

```bash
# Environment Variables (.env)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### **2. Webhook Configuration**

**URL:** `https://yourdomain.com/api/webhooks/stripe`

**Events to listen:**

- ✅ `checkout.session.completed`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`

---

## 📊 **Database Schema:**

### **Community Table**

```prisma
model Community {
  isPaid          Boolean  @default(false)
  membershipPrice Decimal?
  stripeProductId String?
  stripePriceId   String?
  // ... otros campos
}
```

### **Member Table**

```prisma
model Member {
  status MemberStatus @default(PENDING)
  // PENDING | ACTIVE | SUSPENDED | BANNED
}
```

### **MembershipSubscription Table**

```prisma
model MembershipSubscription {
  stripeSubscriptionId String
  stripeCustomerId     String
  stripePriceId        String
  status               String  // active, past_due, canceled
  currentPeriodStart   DateTime
  currentPeriodEnd     DateTime
  canceledAt           DateTime?
}
```

---

## 💰 **Pricing & Fees:**

### **Platform Fee:**

- 10% de cada pago
- Configurado en `application_fee_amount`
- Solo si owner tiene Stripe Connect configurado

### **Subscription Model:**

- **Recurrente:** Monthly
- **Currency:** USD
- **Price:** Definido por community owner

---

## 🎯 **Estados de Membership:**

| Status | Descripción | Acceso |
|--------|-------------|--------|
| **PENDING** | Esperando aprobación | ❌ No |
| **ACTIVE** | Miembro activo (pagado o aprobado) | ✅ Sí |
| **SUSPENDED** | Suspendido temporalmente | ❌ No |
| **BANNED** | Baneado permanentemente | ❌ No |

---

## 🔄 **Manejo de Subscripciones:**

### **Payment Success:**

1. Webhook `checkout.session.completed` recibido
2. Membership creado con status ACTIVE
3. Subscription record creado
4. Member count incrementado
5. Usuario redirigido a community feed

### **Payment Failed:**

1. Webhook `invoice.payment_failed` recibido
2. Subscription status → `past_due`
3. Member status → SUSPENDED (opcional)
4. Notification enviada al usuario

### **Subscription Canceled:**

1. Webhook `customer.subscription.deleted` recibido
2. Subscription status → `canceled`
3. `canceledAt` timestamp guardado
4. Member mantiene acceso hasta final del periodo

---

## 📋 **Testing:**

### **Stripe Test Cards:**

```bash
# Success
4242 4242 4242 4242

# Decline
4000 0000 0000 0002

# Requires 3D Secure
4000 0025 0000 3155
```

### **Testing Flow:**

```bash
# 1. Crear comunidad de paga (owner)
isPaid: true
membershipPrice: 9.99

# 2. Acceder con otro usuario
Visit: /dashboard/communities/{slug}

# 3. Click "Join for $9.99/mo"
→ Redirect a Stripe Checkout

# 4. Usar test card: 4242...
→ Complete payment

# 5. Redirect de vuelta
→ Ver toast "Payment successful!"
→ Acceso a feed/courses/chat
```

---

## ⚠️ **Important Notes:**

### **Security:**

- ✅ Membership verificado en cada página protegida
- ✅ Webhook signature verificado
- ✅ User ID en metadata para identificación segura
- ✅ No confiar solo en customer email

### **Edge Cases Manejados:**

- ✅ Usuario ya es miembro → Error message
- ✅ Comunidad no es de paga → Error 400
- ✅ Pago fallido → Status past_due, notification
- ✅ Subscription cancelado → Acceso hasta fin de periodo
- ✅ Webhook duplicado → Check existingMember

### **TODO (Futuro):**

- 📧 Email notifications (payment success, failed, canceled)
- 🎁 Trial periods (7-day free trial)
- 💎 Multiple pricing tiers (Basic, Premium, VIP)
- 📊 Analytics dashboard para owners
- 🔔 Payment reminder notifications

---

## 🚀 **Estado Final:**

```
✅ Stripe Checkout integration
✅ Webhook processing
✅ Membership creation
✅ Subscription management
✅ Protected pages
✅ Preview page para no-miembros
✅ Success/Cancel redirects
✅ Toast notifications
✅ Member count updates
✅ Platform fees (10%)
✅ Stripe Connect support
```

---

## 📞 **Soporte:**

Si hay problemas:

1. Check Stripe Dashboard → Webhooks → Events
2. Check server logs para webhook processing
3. Verify `.env` variables
4. Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

---

**¡Comunidades de paga 100% funcionales!** 🎉💰