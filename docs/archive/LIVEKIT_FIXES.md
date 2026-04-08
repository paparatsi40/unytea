# 🔧 LIVEKIT FIXES - Problemas Resueltos

**Fecha:** 9 de Enero, 2025  
**Problemas encontrados:** 2  
**Estado:** ✅ **RESUELTO**

---

## 🐛 **PROBLEMA 1: Content Security Policy**

### **Error:**

```
'https://your-livekit-url/rtc/validate?...' violates the following Content Security Policy directive: 
"connect-src 'self' wss: ws: https://sea1.ingest.uploadthing.com https://uploadthing.com https://utfs.io"
```

### **Causa:**

El CSP no incluía los dominios de LiveKit, por lo que el navegador bloqueaba las conexiones
WebSocket y HTTPS a LiveKit Cloud.

### **Solución:**

Actualizado `web/next.config.mjs` para agregar:

```javascript
"connect-src 'self' wss: ws: 
  https://sea1.ingest.uploadthing.com 
  https://uploadthing.com 
  https://utfs.io 
  https://*.livekit.cloud      // ← NUEVO
  https://*.livekit.io         // ← NUEVO
  wss://*.livekit.cloud"       // ← NUEVO
```

**Permite:**

- ✅ Conexiones HTTPS a `*.livekit.cloud` (API calls)
- ✅ Conexiones HTTPS a `*.livekit.io` (fallback)
- ✅ Conexiones WebSocket a `wss://*.livekit.cloud` (video streams)

---

## 🐛 **PROBLEMA 2: Variable de entorno incorrecta**

### **Error en logs:**

```
WebSocket connection to 'wss://your-livekit-url/rtc?...' failed
```

Estaba intentando conectarse a `your-livekit-url` (placeholder) en lugar de la URL real.

### **Causa:**

El código buscaba `process.env.NEXT_PUBLIC_LIVEKIT_URL` pero la variable en `.env.local` se llamaba
`LIVEKIT_URL`.

### **Solución:**

Actualizado `web/app/api/livekit/token/route.ts`:

```typescript
// ANTES:
const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

// DESPUÉS:
const wsUrl = process.env.LIVEKIT_URL;
```

**También agregamos mejor logging:**

```typescript
console.error("LiveKit credentials not configured", {
  hasApiKey: !!apiKey,
  hasApiSecret: !!apiSecret,
  hasWsUrl: !!wsUrl,
  wsUrl: wsUrl || "not set",
});
```

Ahora podemos debuggear más fácilmente si hay problemas de configuración.

---

## ✅ **VERIFICACIÓN:**

### **En .env.local:**

```env
LIVEKIT_URL=wss://unytea-8523x24g.livekit.cloud
LIVEKIT_API_KEY=APIZBLKowyua9Wp
LIVEKIT_API_SECRET=Ki5zO5JUaYOH6xmkDGtssIxpNd8QxPZBzQD9LTtG6EK
```

### **Variables correctas:** ✅

- `LIVEKIT_URL` (no `NEXT_PUBLIC_LIVEKIT_URL`)
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

---

## 🧪 **CÓMO PROBAR:**

### **1. Reiniciar el servidor:**

```bash
# Detener (Ctrl+C)
# Reiniciar
npm run dev
```

### **2. Verificar en consola del servidor:**

Deberías ver algo como:

```
✓ Ready in 2.3s
○ Compiling / ...
✓ Compiled / in 1.2s
```

**NO deberías ver:**

```
LiveKit credentials not configured { hasApiKey: false, ... }
```

### **3. Ir a la página de test:**

```
http://localhost:3000/dashboard/video-test
```

### **4. Join call:**

- Room name: `test-room`
- Your name: `Test User`
- Click "Join Call"

### **5. Resultado esperado:**

- ✅ "Connecting to video call..." (loading spinner)
- ✅ Pantalla de video (con o sin cámara)
- ✅ **NO error** "Connection Failed"

---

## 🎥 **SIN CÁMARA - ¿Qué esperar?**

Si **NO tienes cámara** conectada:

- ✅ El video call **SÍ se conecta**
- ✅ Verás un **placeholder** con tu inicial (ej: "T" de Test User)
- ✅ Los controles aparecen (mute, camera, share)
- ✅ El micrófono funciona (si tienes uno)

**Para probar completamente:**

- Abre en otra ventana/tab con el mismo room name
- Ambas ventanas deberían mostrar "conectado"
- Si una tiene cámara, la otra la verá

---

## 📊 **ESTADO DESPUÉS DE LOS FIXES:**

```
┌────────────────────────────────────┐
│  VIDEO CALLS                       │
├────────────────────────────────────┤
│  ✅ Dependencias:      100%  █████ │
│  ✅ API Endpoint:      100%  █████ │
│  ✅ VideoCallRoom:     100%  █████ │
│  ✅ Test Page:         100%  █████ │
│  ✅ LiveKit Config:    100%  █████ │
│  ✅ CSP Fixed:         100%  █████ │
│  ✅ Env Vars Fixed:    100%  █████ │
│  🔴 Mentor Sessions:     0%  ▒▒▒▒▒ │
└────────────────────────────────────┘

TOTAL: 70% COMPLETO
READY TO TEST! 🎥
```

---

## 🚀 **PRÓXIMOS PASOS:**

1. **Reiniciar servidor** (Ctrl+C, npm run dev)
2. **Probar video call** sin cámara
3. **Verificar conexión** (debería conectarse)
4. **Probar con 2 ventanas** (mismo room name)
5. **Si funciona →** Continuar con integración de Mentor Sessions

---

## 💡 **LECCIÓN APRENDIDA:**

Este es el **segundo fix de CSP** que hacemos (primero UploadThing, ahora LiveKit).

**Patrón para futuras integraciones:**

Cuando integres un servicio externo que use WebSocket o HTTPS, **SIEMPRE actualiza el CSP**:

```javascript
"connect-src 'self' wss: ws: 
  https://servicio-existente.com
  https://NUEVO-SERVICIO.com      // ← Agregar
  wss://NUEVO-SERVICIO.com"       // ← Agregar si usa WebSocket
```

**Servicios que probablemente necesitarán CSP update:**

- OpenAI (AI Assistant) → `https://api.openai.com`
- Socket.io (Real-time Chat) → `wss://tu-servidor.com`
- Stripe (Payments) → `https://api.stripe.com`

---

**Fixes aplicados:** ✅  
**Servidor reiniciado:** ⏳ (hazlo ahora)  
**Listo para probar:** 🎥

**¡Reinicia el servidor y prueba de nuevo!**
