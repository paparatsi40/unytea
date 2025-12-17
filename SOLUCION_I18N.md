# 🔧 SOLUCIÓN: Homepage no cambia de idioma

## ❌ Problema

El homepage sigue mostrando el mismo idioma (probablemente inglés) al cambiar entre `/en`, `/es`,
`/pt`, `/fr`

## ✅ Soluciones (Prueba en orden)

### **Solución 1: Reinicio completo del servidor**

```bash
# 1. Detener el servidor (Ctrl+C)

# 2. Limpiar cache de Next.js
Remove-Item -Path .next -Recurse -Force

# 3. Limpiar cache de TypeScript
Remove-Item -Path .tsbuildinfo -Force -ErrorAction SilentlyContinue

# 4. Reiniciar
npm run dev
```

### **Solución 2: Limpiar caché del navegador**

1. Abre DevTools (F12)
2. Click derecho en el botón de refresh
3. Selecciona "Vaciar caché y recargar de forma forzada"
4. O usa: `Ctrl + Shift + Delete` → Limpiar todo

### **Solución 3: Modo incógnito**

Abre una ventana de incógnito y prueba:

- `http://localhost:3001/en`
- `http://localhost:3001/es`
- `http://localhost:3001/pt`
- `http://localhost:3001/fr`

### **Solución 4: Verificar que los archivos existen**

```bash
# Ejecuta esto para verificar:
Get-Content web/locales/es/home.json | Select-String "Prosperan"
```

Deberías ver: `"headline2": "Prosperan",`

### **Solución 5: Build completo**

Si nada funciona, hacer un build limpio:

```bash
# Detener servidor
# Limpiar todo
Remove-Item -Path .next -Recurse -Force
Remove-Item -Path node_modules/.cache -Recurse -Force -ErrorAction SilentlyContinue

# Reinstalar dependencias
npm install

# Reiniciar
npm run dev
```

## 🧪 Cómo verificar que funciona

1. Ve a: `http://localhost:3001/en`
    - Deberías ver: **"Where Communities Thrive"**

2. Ve a: `http://localhost:3001/es`
    - Deberías ver: **"Donde las Comunidades Prosperan"**

3. Ve a: `http://localhost:3001/pt`
    - Deberías ver: **"Onde as Comunidades Prosperam"**

4. Ve a: `http://localhost:3001/fr`
    - Deberías ver: **"Où les Communautés Prospèrent"**

## 🔍 Debug adicional

Si después de todo esto sigue sin funcionar, verifica en la consola del navegador:

```javascript
// Abre la consola y ejecuta:
console.log(window.location.pathname)
```

Debería mostrar algo como `/es` o `/en/`

## 📝 Archivos verificados

✅ `web/locales/en/home.json` - Actualizado
✅ `web/locales/es/home.json` - Actualizado  
✅ `web/locales/pt/home.json` - Actualizado
✅ `web/locales/fr/home.json` - Actualizado
✅ `web/i18n.ts` - Configuración correcta
✅ `web/middleware.ts` - Maneja locales correctamente

## ⚡ Solución rápida (todo en uno)

```bash
# Copia y pega esto en PowerShell:
cd C:\Users\calfaro\AndroidStudioProjects\Mentorly\web
Remove-Item -Path .next -Recurse -Force
npm run dev
```

Luego abre en modo incógnito: `http://localhost:3001/es`
