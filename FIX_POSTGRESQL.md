# 🔧 Solución: Problema de Autenticación PostgreSQL

## 📋 Problema

```
Error: P1000: Authentication failed against database server at `localhost`
```

La contraseña actual de PostgreSQL no coincide con la configurada en `.env`.

---

## ✅ Solución Rápida (2 minutos)

### Paso 1: Abrir PowerShell como Administrador

**Opción A - Desde menú inicio:**

1. Click derecho en el icono de Windows
2. Click en "Terminal (Admin)" o "PowerShell (Administrador)"

**Opción B - Desde búsqueda:**

1. Presiona `Win + X`
2. Selecciona "Windows PowerShell (Administrador)"

---

### Paso 2: Navegar al proyecto

```powershell
cd C:\Users\calfaro\AndroidStudioProjects\Mentorly\web
```

---

### Paso 3: Ejecutar el script de reseteo

```powershell
.\reset-postgres-password.ps1
```

El script hará automáticamente:

- ✅ Backup de la configuración actual
- ✅ Cambiar temporalmente a autenticación sin contraseña
- ✅ Establecer nueva contraseña: `mentorly2024`
- ✅ Restaurar la configuración de seguridad
- ✅ Reiniciar PostgreSQL

**Resultado esperado:**

```
=== ✓ PASSWORD RESETEADO EXITOSAMENTE ===

Nueva contraseña: mentorly2024

Siguiente paso:
cd C:\Users\calfaro\AndroidStudioProjects\Mentorly\web
npm run db:push
```

---

### Paso 4: Crear las tablas en la base de datos

Desde el directorio `web` (puedes cerrar el PowerShell admin y usar tu terminal normal):

```bash
npm run db:push
```

**Resultado esperado:**

```
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "mentorly", schema "public" at "localhost:5433"

🚀 Your database is now in sync with your schema. Done in Xms

✔ Generated Prisma Client
```

---

## 🎉 ¡Listo!

Ahora tienes:

- ✅ PostgreSQL configurado correctamente
- ✅ 18 tablas creadas en la base de datos `mentorly`
- ✅ Contraseña: `mentorly2024`
- ✅ Listo para desarrollar

---

## 🔍 Verificar que todo funciona

```bash
npm run db:studio
```

Esto abrirá Prisma Studio en http://localhost:5555 donde podrás ver todas las tablas creadas.

---

## 🆘 Solución Alternativa (Manual)

Si el script no funciona, puedes hacerlo manualmente:

### 1. Hacer backup

```powershell
Copy-Item "C:\Program Files\PostgreSQL\18\data\pg_hba.conf" "C:\Program Files\PostgreSQL\18\data\pg_hba.conf.backup"
```

### 2. Editar pg_hba.conf

Abrir con un editor de texto como administrador:

```
C:\Program Files\PostgreSQL\18\data\pg_hba.conf
```

Cambiar todas las líneas que digan `scram-sha-256` por `trust`:

```
# Antes:
host    all             all             127.0.0.1/32            scram-sha-256

# Después:
host    all             all             127.0.0.1/32            trust
```

### 3. Reiniciar PostgreSQL

```powershell
Restart-Service postgresql-x64-18
```

### 4. Cambiar contraseña

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h localhost -p 5433 -c "ALTER USER postgres PASSWORD 'mentorly2024';"
```

### 5. Restaurar pg_hba.conf

```powershell
Copy-Item "C:\Program Files\PostgreSQL\18\data\pg_hba.conf.backup" "C:\Program Files\PostgreSQL\18\data\pg_hba.conf"
```

### 6. Reiniciar de nuevo

```powershell
Restart-Service postgresql-x64-18
```

---

## 📚 Información Adicional

### Configuración Actual

- **Host:** localhost
- **Puerto:** 5433
- **Base de datos:** mentorly
- **Usuario:** postgres
- **Contraseña:** mentorly2024
- **Connection String:** `postgresql://postgres:mentorly2024@localhost:5433/mentorly`

### Servicios PostgreSQL

Tienes 2 versiones instaladas:

- PostgreSQL 16: puerto 5432 (detenido)
- PostgreSQL 18: puerto 5433 (activo) ✅

### Comandos Útiles

```bash
# Ver tablas creadas
npm run db:studio

# Regenerar Prisma Client
npm run db:generate

# Crear migration
npm run db:migrate

# Reset completo de la base de datos (CUIDADO!)
npx prisma migrate reset
```

---

## 🐛 Troubleshooting

### Error: "Cannot find module '@prisma/client'"

```bash
npm run db:generate
```

### Error: "Service postgresql-x64-18 not found"

Verificar el nombre del servicio:

```powershell
Get-Service | Where-Object {$_.DisplayName -like "*postgres*"}
```

### Error: "Access denied"

Asegúrate de ejecutar PowerShell como Administrador.

### La contraseña sigue sin funcionar

Verifica el archivo `.env`:

```bash
cat .env
```

Debe decir:

```
DATABASE_URL="postgresql://postgres:mentorly2024@localhost:5433/mentorly"
```

---

## 📞 Ayuda

Si sigues teniendo problemas, verifica:

1. ✅ PostgreSQL está corriendo: `Get-Service postgresql-x64-18`
2. ✅ El puerto 5433 está libre: `netstat -ano | findstr 5433`
3. ✅ El archivo `.env` tiene la contraseña correcta
4. ✅ Ejecutaste el script como administrador

---

**¡Ahora sí, a construir Mentorly! 🚀**
