# 🖼️ Cloudinary Setup Guide

Esta guía te ayudará a configurar Cloudinary para subir imágenes en tu aplicación.

## 📋 Requisitos

- Una cuenta de Cloudinary (gratis para empezar)
- Acceso al archivo `.env` de tu proyecto

---

## 🚀 Paso a Paso

### 1. Crear Cuenta en Cloudinary

1. Ve a [https://cloudinary.com](https://cloudinary.com)
2. Click en **"Sign Up for Free"**
3. Completa el registro con tu email
4. Verifica tu email

### 2. Obtener Credenciales

Una vez que inicies sesión, verás el **Dashboard**:

1. En la sección **"Account Details"**, encontrarás:
    - **Cloud Name** (nombre de tu cuenta)
    - **API Key** (clave pública)
    - **API Secret** (clave secreta - haz click en el ojo para verla)

### 3. Configurar Variables de Entorno

Agrega las siguientes variables a tu archivo `.env`:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

**⚠️ IMPORTANTE:**

- Nunca compartas tu `API_SECRET` públicamente
- No la subas a Git (el archivo `.env` ya está en `.gitignore`)

### 4. Reiniciar el Servidor

Después de agregar las variables:

```bash
# Detén el servidor (Ctrl + C)
# Reinicia:
npm run dev
```

---

## ✅ Verificar Configuración

1. Ve a tu aplicación
2. Navega a **Communities → [Tu Comunidad] → Courses**
3. Click en **"Create Course"**
4. Intenta subir una imagen
5. Si todo está bien, verás:
    - Preview de la imagen
    - La imagen se sube a Cloudinary
    - Recibes una URL de Cloudinary (`res.cloudinary.com/...`)

---

## 📊 Plan Gratuito de Cloudinary

El plan gratuito incluye:

- ✅ **25 GB** de almacenamiento
- ✅ **25 GB** de ancho de banda/mes
- ✅ **25,000** transformaciones/mes
- ✅ Optimización automática de imágenes
- ✅ Conversión a WebP automática
- ✅ CDN global incluido

**Es suficiente para empezar y crecer tu aplicación** 🚀

---

## 🔧 Configuración Actual

La ruta `/api/upload` está configurada con:

### Transformaciones Automáticas:

- ✅ **Límite de tamaño:** 1280x720 (mantiene aspect ratio)
- ✅ **Calidad:** Auto (Cloudinary optimiza)
- ✅ **Formato:** Auto (WebP cuando es posible)

### Carpetas:

- 📁 `courses/` - Imágenes de cursos

### Validaciones:

- ✅ Solo imágenes (PNG, JPG, GIF, WebP)
- ✅ Máximo 5MB por archivo
- ✅ Autenticación requerida

---

## 🎨 Features de Cloudinary

### 1. Optimización Automática

Las imágenes se optimizan automáticamente para:

- Menor peso
- Mejor calidad
- Carga más rápida

### 2. Responsive Images

Cloudinary genera automáticamente versiones en diferentes tamaños.

### 3. CDN Global

Tus imágenes se sirven desde el CDN más cercano al usuario.

### 4. Lazy Loading

Soporte nativo para carga diferida de imágenes.

---

## 🔒 Seguridad

### Variables de Entorno

Las credenciales están en `.env` (no se suben a Git):

```
✅ .env (ignorado)
❌ .env.example (sin datos reales)
```

### Upload Signed

Todas las subidas están autenticadas con tu API Secret.

---

## 📝 Siguiente Paso

Una vez configurado Cloudinary:

1. ✅ Crea tu primer curso con imagen
2. ✅ Verifica que la URL sea de Cloudinary
3. ✅ Comprueba en el dashboard de Cloudinary que se subió
4. ✅ Disfruta de imágenes optimizadas automáticamente

---

## 🆘 Solución de Problemas

### Error: "Unauthorized"

- ✅ Verifica que las variables de entorno estén correctas
- ✅ Reinicia el servidor después de agregar las variables

### Error: "Invalid API Key"

- ✅ Copia las credenciales exactamente del dashboard
- ✅ No debe haber espacios extras

### Error: "Upload failed"

- ✅ Verifica tu plan de Cloudinary (límites)
- ✅ Revisa los logs del servidor

### Las imágenes no se ven

- ✅ Verifica la URL en el navegador
- ✅ Comprueba que la imagen se subió en el dashboard de Cloudinary

---

## 📚 Recursos

- [Documentación de Cloudinary](https://cloudinary.com/documentation)
- [Dashboard de Cloudinary](https://cloudinary.com/console)
- [Límites del Plan Gratuito](https://cloudinary.com/pricing)
- [Transformaciones de Imágenes](https://cloudinary.com/documentation/image_transformations)

---

**¡Listo para producción!** 🎉
