# 🎬 RECORDING + AI TRANSCRIPTION - Implementation Plan

**Fecha:** 10 de Enero, 2025  
**Feature:** Grabación automática con transcripción por IA y resúmenes inteligentes

---

## 🎯 **OBJETIVO:**

Crear el KILLER FEATURE que ninguna otra plataforma tiene:

- Grabar sesiones automáticamente
- Transcribir con Whisper AI
- Generar resúmenes con GPT-4
- Player sincronizado con transcripción
- Notas colaborativas en tiempo real

---

## 📊 **ARQUITECTURA:**

```
┌─────────────────────────────────────────────────────────────┐
│  FLUJO COMPLETO                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. SESIÓN INICIA                                           │
│     ↓                                                       │
│  2. LiveKit Egress auto-start grabación                     │
│     ↓                                                       │
│  3. Video se guarda en S3/R2                                │
│     ↓                                                       │
│  4. Webhook de LiveKit notifica "recording_ended"           │
│     ↓                                                       │
│  5. Background job: Extraer audio                           │
│     ↓                                                       │
│  6. OpenAI Whisper API transcribe audio                     │
│     ↓                                                       │
│  7. GPT-4 genera summary + key points + action items        │
│     ↓                                                       │
│  8. SessionRecording status → READY                         │
│     ↓                                                       │
│  9. Notificación a participantes: "Recording ready!"        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ **BASE DE DATOS (✅ COMPLETO):**

### **SessionRecording**

```typescript
{
  id: string
  sessionId: string (unique)
  recordingUrl: string      // S3/R2 URL
  thumbnailUrl?: string
  duration?: number         // seconds
  fileSize?: number         // bytes
  status: PROCESSING | READY | ERROR
  egressId?: string         // LiveKit egress ID
  roomId?: string           // LiveKit room ID
}
```

### **SessionTranscription**

```typescript
{
  id: string
  recordingId: string (unique)
  fullText: string          // Full transcription
  segments: JSON[]          // Timestamped segments
  
  // AI Generated
  summary?: string          // GPT-4 summary
  keyPoints: string[]       // Main takeaways
  actionItems: string[]     // Action items
  topics: string[]          // Topics discussed
  
  language: string          // Default: "en"
  confidence?: number       // 0-1
  wordCount?: number
  status: PROCESSING | READY | ERROR
}
```

### **SessionNote**

```typescript
{
  id: string
  sessionId: string
  userId: string
  content: string           // Markdown
  timestamp?: number        // Video timestamp
  isShared: boolean         // Visible to all?
}
```

---

## 🔧 **COMPONENTES A CREAR:**

### **1. LiveKit Recording Setup** (2h)

```
📁 web/lib/livekit/recording.ts
- startRecording(roomName, outputPath)
- stopRecording(egressId)
- getRecordingStatus(egressId)
```

### **2. Storage Service (S3/Cloudflare R2)** (1h)

```
📁 web/lib/storage/recordings.ts
- uploadRecording(file, sessionId)
- getRecordingUrl(sessionId)
- generateThumbnail(videoUrl)
- deleteRecording(sessionId)
```

### **3. AI Transcription Service** (2h)

```
📁 web/lib/ai/transcription.ts
- transcribeAudio(audioUrl): Promise<Segments[]>
- generateSummary(fullText): Promise<Summary>
- extractKeyPoints(fullText): Promise<string[]>
- extractActionItems(fullText): Promise<string[]>
```

### **4. Server Actions** (1.5h)

```
📁 web/app/actions/recordings.ts
- startSessionRecording(sessionId)
- getSessionRecording(sessionId)
- getRecordingWithTranscription(recordingId)
- processRecordingWebhook(data)
```

### **5. Video Player Component** (2h)

```
📁 web/components/recordings/VideoPlayer.tsx
- Video playback
- Transcription sidebar
- Clickable timestamps
- Speed controls
- Download button
```

### **6. Transcription Display** (1h)

```
📁 web/components/recordings/TranscriptionView.tsx
- Timestamped segments
- Search functionality
- Jump to timestamp on click
- Highlight active segment
- Copy/export options
```

### **7. Collaborative Notes** (1.5h)

```
📁 web/components/recordings/CollaborativeNotes.tsx
- Markdown editor
- Link to video timestamps
- Real-time sync (WebSocket)
- Save/share options
```

---

## 🔌 **APIs NECESARIAS:**

### **OpenAI API Keys:**

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview
WHISPER_MODEL=whisper-1
```

### **Storage (Cloudflare R2 recomendado):**

```env
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=unytea-recordings
R2_PUBLIC_URL=https://recordings.unytea.com
```

**¿Por qué R2?**

- ✅ Compatible con S3
- ✅ Sin costos de egress
- ✅ Mucho más barato que S3
- ✅ CDN incluido

---

## ⚡ **OPTIMIZACIONES:**

### **1. Background Jobs (BullMQ o Inngest)**

```typescript
// No bloquear requests
Queue.add('process-recording', {
  recordingId,
  sessionId
})
```

### **2. Chunked Processing**

```typescript
// Procesar audio en chunks de 25MB
// Whisper API tiene límite de 25MB
const chunks = splitAudio(audioFile, 25 * 1024 * 1024)
const transcripts = await Promise.all(
  chunks.map(chunk => transcribeChunk(chunk))
)
```

### **3. Caching**

```typescript
// Cache transcripciones en Redis
redis.set(`transcription:${recordingId}`, transcript, 'EX', 86400)
```

---

## 📱 **UI/UX FLOW:**

### **Durante la sesión:**

```
┌─────────────────────────────────────┐
│  🔴 Recording in progress           │
│  Duration: 00:15:32                 │
└─────────────────────────────────────┘

[Collaborative Notes Panel]
- Take notes during call
- Link to current timestamp
- Share with participants
```

### **Después de la sesión:**

```
┌─────────────────────────────────────┐
│  Session: "React Hooks Deep Dive"  │
│  Status: ✅ Recording Ready          │
│  Duration: 45:32                    │
│                                     │
│  [▶ Watch Recording]                │
│  [📝 View Transcription]            │
│  [📊 AI Summary]                    │
│  [⬇ Download]                       │
└─────────────────────────────────────┘
```

### **Video Player Page:**

```
┌────────────────────────────────────────────────────────────┐
│  [◀◀] [▶] [▶▶]  00:15:32 / 45:32      [🔊] [⚙️] [⬇]       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  [     VIDEO PLAYER AREA     ]  │  TRANSCRIPTION         │
│                                 │                         │
│                                 │  [00:15] "So today we  │
│                                 │  are going to talk..." │
│                                 │                         │
│                                 │  [00:32] "React hooks  │
│                                 │  allow us to..."       │
│                                 │  ← Click to jump       │
│                                 │                         │
├────────────────────────────────────────────────────────────┤
│  📊 AI SUMMARY                                            │
│  This session covered React Hooks fundamentals...         │
│                                                            │
│  🎯 KEY POINTS:                                           │
│  • useState manages component state                       │
│  • useEffect handles side effects                         │
│  • Custom hooks enable reusability                        │
│                                                            │
│  ✅ ACTION ITEMS:                                         │
│  • Practice with useState examples                        │
│  • Build a custom hook for API calls                      │
│  • Review useEffect dependency array                      │
└────────────────────────────────────────────────────────────┘
```

---

## ⏱️ **TIMELINE:**

```
TOTAL: 8-10 horas

✅ Database Schema          (0.5h) - DONE
⏳ LiveKit Recording        (2h)
⏳ Storage Setup            (1h)
⏳ AI Transcription         (2h)
⏳ Server Actions           (1.5h)
⏳ Video Player             (2h)
⏳ Transcription View       (1h)

REMAINING: ~9.5 horas
```

---

## 🎁 **VALOR PARA USUARIOS:**

### **Para Mentores:**

- ✅ No más tomar notas durante sesión
- ✅ Contenido reutilizable automático
- ✅ Referencias para seguimientos
- ✅ Evidencia del trabajo realizado

### **Para Mentees:**

- ✅ Revisar sesiones cuando quieran
- ✅ Buscar temas específicos
- ✅ No perder información importante
- ✅ Compartir con equipo

### **Para Comunidades:**

- ✅ Biblioteca de conocimiento automática
- ✅ Onboarding más fácil
- ✅ Mayor valor percibido
- ✅ Justifica pricing premium

---

## 💰 **VENTAJA COMPETITIVA:**

| Feature | Skool | Circle | Kajabi | **Unytea** |
|---------|-------|--------|--------|------------|
| Video Calls | ❌ | ❌ | ❌ | ✅ Native |
| Recording | ❌ | ❌ | ✅ Manual | ✅ **Auto** |
| Transcription | ❌ | ❌ | ❌ | ✅ **AI** |
| AI Summary | ❌ | ❌ | ❌ | ✅ **GPT-4** |
| Collaborative Notes | ❌ | ❌ | ❌ | ✅ **Real-time** |

**Resultado:** Feature que NADIE más tiene = Justifica precio 3x premium

---

## 🚀 **PRÓXIMO PASO:**

Implementar en este orden:

1. LiveKit recording setup
2. Storage service (R2)
3. AI transcription
4. Server actions
5. UI components

**¿Listo para continuar?**