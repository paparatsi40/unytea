# 🎉 Welcome Message Feature - Migration Guide

## 📊 Database Changes

### Fields Added:

**Community Model:**

- `welcomeMessage` (Text, nullable) - Rich text welcome message editable by owner
- `showWelcomeMessage` (Boolean, default: true) - Toggle to enable/disable welcome message

**Member Model:**

- `welcomeMessageSeen` (Boolean, default: false) - Track if member saw the welcome message

---

## 🚀 Apply Migration

```bash
cd web
npx prisma migrate dev --name add_welcome_message
```

---

## ✅ What This Enables:

1. **Owners** can write custom welcome messages for new members
2. **New members** see the welcome message once when they join
3. **Welcome banner** appears at the top of the feed (dismissible)
4. **Tracking** ensures message is only shown once per member

---

## 🎨 Features:

- Rich text editor for owners
- Markdown support
- Toggle to enable/disable
- Auto-dismiss after viewing
- Beautiful gradient banner design

---

**Run the migration command above to enable this feature!** 🎉