# 🎨 Unytea Complete Branding Guide

**Last Updated:** December 2024  
**Status:** ✅ Production Ready

---

## 📋 Table of Contents

1. [Brand Overview](#brand-overview)
2. [Logo Assets](#logo-assets)
3. [Color System](#color-system)
4. [Cover Image Brief](#cover-image-brief)
5. [Favicon Setup](#favicon-setup)
6. [Implementation Checklist](#implementation-checklist)

---

## 🎯 Brand Overview

### **Brand Name:** Unytea

**Tagline:** "Where Mentors & Mentees Unite"  
**Industry:** EdTech / Community Platform  
**Target:** Mentors, Mentees, Community Leaders

### **Brand Values:**

- 🤝 Connection & Unity
- 💡 Growth & Learning
- ☕ Warmth & Conversation
- 🌱 Personal Development
- 💻 Technology-Enabled

### **Visual Identity:**

- **Primary Symbol:** Tea cup with tech connections
- **Style:** Modern, warm, professional
- **Mood:** Approachable yet sophisticated

---

## 🖼️ Logo Assets

### **1. Main Logo (Primary Use)**

- **File:** `unytea-logo-main.png`
- **Colors:** Split purple/orange gradient
- **Use:** Website header, marketing, presentations
- **Background:** Light/white

### **2. Dark Mode Version**

- **File:** `unytea-logo-dark.png`
- **Colors:** White outline
- **Use:** Dark backgrounds, dark mode UI
- **Background:** Dark

### **3. Icon Only**

- **File:** `unytea-icon-only.png`
- **Use:** App icons, favicons, social profiles
- **Sizes:** 512x512, 192x192, 180x180, 64x64, 32x32, 16x16

### **4. Monochrome Purple**

- **File:** `unytea-logo-purple.png`
- **Use:** Print materials, merch, one-color applications
- **Color:** #6B2D8F

### **5. Monochrome Orange**

- **File:** `unytea-logo-orange.png`
- **Use:** Alternative marketing, highlights
- **Color:** #FF6B35

### **6. Horizontal Lockup**

- **File:** `unytea-logo-horizontal.png`
- **Use:** Narrow spaces, email signatures
- **Layout:** Icon + text side by side

---

## 🎨 Color System

### **Primary Palette:**

```css
/* Purple - Wisdom & Mentoring */
Primary:       #6B2D8F
Primary Light: #9B59B6
Primary Dark:  #4A1D6B

/* Orange - Warmth & Connection */
Secondary:       #FF6B35
Secondary Light: #FF8C5A
Secondary Dark:  #E64A19

/* Cyan - Trust & Growth */
Accent:       #06B6D4
Accent Light: #22D3EE
Accent Dark:  #0891B2
```

### **Usage Matrix:**

| Element | Color | When to Use |
|---------|-------|-------------|
| Primary CTAs | Purple #6B2D8F | Sign up, Join, Get Started |
| Secondary CTAs | Orange #FF6B35 | Learn More, Explore |
| Links | Purple #6B2D8F | All clickable text |
| Success | Cyan #06B6D4 | Confirmations, achievements |
| Hover States | +10% lighter | All interactive elements |
| Active States | +10% darker | Pressed buttons |

### **Gradients:**

```css
/* Brand Signature */
background: linear-gradient(135deg, #6B2D8F 0%, #FF6B35 100%);

/* Subtle Background */
background: linear-gradient(135deg, #F3E5F5 0%, #FFF3E0 100%);

/* Dark Mode */
background: linear-gradient(135deg, #4A1D6B 0%, #E64A19 100%);
```

**📄 Full Documentation:** See `BRAND_COLORS.md`

---

## 📸 Cover Image Brief

### **For Designer:**

**Project:** Hero banner for Unytea platform

**Specifications:**

- **Primary Size:** 1500x500px (3:1 ratio)
- **Additional Sizes:**
    - LinkedIn: 1584x396px
    - Twitter: 1500x500px
    - Facebook: 820x312px

**Design Elements:**

1. **Background:**
    - Gradient: Purple (#6B2D8F) to Orange (#FF6B35)
    - Subtle tech pattern (circuit nodes, connection lines)
    - Not overwhelming - background element only

2. **Logo:**
    - Unytea full logo (icon + text)
    - Positioned left or center
    - Prominent but not overpowering

3. **Typography:**
    - Tagline: "Where Mentors & Mentees Unite"
    - Or alternative: "Mentoring & Community"
    - Large, bold, readable
    - White or light color

4. **Layout:**

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  [Logo]           Tagline Text           [CTA]   │
│                                                  │
│  Subtle connection pattern in background         │
└──────────────────────────────────────────────────┘
```

**Style References:**

- Notion landing page
- Slack hero section
- Discord branding
- Modern SaaS aesthetic

**Deliverables:**

- PNG (high res, transparent if applicable)
- JPG (web optimized, <200KB)
- SVG (if scalable elements)

---

## 🔖 Favicon Setup

### **Quick Steps:**

1. **Get Icon-Only Logo:**
    - Use `unytea-icon-only.png` (512x512)
    - Transparent background
    - Full color

2. **Generate Favicons:**
    - Go to [favicon.io/favicon-converter](https://favicon.io/favicon-converter/)
    - Upload icon
    - Download ZIP

3. **Install Files:**
   ```
   web/public/
   ├── favicon.ico
   ├── favicon-16x16.png
   ├── favicon-32x32.png
   ├── apple-touch-icon.png
   ├── android-chrome-192x192.png
   └── android-chrome-512x512.png
   ```

4. **Configure Manifest:**
    - See `FAVICON_SETUP.md` for full details

**📄 Full Guide:** See `FAVICON_SETUP.md`

---

## ✅ Implementation Checklist

### **Phase 1: Logo Upload (5 min)**

- [ ] Upload main logo to Community Settings → Appearance
- [ ] Upload cover image (when ready)
- [ ] Test on light background
- [ ] Test on dark background

### **Phase 2: Favicon (15 min)**

- [ ] Generate favicon files (favicon.io)
- [ ] Copy to `web/public/`
- [ ] Update `app/layout.tsx` metadata
- [ ] Create `site.webmanifest`
- [ ] Test in browser (hard refresh)
- [ ] Test on mobile (iOS/Android)

### **Phase 3: Color System (Already Done ✅)**

- [x] Update `globals.css` with brand colors
- [x] Configure primary: #6B2D8F
- [x] Configure secondary: #FF6B35
- [x] Configure accent: #06B6D4
- [x] Test in light mode
- [x] Test in dark mode

### **Phase 4: Assets Organization**

- [ ] Create `branding/` folder
- [ ] Organize logo files by type
- [ ] Add README with usage guidelines
- [ ] Version control all assets

### **Phase 5: Documentation**

- [x] Color reference guide
- [x] Logo usage guidelines
- [x] Favicon setup instructions
- [ ] Brand guidelines PDF (future)
- [ ] Style guide (future)

### **Phase 6: Testing**

- [ ] Test logo on all pages
- [ ] Test colors in all components
- [ ] Test favicon in all browsers
- [ ] Test on mobile devices
- [ ] Test dark mode everywhere
- [ ] Get stakeholder approval

### **Phase 7: Deployment**

- [ ] Commit all changes
- [ ] Push to repository
- [ ] Deploy to staging
- [ ] QA testing
- [ ] Deploy to production
- [ ] Announce rebrand (if applicable)

---

## 📁 File Structure

```
web/
├── public/
│   ├── branding/
│   │   ├── logo/
│   │   │   ├── unytea-logo-main.png
│   │   │   ├── unytea-logo-dark.png
│   │   │   ├── unytea-icon-only.png
│   │   │   ├── unytea-logo-purple.png
│   │   │   └── unytea-logo-orange.png
│   │   ├── cover/
│   │   │   └── unytea-cover.jpg
│   │   └── svg/
│   │       └── (vector files)
│   ├── favicon.ico
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── apple-touch-icon.png
│   ├── android-chrome-192x192.png
│   ├── android-chrome-512x512.png
│   └── site.webmanifest
├── app/
│   └── globals.css (✅ Updated with brand colors)
└── docs/
    ├── BRAND_COLORS.md
    ├── FAVICON_SETUP.md
    ├── LAYOUT_SELECTOR_GUIDE.md
    └── BRANDING_COMPLETE_GUIDE.md (this file)
```

---

## 🎯 Next Steps

### **Immediate (This Week):**

1. ✅ Upload main logo to platform
2. ✅ Configure brand colors (done)
3. 📋 Generate and install favicons
4. 📋 Order cover image from designer

### **Short Term (Next 2 Weeks):**

1. 📋 Upload cover image when ready
2. 📋 Test entire brand system
3. 📋 Update all marketing materials
4. 📋 Update social media profiles

### **Long Term (Next Month):**

1. 📋 Create brand guidelines PDF
2. 📋 Design email templates
3. 📋 Create pitch deck template
4. 📋 Design merch (t-shirts, mugs, stickers)

---

## 💡 Tips & Best Practices

### **Logo Usage:**

- Always use provided files (don't recreate)
- Maintain aspect ratio (never stretch)
- Use appropriate version for background
- Ensure minimum size of 32px height

### **Colors:**

- Use hex codes from this guide
- Don't create new shades without approval
- Test accessibility (WCAG 2.1 AA minimum)
- Consider colorblind users

### **Consistency:**

- Use same logo version across all pages
- Maintain color usage patterns
- Keep spacing consistent
- Follow established hierarchy

---

## 📞 Resources

### **Design Tools:**

- [Figma](https://figma.com) - Design collaboration
- [Canva](https://canva.com) - Quick graphics
- [Favicon.io](https://favicon.io) - Favicon generator
- [TinyPNG](https://tinypng.com) - Image optimization

### **Documentation:**

- `BRAND_COLORS.md` - Complete color system
- `FAVICON_SETUP.md` - Favicon implementation
- `LAYOUT_SELECTOR_GUIDE.md` - Community layouts

### **Contact:**

- Brand Manager: [Your name]
- Designer: [Designer name]
- Developer: [Developer name]

---

## ✨ Summary

**Brand Status:** ✅ 80% Complete

**Completed:**

- ✅ Logo design (all variations)
- ✅ Color system configured
- ✅ Documentation created
- ✅ Platform colors updated

**Pending:**

- 📋 Cover image design
- 📋 Favicon installation
- 📋 Final testing

**Timeline:**

- **This week:** Favicons + testing
- **Next week:** Cover image + deployment
- **Week 3:** Marketing materials update

---

**🎉 Your brand is 80% ready for production!**

Next immediate action: Generate and install favicons (15 minutes)

---

**Version:** 1.0  
**Last Updated:** December 2024  
**Maintained by:** Unytea Team
