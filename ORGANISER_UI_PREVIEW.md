# Organiser UI Preview

## Sidebar Navigation (Before vs After)

### BEFORE
```
Side Navigation
├── Dashboard
├── Tasks Hub
├── Shoot Calendar
├── QC Portal
├── My Notes
├── DPR
├── HR Portal
├── Chat
├── Discussions
├── Announcements
├── Reports
├── Social Analytics
├── Marketing Hub
├── Files Manager
├── Daily Summary
├── [Divider]
├── 🎟️ Event Organiser
├── 📅 Leave Organiser
├── 💻 Learnings Organiser
├── 🏠 WorkPlace Organiser
└── 📋 DM Content Organiser
```

### AFTER
```
Side Navigation
├── Dashboard
├── Tasks Hub
├── Shoot Calendar
├── QC Portal
├── My Notes
├── DPR
├── HR Portal
├── Chat
├── Discussions
├── Announcements
├── Reports
├── Social Analytics
├── Marketing Hub
├── Files Manager
├── Daily Summary
├── [Divider]
└── 📋 Organiser          ← NEW: Single consolidated button
```

## Organiser Panel - Tab Interface

```
┌────────────────────────────────────────────────────────────────┐
│                    ORGANISER PANEL                             │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐     │
│  │ 🎟️ Event │ 📅 Leave │ 💻 Learn │ 🏠 Work  │ 📋 DM    │     │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘     │
│                  ▼ Active tab underlined                       │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                                                        │   │
│  │  ┌─────────────────────────────────────┐             │   │
│  │  │ 🎟️ Event Organiser                 │             │   │
│  │  │ Current: John Doe                   │             │   │
│  │  └─────────────────────────────────────┘             │   │
│  │                                                        │   │
│  │  ┌─────────────────────────────────────┐             │   │
│  │  │ Share a New Event Idea              │             │   │
│  │  │ [Form Fields...]                    │             │   │
│  │  │ [Submit Button]                     │             │   │
│  │  └─────────────────────────────────────┘             │   │
│  │                                                        │   │
│  │  ┌─────────────────────────────────────┐             │   │
│  │  │ Event Planning Board                │             │   │
│  │  │ [List of shared events...]          │             │   │
│  │  └─────────────────────────────────────┘             │   │
│  │                                                        │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## Tab Content Display

### Tab: Event Organiser
```
📋 Event Organiser                      Current: John Doe
─────────────────────────────────────────────────────────

🎟️ Event Planning Board
├─ Diwali Celebration (Nov 2)
├─ Team Outing (Nov 15)
└─ Year-End Conference (Dec)
```

### Tab: Leave Organiser
```
📅 Leave Organiser                      Current: Sarah Khan
─────────────────────────────────────────────────────────

Leave Requests This Month
├─ John Doe - Oct 25-26 (Approved)
├─ Emma Smith - Oct 28 (Pending Review)
└─ Mike Johnson - Nov 1-3 (Pending)
```

### Tab: Learnings Organiser
```
💻 Learnings Organiser                  Current: Alex Kumar
──────────────────────────────────────────────────────────

Knowledge Sharing Resources
├─ React Best Practices (Oct 20)
├─ Cloud Migration Guide (Oct 25)
└─ Security Workshop (Nov)
```

### Tab: Workplace Organiser
```
🏠 WorkPlace Organiser                  Current: Lisa Chen
──────────────────────────────────────────────────────────

Office Suggestions
├─ Better WiFi in Meeting Rooms (Noted)
├─ Coffee Machine Upgrade (Planned)
└─ Parking Solutions (Under Review)
```

### Tab: DM Content Organiser
```
📋 DM Content Organiser                 Current: Maya Patel
──────────────────────────────────────────────────────────

Social Media Planning
├─ Instagram Campaign (Oct 2-15)
├─ LinkedIn Articles (Weekly)
└─ Twitter Threads (Daily)
```

## Tab Interactions

### Clicking Different Tabs

**Event Tab Active:**
```
┌─────────┬────────┬────────┬────────┬────────┐
│ 🎟️Event │ Leave  │ Learn  │ Work   │ DM     │
└─────────┴────────┴────────┴────────┴────────┘
    ▼ Highlighted + Underlined
```

**Leave Tab Active:**
```
┌────────┬─────────┬────────┬────────┬────────┐
│ Event  │ 📅Leave │ Learn  │ Work   │ DM     │
└────────┴─────────┴────────┴────────┴────────┘
             ▼ Highlighted + Underlined
```

## Mobile Responsive Design

### Desktop (> 640px)
```
┌─────────┬────────┬────────┬────────┬────────┐
│ 🎟️Event │ 📅Leave│ 💻Learn│ 🏠Work │ 📋 DM  │
└─────────┴────────┴────────┴────────┴────────┘
```

### Mobile (< 640px)
```
┌────┬────┬────┬────┬────┐
│ 🎟️ │ 📅 │ 💻 │ 🏠 │ 📋 │
└────┴────┴────┴────┴────┘
(Labels hidden, icons only)
```

## Color Scheme

### Light Mode
- **Inactive Tab**: Slate-500 text, transparent
- **Active Tab**: Indigo-600 (#4f46e5) text + border
- **Hover**: Light slate-50 background
- **Content**: White card with slate borders

### Dark Mode
- **Inactive Tab**: Slate-200 text, transparent
- **Active Tab**: Indigo-400 (#818cf8) text + border
- **Hover**: Slate-700 background
- **Content**: Dark slate cards

## Permission-Based Tab Display

### Event Organiser Only
```
┌─────────┐
│ 🎟️Event │ ← Only visible/accessible
└─────────┘
```

### Admin (All Roles)
```
┌─────────┬────────┬────────┬────────┬────────┐
│ 🎟️Event │ 📅Leave│ 💻Learn│ 🏠Work │ 📋 DM  │
└─────────┴────────┴────────┴────────┴────────┘
(Can access all tabs)
```

### No Organiser Role
```
No "Organiser" button in sidebar
Dashboard is the default view
```

## Animation & Transitions

- Tab switch: Smooth fade-in/out (0.2s)
- Active border: Instant highlight
- Hover effects: Smooth background change
- No jarring layout shifts

## Summary of UX Improvements

✅ **Cleaner Sidebar**
- Reduced from 5 buttons to 1
- Better visual hierarchy
- Less navigation clutter

✅ **Better Organization**
- All organiser functions in one place
- Clear tab labeling with icons
- Logical content grouping

✅ **Intuitive Navigation**
- Tab interface is familiar to users
- Quick switching between organiser roles
- Clear visual feedback for active tab

✅ **Responsive Design**
- Works on all screen sizes
- Mobile-friendly (icons only)
- Touch-friendly tap targets

✅ **Accessible**
- Proper ARIA labels possible (future enhancement)
- Clear visual states
- Keyboard navigation support (future enhancement)
