# ✅ Branding Global de la Plataforma - COMPLETADO

## 🎉 Lo que YA está configurado (por IA):

### **1. Metadata Global ✅**

**Archivo:** `web/app/layout.tsx`

```typescript
- Title: "Unytea - Mentoring & Community"
- Description: "Where Mentors & Mentees Unite..."
- Keywords: mentoring, community, learning, etc.
- Theme color: #6B2D8F (purple)
- Open Graph image: /branding/cover/unytea-cover.jpg
- Twitter card configurado
- PWA ready
```

### **2. Web Manifest ✅**

**Archivo:** `web/public/site.webmanifest`

```json
- Name: "Unytea - Mentoring & Community"
- Theme color: #6B2D8F
- Background: #FFFFFF
- Icons configurados (todos los tamaños)
- PWA shortcuts (Dashboard, Communities)
```

### **3. Colores Globales ✅**

**Archivo:** `web/app/globals.css`

```css
- Primary: #6B2D8F (Purple)
- Secondary: #FF6B35 (Orange)
- Accent: #06B6D4 (Cyan)
- Configurado para light y dark mode
```

### **4. Favicon Configuration ✅**

**Archivo:** `web/app/layout.tsx`

```typescript
- favicon.ico
- favicon-16x16.png
- favicon-32x32.png
- favicon-96x96.png
- apple-touch-icon.png
- android-chrome-192x192.png
- android-chrome-512x512.png
```

---

## 📋 Lo que TÚ necesitas hacer ahora:

### **PASO 1: Generar Favicons**

1. Ve a: https://favicon.io/favicon-converter/
2. Sube: `web/public/branding/logo/unytea-logo-main.png`
   (O el icon-only si lo tienes)
3. Download el ZIP
4. Descomprime y copia estos archivos a `web/public/`:

```
web/public/
├── favicon.ico                    ← Copia aquí
├── favicon-16x16.png             ← Copia aquí
├── favicon-32x32.png             ← Copia aquí
├── apple-touch-icon.png          ← Copia aquí
├── android-chrome-192x192.png    ← Copia aquí
└── android-chrome-512x512.png    ← Copia aquí
```

**⚠️ Nota:** El archivo `favicon-96x96.png` tal vez no venga en el ZIP de favicon.io, pero no es
crítico.

---

### **PASO 2: Verificar estructura de archivos**

Asegúrate de tener estos archivos en su lugar:

```
web/public/branding/
├── logo/
│   ├── unytea-logo-main.png      ← Ya lo tienes ✅
│   └── (otros logos opcionales)
└── cover/
    └── unytea-cover.jpg           ← Ya lo tienes ✅
```

---

## 🧪 TESTING - Lo que verás después:

### **1. Favicon en Browser Tab:**

- Abre: http://localhost:3000
- Deberías ver el icon de Unytea en el tab del navegador
- Prueba en Chrome, Firefox, Safari

### **2. Title en Browser:**

- Tab title: "Unytea - Mentoring & Community"
- En páginas específicas: "[Página] | Unytea"

### **3. Al compartir en redes sociales:**

- Se mostrará el cover image (unytea-cover.jpg)
- Title: "Unytea - Mentoring & Community"
- Description: "Where Mentors & Mentees Unite..."

### **4. Theme Color (Mobile):**

- En Android Chrome, la barra superior será purple (#6B2D8F)
- En iOS Safari, se verá el theme color en la UI

### **5. PWA (Agregar a Home Screen):**

- Name: "Unytea"
- Icon: Tu logo
- Theme: Purple
- Funciona como app nativa

---

## ✅ CHECKLIST COMPLETO:

### **Configurado por IA (YA LISTO):**

- [x] Metadata global actualizado
- [x] Open Graph configurado
- [x] Twitter Card configurado
- [x] Web Manifest creado
- [x] Theme colors configurados
- [x] Colores CSS actualizados
- [x] Favicon paths configurados
- [x] PWA ready

### **Tu parte (SOLO COPIAR ARCHIVOS):**

- [ ] Generar favicons en favicon.io
- [ ] Copiar favicon files a `web/public/`
- [ ] Verificar que cover esté en `/branding/cover/unytea-cover.jpg`
- [ ] Verificar que logo esté en `/branding/logo/unytea-logo-main.png`

### **Testing:**

- [ ] Refresca browser (Ctrl + Shift + R)
- [ ] Verificar favicon en tab
- [ ] Verificar title "Unytea - Mentoring & Community"
- [ ] Hacer screenshot de página y compartir en Slack/Discord (test Open Graph)
- [ ] Test en mobile (agregar a home screen)

---

## 🎯 ESTADO ACTUAL:

```
Branding Global: 80% COMPLETO ✅

LISTO:
✅ Código configurado (metadata, manifest, colors)
✅ Logo guardado
✅ Cover guardado

PENDIENTE:
📋 Generar y copiar favicons (10 min)
📋 Testing (5 min)
```

---

## 🚀 PRÓXIMOS PASOS (ORDEN):

### **1. Generar Favicons (AHORA - 10 min)**

```
1. https://favicon.io/favicon-converter/
2. Upload: unytea-logo-main.png
3. Download ZIP
4. Copiar 6 archivos a web/public/
```

### **2. Reiniciar servidor**

```bash
cd web
npm run dev
```

### **3. Testing**

```
1. Abre: http://localhost:3000
2. Verifica favicon
3. Verifica title
4. Inspecciona <head> en DevTools
5. Test Open Graph con: https://www.opengraph.xyz/
```

### **4. Deploy (cuando esté listo)**

```
1. Commit cambios
2. Push a repo
3. Deploy a producción
4. Test en vivo
```

---

## 📞 Si algo no funciona:

### **Favicon no aparece:**

```bash
# Hard refresh
Ctrl + Shift + R (Chrome/Edge)
Cmd + Shift + R (Safari/Mac)

# Clear cache
Ctrl + Shift + Delete

# Verificar archivo existe
Test-Path "web/public/favicon.ico"
```

### **Cover image no se muestra en social:**

```bash
# Verificar path
Test-Path "web/public/branding/cover/unytea-cover.jpg"

# URL correcta: /branding/cover/unytea-cover.jpg
# NO: /public/branding/...
```

### **Colores no se ven:**

```bash
# Reiniciar servidor
cd web
npm run dev

# Hard refresh en browser
```

---

## 📸 SCREENSHOTS DE TESTING:

### **Deberías ver:**

1. **Browser Tab:**
   ```
   [🎨 Icon] Unytea - Mentoring & Community
   ```

2. **Cuando compartes en Slack/Discord:**
   ```
   [Cover Image Preview]
   Unytea - Mentoring & Community
   Where Mentors & Mentees Unite...
   ```

3. **Mobile - Add to Home Screen:**
   ```
   [Icon circular con tu logo]
   Unytea
   ```

---

## 🎨 BRAND ASSETS LOCATIONS:

```
WEB (servidor estático):
/favicon.ico                           → Favicon principal
/branding/logo/unytea-logo-main.png   → Logo completo
/branding/cover/unytea-cover.jpg      → Cover image

CODE (configuración):
/app/layout.tsx                        → Metadata global
/app/globals.css                       → Colores
/public/site.webmanifest              → PWA config
```

---

## ✨ RESULTADO FINAL:

Cuando termines, tendrás:

- ✅ Favicon profesional en todos los browsers
- ✅ Title y description optimizados para SEO
- ✅ Open Graph para compartir en redes sociales
- ✅ PWA installable en mobile
- ✅ Theme colors matching tu brand
- ✅ Colores purple/orange en toda la UI
- ✅ Metadata completa y profesional

---

**🎉 ¡Ya casi terminas! Solo falta copiar los favicons (10 min)**

---

**Última actualización:** Hoy
**Status:** ✅ 80% Completo - Solo falta copiar favicons
