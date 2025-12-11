# 🎬 Cómo Agregar tu Video Promocional

## 📍 Ubicación

El video promocional está en: `web/app/page.tsx`

Busca la sección que dice: `{/* Promotional Video Section */}`

---

## 🎥 Opción 1: YouTube

```tsx
<div className="relative rounded-2xl overflow-hidden bg-[#1a1a2e] aspect-video">
  <iframe
    className="absolute inset-0 w-full h-full"
    src="https://www.youtube.com/embed/TU_VIDEO_ID"
    title="Unytea Promotional Video"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowFullScreen
  />
</div>
```

**Cómo obtener el VIDEO_ID:**

- URL de YouTube: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- VIDEO_ID: `dQw4w9WgXcQ`

---

## 🎥 Opción 2: Vimeo

```tsx
<div className="relative rounded-2xl overflow-hidden bg-[#1a1a2e] aspect-video">
  <iframe
    className="absolute inset-0 w-full h-full"
    src="https://player.vimeo.com/video/TU_VIDEO_ID"
    title="Unytea Promotional Video"
    allow="autoplay; fullscreen; picture-in-picture"
    allowFullScreen
  />
</div>
```

**Cómo obtener el VIDEO_ID:**

- URL de Vimeo: `https://vimeo.com/123456789`
- VIDEO_ID: `123456789`

---

## 🎥 Opción 3: Video Directo (MP4/WebM)

```tsx
<div className="relative rounded-2xl overflow-hidden bg-[#1a1a2e] aspect-video">
  <video
    className="absolute inset-0 w-full h-full object-cover"
    controls
    poster="/path/to/thumbnail.jpg"
  >
    <source src="/path/to/video.mp4" type="video/mp4" />
    <source src="/path/to/video.webm" type="video/webm" />
    Tu navegador no soporta el tag de video.
  </video>
</div>
```

---

## ⚙️ Opciones Avanzadas

### **Autoplay (YouTube)**

```
src="https://www.youtube.com/embed/VIDEO_ID?autoplay=1&mute=1"
```

### **Loop (YouTube)**

```
src="https://www.youtube.com/embed/VIDEO_ID?loop=1&playlist=VIDEO_ID"
```

### **Sin Controles (YouTube)**

```
src="https://www.youtube.com/embed/VIDEO_ID?controls=0"
```

### **Empezar en Segundo Específico**

```
src="https://www.youtube.com/embed/VIDEO_ID?start=30"
```

---

## 📋 Paso a Paso

1. **Sube tu video** a YouTube o Vimeo
2. **Copia el ID** del video
3. **Abre** `web/app/page.tsx`
4. **Busca** la línea que dice: `{/* Placeholder until video is ready */}`
5. **Reemplaza** todo el div del placeholder con el iframe
6. **Guarda** el archivo
7. **Refresca** la página

---

## 🎨 Ejemplo Completo

```tsx
{/* Promotional Video Section */}
<div className="max-w-5xl mx-auto mt-20">
  <div className="relative">
    <div className="absolute inset-0 bg-gradient-neon blur-3xl opacity-30 -z-10" />
    <div className="glass-vibrant rounded-3xl p-3 shadow-2xl border border-white/20">
      {/* Video Container */}
      <div className="relative rounded-2xl overflow-hidden bg-[#1a1a2e] aspect-video">
        <iframe
          className="absolute inset-0 w-full h-full"
          src="https://www.youtube.com/embed/dQw4w9WgXcQ"
          title="Unytea Promotional Video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  </div>
</div>
```

---

## 💡 Tips

- ✅ Usa videos cortos (2-3 minutos max)
- ✅ Agrega subtítulos para mejor accesibilidad
- ✅ Optimiza la thumbnail para captar atención
- ✅ Considera agregar autoplay muted para engagement
- ✅ Prueba en mobile para asegurar que se vea bien

---

**¿Necesitas ayuda?** Contáctame y te ayudo a integrarlo.
