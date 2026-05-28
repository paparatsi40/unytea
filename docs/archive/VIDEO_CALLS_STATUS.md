# 🎥 VIDEO CALLS - Estado de Implementación

**Fecha:** 9 de Enero, 2025  
**Feature:** Video Calls con LiveKit  
**Estado:** 🟡 **PENDIENTE CONFIGURACIÓN**

---

## ✅ **LO QUE YA ESTÁ IMPLEMENTADO:**

### **1. Dependencias instaladas** ✅

```bash
npm install livekit-client livekit-server-sdk @livekit/components-react
```

**Paquetes:**

- `livekit-client` - SDK del cliente para WebRTC
- `livekit-server-sdk` - SDK del servidor para generar tokens
- `@livekit/components-react` - Componentes React pre-hechos

---

### **2. API Endpoint para tokens** ✅

**Archivo:** `web/app/api/livekit/token/route.ts`

**Qué hace:**

- Recibe `roomName` y `participantName`
- Genera un access token usando el API Secret de LiveKit
- Retorna token + wsUrl + roomName
- Token expira en 2 horas
- Solo usuarios autenticados pueden obtener tokens

**Permisos otorgados:**

- `roomJoin: true` - Puede unirse al room
- `canPublish: true` - Puede publicar video/audio
- `canSubscribe: true` - Puede recibir video/audio de otros
- `canPublishData: true` - Puede enviar mensajes de datos

---

### **3. Componente VideoCallRoom** ✅

**Archivo:** `web/components/video-call/VideoCallRoom.tsx`

**Features:**

- ✅ Obtiene token del API endpoint
- ✅ Conecta automáticamente a LiveKit
- ✅ Loading state mientras conecta
- ✅ Error state si falla la conexión
- ✅ Video/Audio habilitados por defecto
- ✅ Callback `onDisconnect` cuando sale del call
- ✅ Usa componentes pre-hechos de LiveKit:
  - `<VideoConference />` - UI completa con controles
  - `<RoomAudioRenderer />` - Renderiza audio de participantes

**Props:**

```typescript
interface VideoCallRoomProps {
  roomName: string; // Nombre del room (ej: "mentor-session-123")
  participantName: string; // Nombre visible del participante
  onDisconnect?: () => void; // Callback cuando se desconecta
}
```

---

### **4. Página de Testing** ✅

**Ubicación:** `/dashboard/video-test`

**Archivo:** `web/app/(dashboard)/dashboard/video-test/page.tsx`

**Features:**

- ✅ Form simple para entrar room name y nombre
- ✅ Botón "Join Call"
- ✅ Muestra el VideoCallRoom cuando entra
- ✅ Botón "Leave Call" para salir
- ✅ Instrucciones de setup
- ✅ Tips de cómo probar (abrir en 2 tabs)

**Cómo usar:**

1. Ve a `http://localhost:3000/dashboard/video-test`
2. Entra un room name (ej: "test-room")
3. Entra tu nombre
4. Click "Join Call"
5. Abre en otra tab/browser y usa el mismo room name
6. ¡Deberías verte en ambas pantallas!

---

## 🔴 **LO QUE FALTA:**

### **1. Configurar LiveKit Cloud** ⚠️

**Acción requerida:**

1. Crear cuenta en https://cloud.livekit.io/
2. Crear proyecto "Unytea"
3. Copiar credenciales:
   - `LIVEKIT_URL` (wss://...)
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`
4. Agregar a `.env.local`
5. Reiniciar servidor

**Ver:** `web/LIVEKIT_SETUP.md` para instrucciones detalladas

---

### **2. Integrar con Mentor Sessions** 🔨

**Próximos pasos:**

#### **2.1 Actualizar MentorSession model**

Agregar campo para roomName:

```prisma
model MentorSession {
  // ... campos existentes
  videoRoomName  String?  // ej: "session-cm123456"
}
```

#### **2.2 Generar roomName al crear sesión**

En `web/app/actions/sessions.ts`:

```typescript
const roomName = `session-${session.id}`;
await prisma.mentorSession.update({
  where: { id: session.id },
  data: { videoRoomName: roomName },
});
```

#### **2.3 Crear página para sesiones**

`/dashboard/sessions/[sessionId]/video`

Mostrar:

- Detalles de la sesión (mentor, mentee, tema)
- Botón "Join Video Call"
- VideoCallRoom cuando se une

#### **2.4 Agregar a sesiones existentes**

- Botón "Start Video Call" en la lista de sesiones
- Solo visible cuando status es "IN_PROGRESS"
- Solo mentor y mentee pueden unirse

---

### **3. Features adicionales (opcional)** 💎

- [ ] **Recording** - Grabar sesiones (requiere plan paid)
- [ ] **Chat en video** - Texto mientras hablan
- [ ] **Notas compartidas** - Tomar notas durante sesión
- [ ] **Group calls** - Múltiples mentees
- [ ] **Waiting room** - Mentor debe aprobar entrada
- [ ] **Custom controls** - UI personalizada en lugar de VideoConference

---

## 🎯 **ARQUITECTURA ACTUAL:**

```
┌─────────────────────────────────────┐
│  CLIENT (React)                     │
│  ┌───────────────────────────────┐  │
│  │ VideoCallRoom component       │  │
│  └───────────┬───────────────────┘  │
│              │                       │
│              │ 1. Request token      │
│              ↓                       │
├─────────────────────────────────────┤
│  SERVER (Next.js API)               │
│  ┌───────────────────────────────┐  │
│  │ /api/livekit/token            │  │
│  │ - Verify auth                 │  │
│  │ - Generate token (2h TTL)     │  │
│  │ - Return token + wsUrl        │  │
│  └───────────┬───────────────────┘  │
│              │ 2. Return token       │
│              ↓                       │
├────────────────────────────────���────┤
│  CLIENT (React)                     │
│  ┌───────────────────────────────┐  │
│  │ LiveKitRoom                   │  │
│  │ - Connect with token          │  │
│  │ - Publish video/audio         │  │
│  │ - Subscribe to others         │  │
│  └───────────┬───────────────────┘  │
│              │ 3. WebSocket          │
│              ↓                       │
└─────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────┐
│  LIVEKIT CLOUD                      │
│  - WebRTC signaling                 │
│  - TURN/STUN servers                │
│  - Media routing                    │
│  - Recording (if enabled)           │
└─────────────────────────────────────┘
```

---

## 🧪 **CÓMO PROBAR (una vez configurado):**

### **Test 1: Página de testing**

1. Ve a `/dashboard/video-test`
2. Room name: "test-room"
3. Tu nombre: "Alice"
4. Click "Join Call"
5. Abre en modo incógnito (Ctrl+Shift+N)
6. Same room: "test-room"
7. Nombre: "Bob"
8. ¡Deberías verte en ambas pantallas!

### **Test 2: Controles**

- Click en micrófono para mute/unmute
- Click en cámara para on/off
- Click en screen share para compartir pantalla
- Click en settings (⚙️) para cambiar dispositivos

### **Test 3: Múltiples participantes**

- Abre en 3+ tabs/browsers
- Todos con el mismo room name
- Deberías ver todos los videos

---

## 📊 **ESTADO DE FEATURES:**

| Feature               | Estado             | Notas                              |
| --------------------- | ------------------ | ---------------------------------- |
| **Dependencias**      | ✅ Instaladas      | livekit-client, livekit-server-sdk |
| **API Token**         | ✅ Implementado    | /api/livekit/token                 |
| **VideoCallRoom**     | ✅ Implementado    | Componente funcional               |
| **Página de Testing** | ✅ Implementado    | /dashboard/video-test              |
| **LiveKit Config**    | 🔴 Pendiente       | Necesita credenciales              |
| **Mentor Sessions**   | 🔴 Pendiente       | Integración falta                  |
| **Recording**         | 🔴 No implementado | Requiere plan paid                 |
| **Chat en video**     | 🔴 No implementado | Feature adicional                  |

---

## 💰 **COSTOS:**

| Plan        | Precio  | Minutos | Notas                  |
| ----------- | ------- | ------- | ---------------------- |
| **Free**    | $0/mes  | 10,000  | ✅ Suficiente para MVP |
| **Starter** | $29/mes | 15,000  | Para growth            |
| **Pro**     | $99/mes | 50,000  | Para scale             |

**Para referencia:**

- 100 sesiones de 1 hora = 6,000 minutos
- Plan gratuito = ~166 horas/mes
- **Suficiente para primeros 100-200 usuarios** ✅

---

## 🚀 **PRÓXIMOS PASOS:**

1. **TÚ:** Configurar LiveKit Cloud (10 mins)
   - Ver `LIVEKIT_SETUP.md`
   - Copiar credenciales a `.env.local`
   - Reiniciar servidor

2. **YO:** Integrar con Mentor Sessions (2-3 horas)
   - Agregar campo videoRoomName
   - Crear página de video para sesiones
   - Botón "Join Call" en sesiones

3. **TESTING:** Probar end-to-end (30 mins)
   - Crear sesión de mentoría
   - Iniciar video call
   - Verificar que funciona

---

## 🎉 **CUANDO ESTÉ COMPLETO:**

Tendrás:

- ✅ Video calls 1-on-1 funcionales
- ✅ Integración con sistema de mentorías
- ✅ Controles completos (mute, camera, screen share)
- ✅ Alta calidad (WebRTC)
- ✅ Gratis hasta 10K minutos/mes
- ✅ **Feature que Skool NO tiene de esta calidad**

---

**Tiempo total estimado:** 6-8 horas  
**Progreso actual:** ~30% (estructura base lista)  
**Blocker:** Configuración de LiveKit Cloud

**¿Listo para configurar LiveKit?** 🎥
