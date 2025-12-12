# 🏗️ ARCHITECTURE REFACTOR - Community-Based Structure

**Date:** December 10, 2024  
**Status:** ✅ Phase 1 Complete - Structure Created  
**Next:** Phase 2 - Migrate Existing Features

---

## 📋 **WHAT WAS CHANGED**

### **OLD ARCHITECTURE (Global/Mixed):**

```
/dashboard
  ├─ Messages (all mixed)
  ├─ Sessions (all mixed)
  ├─ Courses (all mixed)
  ├─ Analytics (all mixed)
  └─ Communities
```

### **NEW ARCHITECTURE (Community-Scoped):**

```
/dashboard (Community Selector)
  ↓
/dashboard/communities/[id]
  ├─ Feed
  ├─ Chat (community-specific)
  ├─ Sessions (community-specific)
  ├─ Courses (community-specific)
  ├─ Leaderboard
  ├─ Members
  └─ Settings (owners only)
```

---

## ✅ **WHAT'S ALREADY BUILT (DON'T LOSE!)**

### **1. VIDEO CALLS - LiveKit Integration** 🎥

**Location:**

- `components/video-call/EnhancedVideoCall.tsx` (578 lines) - **MAIN COMPONENT**
- `components/video-call/VideoCallRoom.tsx` (120 lines)
- `components/sessions/VideoRoom.tsx` (123 lines)
- `components/sessions/VideoRoomContent.tsx` (102 lines)

**Features:**

- ✅ LiveKit integration
- ✅ Screen sharing
- ✅ Recording
- ✅ Transcription
- ✅ Multi-user support
- ✅ Hand raise queue
- ✅ Chat in video

**APIs:**

- `app/api/livekit/token/route.ts` - Token generation
- `app/api/sessions/[sessionId]/route.ts` - Session management

**Pages (Currently Global):**

- `app/(dashboard)/dashboard/sessions/page.tsx` - Sessions list
- `app/(dashboard)/dashboard/sessions/[sessionId]/video/page.tsx` - Video call page
- `app/(dashboard)/dashboard/sessions/[sessionId]/room/page.tsx` - Alternative room page
- `app/(dashboard)/dashboard/test-video/page.tsx` - Test page
- `app/(dashboard)/dashboard/video-test/page.tsx` - Alternative test

**Actions:**

- `app/actions/sessions.ts` - Session CRUD
- `app/actions/recordings.ts` - Recording management

---

### **2. CONTENT SHARING PANEL** 📊

**Location:**

- `components/sessions/ContentPanel.tsx` (161 lines) - **UNIQUE FEATURE**
- `components/sessions/WhiteboardCanvas.tsx` (94 lines) - Drawing/annotations
- `components/sessions/FileViewer.tsx` (162 lines) - PDF/document viewer
- `components/sessions/VideoEmbed.tsx` (145 lines) - YouTube/Vimeo embeds

**Features:**

- ✅ Whiteboard with drawing tools
- ✅ PDF viewer
- ✅ YouTube/Vimeo embeds
- ✅ Screen sharing control
- ✅ File sharing

**Components:**

- `components/sessions/ScreenShareControl.tsx` (86 lines)
- `components/sessions/HandRaiseButton.tsx` (38 lines)
- `components/sessions/HandRaiseQueue.tsx` (126 lines)

---

### **3. MESSAGES/CHAT** 💬

**Location:**

- `app/(dashboard)/dashboard/messages/page.tsx` (75 lines)

**Features:**

- ✅ Real-time chat
- ✅ WebSocket integration
- ✅ Message history

**Status:** Currently global, needs to be community-scoped

---

### **4. FILE UPLOADS - UploadThing Integration** 📁

**Location:**

- `app/api/uploadthing/core.ts` - **FILE ROUTER CONFIG**
- `app/api/uploadthing/route.ts` - Route handler
- `lib/uploadthing.ts` - React helpers

**Uploaders Configured:**

- ✅ `avatarUploader` - Profile pictures (2MB, 1 file)
- ✅ `imageUploader` - Posts/comments (4MB, 5 files)
- ✅ `communityBranding` - Logos/covers (10MB, 1 file)
- ✅ `documentUploader` - PDFs/docs (8MB, 3 PDFs, 5 text)
- ✅ `mediaUploader` - Videos/audio (32MB video, 8MB audio)

**Used In:**

- `components/sessions/FileViewer.tsx` (162 lines) - Display uploaded files
- `app/(dashboard)/dashboard/communities/new/page.tsx` - Community creation
- `app/(dashboard)/dashboard/c/[slug]/settings/appearance/page.tsx` - Branding

**Features:**

- ✅ Drag & drop upload
- ✅ File type validation
- ✅ Size limits
- ✅ Progress tracking
- ✅ Secure middleware (auth required)

**Status:** ✅ FULLY FUNCTIONAL - Ready to use in sessions

---

### **5. SUBSCRIPTION & LIMITS** 💳

**Location:**

- `lib/subscription-limits.ts` - Usage tracking
- `lib/stripe/` - Payment integration

**Features:**

- ✅ Video call limits
- ✅ Member limits
- ✅ Usage tracking
- ✅ Overage calculation

---

## 🚀 **MIGRATION PLAN - Phase 2**

### **Step 1: Move Sessions to Community Context**

**FROM:**

```
/dashboard/sessions → (all communities mixed)
```

**TO:**

```
/dashboard/communities/[id]/sessions → (community-specific)
```

**Tasks:**

1. Copy `EnhancedVideoCall.tsx` → Already ready to use
2. Update `/sessions/page.tsx` to filter by `communityId`
3. Update session creation to require `communityId`
4. Update queries to include `WHERE communityId = ?`

**Files to Modify:**

- `app/actions/sessions.ts` - Add `communityId` parameter
- Database: Add `communityId` to `mentor_sessions` table (if not exists)

---

### **Step 2: Move Messages/Chat to Community Context**

**FROM:**

```
/dashboard/messages → (all chats mixed)
```

**TO:**

```
/dashboard/communities/[id]/chat → (community-specific)
```

**Tasks:**

1. Use existing chat component
2. Scope messages by `communityId`
3. Create community-specific rooms

---

### **Step 3: Keep Content Sharing Universal**

**Content Panel** can be used in ANY session within ANY community.

**No changes needed** - it's already component-based and reusable.

---

## 📁 **FILE STRUCTURE - NEW vs OLD**

### **Keep As-Is (Reusable Components):**

```
components/
  ├─ video-call/
  │   ├─ EnhancedVideoCall.tsx ✅ USE THIS
  │   └─ VideoCallRoom.tsx ✅ USE THIS
  ├─ sessions/
  │   ├─ ContentPanel.tsx ✅ USE THIS
  │   ├─ WhiteboardCanvas.tsx ✅ USE THIS
  │   ├─ FileViewer.tsx ✅ USE THIS
  │   ├─ VideoEmbed.tsx ✅ USE THIS
  │   ├─ ScreenShareControl.tsx ✅ USE THIS
  │   ├─ HandRaiseButton.tsx ✅ USE THIS
  │   └─ HandRaiseQueue.tsx ✅ USE THIS
  └─ community/
      ├─ CommunitySwitcher.tsx (NEW)
      └─ CommunitySidebar.tsx (NEW)
```

### **Migrate (Pages to Update):**

```
OLD: app/(dashboard)/dashboard/sessions/
NEW: app/(dashboard)/dashboard/communities/[communityId]/sessions/

OLD: app/(dashboard)/dashboard/messages/
NEW: app/(dashboard)/dashboard/communities/[communityId]/chat/
```

### **Keep for Testing:**

```
app/(dashboard)/dashboard/test-video/ ✅ KEEP
app/(dashboard)/dashboard/video-test/ ✅ KEEP
```

---

## 🔧 **HOW TO INTEGRATE VIDEO CALLS**

### **Option A: Copy Existing Implementation**

Replace placeholder in:
`app/(dashboard)/dashboard/communities/[communityId]/sessions/page.tsx`

With content from:
`app/(dashboard)/dashboard/sessions/page.tsx`

**Changes needed:**

```typescript
// OLD:
const { data: sessions } = await supabase
  .from("mentor_sessions")
  .select("*")
  .eq("mentorId", session.user.id)

// NEW:
const { data: sessions } = await supabase
  .from("mentor_sessions")
  .select("*")
  .eq("communityId", params.communityId) // ADD THIS FILTER
  .order("scheduledFor", { ascending: true })
```

### **Option B: Keep Global + Community Views**

- Keep `/dashboard/sessions` for **personal/1-on-1 sessions**
- Use `/dashboard/communities/[id]/sessions` for **community group sessions**

This gives you BOTH options!

---

## 🎯 **RECOMMENDED APPROACH**

### **Hybrid Model:**

1. **Global Features (Keep in `/dashboard`):**
    - Personal 1-on-1 coaching sessions
    - Direct messages with specific users
    - Personal calendar/schedule

2. **Community Features (New structure):**
    - Community group sessions
    - Community chat rooms
    - Community courses
    - Community leaderboard

3. **Reusable Components (Use everywhere):**
    - `EnhancedVideoCall` - Works in BOTH contexts
    - `ContentPanel` - Works in BOTH contexts
    - `WhiteboardCanvas` - Works in BOTH contexts

---

## 📊 **DATABASE CHANGES NEEDED**

Add `communityId` to these tables (if not exists):

```sql
-- mentor_sessions table
ALTER TABLE mentor_sessions 
ADD COLUMN community_id UUID REFERENCES communities(id);

-- messages table (if exists)
ALTER TABLE messages 
ADD COLUMN community_id UUID REFERENCES communities(id);

-- courses table (if exists)
ALTER TABLE courses 
ADD COLUMN community_id UUID REFERENCES communities(id);
```

Make `communityId` **optional** to support both:

- Personal sessions (communityId = null)
- Community sessions (communityId = xyz)

---

## ✅ **CHECKLIST - Next Steps**

```
Phase 1: Structure ✅ DONE
  ✅ Simplified sidebar
  ✅ Community selector
  ✅ CommunitySwitcher component
  ✅ CommunitySidebar component
  ✅ Community layout
  ✅ Placeholder pages

Phase 2: Integrate Existing Features ⏳ TODO
  ⬜ Add communityId to database tables
  ⬜ Update sessions to work in community context
  ⬜ Update chat to work in community context
  ⬜ Keep test pages functional
  ⬜ Update APIs to filter by communityId

Phase 3: Testing ⏳ TODO
  ⬜ Test video calls in community context
  ⬜ Test content sharing panel
  ⬜ Test chat in community
  ⬜ Test permissions (owner vs member)
```

---

## 🚫 **WHAT WE DID NOT LOSE**

### **ALL Existing Code Is Safe:**

- ✅ **578 lines** of `EnhancedVideoCall.tsx` - INTACT
- ✅ **161 lines** of `ContentPanel.tsx` - INTACT
- ✅ **94 lines** of `WhiteboardCanvas.tsx` - INTACT
- ✅ **162 lines** of `FileViewer.tsx` - INTACT
- ✅ **145 lines** of `VideoEmbed.tsx` - INTACT
- ✅ **126 lines** of `HandRaiseQueue.tsx` - INTACT
- ✅ **123 lines** of `VideoRoom.tsx` - INTACT
- ✅ LiveKit API integration - INTACT
- ✅ Recording system - INTACT
- ✅ Transcription - INTACT
- ✅ Screen sharing - INTACT

### **We Only Changed:**

- ❌ Sidebar structure (simplified)
- ❌ Dashboard landing page (now community selector)
- ❌ Added placeholder pages (temporary)

### **Everything Else:**

- ✅ **Fully functional and ready to use**
- ✅ **Just needs to be wired into new structure**

---

## 💡 **KEY INSIGHT**

The refactor is **STRUCTURAL, not functional**.

We changed the **navigation and organization**, but kept all the **working code intact**.

It's like renovating a house:

- We changed the **room layout** (structure)
- But kept all the **furniture and appliances** (components)
- Now we just need to **move the furniture** into the new rooms

---

## 📞 **Next Actions**

1. **Test current structure:**
    - Create a community
    - See the switcher work
    - Navigate between sections

2. **Choose migration strategy:**
    - Hybrid (Global + Community)
    - Or Full Community-only

3. **Add communityId to database**

4. **Wire up existing components**

**Estimated time:** 2-3 hours to fully integrate existing features

---

**Remember:** We didn't lose ANY code. It's all there, ready to be integrated! 🚀
