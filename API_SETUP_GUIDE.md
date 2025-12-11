# 🔧 API SETUP GUIDE - Recording + AI System

**Fecha:** 10 de Enero, 2025  
**Propósito:** Configurar todas las APIs necesarias para el sistema de grabación y transcripción con
IA

---

## 📋 **RESUMEN DE APIs NECESARIAS:**

```
1. ✅ OpenAI API       - Transcripción (Whisper) + Summary (GPT-4)
2. ✅ Cloudflare R2    - Almacenamiento de videos
3. ✅ LiveKit Egress   - Grabación de sesiones
```

---

## 1️⃣ **OPENAI API CONFIGURATION**

### **Paso 1: Crear cuenta y obtener API Key**

1. Ve a: https://platform.openai.com/signup
2. Crea una cuenta o inicia sesión
3. Ve a: https://platform.openai.com/api-keys
4. Click en **"Create new secret key"**
5. Nombre: `Unytea-Production`
6. **IMPORTANTE:** Copia la key inmediatamente (no se volverá a mostrar)

### **Paso 2: Configurar Billing**

1. Ve a: https://platform.openai.com/account/billing
2. Agrega método de pago
3. Set spending limit (recomendado: $50/mes para empezar)

### **Costos Estimados:**

```
Whisper API (Transcripción):
- $0.006 por minuto de audio
- Sesión 1h = $0.36
- 100 sesiones/mes = $36

GPT-4 Turbo (Resúmenes):
- $0.01 por 1K tokens
- Summary por sesión ≈ 2K tokens = $0.02
- 100 sesiones/mes = $2

TOTAL: ~$38/mes para 100 sesiones
```

### **Paso 3: Agregar a .env.local**

```bash
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
```

---

## 2️⃣ **CLOUDFLARE R2 CONFIGURATION**

### **Paso 1: Crear cuenta Cloudflare**

1. Ve a: https://dash.cloudflare.com/sign-up
2. Crea cuenta gratis
3. Verifica email

### **Paso 2: Crear R2 Bucket**

1. En el dashboard: https://dash.cloudflare.com/
2. Click en **"R2"** en el sidebar izquierdo
3. Click **"Create bucket"**
4. Nombre: `unytea-recordings` (o lo que prefieras)
5. Location: `Automatic` (recomendado)
6. Click **"Create bucket"**

### **Paso 3: Obtener credenciales S3**

1. Ve a: **R2 > Manage R2 API Tokens**
2. Click **"Create API token"**
3. Nombre: `Unytea-Recordings-Upload`
4. Permisos:
    - ✅ Object Read & Write
    - ✅ Bucket: `unytea-recordings` (el que creaste)
5. Click **"Create API Token"**
6. **GUARDA ESTOS VALORES:**
    - Access Key ID
    - Secret Access Key
    - R2 Endpoint URL

### **Paso 4: Agregar a .env.local**

```bash
# Cloudflare R2 Storage
R2_ACCOUNT_ID=tu_account_id
R2_ACCESS_KEY_ID=tu_access_key_id_aqui
R2_SECRET_ACCESS_KEY=tu_secret_access_key_aqui
R2_BUCKET_NAME=unytea-recordings
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxx.r2.dev
```

**¿Cómo obtener R2_ACCOUNT_ID?**

- En tu dashboard de Cloudflare
- Está en la URL: `https://dash.cloudflare.com/[ACCOUNT_ID]/r2`

**¿Cómo obtener R2_PUBLIC_URL?**

1. Ve al bucket que creaste
2. Settings > Public Access
3. Click "Allow Access" si quieres URLs públicas
4. O usa signed URLs (más seguro) - ya está implementado

### **Costos R2:**

```
Storage: $0.015 por GB/mes
- 100 videos de 1h (≈100GB) = $1.50/mes
- 500 videos = $7.50/mes

Egress (descarga): GRATIS (ventaja sobre S3)
Operations (read/write): Muy bajo (~$0.01/mes)

TOTAL: ~$1.50-$7.50/mes (vs S3: $3-$15/mes)
```

---

## 3️⃣ **LIVEKIT EGRESS CONFIGURATION**

### **Paso 1: Verificar LiveKit Cloud**

1. Ya tienes cuenta: https://cloud.livekit.io
2. Ve a tu proyecto: **Settings**
3. Encuentra:
    - API Key
    - API Secret
    - WebSocket URL

### **Paso 2: Habilitar Egress**

LiveKit Cloud incluye Egress gratis en el plan:

- ✅ Ya está habilitado
- ✅ No requiere configuración adicional
- ✅ Solo necesitas tu API Key/Secret existente

### **Paso 3: Configurar Webhook (Opcional pero recomendado)**

Para recibir notificaciones cuando la grabación termina:

1. Ve a: **Project Settings > Webhooks**
2. Click **"Add webhook"**
3. URL: `https://tu-dominio.com/api/webhooks/livekit-recording`
4. Events: Selecciona:
    - ✅ `egress_started`
    - ✅ `egress_ended`
    - ✅ `egress_updated`
5. Save webhook

**Necesitarás implementar el endpoint después del deploy**

### **Paso 4: Variables ya están en .env.local**

```bash
# Ya las tienes configuradas:
LIVEKIT_API_KEY=tu_livekit_api_key
LIVEKIT_API_SECRET=tu_livekit_api_secret
NEXT_PUBLIC_LIVEKIT_URL=wss://tu-proyecto.livekit.cloud
```

---

## 📝 **CHECKLIST DE CONFIGURACIÓN:**

Marca cada paso cuando lo completes:

### OpenAI:

- [ ] Cuenta creada
- [ ] API Key generada
- [ ] Billing configurado
- [ ] Variable en .env.local

### Cloudflare R2:

- [ ] Cuenta creada
- [ ] Bucket creado
- [ ] API Token generado
- [ ] Variables en .env.local

### LiveKit Egress:

- [ ] Egress verificado habilitado
- [ ] (Opcional) Webhook configurado

---

## 🧪 **TESTING RÁPIDO:**

Una vez configurado todo, puedes probar:

### Test 1: OpenAI Connection

```bash
npm run dev
# Luego abre: http://localhost:3000/api/test/openai
```

### Test 2: R2 Upload

```bash
# Abre: http://localhost:3000/api/test/r2
```

### Test 3: LiveKit Recording

```bash
# Inicia una sesión de video y presiona "Record"
```

---

## 🚨 **TROUBLESHOOTING COMÚN:**

### OpenAI 401 Error:

- ✅ Verifica que copiaste la key completa (empieza con `sk-proj-`)
- ✅ Revisa que hay saldo en billing

### R2 403 Error:

- ✅ Verifica permisos del API token (Read & Write)
- ✅ Revisa que el bucket name coincide
- ✅ Account ID correcto

### LiveKit Recording no inicia:

- ✅ Verifica que Egress está habilitado en tu plan
- ✅ Room debe estar activo
- ✅ Al menos 1 participante en el room

---

## 💰 **COSTOS TOTALES ESTIMADOS:**

```
Desarrollo/Testing:
- OpenAI: ~$5-10/mes
- R2: ~$1-2/mes
- LiveKit: Gratis (hasta 50 rooms simultáneos)
━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: ~$6-12/mes

Producción (100 sesiones/mes):
- OpenAI: ~$38/mes
- R2: ~$7.50/mes
- LiveKit: ~$50/mes (plan Pro)
━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: ~$95.50/mes

Por sesión: ~$0.96 (puedes cobrar $10-50 por sesión)
```

---

## 🔐 **SEGURIDAD:**

### ⚠️ NUNCA:

- ❌ Commitear .env.local a git
- ❌ Compartir API keys públicamente
- ❌ Usar mismas keys para dev y prod

### ✅ SIEMPRE:

- ✅ Usar diferentes keys para desarrollo y producción
- ✅ Regenerar keys si se comprometen
- ✅ Usar variables de entorno
- ✅ Set spending limits en OpenAI

---

## 📞 **SOPORTE:**

- **OpenAI:** https://help.openai.com
- **Cloudflare:** https://community.cloudflare.com
- **LiveKit:** https://docs.livekit.io

---

**¡Ya estás listo para configurar todo!** Sigue los pasos en orden y marca cada checklist item. 🚀
