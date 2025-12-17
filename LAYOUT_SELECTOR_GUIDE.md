# 🎨 Layout Selector System

## Overview

El sistema de selección de layouts permite a los owners de comunidades elegir cómo se verá su
landing page pública con **previews visuales realistas**.

---

## ✨ Features Implementadas

### 1. **6 Layouts Disponibles**

Cada layout está diseñado para un tipo específico de comunidad:

#### 📌 **Visual Grid**

- **Tipo:** `MODERN_GRID`
- **Estilo:** Pinterest-style masonry layout
- **Mejor para:** Portfolios, diseño, comunidades visuales
- **Características:**
    - Cards de diferentes tamaños
    - Grid responsive
    - Enfoque en imágenes
    - Perfecto para contenido visual

#### 💬 **Discussion Forum**

- **Tipo:** `CLASSIC_FORUM`
- **Estilo:** Traditional forum threads
- **Mejor para:** Q&A, discusiones, soporte técnico
- **Características:**
    - Threads organizados
    - Contadores de respuestas
    - Layout familiar tipo Reddit/Stack Overflow
    - Fácil navegación

#### 🎓 **Learning Hub**

- **Tipo:** `ACADEMY`
- **Estilo:** Course-focused educational
- **Mejor para:** Cursos, cohorts, educación
- **Características:**
    - Grid de cursos
    - Barras de progreso
    - Hero section prominente
    - Enfoque en learning paths

#### 📱 **Social Feed** (NUEVO)

- **Tipo:** `SOCIAL_HUB`
- **Estilo:** Instagram/Facebook-style
- **Mejor para:** Engagement alto, comunidades sociales
- **Características:**
    - Stories row (como Instagram)
    - Feed de posts con likes/comments
    - Sidebar de miembros activos
    - Social-first design

#### 📊 **Analytics Dashboard**

- **Tipo:** `DASHBOARD`
- **Estilo:** Data-driven metrics
- **Mejor para:** Business, profesionales, accountability
- **Características:**
    - Stats cards
    - Charts y gráficos
    - Recent activity feed
    - Enfoque en métricas

#### ✏️ **Clean & Simple**

- **Tipo:** `MINIMALIST`
- **Estilo:** Notion-style minimal
- **Mejor para:** Escritores, bloggers, content creators
- **Características:**
    - Typography-focused
    - Máximo espacio en blanco
    - Sin distracciones
    - Legibilidad óptima

---

## 🎯 Preview System

### **Mockups Realistas**

Cada layout tiene un preview detallado que muestra:

- ✅ Estructura real del layout
- ✅ Colores y gradientes únicos
- ✅ Elementos interactivos
- ✅ Responsive design
- ✅ Estado "ACTIVE" cuando está seleccionado

### **Componentes Visuales**

```typescript
// Cada preview incluye:
- Header/Hero section
- Content cards/grid
- Sidebar (si aplica)
- Footer/CTA
- Colores específicos por tema
```

---

## 💾 How It Works

### 1. **Community Settings**

```
Dashboard → Communities → [Your Community] → Manage (⚙️) → Appearance
```

### 2. **Selector de Layout**

- Grid 2 columnas en desktop
- 1 columna en mobile
- Hover effects
- Active badge
- Click para seleccionar

### 3. **Save**

- Click "Save Appearance" al final de la sección
- Guarda: Colors + Layout Type
- Toast de confirmación

### 4. **Apply to Landing Page**

El layout se aplica automáticamente a:

- `/c/[slug]` - Landing page pública
- Primera impresión para nuevos visitantes
- No afecta el dashboard interno (`/dashboard/communities/[slug]`)

---

## 🗄️ Database Schema

```prisma
enum CommunityLayoutType {
  MODERN_GRID       // Default
  CLASSIC_FORUM
  ACADEMY
  DASHBOARD
  MINIMALIST
  SOCIAL_HUB        // NEW
}

model Community {
  // ...
  layoutType CommunityLayoutType @default(MODERN_GRID)
  // ...
}
```

---

## 🔧 Implementation

### **Component Structure**

```
web/components/community/
├── LayoutPreview.tsx         # Main selector component
│   ├── LayoutPreview()       # Wrapper component
│   ├── LayoutCard()          # Individual card
│   ├── ModernGridPreview()   # Mockup components
│   ├── ClassicForumPreview()
│   ├── AcademyPreview()
│   ├── SocialHubPreview()    # NEW
│   ├── DashboardPreview()
│   └── MinimalistPreview()
└── layouts/
    ├── ModernGridLayout.tsx
    ├── ClassicForumLayout.tsx
    ├── AcademyLayout.tsx
    ├── DashboardLayout.tsx
    └── MinimalistLayout.tsx
```

### **API Routes**

```typescript
// GET /api/communities/[slug]
// Returns: { community: { ..., layoutType: "MODERN_GRID" } }

// PATCH /api/communities/[slug]/branding
// Body: { layoutType: "SOCIAL_HUB", primaryColor, ... }
```

---

## 🎨 Customization

Cada layout respeta los colores personalizados de la comunidad:

```typescript
community.primaryColor     // Main brand color
community.secondaryColor   // Accent color
community.accentColor      // Highlight color
```

Los mockups usan colores únicos para diferenciación, pero el layout real usa los colores de la
comunidad.

---

## 📱 Responsive Design

Todos los previews son responsive:

- **Desktop:** Grid 2 columnas
- **Tablet:** Grid 2 columnas (más pequeño)
- **Mobile:** 1 columna (stack)

---

## ✅ Testing Checklist

- [ ] Ver 6 layouts en Community Settings
- [ ] Hover sobre cada layout (border + shadow)
- [ ] Click para seleccionar (badge "ACTIVE")
- [ ] Save Appearance (toast de confirmación)
- [ ] Verificar en DB que layoutType cambió
- [ ] Ver landing page `/c/[slug]` con nuevo layout
- [ ] Probar en mobile/tablet

---

## 🚀 Next Steps

### **Agregar más layouts:**

1. Agregar al enum en `schema.prisma`
2. Crear función preview en `LayoutPreview.tsx`
3. Agregar al array `LAYOUTS`
4. Implementar layout real en `components/community/layouts/`

### **Ideas de nuevos layouts:**

- Magazine style
- Event-focused (calendar prominent)
- Podcast/audio focused
- Video-first (YouTube-style)
- Newsletter archive
- Marketplace/directory

---

## 🎉 Benefits

✅ **Visual first** - Owners ven exactamente cómo se verá
✅ **No code needed** - Simple click to change
✅ **Instant preview** - No need to publish to see
✅ **Professional** - Each layout optimized for its use case
✅ **Scalable** - Easy to add new layouts

---

**¡El selector de layouts está listo para producción!** 🚀
