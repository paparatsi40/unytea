# ============================================
# SCRIPT PARA RESETEAR PASSWORD DE POSTGRESQL
# Debe ejecutarse como ADMINISTRADOR
# ============================================

Write-Host "=== MENTORLY - Reset PostgreSQL Password ===" -ForegroundColor Cyan
Write-Host ""

# Verificar si se ejecuta como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: Este script debe ejecutarse como ADMINISTRADOR" -ForegroundColor Red
    Write-Host ""
    Write-Host "Para ejecutar:" -ForegroundColor Yellow
    Write-Host "1. Click derecho en PowerShell" -ForegroundColor White
    Write-Host "2. 'Ejecutar como administrador'" -ForegroundColor White
    Write-Host "3. cd C:\Users\calfaro\AndroidStudioProjects\Mentorly\web" -ForegroundColor White
    Write-Host "4. .\reset-postgres-password.ps1" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✓ Ejecutando como administrador" -ForegroundColor Green
Write-Host ""

$pgDataPath = "C:\Program Files\PostgreSQL\18\data"
$pgHbaFile = "$pgDataPath\pg_hba.conf"
$backupFile = "$pgDataPath\pg_hba.conf.backup"
$serviceName = "postgresql-x64-18"

# Paso 1: Hacer backup
Write-Host "Paso 1/5: Haciendo backup de pg_hba.conf..." -ForegroundColor Yellow
try {
    Copy-Item $pgHbaFile $backupFile -Force
    Write-Host "✓ Backup creado: $backupFile" -ForegroundColor Green
} catch {
    Write-Host "✗ Error al hacer backup: $_" -ForegroundColor Red
    exit 1
}

# Paso 2: Cambiar autenticación a 'trust'
Write-Host "Paso 2/5: Cambiando autenticación a 'trust'..." -ForegroundColor Yellow
try {
    $content = Get-Content $pgHbaFile
    $newContent = $content -replace "scram-sha-256", "trust"
    $newContent | Set-Content $pgHbaFile
    Write-Host "✓ Configuración modificada" -ForegroundColor Green
} catch {
    Write-Host "✗ Error al modificar configuración: $_" -ForegroundColor Red
    exit 1
}

# Paso 3: Reiniciar servicio
Write-Host "Paso 3/5: Reiniciando PostgreSQL..." -ForegroundColor Yellow
try {
    Restart-Service $serviceName -Force
    Start-Sleep -Seconds 3
    Write-Host "✓ PostgreSQL reiniciado" -ForegroundColor Green
} catch {
    Write-Host "✗ Error al reiniciar servicio: $_" -ForegroundColor Red
    exit 1
}

# Paso 4: Cambiar password
Write-Host "Paso 4/5: Estableciendo nueva contraseña 'mentorly2024'..." -ForegroundColor Yellow
try {
    $psqlPath = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
    $command = "ALTER USER postgres PASSWORD 'mentorly2024';"
    
    & $psqlPath -U postgres -h localhost -p 5433 -c $command 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Contraseña establecida correctamente" -ForegroundColor Green
    } else {
        throw "psql retornó código de error: $LASTEXITCODE"
    }
} catch {
    Write-Host "✗ Error al cambiar contraseña: $_" -ForegroundColor Red
    Write-Host "Restaurando backup..." -ForegroundColor Yellow
    Copy-Item $backupFile $pgHbaFile -Force
    Restart-Service $serviceName -Force
    exit 1
}

# Paso 5: Restaurar seguridad
Write-Host "Paso 5/5: Restaurando configuración de seguridad..." -ForegroundColor Yellow
try {
    Copy-Item $backupFile $pgHbaFile -Force
    Restart-Service $serviceName -Force
    Start-Sleep -Seconds 3
    Write-Host "✓ Configuración restaurada" -ForegroundColor Green
} catch {
    Write-Host "✗ Error al restaurar: $_" -ForegroundColor Red
    Write-Host "ADVERTENCIA: El archivo backup está en: $backupFile" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "=== ✓ PASSWORD RESETEADO EXITOSAMENTE ===" -ForegroundColor Green
Write-Host ""
Write-Host "Nueva contraseña: mentorly2024" -ForegroundColor Cyan
Write-Host ""
Write-Host "Siguiente paso:" -ForegroundColor Yellow
Write-Host "cd C:\Users\calfaro\AndroidStudioProjects\Mentorly\web" -ForegroundColor White
Write-Host "npm run db:push" -ForegroundColor Green
Write-Host ""
