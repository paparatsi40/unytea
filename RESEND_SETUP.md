# 📧 RESEND EMAIL SERVICE - SETUP RÁPIDO

**Tiempo estimado: 10 minutos**

---

## ✅ **LO QUE TENEMOS:**

```
✅ Resend instalado (npm package)
✅ Email service centralizado (lib/email.ts)
✅ 3 templates profesionales:
   - Password Reset
   - Welcome Email
   - Session Reminder
✅ Integrado en forgot-password API
✅ Error handling robusto
```

---

## 🚀 **SETUP (10 MINUTOS):**

### **1. Crear Cuenta en Resend (2 min)**

1. Ve a: https://resend.com
2. Click "Sign Up"
3. Usa tu email o GitHub
4. Verifica tu email

---

### **2. Obtener API Key (1 min)**

1. Una vez logueado, ve a: https://resend.com/api-keys
2. Click "Create API Key"
3. Name: "Unytea Production" (o "Unytea Development")
4. Click "Create"
5. **COPIA LA KEY** (empieza con `re_`)

```
Ejemplo: re_123abc456def789ghi
```

⚠️ **IMPORTANTE:** Guarda esta key, solo la verás una vez!

---

### **3. Agregar a .env.local (1 min)**

Abre: `web/.env.local`

Agrega estas líneas:

```bash
# Resend Email Service
RESEND_API_KEY=re_tu_api_key_aqui
EMAIL_FROM="Unytea <noreply@unytea.com>"
```

✅ Guarda el archivo

---

### **4. Verificar Dominio (OPCIONAL - 5 min)**

**Para enviar desde tu propio dominio:**

1. Ve a: https://resend.com/domains
2. Click "Add Domain"
3. Ingresa tu dominio (ej: `unytea.com`)
4. Agrega los DNS records que te muestra Resend
5. Espera verificación (1-5 minutos)

**Una vez verificado:**

```bash
# Actualiza EMAIL_FROM en .env.local:
EMAIL_FROM="Unytea <hello@unytea.com>"
```

**Para desarrollo puedes usar:**

```bash
# Resend te da un dominio de desarrollo gratis:
EMAIL_FROM="Unytea <onboarding@resend.dev>"
```

---

### **5. Testing (1 min)**

**Probar password reset:**

1. Reinicia el servidor:
   ```bash
   npm run dev
   ```

2. Ve a: http://localhost:3000/auth/forgot-password

3. Ingresa un email que exista en tu DB

4. Click "Send Reset Link"

5. **Revisa tu email** - deberías recibir el email de reset!

---

## 📊 **MONITOREO:**

**Ver emails enviados:**

1. Ve a: https://resend.com/emails
2. Verás todos los emails enviados
3. Puedes ver:
    - Status (delivered, bounced, etc.)
    - Open rate
    - Click rate
    - Email content (preview)

---

## 💡 **LÍMITES Y PRICING:**

### **Free Tier:**

```
✅ 100 emails/día
✅ 3,000 emails/mes
✅ 1 dominio verificado
✅ Todas las features
✅ Perfecto para development
```

### **Pro Tier ($20/mes):**

```
✅ 50,000 emails/mes
✅ Dominios ilimitados
✅ Email analytics
✅ Prioridad en soporte
✅ DMARC/SPF/DKIM automático
```

**Para Unytea:**

- Free tier suficiente para comenzar
- Upgrade cuando tengas 100+ usuarios activos

---

## 🎨 **EMAIL TEMPLATES DISPONIBLES:**

### **1. Password Reset**

```typescript
import { sendPasswordResetEmail } from "@/lib/email";

await sendPasswordResetEmail({
  to: "user@example.com",
  name: "John Doe",
  resetUrl: "https://unytea.com/auth/reset-password?token=abc123",
});
```

**Features:**

- ✅ Botón CTA prominente
- ✅ Link alternativo de texto
- ✅ Advertencia de expiración (1 hora)
- ✅ Branding de Unytea
- ✅ Responsive design

---

### **2. Welcome Email**

```typescript
import { sendWelcomeEmail } from "@/lib/email";

await sendWelcomeEmail({
  to: "user@example.com",
  name: "John Doe",
});
```

**Features:**

- ✅ Welcome message cálido
- ✅ Next steps checklist
- ✅ Link to dashboard
- ✅ Pro tips
- ✅ Branding de Unytea

---

### **3. Session Reminder**

```typescript
import { sendSessionReminderEmail } from "@/lib/email";

await sendSessionReminderEmail({
  to: "user@example.com",
  name: "John Doe",
  sessionTitle: "Introduction to React",
  sessionTime: "Tomorrow at 3:00 PM EST",
  sessionUrl: "https://unytea.com/sessions/abc123/room",
});
```

**Features:**

- ✅ Session info destacada
- ✅ Join button directo
- ✅ Reminder timing claro
- ✅ Pro tip para setup

---

## 🔧 **AGREGAR MÁS EMAILS:**

Para agregar nuevos tipos de email:

1. Abre: `web/lib/email.ts`

2. Agrega nueva función:

```typescript
export async function sendYourEmail({
  to,
  name,
  // ... otros params
}: {
  to: string;
  name: string;
  // ... tipos
}) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Tu Subject",
      html: getYourEmailTemplate(name),
    });
    
    console.log("✅ Email sent to:", to);
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to send:", error);
    return { success: false };
  }
}

function getYourEmailTemplate(name: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <!-- Tu template HTML aquí -->
    </html>
  `;
}
```

3. Usa en tu código:

```typescript
import { sendYourEmail } from "@/lib/email";

await sendYourEmail({ to, name });
```

---

## 🐛 **TROUBLESHOOTING:**

### **Error: "Missing API key"**

```bash
# Verifica que RESEND_API_KEY esté en .env.local
# Reinicia el servidor después de agregar
```

### **Email no llega**

1. Revisa spam folder
2. Verifica email en Resend dashboard: https://resend.com/emails
3. Chequea status (delivered/bounced)

### **Error: "Invalid from address"**

```bash
# Usa el formato correcto:
EMAIL_FROM="Name <email@domain.com>"

# Ejemplos válidos:
EMAIL_FROM="Unytea <hello@unytea.com>"
EMAIL_FROM="Unytea <onboarding@resend.dev>"
```

### **Rate limit exceeded**

```
Free tier: 100 emails/día
Solución: Upgrade a Pro o espera 24h
```

---

## ✅ **PRODUCTION CHECKLIST:**

```
□ Dominio verificado en Resend
□ RESEND_API_KEY en production .env
□ EMAIL_FROM usa dominio verificado
□ Tested password reset
□ Tested welcome email
□ Monitoreando bounces en dashboard
□ DNS records (SPF, DKIM) configurados
```

---

## 📚 **RECURSOS:**

- [Resend Docs](https://resend.com/docs)
- [Email Templates](https://resend.com/docs/send-with-react)
- [API Reference](https://resend.com/docs/api-reference)
- [Pricing](https://resend.com/pricing)

---

## 🎯 **ESTADO ACTUAL:**

```
✅ Resend instalado
✅ Email service configurado
✅ 3 templates listos
✅ Integrado en password reset
⏳ Falta solo RESEND_API_KEY en .env

TIEMPO PARA COMPLETAR: 5 minutos
```

---

**¿Listo para configurar? Solo necesitas:**

1. Crear cuenta Resend (2 min)
2. Copiar API key
3. Agregar a `.env.local`
4. Reiniciar servidor
5. ✅ **LISTO!**
