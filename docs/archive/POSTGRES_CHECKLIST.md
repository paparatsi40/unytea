# ✅ PostgreSQL Setup Checklist

## Pre-requisitos

- [x] PostgreSQL 18 instalado
- [x] Servicio `postgresql-x64-18` corriendo
- [x] Proyecto Next.js configurado
- [x] Prisma schema definido (18 modelos)

## Solución del Problema de Autenticación

### Paso 1: Script de Reseteo (como Admin)

```powershell
# Abrir PowerShell como Administrador
# Win + X → "Windows PowerShell (Administrador)"

cd C:\Users\calfaro\AndroidStudioProjects\Mentorly\web
.\reset-postgres-password.ps1
```

**Resultado esperado:**

```
✓ Backup creado
✓ Configuración modificada
✓ PostgreSQL reiniciado
✓ Contraseña establecida correctamente
✓ Configuración restaurada

=== ✓ PASSWORD RESETEADO EXITOSAMENTE ===
```

### Paso 2: Crear Tablas en la Base de Datos

```bash
npm run db:push
```

**Resultado esperado:**

```
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "mentorly"

🚀 Your database is now in sync with your schema.
✔ Generated Prisma Client
```

### Paso 3: Verificar las Tablas

```bash
npm run db:studio
```

Abrirá http://localhost:5555 con Prisma Studio

**Deberías ver 18 tablas:**

- ✅ users
- ✅ communities
- ✅ members
- ✅ channels
- ✅ posts
- ✅ comments
- ✅ reactions
- ✅ direct_messages
- ✅ sessions (mentoría)
- ✅ availabilities
- ✅ courses
- ✅ modules
- ✅ lessons
- ✅ enrollments
- ✅ lesson_progress
- ✅ subscription_plans
- ✅ subscriptions
- ✅ achievements
- ✅ user_achievements
- ✅ notifications

## Configuración Final

### Archivo .env

```env
DATABASE_URL="postgresql://postgres:mentorly2024@localhost:5433/mentorly"
```

### Verificar Conexión

```bash
# Opción 1: Prisma Studio
npm run db:studio

# Opción 2: Generar Prisma Client
npm run db:generate

# Opción 3: Ver logs de Prisma
npm run db:push -- --help
```

## Troubleshooting Rápido

### ❌ Error: "Authentication failed"

**Solución:** Ejecuta el script de nuevo como Admin

```powershell
.\reset-postgres-password.ps1
```

### ❌ Error: "Cannot find module '@prisma/client'"

**Solución:** Regenera el cliente

```bash
npm run db:generate
```

### ❌ Error: "Service postgresql-x64-18 not found"

**Solución:** Verifica el servicio

```powershell
Get-Service | Where-Object {$_.DisplayName -like "*postgres*"}
```

### ❌ La contraseña no funciona después del reset

**Solución:** Verifica el .env

```bash
cat .env | findstr DATABASE_URL
```

Debe mostrar:

```
DATABASE_URL="postgresql://postgres:mentorly2024@localhost:5433/mentorly"
```

## Estado Actual ✅

| Componente               | Estado        | Detalles                    |
| ------------------------ | ------------- | --------------------------- |
| PostgreSQL 18            | ✅ Running    | Puerto 5433                 |
| Base de datos `mentorly` | 🔄 Pendiente  | Se crea con db:push         |
| 18 Tablas                | 🔄 Pendiente  | Se crean con db:push        |
| Contraseña               | 🔄 A resetear | Script listo                |
| Prisma Client            | ✅ Generado   | Auto-genera con postinstall |

## Después del Setup

### Comandos útiles

```bash
# Ver todas las tablas
npm run db:studio

# Crear una migration
npm run db:migrate

# Ver el estado del schema
npx prisma db pull

# Reset completo (CUIDADO: borra todo)
npx prisma migrate reset

# Seed de datos de prueba (cuando lo implementes)
npx prisma db seed
```

## Próximos Pasos Después de PostgreSQL ✅

1. **Setup de Clerk (Auth)** - 1 día
2. **Dashboard Layout** - 2 días
3. **Community CRUD** - 3 días
4. **MVP completo** - 12 semanas

---

**Tiempo total para resolver PostgreSQL: ~2 minutos** ⏱️

**¡Vamos con todo! 🚀**
