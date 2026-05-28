# 🧪 TESTING INSTRUCTIONS - LIVE CHAT

## 🚀 **QUICK START:**

### **1. Reiniciar Dev Server**

```bash
# En tu terminal (si no está corriendo):
cd C:\Users\calfaro\AndroidStudioProjects\Mentorly\web
npm run dev
```

### **2. Abrir Browser**

```
http://localhost:3001
```

### **3. Iniciar Sesión**

- Si no tienes cuenta: Sign Up
- Si ya tienes: Sign In

---

## 📝 **CREAR UNA COMMUNITY:**

### **Opción A - Desde UI:**

1. Ve a: http://localhost:3001/dashboard
2. Click en **"Communities"** en el sidebar
3. Click en **"New Community"** (botón púrpura)
4. Llena el form:
   ```
   Name: Test Community
   Description: For testing chat
   ```
5. Click **"Create Community"**

### **Opción B - SQL Directo:**

Si tienes problemas, puedes crear una directamente en la DB:

```sql
-- En pgAdmin o psql:
INSERT INTO communities (
  id,
  name,
  slug,
  description,
  "ownerId",
  "createdAt",
  "updatedAt"
) VALUES (
  'cm123test456',
  'Test Community',
  'test-community',
  'Testing live chat',
  'TU_USER_ID_AQUI',  -- Cambia esto por tu user ID
  NOW(),
  NOW()
);

-- Agregar membership:
INSERT INTO members (
  id,
  "userId",
  "communityId",
  role,
  status,
  "joinedAt",
  "updatedAt"
) VALUES (
  'mem123test456',
  'TU_USER_ID_AQUI',  -- Cambia esto
  'cm123test456',
  'OWNER',
  'ACTIVE',
  NOW(),
  NOW()
);
```

---

## 💬 **ACCEDER AL CHAT:**

### **URL Directa:**

```
http://localhost:3001/c/test-community
```

### **Desde Dashboard:**

```
Dashboard → Communities → Click en "Test Community"
```

### **En la Community:**

1. Verás tabs: **Feed | 💬 Chat | Members | About**
2. Click en **💬 Chat**
3. ¡Listo!

---

## ✅ **TESTING CHECKLIST:**

### **Chat Básico:**

- [ ] Ver lista de canales (💬 General, 📢 Announcements, etc)
- [ ] Escribir mensaje en General
- [ ] Ver mensaje aparecer
- [ ] Cambiar a otro canal
- [ ] Escribir mensaje en otro canal

### **Features Avanzados:**

- [ ] Ver typing indicator cuando escribes
- [ ] Ver nivel badge en tu avatar
- [ ] Hover sobre mensaje → ver botón delete
- [ ] Delete tu mensaje
- [ ] Ver count "X online" (abajo en sidebar)

### **Multi-Usuario (necesitas 2 browsers):**

- [ ] Abre en Chrome y en Incognito/Edge
- [ ] Inicia sesión con 2 cuentas diferentes
- [ ] Ambos en el mismo canal
- [ ] Escribe en uno → debería aparecer en el otro (2s delay)
- [ ] Ver typing indicator del otro usuario

---

## 🐛 **SI HAY ERRORES:**

### **Error: "Community not found"**

```
→ Verifica que la community exista
→ Verifica el slug en la URL
→ Refresh (F5)
```

### **Error: "Loading chat..."**

```
→ Verifica que la DB esté corriendo
→ Check prisma schema está actualizado
→ npm run dev reiniciado
```

### **Mensajes no aparecen:**

```
→ Espera 2 segundos (polling interval)
→ Check console del browser (F12)
→ Verifica que channelId sea correcto
```

---

## 📊 **OBTENER TU USER ID:**

### **Desde Browser Console (F12):**

```javascript
// En cualquier página logueada:
fetch("/api/auth/session")
  .then((r) => r.json())
  .then((d) => console.log("User ID:", d.user?.id));
```

### **Desde pgAdmin:**

```sql
SELECT id, name, email FROM users;
```

---

## 🎯 **SUCCESS CRITERIA:**

✅ Puedes ver los canales  
✅ Puedes enviar mensajes  
✅ Los mensajes aparecen en tiempo real  
✅ Typing indicator funciona  
✅ Level badges se muestran  
✅ Puedes borrar tus mensajes

---

## 📸 **LO QUE DEBERÍAS VER:**

```
┌──────────────┬────────────────────────────────┐
│  Channels    │  💬 General                    │
│              │  ────────────────────────────  │
│ 💬 General   │  👤 Carlos (Lv1) 🥉           │
│ 📢 Announce  │  Hello! This is working!       │
│ ❓ Questions │                                │
│ 🎲 Random    │  ⌨️ Carlos is typing...        │
│              │                                │
│              │  [Message #General]    [Send]  │
│ 👥 1 online  │                                │
└──────────────┴────────────────────────────────┘
```

---

**¡Listo para probar!** 🚀💬
