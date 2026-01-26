# 📚 GUÍA RÁPIDA - Gestión de Contenido de Cursos

**Fecha:** 26 de Enero, 2025  
**Estado:** ✅ Sistema Completo Implementado

---

## 🎯 Cómo Alimentar Tu Curso (Paso a Paso)

### **Paso 1: Acceder al Editor del Curso** (30 seg)

**Desde la lista de cursos:**

1. Ve a: `https://www.unytea.com/[tu-idioma]/dashboard/communities/[tu-comunidad]/courses`
2. Verás tu curso con badge **"📝 Draft"** (naranja)
3. Click en el curso
4. Click en botón **"Edit Course"** (arriba derecha)
5. ✅ Llegas a la interfaz de edición

**URL Directa:**
```
https://www.unytea.com/en/dashboard/courses/[course-id]/edit
```

---

## 🏗️ Estructura del Contenido

```
CURSO
  ├── Módulo 1
  │   ├── Lección 1.1 (VIDEO)
  │   ├── Lección 1.2 (TEXT)
  │   └── Lección 1.3 (QUIZ)
  ├── Módulo 2
  │   ├── Lección 2.1 (VIDEO)
  │   └── Lección 2.2 (ASSIGNMENT)
  └── Módulo 3
      └── ...
```

---

## 📖 Paso 2: Crear Módulos (1-2 min por módulo)

**En la pestaña "Course Content":**

### **Agregar Nuevo Módulo:**

1. **Llena el formulario en el card superior:**
   - **Module Title:** "Módulo 1: Fundamentos de Comunidades"
   - **Description:** "Aprende los conceptos básicos..." (opcional)

2. **Click "Create Module"**

3. ✅ El módulo se crea y aparece en la lista abajo

### **Ejemplo de Módulos:**

```
✅ Módulo 1: Fundamentos de Comunidades
   Descripción: Conceptos básicos que todo creator debe conocer

✅ Módulo 2: Setup de Tu Primera Comunidad
   Descripción: Paso a paso para configurar unytea

✅ Módulo 3: Engagement y Retención
   Descripción: Estrategias para mantener activa tu comunidad
```

---

## 📝 Paso 3: Agregar Lecciones (2-5 min por lección)

**Dentro de cada módulo:**

1. **Click en el módulo** para expandirlo (flecha derecha)

2. **Click "Add Lesson"**

3. **Llena el formulario:**

### **A. Información Básica:**
- **Lesson Title:** "1.1 - ¿Qué es una Comunidad Online?"
- **Content Type:** Selecciona el tipo (ver abajo)

### **B. Contenido según el Tipo:**

#### **📄 TEXT (Texto/Artículo)**

**Cuándo usar:**
- Lecciones escritas
- Guías paso a paso
- Documentación
- Recursos complementarios

**Campos:**
- **Lesson Content:** Escribe el contenido completo
  - Soporta **Markdown**:
    ```
    # Título
    ## Subtítulo
    **Negrita**
    *Cursiva*
    - Lista
    [Link](https://...)
    ```
- **Free Preview:** ✅ Si quieres que sea gratis (opcional)

**Ejemplo:**
```markdown
# ¿Qué es una Comunidad Online?

Una comunidad online es un **espacio digital** donde personas con intereses comunes se reúnen para:

- Compartir conocimientos
- Apoyarse mutuamente
- Crear conexiones significativas

## Por qué crear una comunidad...
```

---

#### **🎥 VIDEO**

**Cuándo usar:**
- Tutoriales en video
- Webinars grabados
- Demostraciones prácticas
- Bienvenidas personalizadas

**Campos:**
- **Video URL:** URL del video
  - ✅ YouTube: `https://youtube.com/watch?v=abc123`
  - ✅ Vimeo: `https://vimeo.com/123456789`
  - ✅ Video directo: `https://tu-cdn.com/video.mp4`
  
- **Duration (minutes):** Duración aproximada (ej: 15)
- **Free Preview:** ✅ Para permitir acceso sin inscripción

**Ejemplo:**
```
Title: 1.1 - Introducción a Unytea (Video Tour)
Video URL: https://youtube.com/watch?v=dQw4w9WgXcQ
Duration: 8 minutes
Free Preview: ✅ YES
```

---

#### **🎧 AUDIO**

**Cuándo usar:**
- Podcasts
- Meditaciones guiadas
- Audio lecciones
- Entrevistas

**Campos:**
- **Audio URL:** URL del archivo de audio
  - SoundCloud, Spotify, o MP3 directo
- **Duration (minutes):** Duración
- **Free Preview:** Opcional

---

#### **📊 QUIZ**

**Cuándo usar:**
- Evaluaciones
- Auto-tests
- Repaso de conocimientos
- Certificación

**Campos:**
- **Instructions/Description:** Instrucciones del quiz y preguntas

**Ejemplo:**
```
**Quiz de Módulo 1**

Responde las siguientes preguntas para verificar tu comprensión:

1. ¿Qué es una comunidad online?
   a) Un grupo de Facebook
   b) Un espacio digital para intereses comunes ✓
   c) Una red social
   d) Un foro

2. ¿Cuál es el primer paso para crear una comunidad?
   ...
```

---

#### **📋 ASSIGNMENT (Tarea)**

**Cuándo usar:**
- Proyectos prácticos
- Ejercicios aplicados
- Tareas entregables
- Desafíos

**Campos:**
- **Instructions/Description:** Descripción de la tarea

**Ejemplo:**
```
**Proyecto: Crea Tu Primera Comunidad**

**Objetivo:**
Aplicar lo aprendido creando tu propia comunidad en Unytea.

**Instrucciones:**
1. Define tu nicho (audiencia específica)
2. Crea tu comunidad en Unytea
3. Configura al menos 3 canales
4. Invita a 5 personas de prueba
5. Publica tu primer post

**Entregables:**
- Screenshot de tu comunidad creada
- Link a tu comunidad
- Reflexión de 200 palabras sobre el proceso

**Tiempo estimado:** 2-3 horas
```

---

## 🎛️ Opciones de Cada Lección:

### **Free Preview Toggle**

**Activar cuando:**
- ✅ Quieres dar un "taste" del curso
- ✅ Primera lección de introducción
- ✅ Videos promocionales
- ✅ Lecciones de "bienvenida"

**Resultado:**
- Usuarios NO inscritos pueden ver esta lección
- Ayuda a convertir visitantes en estudiantes

---

## ⚙️ Paso 4: Configuración del Curso

**En la pestaña "Settings":**

### **Basic Information:**
- **Course Title:** Editar título del curso
- **Description:** Descripción detallada
- **Thumbnail Image URL:** URL de imagen de portada

### **Pricing:**
- **Paid Course:** Toggle ON/OFF
  - **OFF:** Curso gratis ✅
  - **ON:** Curso de pago 💰
    - **Price (USD):** Ej: $97.00

### **Save Changes:**
- Click "Save Changes" para aplicar

---

## ✅ Paso 5: Publicar el Curso

**Cuando tengas contenido listo:**

1. **Verifica que tengas:**
   - ✅ Al menos 1 módulo
   - ✅ Al menos 1 lección en ese módulo
   - ✅ Thumbnail configurado (recomendado)
   - ✅ Descripción completa

2. **Click en "Publish Course"** (botón verde arriba derecha)

3. **El curso cambia de:**
   - ❌ Draft (naranja) 
   - → ✅ Published (verde)

4. **Resultado:**
   - ✅ Visible para miembros de la comunidad
   - ✅ Estudiantes pueden inscribirse
   - ✅ Aparece en listado público

---

## 🎨 Gestión de Módulos y Lecciones

### **Editar un Módulo:**
1. Click en ícono **Edit** (lápiz) junto al módulo
2. Modifica título/descripción
3. Click "Save"

### **Eliminar un Módulo:**
1. Click en ícono **Trash** (basura)
2. Confirma la eliminación
3. ⚠️ **Cuidado:** Se eliminan TODAS las lecciones dentro

### **Editar una Lección:**
1. Expande el módulo
2. Click en **Edit** junto a la lección
3. Modifica campos
4. Click "Save"

### **Eliminar una Lección:**
1. Expande el módulo
2. Click en **Trash** junto a la lección
3. Confirma

### **Reordenar (Próximamente):**
- Drag & drop con el ícono ⋮⋮ (ya está el UI preparado)

---

## 📋 Workflow Recomendado

### **Para Crear un Curso Completo:**

```
Día 1: Estructura
├── Crear curso básico
├── Agregar 5-10 módulos (solo títulos)
└── Planear lecciones por módulo

Día 2-5: Contenido Módulo 1
├── Grabar/escribir lecciones
├── Subir videos a YouTube/Vimeo
├── Agregar lecciones al módulo 1
└── Marcar lección 1.1 como "Free Preview"

Día 6-10: Contenido Módulo 2
└── Repetir proceso

...

Día Final: Publicación
├── Revisar todo el contenido
├── Configurar pricing
├── Agregar thumbnail profesional
└── Click "Publish Course" 🚀
```

---

## 🎥 Ejemplos de URLs de Video

### **YouTube:**
```
https://youtube.com/watch?v=abc123
https://youtu.be/abc123
https://youtube.com/embed/abc123
```

### **Vimeo:**
```
https://vimeo.com/123456789
https://player.vimeo.com/video/123456789
```

### **Video Directo (MP4):**
```
https://tu-cdn.cloudinary.com/video.mp4
https://storage.googleapis.com/bucket/video.mp4
```

---

## 💡 Tips Pro

### **Para Contenido de Texto:**
- ✅ Usa markdown para mejor formato
- ✅ Incluye imágenes con `![alt](url)`
- ✅ Divide en secciones con `##` headers
- ✅ Usa listas y bullet points
- ✅ Agrega bloques de código con triple backticks

### **Para Videos:**
- ✅ Sube a YouTube (unlisted) o Vimeo
- ✅ Títulos descriptivos
- ✅ Duración realista (ayuda al estudiante a planear)
- ✅ Primera lección como "Free Preview" para marketing

### **Para Lecciones Interactivas:**
- ✅ Alterna entre VIDEO y TEXT para variedad
- ✅ Agrega QUIZ al final de cada módulo
- ✅ Usa ASSIGNMENT para proyectos prácticos
- ✅ Marca lecciones clave como "Free" para atraer estudiantes

---

## 🚀 En ~3-4 Minutos (Cuando Deploy Termine):

### **Prueba la Interfaz:**

1. **Ve a:** `https://www.unytea.com/en/dashboard/courses/[tu-course-id]/edit`

2. **Verás la nueva interfaz con:**
   - ✅ Botón "Publish Course" (arriba derecha)
   - ✅ Tabs: "Course Content" y "Settings"
   - ✅ Card para crear módulos
   - ✅ Lista de módulos existentes

3. **Crea tu primer módulo:**
   - Title: "Módulo 1: Introducción"
   - Description: "Fundamentos de comunidades online"
   - Click "Create Module"

4. **Agrega tu primera lección:**
   - Expande el módulo (click en flecha)
   - Click "Add Lesson"
   - Title: "Bienvenida al Curso"
   - Type: "VIDEO" o "TEXT"
   - Llena contenido
   - Click "Create Lesson"

5. **Repite para más módulos/lecciones**

6. **Cuando esté listo:**
   - Click "Publish Course" (verde, arriba)
   - ✅ Tu curso está LIVE!

---

## 📊 Tipos de Contenido Soportados

| Tipo | Icono | Uso Principal | Campos Requeridos |
|------|-------|---------------|-------------------|
| **TEXT** | 📄 | Artículos, guías | Title + Content (markdown) |
| **VIDEO** | 🎥 | Tutoriales, demos | Title + Video URL + Duration |
| **AUDIO** | 🎧 | Podcasts, audio | Title + Audio URL + Duration |
| **QUIZ** | 📊 | Evaluaciones | Title + Questions/Instructions |
| **ASSIGNMENT** | 📋 | Proyectos, tareas | Title + Assignment Description |

---

## 🎓 Ejemplo Práctico: Unytea Academy

### **Módulo 1: Tu Primera Comunidad (3 lecciones)**

**Lección 1.1: Bienvenida** (VIDEO - 5 min - FREE)
```
Title: Bienvenida a Unytea Academy
Type: VIDEO
URL: https://youtube.com/watch?v=tu-video-intro
Duration: 5
Free Preview: ✅ YES
```

**Lección 1.2: ¿Qué es una Comunidad?** (TEXT - 10 min)
```
Title: Definiendo Comunidades Online
Type: TEXT
Content:
# ¿Qué es una Comunidad Online?

Una comunidad online es mucho más que un grupo de personas...

[Aquí tu contenido completo en markdown]
```

**Lección 1.3: Quiz de Fundamentos** (QUIZ - 5 min)
```
Title: Quiz: Fundamentos
Type: QUIZ
Content:
**Evalúa tu comprensión**

1. ¿Qué característica NO es esencial en una comunidad?
   a) Miembros activos
   b) Intereses comunes ✓
   c) Miles de usuarios
   d) Propósito claro
   
[Más preguntas...]
```

---

## 🔄 Workflow Rápido de Producción

### **Si sigues el plan del CURSO_MODULO_1_SCRIPTS.md:**

**Para cada lección del script:**

1. **Lección en VIDEO:**
   - Graba el video (10-15 min)
   - Sube a YouTube (unlisted)
   - Copia URL
   - Agrega lección tipo VIDEO
   - Pega URL
   - Duration: según grabación

2. **Lección en TEXT:**
   - Copia el script
   - Pégalo en Content
   - Formatea con markdown
   - Agrega imágenes si necesitas

3. **Lección QUIZ/ASSIGNMENT:**
   - Copia las preguntas/instrucciones del script
   - Pega en Content
   - Marca como Quiz o Assignment

---

## 🎯 Checklist Pre-Publicación

**Antes de hacer "Publish Course":**

- [ ] Al menos 3-5 módulos creados
- [ ] Cada módulo tiene 3-8 lecciones
- [ ] Primera lección marcada como "Free Preview"
- [ ] Al menos 1 quiz por módulo
- [ ] Thumbnail atractivo configurado
- [ ] Descripción completa y clara
- [ ] Precio configurado (si es de pago)
- [ ] Preview de cada lección funcionando

---

## ⚡ Quick Actions

### **Ver curso publicado:**
```
Click "Preview" (botón arriba) → Ves el curso como estudiante
```

### **Despublicar temporalmente:**
```
Click "Unpublish" → Curso vuelve a draft (oculto para estudiantes)
```

### **Volver a lista de cursos:**
```
Click "Back to Course" (arriba izquierda)
```

---

## 🎨 Interfaz Visual

**Lo que verás:**

### **Header:**
```
← Back to Course    [Nombre del Curso]    [Preview] [Publish Course ✨]
                    ● Draft / ● Published
```

### **Tabs:**
```
[Course Content] [Settings]
```

### **Course Content Tab:**
```
┌─────────────────────────────────┐
│ ➕ Add New Module               │
│ Module Title: ____________      │
│ Description: ____________       │
│ [Create Module]                 │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ ⋮⋮ 1️⃣ Módulo 1: Fundamentos   │
│    3 lessons          [Edit][🗑️][▼]│
│                                 │
│    [Add Lesson]                 │
│    ⋮⋮ 1 📄 Lección 1.1 [Edit][🗑️] │
│    ⋮⋮ 2 🎥 Lección 1.2 [Edit][🗑️] │
│    ⋮⋮ 3 📊 Quiz 1      [Edit][🗑️] │
└─────────────────────────────────┘
```

---

## 🚀 LISTO PARA USAR (en ~4 minutos)

**Vercel está desplegando ahora.**

**Cuando termine (verás "Ready" en dashboard):**

1. ✅ Hard refresh: `Ctrl + Shift + R`
2. ✅ Ve a tu curso → Click "Edit Course"
3. ✅ Empieza a agregar módulos y lecciones
4. ✅ Publica cuando esté listo

---

## 📚 Documentación del Curso Creada

**Ya tienes 7 documentos listos:**

1. **CURSO_INDICE.md** - Navegación
2. **CURSO_RESUMEN_EJECUTIVO.md** - Overview
3. **CURSO_QUICK_START_GUIDE.md** - Validación 7 días ⚡
4. **CURSO_UNYTEA_ESTRUCTURA.md** - 10 módulos completos
5. **CURSO_MODULO_1_SCRIPTS.md** - Scripts listos para copiar/pegar
6. **CURSO_PLAN_DE_EJECUCION.md** - Timeline 90 días
7. **GUIA_GESTION_CURSOS.md** - Esta guía

---

## 💪 Próximo Paso

**Cuando el deploy esté "Ready":**

1. Abre `CURSO_MODULO_1_SCRIPTS.md`
2. Ve a la interfaz de edición del curso
3. Crea "Módulo 1: Tu Primera Comunidad"
4. Copia/pega las 8 lecciones del script
5. Ajusta formato según tipo (VIDEO/TEXT)
6. ✅ Módulo 1 completado en ~1-2 horas!

**¡En 4 minutos tendrás la interfaz completa funcionando en producción! 🎉**
