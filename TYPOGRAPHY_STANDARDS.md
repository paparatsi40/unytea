# 📝 Typography Standards - Unytea

## Base Configuration

```css
html: 16px (base font size)
body: 1rem (16px) with line-height: 1.6
```

---

## 📏 Text Size Hierarchy

### Headers

```tsx
// Page Title (Main)
<h1 className="text-4xl font-bold">Settings</h1>  // 36px

// Section Title
<h2 className="text-3xl font-bold">Profile</h2>   // 30px

// Subsection Title
<h3 className="text-2xl font-bold">Basic Information</h3>  // 24px

// Card/Block Title
<h4 className="text-xl font-semibold">Recent Activity</h4>  // 20px

// Small Header
<h5 className="text-lg font-semibold">Details</h5>  // 18px
```

### Body Text

```tsx
// Default Body Text
<p className="text-base">Regular paragraph text</p>  // 16px

// Secondary/Muted Text
<p className="text-base text-muted-foreground">Description or helper text</p>  // 16px

// Small Text (hints, captions)
<p className="text-sm text-muted-foreground">Character count: 50/100</p>  // 14px

// Extra Small Text (timestamps, meta)
<p className="text-xs text-muted-foreground">2 hours ago</p>  // 12px
```

### Form Elements

```tsx
// Label
<label className="text-base font-medium">Full Name</label>  // 16px

// Input/Textarea
<input className="text-base px-4 py-3" />  // 16px text, comfortable padding

// Select
<select className="text-base px-4 py-3" />  // 16px

// Helper Text
<p className="text-sm text-muted-foreground">Optional description</p>  // 14px

// Error Message
<p className="text-sm text-red-600">This field is required</p>  // 14px
```

### Buttons

```tsx
// Primary Button
<Button className="text-base px-6 py-2.5">Save Changes</Button>  // 16px

// Secondary Button
<Button variant="outline" className="text-base px-6 py-2.5">Cancel</Button>  // 16px

// Small Button
<Button size="sm" className="text-sm px-4 py-2">Quick Action</Button>  // 14px

// Icon Button (with text)
<Button className="text-base">
  <Icon className="h-5 w-5 mr-2" />
  Action
</Button>
```

### Navigation

```tsx
// Sidebar Main Items
<Link className="text-base font-medium">Communities</Link>  // 16px

// Sidebar Descriptions
<p className="text-sm text-muted-foreground">Explore communities</p>  // 14px

// Breadcrumbs
<span className="text-sm">Dashboard / Settings</span>  // 14px

// Tabs
<button className="text-base font-medium">Overview</button>  // 16px
```

### Cards & Lists

```tsx
// Card Title
<h3 className="text-xl font-semibold">Card Title</h3>  // 20px

// Card Description
<p className="text-base text-muted-foreground">Card description text</p>  // 16px

// List Item Text
<li className="text-base">List item content</li>  // 16px

// List Item Meta
<span className="text-sm text-muted-foreground">5 members</span>  // 14px
```

### Icons

```tsx
// With text-base (16px)
<Icon className="h-5 w-5" />

// With text-xl (20px)
<Icon className="h-6 w-6" />

// With text-2xl (24px)
<Icon className="h-7 w-7" />

// Large standalone
<Icon className="h-8 w-8" />
```

---

## 🎨 Usage Guidelines

### ✅ DO:

- Use `text-base` (16px) as the default for all body text
- Use `text-base` for form labels and inputs
- Use `text-base` for navigation items
- Use `text-base` for buttons
- Use `text-sm` only for helper text, hints, and meta information
- Maintain consistent line-height (1.6 for body text)
- Use proper spacing between elements

### ❌ DON'T:

- Don't use `text-xs` for primary content
- Don't use `text-sm` for form inputs
- Don't use inconsistent padding in similar elements
- Don't mix font sizes arbitrarily

---

## 📱 Responsive Adjustments

For mobile devices, you can slightly reduce sizes:

```tsx
// Example: Hero Title
<h1 className="text-3xl md:text-4xl lg:text-5xl">Welcome</h1>

// Example: Section Title
<h2 className="text-2xl md:text-3xl">Profile</h2>

// Body text usually stays the same (text-base)
<p className="text-base">Content</p>
```

---

## 🔧 Quick Reference

| Element | Class | Size | Use Case |
|---------|-------|------|----------|
| Page Title | `text-4xl` | 36px | Main page header |
| Section Title | `text-3xl` | 30px | Major section |
| Subsection | `text-2xl` | 24px | Subsection header |
| Card Title | `text-xl` | 20px | Card/block header |
| Small Header | `text-lg` | 18px | Minor header |
| **Body Text** | **`text-base`** | **16px** | **Default text** |
| Helper Text | `text-sm` | 14px | Hints, captions |
| Meta Text | `text-xs` | 12px | Timestamps, tags |

---

## 🎯 Examples from Codebase

### Settings Page (Correct)

```tsx
<h1 className="text-4xl font-bold">Settings</h1>
<p className="text-base text-muted-foreground">Description</p>

<label className="text-base font-medium">Full Name</label>
<input className="text-base px-4 py-3" />
```

### Dashboard (Correct)

```tsx
<h2 className="text-3xl font-bold">Welcome back, {name}!</h2>
<p className="text-base text-muted-foreground">Select a community</p>

<Link className="text-base font-medium">Communities</Link>
```

### Community Card (Correct)

```tsx
<h3 className="text-xl font-semibold">{community.name}</h3>
<p className="text-base text-muted-foreground">{community.description}</p>
<span className="text-sm text-muted-foreground">{memberCount} members</span>
```

---

## 🚀 Migration Checklist

When updating an existing page:

- [ ] Set page title to `text-4xl`
- [ ] Set section titles to `text-3xl`
- [ ] Set all body text to `text-base`
- [ ] Set form labels to `text-base font-medium`
- [ ] Set form inputs to `text-base px-4 py-3`
- [ ] Set buttons to `text-base px-6 py-2.5`
- [ ] Set helper text to `text-sm`
- [ ] Update spacing (space-y-5 or space-y-6 for forms)
- [ ] Test on mobile and desktop

---

**Last Updated:** December 2024  
**Status:** ✅ Active Standard
