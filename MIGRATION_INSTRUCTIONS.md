# 🗄️ Migración Manual - Add SOCIAL_HUB Layout

## Problema

El layout `SOCIAL_HUB` fue agregado al schema de Prisma pero necesita ser agregado al enum en
PostgreSQL.

---

## ✅ Solución Rápida

### **Opción 1: Via psql (Recomendado)**

```bash
# Conectar a la base de datos
psql -h localhost -p 5433 -U postgres -d mentorly

# Ejecutar la migración
ALTER TYPE "CommunityLayoutType" ADD VALUE IF NOT EXISTS 'SOCIAL_HUB';

# Verificar
SELECT enum_range(NULL::public."CommunityLayoutType");

# Salir
\q
```

### **Opción 2: Via Prisma Studio**

```bash
cd web
npx prisma studio
```

Luego ejecuta la query SQL en tu cliente PostgreSQL favorito.

### **Opción 3: Via script SQL**

El archivo está en: `web/prisma/migrations/add_social_hub_layout.sql`

Ejecuta ese archivo contra tu base de datos.

---

## 🧪 Verificar que Funcionó

1. **Refresca la página de Community Settings**
2. **Intenta seleccionar "Social Feed" layout**
3. **Click "Save Appearance"**
4. **Deberías ver:** "Appearance saved successfully!" ✅

---

## 🔍 Si Sigue Fallando

### **Check 1: Verificar valores del enum**

```sql
SELECT enum_range(NULL::public."CommunityLayoutType");
```

Deberías ver:

```
{MODERN_GRID,CLASSIC_FORUM,ACADEMY,DASHBOARD,MINIMALIST,SOCIAL_HUB}
```

### **Check 2: Verificar logs del servidor**

En la consola de Next.js, busca:

```
[BRANDING] Update request: { layoutType: 'SOCIAL_HUB', ... }
[BRANDING] Update data: { layoutType: 'SOCIAL_HUB', ... }
[BRANDING] Update successful: { id: '...', layoutType: 'SOCIAL_HUB' }
```

### **Check 3: Verificar en la DB**

```sql
SELECT id, name, slug, "layoutType" FROM "communities";
```

---

## 🚀 Después de la Migración

Una vez aplicada, **reinicia el servidor de desarrollo**:

```bash
# Detén el servidor (Ctrl + C)
cd web
npm run dev
```

---

## 📝 Nota para Producción

Cuando hagas deploy a producción, Prisma Migrate manejará esto automáticamente con:

```bash
npx prisma migrate deploy
```

O si usas Vercel/Railway/etc, se aplicará automáticamente en el build.

---

**¡Listo!** El layout SOCIAL_HUB estará disponible. 🎉
