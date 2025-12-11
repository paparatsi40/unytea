# 🧪 TESTING GUIDE - APIs Configuradas

**Fecha:** 10 de Enero, 2025  
**Status:** ✅ Todas las APIs configuradas

---

## ✅ **CONFIGURACIÓN COMPLETA:**

```
✅ OpenAI API Key       - CONFIGURADA
✅ Cloudflare R2        - CONFIGURADA  
✅ LiveKit              - CONFIGURADA
```

---

## 🧪 **CÓMO PROBAR:**

### **PASO 1: Reiniciar el servidor**

El servidor debe reiniciarse para cargar las nuevas variables de entorno:

```bash
# Si el servidor está corriendo, presiona Ctrl+C para detenerlo
# Luego inicia de nuevo:
npm run dev
```

**El servidor debería iniciar en:** `http://localhost:3000` o `http://localhost:3001`

---

### **PASO 2: Abrir el API Test Dashboard**

Abre en tu navegador:

```
http://localhost:3001/dashboard/api-test
```

(Si el servidor está en 3000, usa ese puerto)

---

### **PASO 3: Probar OpenAI**

1. En el dashboard, verás una tarjeta verde con **"OpenAI API"**
2. Click en el botón **"Test Connection"**
3. **Deberías ver:**
   ```
   ✅ Connected!
   ✅ API Key Configured
   ✅ Models Accessible
   ✅ Whisper Available
   ✅ GPT-4 Available
   ```

**Si falla:**

- Verifica que el servidor se reinició
- Revisa la consola del servidor para ver errores
- Verifica que `OPENAI_API_KEY` esté en `.env.local`

---

### **PASO 4: Probar Cloudflare R2**

1. En el mismo dashboard, verás una tarjeta azul con **"Cloudflare R2"**
2. Click en el botón **"Test Connection"**
3. **Deberías ver:**
   ```
   ✅ Connected!
   ✅ Credentials Valid
   ✅ Connection Successful
   ✅ Upload Successful
   Bucket: unytea-recordings
   ```

**Si falla:**

- Verifica que el servidor se reinició
- Revisa que el bucket name sea exactamente: `unytea-recordings`
- Verifica que las credenciales estén correctas en `.env.local`

---

## 🎯 **RESULTADO ESPERADO:**

Ambas tarjetas deberían mostrar:

```
┌─────────────────────────┐  ┌─────────────────────────┐
│  OpenAI API             │  │  Cloudflare R2          │
│  ✅ Connected!          │  │  ✅ Connected!          │
└─────────────────────────┘  └─────────────────────────┘
```

---

## 🚀 **SIGUIENTE PASO:**

Una vez que ambos tests pasen:

✅ **El sistema de Recording + AI está 100% funcional**

Podrás:

1. Grabar sesiones de video
2. Las grabaciones se subirán automáticamente a R2
3. Se transcribirán con Whisper
4. Se generarán resúmenes con GPT-4
5. Todo estará disponible en `/dashboard/recordings`

---

## 🐛 **TROUBLESHOOTING:**

### **OpenAI 401 Error:**

- La API key es inválida o expiró
- Ve a: https://platform.openai.com/api-keys
- Genera una nueva key

### **OpenAI 429 Error:**

- Sin saldo en la cuenta
- Ve a: https://platform.openai.com/account/billing
- Agrega método de pago

### **R2 403 Forbidden:**

- Las credenciales son incorrectas
- Ve a: https://dash.cloudflare.com/ → R2 → Manage API Tokens
- Verifica que el token tenga permisos "Object Read & Write"

### **R2 NoSuchBucket:**

- El nombre del bucket no coincide
- Ve a R2 dashboard y verifica que el bucket se llame exactamente: `unytea-recordings`

---

## 📊 **COSTOS ESTIMADOS:**

**Durante desarrollo/testing:**

- OpenAI: ~$0.03 por test
- R2: Gratis (dentro del free tier)

**En producción (100 sesiones/mes):**

- OpenAI: ~$38/mes
- R2: ~$1.50/mes
- **TOTAL: ~$40/mes**

---

**¡Todo listo para probar!** 🎉
