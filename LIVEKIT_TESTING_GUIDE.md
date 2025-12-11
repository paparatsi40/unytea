# 🧪 LIVEKIT - Guía Rápida de Testing

**Una vez configurado LiveKit, sigue estos pasos para probar:**

---

## ✅ **CHECKLIST PRE-TESTING:**

- [ ] Credenciales agregadas a `.env.local`
- [ ] Servidor reiniciado (`Ctrl+C` y `npm run dev`)
- [ ] Navegador con permisos de cámara/micrófono

---

## 🎥 **TEST 1: Basic Video Call (2 participantes)**

### **Paso 1: Abrir primera ventana**

1. Ve a: `http://localhost:3000/dashboard/video-test`
2. Room Name: **`test-room-1`**
3. Your Name: **`Alice`**
4. Click **"Join Call"**
5. 💡 **Acepta permisos** de cámara/micrófono cuando el navegador pregunte
6. ✅ **Deberías verte** en pantalla

### **Paso 2: Abrir segunda ventana**

1. Abre **modo incógnito** (Ctrl+Shift+N) o **otro navegador**
2. Ve a: `http://localhost:3000/dashboard/video-test`
3. Room Name: **`test-room-1`** (mismo que antes)
4. Your Name: **`Bob`**
5. Click **"Join Call"**

### **Resultado esperado:** ✅

- Alice ve a Bob en su pantalla
- Bob ve a Alice en su pantalla
- Ambos pueden verse y escucharse

---

## 🎛️ **TEST 2: Controles básicos**

### **Mute/Unmute:**

1. Click en el **ícono de micrófono** 🎤
2. Debería ponerse rojo y con una línea
3. La otra persona NO debería escucharte
4. Click de nuevo para unmute

### **Camera On/Off:**

1. Click en el **ícono de cámara** 📹
2. Tu video debería apagarse (pantalla negra con tu inicial)
3. La otra persona solo ve tu inicial
4. Click de nuevo para encender

### **Screen Share:**

1. Click en **"Share Screen"** o ícono 🖥️
2. Selecciona qué compartir (pantalla completa, ventana, tab)
3. La otra persona debería ver tu pantalla
4. Click **"Stop Sharing"** para detener

---

## 👥 **TEST 3: Múltiples participantes (3+)**

1. Abre en **3 ventanas diferentes**:
    - Navegador normal
    - Modo incógnito
    - Otro navegador (Chrome + Firefox)

2. **Todos** con el mismo room name: `test-room-multi`

3. **Nombres diferentes:**
    - Alice
    - Bob
    - Charlie

### **Resultado esperado:** ✅

- Todos ven a todos
- Grid layout con 3 videos
- Todos pueden escucharse

---

## 🔊 **TEST 4: Audio/Video Quality**

### **Test de audio:**

1. En una ventana, habla claramente
2. En la otra, verifica que:
    - ✅ Audio se escucha sin eco
    - ✅ Sin delay significativo (<500ms)
    - ✅ Calidad clara

### **Test de video:**

1. Mueve la mano frente a la cámara
2. Verifica que:
    - ✅ Video no está pixelado
    - ✅ Movimientos fluidos (no choppy)
    - ✅ Sin congelamiento

---

## 📊 **TEST 5: Connection Stats**

En el video call, busca el **ícono de settings** (⚙️):

1. Click en settings
2. Ve a **"Advanced"** o **"Stats"**
3. Verifica:
    - ✅ **Bitrate:** >500 kbps (bueno), >1000 kbps (excelente)
    - ✅ **Packet Loss:** <5% (aceptable), <1% (excelente)
    - ✅ **Latency:** <100ms (excelente), <300ms (bueno)

---

## 🐛 **TROUBLESHOOTING:**

### **❌ "Failed to connect" o "Connection failed"**

**Posibles causas:**

1. Credenciales incorrectas en `.env.local`
2. Servidor no reiniciado después de agregar credenciales
3. Firewall bloqueando WebSocket

**Solución:**

```bash
# 1. Verifica .env.local
cat .env.local | grep LIVEKIT

# 2. Reinicia servidor
Ctrl+C
npm run dev

# 3. Verifica en consola del servidor que aparezca:
# LiveKit URL: wss://...
# LiveKit API Key: API...
```

---

### **❌ "Camera/Microphone not found"**

**Solución:**

1. Click en el **candado** 🔒 en la barra de direcciones
2. Permisos → Cámara y Micrófono → **Permitir**
3. Recarga la página (F5)

---

### **❌ "No video, solo audio"**

**Posible causa:** Cámara en uso por otra app

**Solución:**

1. Cierra Zoom, Teams, Skype, etc.
2. Reinicia el navegador
3. Intenta de nuevo

---

### **❌ Video se ve pero audio no funciona**

**Solución:**

1. Verifica que micrófono no esté en **mute** (ícono rojo)
2. Settings → Cambia el micrófono en el dropdown
3. Verifica volumen del sistema

---

### **❌ Echo (escucho mi propia voz)**

**Causa:** Misma persona en 2 ventanas sin audífonos

**Solución:**

1. Usa **audífonos** en al menos una ventana
2. O mute el micrófono en una de las ventanas

---

## ✅ **CHECKLIST DE VERIFICACIÓN:**

Una vez completados todos los tests:

- [ ] **Test 1:** 2 participantes ✅
- [ ] **Test 2:** Controles (mute, camera, share) ✅
- [ ] **Test 3:** 3+ participantes ✅
- [ ] **Test 4:** Audio/Video quality ✅
- [ ] **Test 5:** Connection stats ✅

---

## 🎉 **SI TODO PASA:**

**¡LiveKit está configurado correctamente!** 🚀

### **Próximos pasos:**

1. ✅ Integrar con Mentor Sessions
2. ✅ Crear página de video para sesiones
3. ✅ Agregar botón "Start Call" en sesiones
4. ✅ Deploy a producción

---

## 📊 **MÉTRICAS DE CALIDAD ESPERADAS:**

| Métrica | Bueno | Excelente |
|---------|-------|-----------|
| **Bitrate** | >500 kbps | >1000 kbps |
| **Latency** | <300ms | <100ms |
| **Packet Loss** | <5% | <1% |
| **Video FPS** | >15 | >24 |
| **Resolution** | 480p | 720p+ |

---

## 🎥 **DEMO VIDEO (opcional):**

Graba un video corto (30 seg) mostrando:

1. Dos ventanas con video call
2. Controles funcionando
3. Screen share
4. Audio claro

Esto es útil para:

- Documentación
- Marketing
- Onboarding de usuarios
- Showcase para inversionistas

---

## 💡 **TIPS PRO:**

1. **Usa buena iluminación** - Video se ve mejor
2. **Ethernet > WiFi** - Menos latency
3. **Cierra otras tabs** - Mejor performance
4. **Chrome funciona mejor** que otros browsers
5. **Audífonos obligatorios** para evitar echo

---

**Tiempo estimado de testing:** 15-20 minutos  
**Dificultad:** ⭐⭐☆☆☆ (Fácil)

**¡Suerte con las pruebas!** 🎉
