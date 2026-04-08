# 🎥 LIVEKIT SETUP - Guía Completa

**Fecha:** 9 de Enero, 2025  
**Feature:** Video Calls con LiveKit

---

## 🎯 **¿QUÉ ES LIVEKIT?**

LiveKit es una plataforma open-source para video calls en tiempo real. Es como Zoom/Meet pero
integrado en tu app.

**Ventajas:**

- ✅ Plan gratuito: **10,000 minutos/mes** (gratis para siempre)
- ✅ Open source (puedes self-host si quieres)
- ✅ WebRTC de alta calidad
- ✅ Screen sharing incluido
- ✅ Recording disponible
- ✅ SDKs para React, React Native, iOS, Android

---

## 📋 **PASO 1: Crear cuenta en LiveKit Cloud**

### **1.1 Ir a LiveKit Cloud:**

```
https://cloud.livekit.io/
```

### **1.2 Sign Up:**

- Click en **"Sign Up"**
- Puedes usar:
    - GitHub (recomendado)
    - Google
    - Email

### **1.3 Crear un proyecto:**

- Una vez logueado, verás el dashboard
- Click en **"Create Project"**
- Nombre del proyecto: **"Unytea"** (o el que prefieras)
- Region: **"US West (us-west-2)"** o la más cercana a ti

---

## 🔑 **PASO 2: Obtener credenciales**

### **2.1 En el dashboard de tu proyecto:**

Verás algo como:

```
Project: Unytea
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WebSocket URL:
wss://unytea-xxxxx.livekit.cloud

API Key:
APIxxxxxxxxxxxxxxxxx

API Secret:
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### **2.2 Copiar las credenciales:**

Necesitas estos 3 valores:

1. **LIVEKIT_URL** (WebSocket URL)
    - Ejemplo: `wss://unytea-xxxxx.livekit.cloud`

2. **LIVEKIT_API_KEY** (API Key)
    - Ejemplo: `APIxxxxxxxxxxxxxxxxx`

3. **LIVEKIT_API_SECRET** (API Secret)
    - Ejemplo: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## 🔧 **PASO 3: Agregar a .env.local**

Abre `web/.env.local` y agrega al final:

```env
# LiveKit (Video Calls)
# Get your keys from: https://cloud.livekit.io/
LIVEKIT_URL=wss://tu-proyecto.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**⚠️ IMPORTANTE:**

- Reemplaza los valores con los de TU proyecto
- El `LIVEKIT_URL` debe empezar con `wss://` (no `https://`)
- El `LIVEKIT_API_SECRET` es sensible - NO lo compartas

---

## ✅ **PASO 4: Verificar instalación**

### **4.1 Reiniciar el servidor:**

```bash
# En la terminal donde corre npm run dev:
Ctrl + C

# Reiniciar:
npm run dev
```

### **4.2 Verificar que las variables están cargadas:**

En cualquier archivo del servidor, temporalmente agrega:

```typescript
console.log("LiveKit URL:", process.env.LIVEKIT_URL);
console.log("LiveKit API Key:", process.env.LIVEKIT_API_KEY);
console.log("LiveKit API Secret:", process.env.LIVEKIT_API_SECRET ? "✅ Set" : "❌ Not set");
```

Deberías ver en la consola:

```
LiveKit URL: wss://tu-proyecto.livekit.cloud
LiveKit API Key: APIxxxxxxxxxxxxxxxxx
LiveKit API Secret: ✅ Set
```

---

## 🧪 **PASO 5: Test básico (opcional)**

En el dashboard de LiveKit Cloud:

1. Ve a **"Rooms"** en el sidebar
2. Click en **"Create Room"**
3. Nombre: `test-room`
4. Click en **"Create"**
5. Click en **"Join Room"**
6. ¡Deberías ver tu cámara! 📹

Esto verifica que tu cuenta funciona correctamente.

---

## 📊 **LÍMITES DEL PLAN GRATUITO:**

| Recurso | Límite Gratuito |
|---------|-----------------|
| **Minutos de video** | 10,000/mes |
| **Participantes simultáneos** | Ilimitados |
| **Rooms simultáneos** | Ilimitados |
| **Storage (recording)** | No incluido (upgrade a $9/mes) |
| **Bandwidth** | Ilimitado |

**Para referencia:**

- 10,000 minutos = ~166 horas
- Si tienes 100 sesiones de 1 hora/mes = 6,000 minutos
- **Suficiente para MVP y primeros usuarios** ✅

---

## 💰 **PLANES PAGOS (si creces):**

| Plan | Precio | Minutos |
|------|--------|---------|
| **Free** | $0/mes | 10,000 |
| **Starter** | $29/mes | 15,000 + $0.002/min adicional |
| **Pro** | $99/mes | 50,000 + $0.0015/min adicional |
| **Enterprise** | Custom | Custom |

---

## 🔐 **SEGURIDAD:**

### **Buenas prácticas:**

1. ✅ **NUNCA** expongas el `LIVEKIT_API_SECRET` al cliente
2. ✅ Los access tokens se generan en el **servidor** (API route)
3. ✅ Los tokens expiran después de 1-2 horas
4. ✅ Los rooms se auto-destruyen cuando están vacíos

### **Flujo seguro:**

```
Cliente                 Servidor (API)           LiveKit Cloud
   │                         │                         │
   ├─── Request token ──────>│                         │
   │                         │                         │
   │                         ├─ Generate token ──────> │
   │                         │  (usando API Secret)    │
   │                         │                         │
   │                         │<── Token válido ────────┤
   │<── Return token ────────┤                         │
   │                         │                         │
   ├─ Join room (con token) ──────────────────────────>│
   │                                                    │
   │<══════════ Video Stream ══════════════════════════>│
```

---

## 📚 **RECURSOS:**

- **Docs oficiales:** https://docs.livekit.io/
- **React SDK:** https://docs.livekit.io/client-sdk-js/
- **Server SDK:** https://docs.livekit.io/server-sdk-node/
- **Examples:** https://github.com/livekit/livekit-react

---

## 🐛 **TROUBLESHOOTING:**

### **❌ "WebSocket connection failed"**

- Verifica que `LIVEKIT_URL` empiece con `wss://`
- Verifica que copiaste la URL correcta

### **❌ "Invalid token"**

- Verifica que `LIVEKIT_API_KEY` y `LIVEKIT_API_SECRET` sean correctos
- Reinicia el servidor después de cambiar `.env.local`

### **❌ "Camera not found"**

- Dale permisos al navegador (click en el candado en la barra de direcciones)
- Verifica que tu cámara no esté siendo usada por otra app

---

## ✅ **CHECKLIST:**

- [ ] Cuenta creada en LiveKit Cloud
- [ ] Proyecto "Unytea" creado
- [ ] `LIVEKIT_URL` copiado
- [ ] `LIVEKIT_API_KEY` copiado
- [ ] `LIVEKIT_API_SECRET` copiado
- [ ] Variables agregadas a `.env.local`
- [ ] Servidor reiniciado
- [ ] Variables verificadas en consola

---

## 🚀 **SIGUIENTE PASO:**

Una vez que tengas las credenciales configuradas, continuaremos con:

1. ✅ API endpoint para generar tokens
2. ✅ Componente de Video Call
3. ✅ Integración con Mentor Sessions
4. ✅ Controls (mute, camera, screen share)

---

**Tiempo estimado:** 10-15 minutos para configurar LiveKit

**¡Avísame cuando tengas las credenciales listas!** 🎥
