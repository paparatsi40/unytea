# 🎨 Unytea Brand Colors

## Color Palette

### Primary - Purple (Wisdom & Mentoring)

```css
/* Base */
--primary: #6B2D8F;
--primary-rgb: 107, 45, 143;
--primary-hsl: 280deg 54% 37%;

/* Variations */
--primary-light: #9B59B6;    /* For hover states */
--primary-dark: #4A1D6B;     /* For active states */
--primary-50: #F3E5F5;       /* Very light backgrounds */
```

### Secondary - Orange (Warmth & Connection)

```css
/* Base */
--secondary: #FF6B35;
--secondary-rgb: 255, 107, 53;
--secondary-hsl: 14deg 100% 60%;

/* Variations */
--secondary-light: #FF8C5A;  /* For hover states */
--secondary-dark: #E64A19;   /* For active states */
--secondary-50: #FFF3E0;     /* Very light backgrounds */
```

### Accent - Cyan (Trust & Growth)

```css
/* Base */
--accent: #06B6D4;
--accent-rgb: 6, 182, 212;
--accent-hsl: 189deg 94% 43%;

/* Variations */
--accent-light: #22D3EE;
--accent-dark: #0891B2;
```

### Neutrals

```css
/* Backgrounds */
--background: #FFFFFF;
--background-dark: #0F172A;  /* Slate 900 */

/* Text */
--foreground: #0F172A;       /* Slate 900 */
--foreground-muted: #64748B; /* Slate 500 */

/* Borders */
--border: #E2E8F0;           /* Slate 200 */
--border-dark: #334155;      /* Slate 700 */
```

---

## Usage Guidelines

### Primary Purple (#6B2D8F)

**Use for:**

- Primary buttons
- Links
- Active states
- Brand elements
- Header navigation
- Important CTAs

**Don't use for:**

- Large backgrounds (too dark)
- Body text (use neutral instead)
- Error messages (use red)

### Secondary Orange (#FF6B35)

**Use for:**

- Secondary buttons
- Highlights
- Badges
- Notifications
- Accent elements
- Hover states

**Don't use for:**

- Primary CTAs (use purple)
- Warning messages (too similar to warning yellow)
- Large text blocks

### Accent Cyan (#06B6D4)

**Use for:**

- Success messages
- Info badges
- Links in dark mode
- Complementary accents
- Data visualization

---

## Color Combinations

### ✅ Good Combinations:

```css
/* Purple + Orange (Brand signature) */
background: linear-gradient(135deg, #6B2D8F 0%, #FF6B35 100%);

/* Purple + White (Clean & Professional) */
background: #6B2D8F;
color: #FFFFFF;

/* Orange + Dark (Warm & Modern) */
background: #FF6B35;
color: #0F172A;

/* Cyan + Purple (Trust + Wisdom) */
accent: #06B6D4;
primary: #6B2D8F;
```

### ❌ Avoid:

- Orange + Purple text on white (poor contrast)
- Cyan + Orange together (clashing)
- All three colors at once (too busy)

---

## Accessibility (WCAG 2.1)

### Contrast Ratios:

**Purple (#6B2D8F) on White:**

- Ratio: 5.2:1 ✅ AA (Large text)
- Ratio: 5.2:1 ⚠️ AAA (Needs darker shade for small text)

**Orange (#FF6B35) on White:**

- Ratio: 3.1:1 ⚠️ AA (Large text only)
- Use darker shade #E64A19 for small text

**White on Purple (#6B2D8F):**

- Ratio: 5.2:1 ✅ AA (All text sizes)

**Recommendations:**

- For body text: Use neutrals (#0F172A)
- For buttons: White text on purple/orange works
- For small text: Use darker shades or neutrals

---

## Implementation

### CSS Variables (Already configured):

```css
/* In globals.css */
:root {
  --primary: 280 54% 37%;       /* #6B2D8F */
  --secondary: 14 100% 60%;     /* #FF6B35 */
  --accent: 189 94% 43%;        /* #06B6D4 */
}
```

### Tailwind Usage:

```tsx
<button className="bg-primary text-white hover:bg-primary/90">
  Click me
</button>

<div className="bg-secondary text-white">
  Orange card
</div>

<span className="text-accent">
  Cyan text
</span>
```

### Direct Hex Usage:

```tsx
<div style={{ backgroundColor: '#6B2D8F', color: '#FFFFFF' }}>
  Custom styled
</div>
```

---

## Export Formats

### For Design Tools:

```
Purple:  #6B2D8F  RGB(107, 45, 143)  HSL(280, 54%, 37%)
Orange:  #FF6B35  RGB(255, 107, 53)  HSL(14, 100%, 60%)
Cyan:    #06B6D4  RGB(6, 182, 212)   HSL(189, 94%, 43%)
```

### For Print (CMYK - approximate):

```
Purple:  C:71  M:100  Y:0   K:0
Orange:  C:0   M:70   Y:85  K:0
Cyan:    C:85  M:0    Y:15  K:0
```

### For Pantone (closest matches):

```
Purple:  Pantone 2665 C
Orange:  Pantone 1665 C
Cyan:    Pantone 3115 C
```

---

## Gradients

### Brand Gradient (Primary):

```css
background: linear-gradient(135deg, #6B2D8F 0%, #FF6B35 100%);
```

### Subtle Gradient (Backgrounds):

```css
background: linear-gradient(135deg, #F3E5F5 0%, #FFF3E0 100%);
```

### Dark Mode Gradient:

```css
background: linear-gradient(135deg, #4A1D6B 0%, #E64A19 100%);
```

---

**Last updated:** [Today's date]
**Brand:** Unytea - Mentoring & Community
**Version:** 1.0
