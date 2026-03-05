# 🎭 TESTING AUDITORIUM VIEW - QUICK GUIDE

**Status:** ✅ FIXED - Presence tracking ahora funciona correctamente

---

## 🔧 **LO QUE SE ARREGLÓ:**

```
✅ updateChannelPresence() se llama al entrar al chat
✅ Marca usuario como "online" en ChannelMember
✅ Cleanup marca como "offline" al salir
✅ AuditoriumSpace muestra miembros online
✅ Polling cada 3 segundos para updates
```

---

## 🚀 **CÓMO PROBAR (2 USUARIOS):**

### **Paso 1: Primera cuenta (tu cuenta actual)**

1. Ve a: `http://localhost:3001/dashboard/c/community-testing/chat`
2. Deberías ver el chat normal
3. **NO clicks en "Auditorium" todavía**

---

### **Paso 2: Segunda cuenta (ventana incógnito)**

1. **Abre ventana incógnito** (Ctrl+Shift+N en Chrome)
2. Ve a: `http://localhost:3001`
3. **Crea nueva cuenta** o inicia sesión con "John Doe"
4. Ve a Communities → "Community Testing" → Join
5. Ve a Chat: `http://localhost:3001/dashboard/c/community-testing/chat`
6. **Envía un mensaje** (opcional, para confirmar que estás conectado)

---

### **Paso 3: Ver el Auditorium**

1. **Vuelve a tu ventana original** (cuenta Carlos)
2. **Click en botón "Auditorium"** (arriba derecha)
3. **Espera 3-5 segundos** (auto-refresh)
4. ¡Deberías ver **2 avatars** en el auditorium! 🎉

```
┌─────────────────────────────────────┐
│  🎤 Live Session                    │
│                                     │
│   👤 CA      👤 JD                 │
│  Carlos     John                    │
│  Lv1 👑     Lv1                    │
│                                     │
│  👥 2 people online                 │
└─────────────────────────────────────┘
```

---

## 🎨 **LO QUE DEBERÍAS VER:**

### **Avatars:**

- ✅ Circular con iniciales
- ✅ Gradiente único por usuario
- ✅ Level badge (Lv1, Lv2, etc.)
- ✅ Online indicator (punto verde)
- ✅ Role badge si aplica (👑 Owner)

### **Interacciones:**

- 🖱️ **Hover** → Tooltip aparece con nombre
- 👆 **Click** → Mini profile (nombre + nivel)
- ✨ **Animación** → Fade in suave

### **Updates:**

- 🔄 Auto-refresh cada 3 segundos
- ➕ Nuevos usuarios aparecen (fade in)
- ➖ Usuarios que salen desaparecen (fade out)

---

## 🧪 **PRUEBAS ADICIONALES:**

### **Test 1: Salir y entrar**

1. En la cuenta de John, **cierra el tab**
2. En cuenta Carlos, **espera 3-5 segundos**
3. Avatar de John debería **desaparecer**
4. Online count: "1 person online"

### **Test 2: Cambiar de canal**

1. En la cuenta de John, **click en "Chat"**
2. Cambia al canal **"Announcements"**
3. En cuenta Carlos, **refresh** o espera auto-refresh
4. John debería **desaparecer** del Auditorium de "General"

### **Test 3: Múltiples usuarios**

1. Abre **3-4 ventanas incógnito**
2. Crea cuentas diferentes
3. Únelas a la community
4. Todas en el chat
5. ¡Verás **5-6 avatars** en el auditorium! 🎉

---

## 🎯 **LAYOUT DEL AUDITORIUM:**

```
Capacity: 64 seats (8 rows × 8 columns)

Layout visual:
   👤  👤  👤  👤  👤  👤  👤  👤   Row 1
   👤  👤  👤  👤  👤  👤  👤  👤   Row 2
   👤  👤  👤  👤  👤  👤  👤  👤   Row 3
   ...
```

**Auto-centering:** Cada fila se centra automáticamente

---

## 📊 **PRESENCE TRACKING:**

### **Cómo funciona:**

```typescript
// Al entrar al chat:
updateChannelPresence(channelId, true)
→ ChannelMember.isOnline = true
→ ChannelMember.lastSeenAt = now()

// Al salir del chat:
updateChannelPresence(channelId, false)
→ ChannelMember.isOnline = false

// Auditorium polling:
getChannelOnlineMembers(channelId)
→ WHERE isOnline = true
→ Returns array of members
→ Renders avatars
```

---

## 🐛 **TROUBLESHOOTING:**

### **"0 people online" aunque hay gente:**

1. **Refresh la página (F5)**
2. **Espera 3-5 segundos** (auto-refresh)
3. Verifica que estés en el **mismo canal**
4. Verifica que el dev server esté corriendo

### **Avatars no aparecen:**

1. **Abre DevTools** (F12)
2. Ve a la tab **Console**
3. Busca errores en rojo
4. Si ves errores, compártelos

### **"No one here yet":**

1. Confirma que **otro usuario** esté en el chat
2. Verifica que esté en el **mismo canal** (General)
3. Espera el auto-refresh (3s)
4. Click en "Chat" y luego "Auditorium" de nuevo

---

## ✅ **CHECKLIST COMPLETO:**

- [ ] Crear 2 cuentas diferentes
- [ ] Ambas en "Community Testing"
- [ ] Ambas en `/dashboard/c/community-testing/chat`
- [ ] Click "Auditorium" en cuenta 1
- [ ] Esperar 3-5 segundos
- [ ] Ver 2 avatars aparecer 🎉
- [ ] Hover sobre avatar → Tooltip
- [ ] Click en avatar → Mini profile
- [ ] Test salir/entrar
- [ ] Test cambiar de canal

---

## 🎉 **SUCCESS CRITERIA:**

```
✅ Auditorium muestra avatars de usuarios online
✅ Auto-refresh funciona cada 3s
✅ Animaciones smooth (fade in/out)
✅ Hover tooltips funcionan
✅ Click interactions funcionan
✅ Online count correcto
✅ Level badges mostrados
✅ Role badges mostrados (si aplica)
```

---

## 🚀 **SIGUIENTE NIVEL:**

Una vez que esto funcione, podemos agregar:

- 💬 Speech bubbles cuando alguien escribe
- ⌨️ Typing indicators visualizados
- 🎤 Stage presenter mode
- 🏝️ Multiple space types (Lounge, Office, etc.)
- 🗺️ World map view
- 🎨 Custom themes
- ✨ Particle effects

---

**¡A PROBAR!** 🎭🔥
