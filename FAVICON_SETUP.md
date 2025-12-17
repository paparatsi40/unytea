# 🎯 Favicon Setup Guide - Unytea

## Favicon Files Needed

```
web/public/
├── favicon.ico              (32x32, multi-size ICO)
├── favicon-16x16.png
├── favicon-32x32.png
├── favicon-96x96.png
├── apple-touch-icon.png     (180x180)
├── android-chrome-192x192.png
├── android-chrome-512x512.png
└── site.webmanifest
```

---

## 📐 Step 1: Prepare Source Image

**You need:** Icon-only version of Unytea logo (the tea cup without text)

**Specifications:**

- Size: At least 512x512px
- Format: PNG with transparent background
- Content: Logo icon only (no text)
- Colors: Full color (purple/orange gradient)

**File:** `unytea-icon-only.png`

---

## 🔧 Step 2: Generate Favicons (3 Options)

### **Option A: Online Tool (Easiest) ⭐**

**Recommended: [Favicon.io](https://favicon.io/favicon-converter/)**

1. Go to https://favicon.io/favicon-converter/
2. Upload your `unytea-icon-only.png` (512x512)
3. Click "Download"
4. Extract the ZIP file
5. You'll get all needed files!

**What you get:**

```
✅ favicon.ico
✅ favicon-16x16.png
✅ favicon-32x32.png
✅ android-chrome-192x192.png
✅ android-chrome-512x512.png
✅ apple-touch-icon.png
✅ site.webmanifest
```

### **Option B: RealFaviconGenerator (Advanced)**

**URL:** https://realfavicongenerator.net/

**Pros:**

- More customization options
- Platform-specific icons
- Preview on different devices
- Generates HTML code

**Steps:**

1. Upload your icon
2. Customize for each platform
3. Generate and download
4. Get custom code snippet

### **Option C: Manual with ImageMagick (Dev)**

If you have ImageMagick installed:

```bash
# Install ImageMagick first
# Windows: choco install imagemagick
# Mac: brew install imagemagick

# Generate sizes
magick unytea-icon-only.png -resize 16x16 favicon-16x16.png
magick unytea-icon-only.png -resize 32x32 favicon-32x32.png
magick unytea-icon-only.png -resize 96x96 favicon-96x96.png
magick unytea-icon-only.png -resize 180x180 apple-touch-icon.png
magick unytea-icon-only.png -resize 192x192 android-chrome-192x192.png
magick unytea-icon-only.png -resize 512x512 android-chrome-512x512.png

# Generate ICO (multi-size)
magick unytea-icon-only.png -define icon:auto-resize=16,32,48 favicon.ico
```

---

## 📁 Step 3: Place Files

Copy all generated files to `web/public/`:

```bash
web/public/
├── favicon.ico
├── favicon-16x16.png
├── favicon-32x32.png
├── favicon-96x96.png
├── apple-touch-icon.png
├── android-chrome-192x192.png
├── android-chrome-512x512.png
└── site.webmanifest
```

---

## 🔗 Step 4: Update HTML Head

Your `app/layout.tsx` should have:

```tsx
export const metadata: Metadata = {
  title: 'Unytea - Mentoring & Community',
  description: 'Where Mentors & Mentees Unite',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
}
```

---

## 📱 Step 5: Configure Web Manifest

Create/update `web/public/site.webmanifest`:

```json
{
  "name": "Unytea",
  "short_name": "Unytea",
  "description": "Mentoring & Community Platform",
  "icons": [
    {
      "src": "/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "theme_color": "#6B2D8F",
  "background_color": "#FFFFFF",
  "display": "standalone",
  "start_url": "/",
  "orientation": "portrait"
}
```

---

## ✅ Step 6: Verify

### **In Browser:**

1. Hard refresh your site (Ctrl + Shift + R)
2. Check browser tab - should see your icon
3. Bookmark the page - icon should appear
4. Check in different browsers

### **iOS (iPhone/iPad):**

1. Open site in Safari
2. Tap Share → Add to Home Screen
3. Icon should be your logo (180x180)

### **Android:**

1. Open site in Chrome
2. Menu → Add to Home Screen
3. Icon should be your logo (192x192 or 512x512)

### **Desktop App (PWA):**

1. In Chrome, look for install icon in address bar
2. Install the PWA
3. Icon should appear in app launcher

---

## 🎨 Design Tips for Favicon

### **Do:**

- ✅ Use icon only (no text - too small to read)
- ✅ High contrast colors
- ✅ Simple, recognizable shape
- ✅ Test at 16x16px (smallest size)
- ✅ Keep it centered with padding

### **Don't:**

- ❌ Include text in favicon
- ❌ Use complex details (won't be visible)
- ❌ Use light colors on light backgrounds
- ❌ Make it too busy

### **For Unytea:**

Your tea cup icon is **perfect** for favicon because:

- ✅ Simple, recognizable shape
- ✅ High contrast (purple/orange vs white)
- ✅ Unique silhouette
- ✅ Scales well to small sizes

---

## 🐛 Troubleshooting

### **Favicon not updating?**

```bash
# Clear browser cache
Ctrl + Shift + Delete (Chrome/Edge)
Cmd + Shift + Delete (Safari)

# Hard refresh
Ctrl + Shift + R (Chrome/Edge)
Cmd + Shift + R (Safari)

# Check correct path
console.log('Favicon path:', document.querySelector('link[rel="icon"]').href);
```

### **Wrong icon on mobile?**

- Check `apple-touch-icon.png` exists (180x180)
- Check `android-chrome-512x512.png` exists
- Verify `site.webmanifest` is accessible
- Clear browser cache on mobile

### **ICO not working in old browsers?**

- Make sure `favicon.ico` is in root of `public/`
- Verify it's a proper multi-size ICO file
- Test in IE/Edge Legacy

---

## 📊 File Size Optimization

### **Before uploading:**

```bash
# Optimize PNGs
npm install -g pngquant
pngquant --quality=65-80 favicon-*.png
pngquant --quality=65-80 android-*.png
pngquant --quality=65-80 apple-*.png

# Or use online tool
# TinyPNG.com - drag and drop all PNGs
```

### **Target sizes:**

```
favicon-16x16.png:         < 1KB
favicon-32x32.png:         < 2KB
favicon-96x96.png:         < 5KB
apple-touch-icon.png:      < 10KB
android-chrome-192x192.png: < 15KB
android-chrome-512x512.png: < 30KB
favicon.ico:               < 5KB
```

---

## 🚀 Quick Start Checklist

- [ ] Get icon-only logo (512x512 PNG)
- [ ] Go to favicon.io/favicon-converter/
- [ ] Upload logo
- [ ] Download generated files
- [ ] Copy to `web/public/`
- [ ] Update `app/layout.tsx` metadata
- [ ] Create/update `site.webmanifest`
- [ ] Test in browser (hard refresh)
- [ ] Test on mobile (iOS/Android)
- [ ] Commit and deploy

---

## 📝 Summary

**Time to complete:** 10-15 minutes

**Tools needed:**

- Icon-only logo (512x512 PNG)
- favicon.io (online tool)
- Text editor

**Result:**

- ✅ Favicon in browser tabs
- ✅ Bookmark icon
- ✅ iOS home screen icon
- ✅ Android home screen icon
- ✅ PWA app icon
- ✅ All platform-optimized

---

**Need help?** The icon-only version from your logo variants is perfect for this! Just use the
simplified tea cup icon (without the handle if needed for better scaling).
