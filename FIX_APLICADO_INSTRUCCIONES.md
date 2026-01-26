# ✅ FIX APLICADO - Instrucciones para Probar

**Fecha:** 26 de Enero, 2025  
**Fix:** CSP actualizado para permitir Vercel y Cloudinary  
**Acción requerida:** Testing

---

## 🎯 QUÉ SE ARREGLÓ

### **Problema Original:**
```
❌ Error al crear curso
❌ CSP bloqueando https://unytea.vercel.app
❌ API /api/upload fallando con 500
```

### **Solución Aplicada:**
```
✅ Agregado https://*.vercel.app a connect-src
✅ Agregado wss://*.vercel.app para WebSockets
✅ Agregado https://*.cloudinary.com para uploads
✅ Agregado https://api.cloudinary.com para API
```

---

## ⚡ CÓMO PROBAR EL FIX (3 minutos)

### **Paso 1: Reiniciar Dev Server** (30 seg)

**Si estás corriendo el servidor local:**

```powershell
# Presiona Ctrl+C para detener
# Luego ejecuta:
cd C:\Users\calfaro\AndroidStudioProjects\Mentorly\web
npm run dev
```

Espera a que inicie completamente:
```
✓ Ready in 2s
○ Local: http://localhost:3000
```

---

### **Paso 2: Clear Browser Cache** (30 seg)

**IMPORTANTE: El browser cachea políticas CSP**

**Chrome/Edge:**
1. Presiona `Ctrl + Shift + Delete`
2. Select "Cached images and files"
3. Time range: "Last hour"
4. Click "Clear data"

**O más fácil:**

1. Abre DevTools (F12)
2. Click derecho en Refresh button
3. Select "Empty Cache and Hard Reload"

---

### **Paso 3: Probar Crear Curso** (2 min)

**1. Ve a:**
```
http://localhost:3000/en/dashboard/courses/create
```

**2. Llena el formulario básico:**
- Course name: "Test Course"
- Description: "Testing CSP fix"
- Category: Cualquiera

**3. Intenta subir thumbnail image:**
- Click en upload
- Selecciona cualquier imagen
- **Debe subir sin errores ✅**

**4. Click "Create Course"**

**5. Verifica en Console (F12):**
- ✅ NO debe haber errores de CSP
- ✅ NO debe haber error 500
- ✅ Curso debe crearse exitosamente

---

## ✅ VERIFICACIÓN DE ÉXITO

### **Deberías Ver:**

**En la UI:**
✅ Curso creado sin errores  
✅ Redirect a dashboard de cursos  
✅ Nuevo curso visible en lista  
✅ Thumbnail se ve correctamente

**En Console (F12):**
✅ Sin errores de CSP relacionados a vercel.app  
✅ Sin errores 500 en /api/upload  
✅ Response 200 OK en requests

**Ejemplo de Console limpio:**
```
POST /api/upload 200 OK
GET /en/dashboard/courses 200 OK
```

---

## 🔴 SI AÚN HAY PROBLEMAS

### **Troubleshooting:**

**Problema 1: Sigue error de CSP**

**Solución:**
```powershell
# Clear completamente y rebuild:
cd web
rm -rf .next
npm run dev
```

**Problema 2: Error 500 en /api/upload persiste**

**Posibles causas:**

1. **Variables de Cloudinary faltantes:**

```powershell
# Verifica en .env:
CLOUDINARY_CLOUD_NAME=dzvp2bg3a
CLOUDINARY_API_KEY=685154689573848
CLOUDINARY_API_SECRET=[debe tener valor]
```

Si falta alguna:
- Ve a `web\.env`
- Agrega las variables
- Restart server

2. **Credenciales de Cloudinary inválidas:**

Ve a: https://console.cloudinary.com/
- Login con tu cuenta
- Settings > Security
- Verifica que API key y secret sean correctos
- Si cambiaron, actualiza en `.env`

**Problema 3: Imagen no sube**

**Verifica:**
- Tamaño < 5MB
- Formato: JPG, PNG, GIF, WebP
- No corrupted

---

## 📊 DOMINIOS PERMITIDOS (REFERENCIA)

### **connect-src (Completo):**

```
'self'
https://www.unytea.com
wss://www.unytea.com
https://*.vercel.app          ← NUEVO
wss://*.vercel.app            ← NUEVO
ws://localhost:*
wss://localhost:*
https://sea1.ingest.uploadthing.com
https://uploadthing.com
https://utfs.io
https://*.livekit.cloud
https://*.livekit.io
wss://*.livekit.cloud
https://vercel.live
https://*.vercel.live
https://*.cloudinary.com      ← NUEVO
https://api.cloudinary.com    ← NUEVO
```

### **img-src (Completo):**

```
'self'
data:
https:
blob:
https://*.cloudinary.com      ← Explícito ahora
```

---

## 🎯 NEXT STEPS

### **Después de Verificar que Funciona:**

**1. Crear curso real:**
- Sigue la documentación en `CURSO_UNYTEA_ESTRUCTURA.md`
- Usa los scripts en `CURSO_MODULO_1_SCRIPTS.md`

**2. Upload todos los materiales:**
- Videos de lecciones
- Recursos descargables
- Thumbnails

**3. Deploy a production:**
```bash
git add .
git commit -m "fix(csp): allow Vercel and Cloudinary domains"
git push
```

Vercel deployará automáticamente.

---

## 💡 LECCIONES APRENDIDAS

### **Para Evitar Esto en el Futuro:**

**1. Al integrar nuevo servicio externo:**
- Siempre revisar qué dominios necesita
- Agregarlos al CSP ANTES de usar
- Documentar en CSP_IMPLEMENTATION_GUIDE.md

**2. Al ver errores de CSP en Console:**
- NO ignorar (no funcionará)
- Identificar dominio bloqueado
- Agregarlo si es servicio legítimo
- NUNCA usar `unsafe-inline` o `*` como workaround

**3. Testing en múltiples environments:**
- Local (localhost)
- Preview (*.vercel.app)
- Production (www.unytea.com)

---

## 📞 SI NECESITAS AYUDA

### **Debugging CSP:**

**1. Ver qué está bloqueado:**
- Abre Console (F12)
- Busca errores que digan "violates the following Content Security Policy"
- El mensaje te dice qué dominio está bloqueado

**2. Decidir si agregarlo:**
- ¿Es un servicio que TÚ controlas? (unytea.vercel.app) → SÍ, agregar
- ¿Es un servicio third-party conocido? (cloudinary.com) → SÍ, agregar
- ¿Es un dominio random/desconocido? → NO agregar, investigar

**3. Agregarlo al CSP:**
- Edita `web/lib/csp.ts`
- Encuentra el directive correcto (connect-src, img-src, etc.)
- Agrega el dominio
- Restart server
- Test

---

## 🎉 RESUMEN

**Cambios Realizados:**
- ✅ `web/lib/csp.ts` - 4 líneas agregadas
- ✅ Dominios de Vercel permitidos
- ✅ Dominios de Cloudinary permitidos

**Testing Necesario:**
- [ ] Clear cache
- [ ] Restart server
- [ ] Crear curso de prueba
- [ ] Verificar upload funciona

**Tiempo estimado:** 3 minutos

**Impacto:** ALTO - Desbloquea course creation

**Security:** ✅ Maintained (fix es seguro)

---

## 🚀 LISTO PARA CONTINUAR

**Una vez verificado el fix, puedes:**

1. ✅ Crear cursos sin problemas
2. ✅ Subir contenido multimedia
3. ✅ Implementar los planes del curso
4. ✅ Comenzar con validación (Quick Start Guide)

**Los documentos del curso están en:**
- `CURSO_INDICE.md` - Start here
- `CURSO_QUICK_START_GUIDE.md` - Validación 7 días
- `CURSO_UNYTEA_ESTRUCTURA.md` - Blueprint completo
- `CURSO_PLAN_DE_EJECUCION.md` - Timeline 90 días
- `CURSO_MODULO_1_SCRIPTS.md` - Scripts listos

**¡Todo listo para crear tu Unytea Academy! 🎓🚀**

---

**Fix Status:** ✅ APLICADO  
**Testing Status:** ⏳ PENDIENTE (hazlo ahora)  
**Ready to Continue:** ✅ SÍ

**¡Adelante! 💪**
