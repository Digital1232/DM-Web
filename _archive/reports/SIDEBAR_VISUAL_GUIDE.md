# Icon-Only Sidebar Visual Implementation Guide

## Component Layout (Collapsed State)

```
┌─────────────────────────────────────┐
│           SIDEBAR (76px)            │
├─────────────────────────────────────┤
│                                     │
│    ┌─────────────────────────────┐  │
│    │      TOGGLE BUTTON          │  │ 40×40px
│    │         (⟨)                 │  │
│    └─────────────────────────────┘  │
│                                     │
│    ═══════════════════════════════  │ Navigation Group 1
│          (start)                    │
│                                     │
│    ┌─────────────────────────────┐  │
│    │ 🏠 [badge]                  │  │ 48×48px active
│    │ (Dashboard)                 │  │
│    └─────────────────────────────┘  │ Indigo bg + 4px left border
│                                     │
│    ┌─────────────────────────────┐  │
│    │ 📋                          │  │ 48×48px hover
│    │ (Tasks)                     │  │
│    └─────────────────────────────┘  │
│                                     │
│    ┌─────────────────────────────┐  │
│    │ 📷                          │  │
│    │ (Shoots)                    │  │
│    └─────────────────────────────┘  │
│                                     │
│    ═══════════════════════════════  │ Divider: Operations & QC
│                                     │
│    ┌─────────────────────────────┐  │
│    │ ✓ [19]                      │  │ 48×48px with badge
│    │ (QC Portal)                 │  │
│    └─────────────────────────────┘  │
│                                     │
│    ┌─────────────────────────────┐  │
│    │ 📝                          │  │
│    │ (Notes)                     │  │
│    └─────────────────────────────┘  │
│                                     │
│    ┌─────────────────────────────┐  │
│    │ 📊                          │  │
│    │ (DPR)                       │  │
│    └─────────────────────────────┘  │
│                                     │
│    ═══════════════════════════════  │ Divider: Communication
│                                     │
│    [More items...]                  │
│                                     │
│    ═══════════════════════════════  │ Divider: Reports
│                                     │
│    [More items...]                  │
│                                     │
│    ═══════════════════════════════  │
│         (auto bottom)               │
│                                     │
│    ┌─────────────────────────────┐  │ Profile Widget
│    │ 👤                          │  │ 40×40px avatar
│    │                             │  │
│    │ [logout]                    │  │
│    └─────────────────────────────┘  │
│                                     │
│    💧 (water button below)          │
│                                     │
└─────────────────────────────────────┘
```

---

## Navigation Item States

### **Inactive (Normal)**
```
┌────────────────────┐
│                    │
│      📋           │  Color: #64748b (slate-500)
│                    │  Background: transparent
│                    │  Radius: 12px
│      (Tasks)       │
│                    │
└────────────────────┘
   48px × 48px
   Margin: 4px auto
```

### **Inactive (Hover)**
```
┌────────────────────┐
│  ┌──────────────┐  │
│  │              │  │  Color: #475569 (slate-600)
│  │    📋 (1.1x) │  │  Background: #f1f5f9 (slate-100)
│  │              │  │  Scale: 1.1
│  │  (Tasks)     │  │
│  └──────────────┘  │
└────────────────────┘
 + Tooltip on right
```

### **Active (Selected)**
```
┌──┬──────────────────┐
│  │                  │  Color: #4f46e5 (indigo-600)
│  │      📋          │  Background: rgba(79, 70, 229, 0.1)
│  │                  │  Left Border: 4px solid #4f46e5
│  │  (Dashboard)     │  Radius: 12px
│  │                  │  
└──┴──────────────────┘
  4px accent border
```

### **Badge Display**
```
      ┌───┐
      │19 │  18×18px
      └───┘  Position: top-right (+0, +0)
    ┌──────────────┐  White text, bold
    │              │  Font: 10px, 900 weight
    │    ✓ [19]    │  Shadow: 0 2px 4px rgba(0,0,0,0.1)
    │              │
    └──────────────┘
      48px × 48px
```

---

## Tooltip Positioning

### **Trigger**
- Hover on navigation button
- Delay: 0ms (immediate)
- Display: right side

### **Layout**
```
Button (48px)  |  Spacing  |  Tooltip
              12px gap
                            ┌──────────────┐
                            │ Dashboard    │
                            │              │
                            │ (0.75rem     │
                            │  padding)    │
                            └──────────────┘
                                ▲ Arrow
                                
Position: left 56px from button edge
Radius: 8px
Background: #1f2937 (dark gray)
Color: white
Shadow: 0 4px 12px rgba(0, 0, 0, 0.15)
```

---

## Notification Badge Styles

### **Active Badge** (visible)
```
┌───────────────┐
│    18×18px    │  Background: Color-coded
│      19       │  • Indigo-600: Tasks, Discussions
│               │  • Rose-500: QC, HR
│               │  • Emerald-500: Chat
└───────────────┘  • Amber-500: Announcements
  Position: absolute top-0 right-0
  Border-radius: 9999px (circle)
  Font: 10px bold
  Shadow: 0 2px 4px rgba(0, 0, 0, 0.1)
```

### **Hidden Badge** (count = 0)
- Displays only when count > 0
- Smooth fade-in/out transition

---

## Section Dividers

### **Divider Styling**
```
════════════════════  1px height
                      40px width
                      #e2e8f0 (light gray)
                      Margin: 0.5rem 0
                      Centered horizontally
```

### **Groups Separated**
1. Main Navigation → QC Portal
2. DPR → HR Portal
3. Announcements → Reports
4. (Optional) Organisers → Admin Settings

---

## Dark Mode Colors

### **Base Sidebar**
- Background: `rgba(13, 18, 32, 0.98)` with gradient
- Border: `#253347`
- Shadow: `12px 0 40px rgba(0, 0, 0, 0.28)`

### **Navigation Items (Dark)**
- Normal: `#94a3b8` (slate-400)
- Hover: `#cbd5e1` (slate-200) with `#1e2a3a` background
- Active: `#818cf8` (indigo-400) with `rgba(79, 70, 229, 0.15)` background

### **Dividers (Dark)**
- `#253347` (slate-700)

### **Tooltips (Dark)**
- Background: `#f1f5f9` (light)
- Text: `#1f2937` (dark)
- Border arrow: `#f1f5f9`

---

## Measurements Reference

| Component | Dimension | Note |
|-----------|-----------|------|
| Sidebar Width | 76px | Collapsed |
| Navigation Item | 48×48px | Square with icon |
| Icon Size | 20×20px | Centered |
| Badge Size | 18×18px | Circle |
| Divider Height | 1px | Full width 40px |
| Divider Margin | 0.5rem (8px) | Top & bottom |
| Item Margin | 4px | Between buttons |
| Toggle Button | 40×40px | Square with radius 8px |
| Profile Avatar | 40×40px | Square with radius 12px |
| Tooltip Distance | 12px | From button edge |

---

## Transitions & Animations

| Property | Duration | Timing | Trigger |
|----------|----------|--------|---------|
| Background color | 0.2s | ease-in-out | Hover |
| Icon scale | 0.2s | ease-in-out | Hover |
| Sidebar width | 0.3s | ease-in-out | Toggle |
| Tooltip opacity | ~0ms | immediate | Hover |

---

## Accessibility Features

✅ **Tooltips for icon clarity** - Labels visible on hover
✅ **Sufficient color contrast** - #4f46e5 on light/dark
✅ **Clear focus states** - Active indication with border
✅ **Badge counts visible** - Text, not just color
✅ **Smooth animations** - No motion sickness triggers
✅ **Keyboard navigable** - All buttons can be tabbed

---

## Responsive Behavior

### **Desktop (> 768px)**
- Sidebar can collapse to 76px
- Full 240px expanded view
- Toggle button visible

### **Tablet (768px - 1024px)**
- Sidebar responsive
- Toggle button on header when closed

### **Mobile (< 768px)**
- Sidebar becomes drawer
- Fixed position overlay
- Slides from left to right
- Full height with transparency backdrop

