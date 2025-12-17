# 🔖 Actualizar Favicon - Instrucciones

## ❌ Problema Actual

El `favicon.ico` en `web/public/` es el **favicon por defecto de Next.js** (círculo negro con
triángulo blanco).

Necesitas reemplazarlo con el **logo de Unytea** (la taza purple/orange).

---

## ✅ SOLUCIÓN: Generar Nuevo Favicon

### **Paso 1: Ve al Generador de Favicons**

Abre este sitio en tu navegador:

```
https://favicon.io/favicon-converter/
```

O usa este otro (también funciona):

```
https://www.icoconverter.com/
```

---

### **Paso 2: Sube tu Logo**

En la página, sube este archivo:

```
C:\Users\calfaro\AndroidStudioProjects\Mentorly\web\public\branding\logo\unytea-icon.png
```

**Nota:** Es el icon **solo de la taza**, no el logo completo con texto.

---

### **Paso 3: Configura las Opciones**

Si el sitio te da opciones:

- ✅ Generar múltiples tamaños (16x16, 32x32, etc.)
- ✅ Mantener transparencia (si está disponible)
- ✅ Formato ICO

---

### **Paso 4: Descarga el ZIP**

Click en **"Download"** o **"Generate"**.

Te dará un archivo ZIP con varios archivos dentro.

---

### **Paso 5: Descomprime el ZIP**

El ZIP debe contener estos archivos:

```
favicon.ico
favicon-16x16.png
favicon-32x32.png
apple-touch-icon.png
android-chrome-192x192.png
android-chrome-512x512.png
site.webmanifest (opcional, ya lo tienes)
```

---

### **Paso 6: REEMPLAZA los Archivos en `web/public/`**

**IMPORTANTE:** Necesitas **SOBRESCRIBIR** (reemplazar) los archivos viejos.

Copia estos archivos desde el ZIP descargado a:

```
C:\Users\calfaro\AndroidStudioProjects\Mentorly\web\public\
```

**Archivos a reemplazar:**

```
✅ favicon.ico                 (CRÍTICO - este es el principal)
✅ favicon-16x16.png
✅ favicon-32x32.png
✅ apple-touch-icon.png
✅ android-chrome-192x192.png
✅ android-chrome-512x512.png
```

---

### **Paso 7: Reinicia el Servidor**

```bash
# Detén el servidor (Ctrl + C)
cd web
npm run dev
```

---

### **Paso 8: Limpia el Caché del Navegador**

Los favicons se cachean **muy agresivamente**. Haz esto:

**Opción 1: Hard Refresh**

```
Ctrl + Shift + R
```

**Opción 2: Modo Incógnito**

```
Ctrl + Shift + N
Luego abre: http://localhost:3000
```

**Opción 3: Limpia Caché Completo**

```
Ctrl + Shift + Delete
Marca "Cached images and files"
Clear data
Cierra y abre el navegador de nuevo
```

---

### **Paso 9: Verifica que Funciona**

Abre esta URL directamente:

```
http://localhost:3000/favicon.ico
```

**Deberías ver:** La taza de Unytea (purple/orange) ✅
**NO deberías ver:** Círculo negro con triángulo blanco ❌

---

## 🎯 RESUMEN RÁPIDO:

```
1. Abre https://favicon.io/favicon-converter/
2. Sube web/public/branding/logo/unytea-icon.png
3. Download el ZIP
4. Copia TODOS los archivos del ZIP a web/public/ (SOBRESCRIBE)
5. Reinicia servidor (npm run dev)
6. Hard refresh navegador (Ctrl + Shift + R)
7. Verifica: http://localhost:3000/favicon.ico
```

---

## ✅ CUANDO FUNCIONE:

Verás el **logo de Unytea** en:

- ✅ Tab del navegador (favicon)
- ✅ Bookmarks/Favoritos
- ✅ Historial del navegador
- ✅ App cuando se instala como PWA
- ✅ Home screen en mobile (Apple touch icon)

---

## 📝 NOTA IMPORTANTE:

El archivo `favicon.ico` actual es el **default de Next.js**. DEBE ser reemplazado para que se vea
tu logo de Unytea en todas partes.

**Los otros archivos PNG también deben ser actualizados** para que funcione en diferentes
dispositivos y tamaños.

---

**¡HAZLO AHORA! Toma solo 5 minutos.** 🚀✨