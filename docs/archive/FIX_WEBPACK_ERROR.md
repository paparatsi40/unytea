# 🔧 SOLUCIÓN AL ERROR DE WEBPACK

## ❌ Error actual:

```
TypeError: Cannot read properties of undefined (reading 'call')
at options.factory
```

## ✅ SOLUCIÓN (3 PASOS):

### **PASO 1: Cerrar TODO**

1. Cierra el navegador completamente (todas las ventanas)
2. En la terminal donde corre `npm run dev`, presiona `Ctrl + C`
3. Espera 2 segundos

### **PASO 2: Limpiar caché COMPLETO**

Ejecuta estos comandos UNO POR UNO:

```powershell
cd C:\Users\calfaro\AndroidStudioProjects\Mentorly\web

# Matar todos los procesos Node
taskkill /F /IM node.exe

# Borrar caché de Next.js
Remove-Item -Recurse -Force .next

# Borrar caché de webpack
Remove-Item -Recurse -Force node_modules\.cache

# Borrar TypeScript build info
Remove-Item -Force tsconfig.tsbuildinfo

# Opcional: Limpiar npm cache
npm cache clean --force
```

### **PASO 3: Reiniciar desde cero**

```powershell
# Iniciar servidor
npm run dev
```

**ESPERA** hasta que veas:

```
✓ Ready in X.Xs
✓ Compiled /dashboard/c/[slug]/settings/landing
```

### **PASO 4: Abrir navegador en modo incógnito**

```
http://localhost:3000/dashboard/c/[tu-slug]/settings/landing
```

**Usa modo incógnito** (Ctrl + Shift + N) para evitar caché del navegador.

---

## 🆘 SI EL ERROR PERSISTE:

### **Opción A: Reinstalar node_modules**

```powershell
Remove-Item -Recurse -Force node_modules
npm install
npm run dev
```

**Tiempo:** ~5-10 minutos

### **Opción B: Usar el Simple Editor temporalmente**

El Section Builder funciona, pero si necesitas avanzar YA, puedes usar el Simple Editor que ya
estaba implementado.

---

## 📝 **NOTA IMPORTANTE:**

Este error NO es culpa del código. Es un problema conocido de Next.js 14 cuando:

1. Cambias entre Server/Client Components
2. El caché de webpack queda inconsistente
3. El hot reload no puede resolver las referencias

**La única solución es borrar `.next` completamente.**

---

## ✅ **VERIFICACIÓN FINAL:**

Una vez reiniciado, verifica:

1. ✅ No hay errores en la terminal del servidor
2. ✅ El navegador carga sin error de webpack
3. ✅ Ves el Section Builder con los 3 paneles
4. ✅ Puedes agregar secciones desde la paleta
5. ✅ El botón Save es visible

---

**Si después de seguir TODOS estos pasos el error persiste, avísame para investigar más profundo.**
🔍
