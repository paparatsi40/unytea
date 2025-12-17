# 🔐 Password Reset Guide - Unytea

## ⚠️ Problema Actual

La funcionalidad de "Forgot Password" requiere **Resend API key** para enviar emails, pero no está
configurada actualmente.

---

## 🚀 Solución Inmediata - Reset Manual

### **Opción 1: Usando el Script (Recomendado)**

```bash
cd web
npx tsx scripts/reset-password.ts TU_EMAIL@example.com NuevoPassword123
```

**Ejemplo:**

```bash
npx tsx scripts/reset-password.ts carlos@unytea.com MiPassword2024
```

**Output esperado:**

```
🔐 Starting password reset process...

✅ User found:
   Name: Carlos Alfaro
   Email: carlos@unytea.com
   ID: cmj97twdl0000qtej7htpr2y7

🔒 Hashing new password...
✅ Password updated successfully!

🎉 You can now sign in with:
   Email: carlos@unytea.com
   Password: MiPassword2024
```

---

### **Opción 2: Usando Prisma Studio (GUI)**

```bash
cd web
npx prisma studio
```

1. Abre `Users` en el navegador
2. Busca tu usuario por email
3. Genera un hash de bcrypt para tu nuevo password:
    - Ve a: https://bcrypt-generator.com/
    - Escribe tu nuevo password
    - Rounds: 12
    - Copia el hash generado
4. Pega el hash en el campo `password`
5. Click "Save 1 change"

---

### **Opción 3: Desde la Base de Datos (SQL Directo)**

```sql
-- 1. Genera el hash primero (usa online tool o Node.js)
-- bcrypt.hash('MiNuevoPassword', 12)

-- 2. Actualiza el password
UPDATE users 
SET password = '$2a$12$HASH_AQUI'
WHERE email = 'tu_email@example.com';
```

---

## ✅ Solución Permanente - Configurar Resend

### **Paso 1: Crear Cuenta en Resend**

1. Ve a [https://resend.com/signup](https://resend.com/signup)
2. Crea una cuenta gratis
    - Plan Free: 3,000 emails/mes
    - Perfecto para desarrollo

### **Paso 2: Obtener API Key**

1. Ve a [https://resend.com/api-keys](https://resend.com/api-keys)
2. Click "Create API Key"
3. Nombre: `Unytea Development`
4. Permisos: "Sending access"
5. Copia la API key (comienza con `re_`)

### **Paso 3: Configurar Variables de Entorno**

Edita tu archivo `web/.env`:

```bash
# Email (Resend)
RESEND_API_KEY=re_TuApiKeyAqui123456
EMAIL_FROM="Unytea <noreply@unytea.com>"
ADMIN_EMAIL="support@unytea.com"
```

### **Paso 4: Verificar Dominio (Opcional pero Recomendado)**

**Para desarrollo (localhost):**

- Puedes usar cualquier email "from" mientras estés en localhost
- Resend permite emails de prueba sin verificar dominio

**Para producción:**

1. Ve a [https://resend.com/domains](https://resend.com/domains)
2. Agrega tu dominio (ejemplo: `unytea.com`)
3. Agrega los registros DNS que te proporcionen
4. Espera verificación (15-30 minutos)
5. Actualiza `EMAIL_FROM` con tu dominio verificado

### **Paso 5: Reiniciar Servidor**

```bash
# Detén el servidor (Ctrl + C)
npm run dev
```

### **Paso 6: Probar**

1. Ve a: `http://localhost:3000/en/auth/forgot-password`
2. Ingresa tu email
3. Deberías recibir el email en 1-2 segundos
4. Revisa tu bandeja de entrada (y spam)
5. Click en el link para resetear password

---

## 🧪 Testing de Emails

### **Test Manual con cURL:**

```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"tu_email@example.com"}'
```

### **Test desde el Código:**

```typescript
import { sendPasswordResetEmail } from '@/lib/email';

await sendPasswordResetEmail({
  to: 'test@example.com',
  name: 'Test User',
  resetUrl: 'http://localhost:3000/auth/reset-password?token=test123'
});
```

---

## 📧 Resend - Plan Gratuito

### **Límites del Plan Free:**

- ✅ 3,000 emails/mes
- ✅ 100 emails/día
- ✅ Perfecto para desarrollo y MVP
- ✅ No requiere tarjeta de crédito

### **Emails de la Plataforma:**

- Password reset
- Welcome emails
- Session reminders
- Payment confirmations
- Community invitations

Con 3,000 emails/mes puedes soportar:

- ~100 usuarios activos
- ~30 resets de password/mes
- ~500 sesiones/mes
- ~50 nuevos registros/mes

---

## 🔒 Seguridad

### **Buenas Prácticas Implementadas:**

✅ **Token Seguro:** 32 bytes aleatorios (crypto.randomBytes)
✅ **Expiración:** Token válido por 1 hora
✅ **Hash Bcrypt:** Password con 12 rounds
✅ **No Leak:** No revela si email existe
✅ **HTTPS Only:** Tokens solo por HTTPS en producción
✅ **One-Time Use:** Token se elimina después de usar

---

## 🐛 Troubleshooting

### **Error: "Failed to send reset email"**

**Causa:** Resend API key no configurada o inválida

**Solución:**

1. Verifica que `RESEND_API_KEY` esté en `.env`
2. Verifica que la key comience con `re_`
3. Reinicia el servidor

### **Email no llega**

**Checklist:**

- ✅ Revisa carpeta de spam
- ✅ Verifica que el email es válido
- ✅ Revisa logs del servidor (console)
- ✅ Verifica en [Resend Dashboard](https://resend.com/emails)
- ✅ Verifica dominio verificado (producción)

### **Link de reset expirado**

**Solución:**

- Los links expiran en 1 hora
- Solicita un nuevo link
- El token anterior ya no funciona

---

## 📱 Próximos Pasos (Opcionales)

### **Email Templates Avanzados:**

- [ ] Personalización de colores
- [ ] Logo de tu marca
- [ ] Footer con redes sociales
- [ ] Tracking de aperturas
- [ ] A/B testing

### **Proveedores Alternativos:**

- **SendGrid:** Hasta 100 emails/día gratis
- **Mailgun:** Primer 3 meses gratis
- **AWS SES:** $0.10 por 1,000 emails
- **Postmark:** $15/mes por 10,000 emails

---

## ✅ Resumen Rápido

### **Reset Inmediato (Sin configurar nada):**

```bash
cd web
npx tsx scripts/reset-password.ts TU_EMAIL@example.com NuevoPassword123
```

### **Configuración Permanente (5 minutos):**

1. Crear cuenta en Resend
2. Copiar API key
3. Agregar a `.env`:

```bash
RESEND_API_KEY=re_tu_key_aqui
EMAIL_FROM="Unytea <noreply@unytea.com>"
```

4. Reiniciar servidor

---

**¡Listo! Ahora puedes resetear passwords fácilmente.** 🎉
