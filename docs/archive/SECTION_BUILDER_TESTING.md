# 🧪 SECTION BUILDER - GUÍA DE TESTING

**Fecha:** 9 de Enero, 2025  
**Feature:** Section Builder completo con integración a landing pública

---

## ✅ **FLUJO COMPLETO A PROBAR:**

```
Editor → Guardar → Base de Datos → Landing Pública
```

---

## 📋 **CHECKLIST DE TESTING:**

### **PARTE 1: EDITOR (Settings)**

**URL:** `http://localhost:3000/dashboard/c/[tu-slug]/settings/landing`

- [ ] 
    1. La página carga sin errores
- [ ] 
    2. Se muestra el **Section Builder** con 3 paneles
- [ ] 
    3. Panel IZQUIERDO muestra 8+ secciones disponibles:

    - Hero 🦸
    - Features ⭐
    - Call to Action 📣
    - Testimonials 💬
    - FAQ ❓
    - Stats 📊
    - Owner Bio 👤
    - Gallery 🖼️
- [ ] 
    4. Panel CENTRAL muestra el preview
- [ ] 
    5. Panel DERECHO muestra las propiedades
- [ ] 
    6. Botón **"Save"** visible arriba a la izquierda

---

### **PARTE 2: AGREGAR SECCIONES**

- [ ] 
    7. **Click en "Hero"** → Aparece en el preview
- [ ] 
    8. **Click en "Features"** → Se agrega debajo del Hero
- [ ] 
    9. **Click en "CTA"** → Se agrega al final
- [ ] 
    10. Las **3 secciones** aparecen en el "Layers" panel (izquierda abajo)

---

### **PARTE 3: EDITAR CONTENIDO**

**Editar Hero:**

- [ ] 
    11. Click en la sección Hero en el preview → Se selecciona (ring morado)
- [ ] 
    12. Panel derecho muestra propiedades del Hero
- [ ] 
    13. **Cambiar Title** a "Bienvenido a mi comunidad"
- [ ] 
    14. **Cambiar Subtitle** a "Aprende, conecta y crece"
- [ ] 
    15. El preview **se actualiza en tiempo real** ✨

**Subir imagen:**

- [ ] 
    16. En "Hero Image (URL)", click en **"Upload from PC"**
- [ ] 
    17. Seleccionar una imagen de tu PC
- [ ] 
    18. Esperar 2-3 segundos → Imagen aparece en el preview
- [ ] 
    19. URL empieza con `https://utfs.io/f/...`

**Editar Features:**

- [ ] 
    20. Click en la sección Features
- [ ] 
    21. Cambiar el título a "Lo que incluye"
- [ ] 
    22. Editar los items en el campo CSV
- [ ] 
    23. Preview se actualiza

---

### **PARTE 4: REORDENAR SECCIONES**

- [ ] 
    24. En el "Layers" panel, click en botón **↑** del CTA
- [ ] 
    25. CTA sube una posición en el preview
- [ ] 
    26. Click en **↓** del Hero → Hero baja
- [ ] 
    27. El orden en el preview cambia correctamente

---

### **PARTE 5: ELIMINAR SECCIÓN**

- [ ] 
    28. En el "Layers" panel, click en **✕** de Features
- [ ] 
    29. Features desaparece del preview
- [ ] 
    30. Solo quedan Hero y CTA

---

### **PARTE 6: GUARDAR**

- [ ] 
    31. Click en botón **"Save"** (morado, arriba izquierda)
- [ ] 
    32. Aparece toast/mensaje: **"Landing page saved successfully!"** ✅
- [ ] 
    33. NO hay errores en la consola del navegador (F12)
- [ ] 
    34. NO hay errores en la consola del servidor

**Verificar en consola del servidor:**

Deberías ver algo como:

```
PATCH /api/communities/[slug]/landing 200 in XXXms
```

---

### **PARTE 7: RECARGA Y PERSISTENCIA**

- [ ] 
    35. **Recarga la página** (F5)
- [ ] 
    36. Las secciones **siguen ahí** (Hero y CTA)
- [ ] 
    37. Los textos editados **están guardados**
- [ ] 
    38. La imagen **sigue cargada**

---

### **PARTE 8: LANDING PÚBLICA** 🎉

**URL:** `http://localhost:3000/c/[tu-slug]`

- [ ] 
    39. La landing pública carga sin errores
- [ ] 
    40. Muestra un **top bar** con:

    - Botón "Back to Dashboard"
    - Nombre de la comunidad
    - Botón "Edit Landing Page" (si eres owner)
- [ ] 
    41. **Se ven las secciones** que guardaste (Hero y CTA)
- [ ] 
    42. **Hero muestra:**

    - Tu título: "Bienvenido a mi comunidad"
    - Tu subtítulo: "Aprende, conecta y crece"
    - La imagen que subiste
    - El botón "Join Now"
- [ ] 
    43. **CTA se ve correctamente** con su contenido
- [ ] 
    44. NO hay errores en la consola (F12)
- [ ] 
    45. **Footer** muestra "© 2025 [nombre]. Powered by Unytea"

---

### **PARTE 9: RESPONSIVE** 📱

**En la landing pública:**

- [ ] 
    46. Abre DevTools (F12) y activa **Device Toolbar** (Ctrl+Shift+M)
- [ ] 
    47. Cambia a **iPhone 12 Pro** (375x812)
- [ ] 
    48. Las secciones **se ven bien en móvil**
- [ ] 
    49. Hero tiene 1 columna (imagen abajo del texto)
- [ ] 
    50. Botones son **tocables** y del tamaño correcto
- [ ] 
    51. Textos son **legibles** (no muy pequeños)
- [ ] 
    52. No hay **overflow horizontal** (scroll horizontal)

---

### **PARTE 10: EMPTY STATE** 🔄

**Probar cuando NO hay secciones:**

- [ ] 
    53. Vuelve al editor
- [ ] 
    54. Elimina **todas las secciones** (click en ✕ de cada una)
- [ ] 
    55. Click en **"Save"**
- [ ] 
    56. Ve a la landing pública: `/c/[tu-slug]`
- [ ] 
    57. Aparece **empty state** con:

    - Ícono morado
    - "No Landing Page Yet"
    - Mensaje apropiado
    - Botón "Build Landing Page" (si eres owner)

---

### **PARTE 11: PREVIEW BUTTON** 👁️

**En el editor:**

- [ ] 
    58. Agrega algunas secciones (Hero, Features, CTA)
- [ ] 
    59. Click en botón **"Preview"** (arriba a la derecha)
- [ ] 
    60. Se abre una **nueva pestaña** con `/c/[tu-slug]`
- [ ] 
    61. Las secciones **NO están guardadas aún** (empty state)
- [ ] 
    62. Vuelve al editor, click en **"Save"**
- [ ] 
    63. Recarga la pestaña del preview (F5)
- [ ] 
    64. Ahora SÍ aparecen las secciones guardadas ✅

---

### **PARTE 12: TODAS LAS SECCIONES** 🎨

**Agregar y probar cada sección:**

- [ ] 
    65. **Hero** - Título, subtítulo, imagen, botón
- [ ] 
    66. **Features** - Grid de 3 columnas con features
- [ ] 
    67. **CTA** - Call to action con gradiente morado
- [ ] 
    68. **Testimonials** - 3 testimonios con avatares
- [ ] 
    69. **FAQ** - Accordion expandible (click en pregunta)
- [ ] 
    70. **Stats** - 4 estadísticas grandes (miembros, cursos, etc.)
- [ ] 
    71. **Owner Bio** - Avatar + bio + título del owner
- [ ] 
    72. **Gallery** - Grid 2x2 de imágenes

---

## 🐛 **ERRORES COMUNES Y SOLUCIONES:**

### **❌ "Landing page saved successfully!" pero no se ve en la landing pública**

**Causa:** Caché del navegador o servidor

**Solución:**

1. Presiona `Ctrl + Shift + R` en la landing pública (hard refresh)
2. O abre en modo incógnito: `Ctrl + Shift + N`

---

### **❌ Imagen no se sube (error 500)**

**Causa:** UploadThing keys no configuradas o CSP bloqueando

**Solución:**

1. Verifica que `.env.local` tenga:
   ```
   UPLOADTHING_SECRET=sk_live_...
   UPLOADTHING_APP_ID=...
   ```
2. Verifica que `next.config.mjs` tenga en CSP:
   ```
   "connect-src 'self' wss: ws: https://sea1.ingest.uploadthing.com https://uploadthing.com https://utfs.io"
   ```
3. Reinicia el servidor

---

### **❌ "Cannot read properties of undefined (reading 'bind')"**

**Causa:** Caché corrupto de Next.js

**Solución:**

```bash
cd web
taskkill /F /IM node.exe
Remove-Item -Recurse -Force .next
npm run dev
```

---

### **❌ Secciones no cargan (empty state siempre)**

**Causa:** `landingLayout` no se está devolviendo en el API

**Solución:** Ya está arreglado en este commit ✅

---

## ✅ **RESULTADO ESPERADO:**

Al completar este testing, deberías tener:

1. ✅ Editor funcional con 8+ secciones
2. ✅ Edición en tiempo real
3. ✅ Upload de imágenes desde PC
4. ✅ Guardar en base de datos
5. ✅ Landing pública renderizando correctamente
6. ✅ Responsive en móvil
7. ✅ Empty state cuando no hay contenido
8. ✅ Persistencia (recarga y sigue ahí)

---

## 🎉 **SI TODO PASA:**

**¡El Section Builder está 100% funcional y listo para producción!** 🚀

Puedes continuar con:

- Video Calls (LiveKit)
- Real-time Chat (WebSockets)
- AI Assistant (OpenAI)
- O cualquier otra feature

---

**Tiempo estimado de testing:** 15-20 minutos  
**Checklist items:** 72  
**¡Buena suerte!** 🎨
