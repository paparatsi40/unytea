# 📦 Migración: Agregar Campo isArchived a Cursos

## 🎯 Objetivo

Permitir a los owners de comunidades **archivar cursos** en lugar de borrarlos permanentemente.

---

## 📝 Cambio en el Schema

```prisma
model Course {
  // ... campos existentes
  isArchived      Boolean      @default(false)  // ← NUEVO
  // ... más campos
  
  @@index([isArchived])  // ← NUEVO índice para queries eficientes
}
```

---

## 🚀 Aplicar Migración

### **Paso 1: Crear la migración**

```bash
cd web
npx prisma migrate dev --name add_course_archive
```

### **Paso 2: Aplicar a la base de datos**

La migración creará automáticamente la columna `isArchived` con valor por defecto `false` en todos
los cursos existentes.

---

## ✨ Funcionalidad Nueva

### **Para Owners:**

1. **Archivar curso**
    - Oculta el curso de la lista principal
    - Los enrollments existentes siguen funcionando
    - Se puede desarchivar después

2. **Borrar curso**
    - Eliminación permanente
    - Requiere confirmación
    - Solo disponible si no hay enrollments activos

---

## 📊 Queries Actualizados

### **Antes:**

```typescript
const courses = await prisma.course.findMany({
  where: {
    communityId: community.id,
    isPublished: true,
  }
});
```

### **Después:**

```typescript
const courses = await prisma.course.findMany({
  where: {
    communityId: community.id,
    isPublished: true,
    isArchived: false,  // ← Filtrar archivados
  }
});
```

---

## 🎨 UI Components

Se agregarán:

- ✅ Botón "Archive" en cada curso card (solo para owners)
- ✅ Tab "Archived Courses" para ver cursos archivados
- ✅ Botón "Unarchive" para restaurar
- ✅ Botón "Delete Permanently" (con confirmación)

---

## ⚠️ IMPORTANTE

- **Los cursos archivados NO se borran** de la base de datos
- **Los estudiantes enrollados** pueden seguir accediendo
- **Se puede desarchivar** en cualquier momento
- **El borrado permanente** requiere confirmación doble

---

**Aplicar migración AHORA antes de continuar con la UI.** 🚀