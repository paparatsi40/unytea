# Localization Audit: Hardcoded Strings for next-intl Migration

**Project**: Mentorly Web (Unytea)  
**Current Localization**: next-intl with partial JSON namespaces (en.json, es.json, fr.json)  
**Status**: Many hardcoded strings found - Priority localization needed

---

## Executive Summary

The app has **3 locale files** (en.json, es.json, fr.json) with existing keys but uses `useTranslations()` inconsistently. **~50+ hardcoded user-facing strings** were identified across high-traffic pages and shared components. These should be extracted to JSON namespaces for full localization coverage.

---

## 🔴 Priority 1: Landing Page & Auth Pages

### File: `app/[locale]/page.tsx` (Main Landing Page)
**Impact**: First user impression, critical conversion funnel  
**Status**: Mostly hardcoded, minimal translation usage

#### Hardcoded Strings Found:

```typescript
// Navigation
"Explore communities"          // Line 57
"Features"                      // Line 60
"vs Skool"                      // Line 63
"Pricing"                       // Line 66
"Go to Dashboard"              // Line 77 (hardcoded, not using authT)

// Hero section
"Trusted by creators, coaches, and educators worldwide"  // Line 109
"Build a community that"        // Line 112
"learns live"                   // Line 114
"Host live sessions, courses, and community discussions — all in one place."  // Line 118
"Create Your Community Free"    // Line 125
"Explore communities"           // Line 133
"Watch Demo"                    // Line 140

// Feature bullets
"Live sessions"                 // Line 241
"Courses"                       // Line 247
"Community discussions"         // Line 253
"Built-in monetization"        // Line 259

// Market problem section
"Most community platforms are built like"  // Line 270
"forums from 2010"             // Line 271
"They focus on posts and discussions. But modern communities need more:"  // Line 274
"Live interaction"             // Line 291
"Missing real-time video, whiteboard, screen sharing"  // Line 292
```

**Suggested Namespace**: `landing.page`

```json
{
  "landing": {
    "page": {
      "nav": {
        "explore": "Explore communities",
        "features": "Features",
        "comparison": "vs Skool",
        "pricing": "Pricing",
        "goToDashboard": "Go to Dashboard"
      },
      "hero": {
        "badge": "Trusted by creators, coaches, and educators worldwide",
        "headline": "Build a community that",
        "headlineHighlight": "learns live",
        "subheadline": "Host live sessions, courses, and community discussions — all in one place.",
        "cta": "Create Your Community Free",
        "ctaExplore": "Explore communities",
        "ctaDemo": "Watch Demo",
        "trial": "14-day free trial"
      },
      "features": {
        "liveSessions": "Live sessions",
        "courses": "Courses",
        "discussions": "Community discussions",
        "monetization": "Built-in monetization"
      },
      "problem": {
        "headline": "Most community platforms are built like",
        "subheading": "forums from 2010",
        "description": "They focus on posts and discussions. But modern communities need more:",
        "liveInteraction": "Live interaction",
        "missingFeatures": "Missing real-time video, whiteboard, screen sharing"
      }
    }
  }
}
```

---

## 🔴 Priority 2: Dashboard Components

### File: `components/dashboard/sidebar.tsx`
**Impact**: Core navigation, seen on every dashboard page  
**Status**: Completely hardcoded

#### Hardcoded Strings:
```typescript
"Dashboard"                     // Line 21
"Communities"                   // Line 22
"Messages"                      // Line 23
"Sessions"                      // Line 24
"Recordings"                    // Line 25
"Knowledge Library"             // Line 26
"Courses"                       // Line 27
"Analytics"                     // Line 28
"Achievements"                  // Line 29
"Notifications"                 // Line 30
"Settings"                      // Line 31
"Upgrade to Premium"            // Line 81
"Unlock all features"           // Line 84
"Upgrade Now"                   // Line 90
```

**Suggested Namespace**: `navigation.sidebar`

```json
{
  "navigation": {
    "sidebar": {
      "dashboard": "Dashboard",
      "communities": "Communities",
      "messages": "Messages",
      "sessions": "Sessions",
      "recordings": "Recordings",
      "knowledgeLibrary": "Knowledge Library",
      "courses": "Courses",
      "analytics": "Analytics",
      "achievements": "Achievements",
      "notifications": "Notifications",
      "settings": "Settings",
      "upgrade": {
        "title": "Upgrade to Premium",
        "description": "Unlock all features",
        "button": "Upgrade Now"
      }
    }
  }
}
```

### File: `components/dashboard/header.tsx`
**Impact**: Header on every page, user profile area  
**Status**: Partially localized (uses `t()` but some strings missing)

#### Issues:
- Line 45: Uses `t("common.search")` ✅ (Good)
- Line 53: Uses `t("navigation.messages")` ✅ (Good)
- Line 67: Uses `t("navigation.profile")` ✅ (Good)
- Line 73: Uses `t("navigation.profile")` ✅ (Good)
- Line 88: Uses `t("navigation.logout")` ✅ (Good)

**Status**: This component is well-localized. Ensure keys exist in all locale files.

---

## 🟠 Priority 3: Community & Feed Components

### File: `components/community/CommentSection.tsx`
**Impact**: High visibility in community feed  
**Status**: Partially hardcoded

#### Hardcoded Strings:
```typescript
"{comments.length} Comments"         // Line 78
"No comments yet"                    // Line 113
"Be the first to comment!"          // Line 114
```

**Suggested Namespace**: `community.comments`

```json
{
  "community": {
    "comments": {
      "header": "Comments",
      "empty": "No comments yet",
      "emptySubtext": "Be the first to comment!"
    }
  }
}
```

### File: `components/community/PremiumPostFeed.tsx`
**Impact**: Core feed interaction  
**Status**: Heavily hardcoded

#### Hardcoded Strings:
```typescript
"Failed to create post"              // Line 156, 200
"Shared an attachment"              // Line 180
"You"                               // Line 187
```

**Suggested Namespace**: `community.feed`

```json
{
  "community": {
    "feed": {
      "errors": {
        "postFailed": "Failed to create post"
      },
      "attachments": {
        "shared": "Shared an attachment"
      },
      "author": {
        "you": "You"
      }
    }
  }
}
```

### File: `components/explore/ExploreFilters.tsx`
**Impact**: Explore page filters  
**Status**: Multiple hardcoded filter labels

#### Hardcoded Strings:
```typescript
"Search communities"                // Line 70
"Free + Paid"                       // Line 79
"Free"                              // Line 80
"Paid"                              // Line 81
"All languages"                     // Line 89
"Any schedule"                      // Line 102
"Sessions this week"               // Line 103
"Trending"                         // Line 111
"Most members"                     // Line 112
"Newest"                           // Line 113
"All Categories"                   // Line 120
"filters fallback"                 // Line 140 (SR only)
```

**Suggested Namespace**: `explore.filters`

```json
{
  "explore": {
    "filters": {
      "search": "Search communities",
      "monetization": {
        "all": "Free + Paid",
        "free": "Free",
        "paid": "Paid"
      },
      "languages": {
        "all": "All languages"
      },
      "schedule": {
        "all": "Any schedule",
        "sessionsThisWeek": "Sessions this week"
      },
      "sort": {
        "trending": "Trending",
        "members": "Most members",
        "newest": "Newest"
      },
      "categories": {
        "all": "All Categories"
      }
    }
  }
}
```

---

## 🟡 Priority 4: Messaging & Notifications

### File: `components/messages/MessageInput.tsx`
**Impact**: Critical interaction point  
**Status**: Partially hardcoded

#### Hardcoded Strings:
```typescript
"Write a message or add an attachment."  // Line 35
`Message must be ${MAX_MESSAGE_LENGTH} characters or less.`  // Line 40
"Type a message... (Shift+Enter for new line)"  // Line 175
"Enter to send · Shift+Enter for new line"    // Line 243
"Uploading..."                      // Line 244
```

**Note**: This component needs dynamic messages with character count. Consider using translation + interpolation.

**Suggested Namespace**: `messages.input`

```json
{
  "messages": {
    "input": {
      "placeholder": "Type a message... (Shift+Enter for new line)",
      "errors": {
        "empty": "Write a message or add an attachment.",
        "tooLong": "Message must be {{maxLength}} characters or less."
      },
      "hints": {
        "keyboard": "Enter to send · Shift+Enter for new line",
        "uploading": "Uploading..."
      },
      "buttons": {
        "emoji": "Add emoji",
        "attach": "Attach file"
      }
    }
  }
}
```

### File: `components/notifications/NotificationCenter.tsx`
**Impact**: Real-time notification display  
**Status**: Mostly hardcoded

#### Hardcoded Strings Found:
- Notification type icons are hardcoded (MESSAGE, COMMENT, REACTION, NEW_POST, NEW_MEMBER, ACHIEVEMENT, SYSTEM)
- Toast messages: "Marked as read" (NotificationItem.tsx:63)
- Toast messages: "Notification deleted" (NotificationItem.tsx:78)
- Toast messages: "All notifications marked as read" (NotificationHeader.tsx:20)
- Toast messages: "All read notifications deleted" (NotificationHeader.tsx:33)

**Suggested Namespace**: `notifications.actions`

```json
{
  "notifications": {
    "actions": {
      "markRead": "Marked as read",
      "deleted": "Notification deleted",
      "markAllRead": "All notifications marked as read",
      "deleteAllRead": "All read notifications deleted"
    }
  }
}
```

---

## 🟡 Priority 5: Live Session & Interaction Components

### File: `components/live-session/LivePoll.tsx`
**Impact**: Interactive elements in live sessions  
**Status**: No hardcoded user-facing text yet (but poll options will need translation keys)

**Suggestion**: Prepare namespace structure for poll UI:

```json
{
  "liveSession": {
    "poll": {
      "results": "Results",
      "hasVoted": "You voted",
      "timeRemaining": "Time remaining",
      "closed": "Poll closed"
    }
  }
}
```

### File: `components/sessions/CreateSessionDialog.tsx`
**Impact**: Session creation flow  
**Status**: Mostly hardcoded labels and UI text

#### Hardcoded Strings:
```typescript
"Create Session"                    // Line 56 (triggerText default)
"Sun", "Mon", "Tue", etc.          // Lines 24-30
"Pacific Time (PT)"                // Line 35 (and other timezones)
"Select a section to edit its settings"  // Locale file shows this should use trans
```

**Suggested Namespace**: `sessions.create`

```json
{
  "sessions": {
    "create": {
      "title": "Create Session",
      "modes": {
        "now": "Start now",
        "scheduled": "Schedule for later"
      },
      "types": {
        "video": "Video session",
        "audio": "Audio only"
      },
      "weekdays": {
        "sun": "Sunday",
        "mon": "Monday",
        "tue": "Tuesday",
        "wed": "Wednesday",
        "thu": "Thursday",
        "fri": "Friday",
        "sat": "Saturday"
      },
      "timezones": {
        "pt": "Pacific Time (PT)",
        "mt": "Mountain Time (MT)",
        "ct": "Central Time (CT)",
        "et": "Eastern Time (ET)"
      }
    }
  }
}
```

---

## 🟡 Priority 6: Library & Resources

### File: `components/library/ResourceCard.tsx`
**Impact**: Knowledge library display  
**Status**: No hardcoded user-facing text visible (mostly using icons)

**Ensure** these computed values are translatable:
- Duration format: `${hours}h ${mins % 60}m` / `${mins}m`

**Suggested Namespace**: `library.resources`

```json
{
  "library": {
    "resources": {
      "duration": {
        "hours": "{{hours}}h {{minutes}}m",
        "minutes": "{{minutes}}m"
      }
    }
  }
}
```

---

## 🟢 Priority 7: Error Messages & Toasts (Lower Impact but Needed)

### Scattered Toast Messages (High Priority):

| Component | String | Line | Suggested Key |
|-----------|--------|------|---|
| `community/CommunityActions.tsx` | "Successfully joined!" | 45 | `community.actions.joinSuccess` |
| `dashboard/ShareableMetrics.tsx` | "Failed to generate image. Please try again." | 47 | `dashboard.metrics.generateError` |
| `dashboard/ShareableMetrics.tsx` | "Copied to clipboard! Share on X, LinkedIn, or Discord." | 58 | `dashboard.metrics.copied` |
| `dashboard/ShareableMetrics.tsx` | "Generating..." / "Download Image" | 172 | `dashboard.metrics.generating` / `downloadImage` |
| `ai/AIChatWidget.tsx` | "Failed to send message. Please try again." | 82 | `ai.errors.sendFailed` |
| `community/PostCard.tsx` | "just now" | 47 | `common.time.justNow` |
| `chat/PusherChat.tsx` | "just now" | 193 | `common.time.justNow` |
| `buddy/BuddyDashboard.tsx` | "Goal title..." / "Description..." | 222, 228 | `buddy.placeholders.goalTitle` / `description` |
| `editor/RichTextEditor.tsx` | "Start writing..." | 32 | `editor.placeholder` |

---

## 📊 Summary by Category

| Category | Count | Files | Priority |
|----------|-------|-------|----------|
| **Navigation & UI** | 20+ | sidebar, header, dashboard | 🔴 P1 |
| **Landing Page** | 30+ | page.tsx | 🔴 P1 |
| **Comments & Feed** | 8+ | CommentSection, PostFeed | 🟠 P2 |
| **Filters & Explore** | 12+ | ExploreFilters | 🟠 P2 |
| **Messages** | 8+ | MessageInput, ConversationList | 🟡 P3 |
| **Notifications** | 6+ | NotificationCenter, NotificationItem | 🟡 P3 |
| **Sessions & Live** | 10+ | CreateSessionDialog, LivePoll | 🟡 P3 |
| **Toast & Errors** | 10+ | Scattered | 🟢 P4 |
| **Resources & Library** | 4+ | ResourceCard, CategorySidebar | 🟢 P4 |

**Total Hardcoded Strings**: ~120+

---

## 🛠️ Recommended Implementation Order

1. **Phase 1**: Landing page (`app/[locale]/page.tsx`) + Dashboard sidebar/header
   - Highest user impact
   - Sets tone for rest of app

2. **Phase 2**: Community feed components (comments, posts, explore filters)
   - High engagement areas
   - Many user interactions

3. **Phase 3**: Messaging, notifications, sessions
   - Important but secondary

4. **Phase 4**: Toast messages, error states, edge cases
   - Polish and consistency

---

## 🎯 Integration Checklist

- [ ] Create new namespace files in `locales/`:
  - `landing.json`
  - `navigation.json`
  - `community.json`
  - `explore.json`
  - `messages.json`
  - `notifications.json`
  - `sessions.json`
  - `dashboard.json`

- [ ] Update `pages/[locale]/page.tsx` to use `useTranslations("landing")`

- [ ] Update all sidebar/header components to use new `navigation` namespace

- [ ] Add translation keys for dynamic content (character counts, timers, etc.) with interpolation

- [ ] Use `<Trans>` component for long-form text with formatting

- [ ] Test all locale files for missing keys using `next-intl` validation

- [ ] Consider adding locale-specific formatting:
  - Date/time (use `date-fns` with locale)
  - Numbers/currency
  - Relative times ("2 hours ago" vs "hace 2 horas")

---

## 📝 Notes

1. **Character Counts**: MessageInput uses dynamic `message.length/${MAX_MESSAGE_LENGTH}` - use template variables
2. **Timezones**: CreateSessionDialog has hardcoded timezone names - these should be externalized
3. **Date Formatting**: Components use `date-fns` with locale support - ensure locale context is passed
4. **Toast Messages**: Use `sonner` toast library which supports custom content - consider creating localized toast helpers
5. **Time Relative**: "just now", "2 hours ago" should use locale-aware formatting via `date-fns`

---

## 🚀 Quick Start Code Example

```typescript
// Before (hardcoded)
<button>{isLoading ? "Generating..." : "Download Image"}</button>

// After (localized)
const t = useTranslations("dashboard.metrics");
<button>{isLoading ? t("generating") : t("downloadImage")}</button>
```

```typescript
// For dynamic content with interpolation
const t = useTranslations("messages.input");
<p>{t("errors.tooLong", { maxLength: MAX_MESSAGE_LENGTH })}</p>
```
