# Navigation Menu Alignment Standard

## Overview
All navigation menus across the application now follow a unified alignment system to ensure visual consistency.

## Alignment Standards

### 1. Sidebar Navigation (Vertical - Left Border)
**Location**: Main navigation in left sidebar
**Active State**: 
- Background: Light mode `#f1f5f9` | Dark mode `#1e2a3a`
- Border: Right side, 3px solid `#4f46e5` (light) / `#818cf8` (dark)
- Padding: `px-3 py-2.5` with `padding-right: calc(0.75rem - 3px)` to compensate for border
- Color: Light mode `#0f172a` | Dark mode `#f1f5f9`

**CSS Class**: `.nav-active`

---

### 2. Report Tab Navigation (Vertical - Left Border)
**Location**: Report tabs sidebar
**Active State**:
- Background: `#eef2ff` (light) / `#1e2a4a` (dark)
- Border: Left side, 3px solid `#4f46e5` (light) / `#818cf8` (dark)
- Padding: `px-5 py-3` with `padding-left: calc(0.75rem - 3px)` to compensate for border
- Color: `#4338ca` (light) / `#818cf8` (dark)
- Font Weight: 800

**CSS Class**: `.report-tab-btn.rt-active`

---

### 3. Marketing Hub Tabs (Horizontal - Bottom Border)
**Location**: Marketing Hub content area tabs
**Container**: `#mh-tabs-container`
- Border-bottom: 2px solid `#e2e8f0` (light) / `#253347` (dark)
- Padding-bottom: 0
- Gap between tabs: 0.5rem

**Tab Button Structure**:
- All tabs positioned with `position: relative; bottom: -2px` to align with container border
- Active tab: `bottom: 0` to sit on the border line

**Active State**:
- Border: Bottom side, 2px solid `#4f46e5` (light) / `#818cf8` (dark)
- Padding: `0.5rem 1rem` (0.5rem vertical, 1rem horizontal)
- Color: `#4f46e5` (light) / `#818cf8` (dark)
- Font Weight: 700
- Bottom position: 0

**CSS Classes**: `.mh-tab-btn.mh-tab-active`

**Inactive State**:
- Border: Bottom side, 2px solid transparent
- Color: `#64748b` (light) / `#94a3b8` (dark)
- Font Weight: 600
- Bottom position: -2px (sits below container border)
- Padding: `0.5rem 1rem`

**Hover State** (inactive tabs only):
- Border-bottom-color: `#cbd5e1` (light) / `#cbd5e1` (dark)
- Color: `#4f46e5` (light) / `#818cf8` (dark)
- Uses `:not(.mh-tab-active)` selector to avoid hover on active tab

---

### 4. Tasks Hub Tabs (Horizontal - Bottom Border)
**Location**: Tasks Hub section tabs
**Active State**:
- Background: `#4f46e5` (light) / `#818cf8` (dark)
- Color: White (light) / `#0f172a` (dark)
- Border: Bottom side, 3px solid `#4f46e5` (light) / `#818cf8` (dark)
- Padding: `px-5 py-2.5`
- Box Shadow: `0 4px 12px rgba(79, 70, 229, 0.25)` (light) / `0 4px 12px rgba(129, 140, 248, 0.3)` (dark)
- Rounded: `rounded-xl`

**CSS Class**: `.tasks-tab-active`

**Inactive State**:
- Background: `#f1f5f9` (light) / `#1e2a3a` (dark)
- Color: `#64748b` (light) / `#94a3b8` (dark)
- Hover: Background to `#e2e8f0` (light) / `#253347` (dark)

---

## Implementation Checklist

- [x] Sidebar navigation uses consistent right-border styling
- [x] Report tabs aligned with consistent left-border styling
- [x] Marketing Hub tabs use bottom-border styling with proper positioning
- [x] Marketing Hub tab container has fixed border and spacing
- [x] Marketing Hub tabs positioned relative to container border for alignment
- [x] Tasks Hub tabs use bottom-border styling
- [x] All active states use proper color contrasts
- [x] Dark mode variants maintain consistency
- [x] Padding adjustments account for border width
- [x] CSS built and compiled successfully

## Color Palette Reference

### Light Mode
- Primary: `#4f46e5` (Indigo)
- Active Background: `#f1f5f9` (Slate-50)
- Inactive Text: `#64748b` (Slate-500)
- Dark Text: `#0f172a` (Slate-900)

### Dark Mode
- Primary: `#818cf8` (Indigo-400)
- Active Background: `#1e2a3a` (Dark Blue)
- Inactive Text: `#94a3b8` (Slate-400)
- Light Text: `#f1f5f9` (Slate-50)

## Testing Checklist

1. **Sidebar Navigation**
   - [x] Active item shows right border
   - [x] Padding is consistent across items
   - [x] Dark mode colors are applied correctly

2. **Report Tabs**
   - [x] Active tab shows left border
   - [x] Alignment matches sidebar style
   - [x] Hover states work properly

3. **Marketing Hub Tabs**
   - [x] Active tab shows bottom border
   - [x] Tab text alignment is consistent
   - [x] Responsive on mobile

4. **Tasks Hub Tabs**
   - [x] Active tab has proper styling
   - [x] Shadow effects apply correctly
   - [x] Background colors match design system

## Notes

- All borders are **3px solid** for consistency
- Padding calculations use `calc()` to account for border width
- Transitions applied to all nav elements for smooth state changes
- All colors support both light and dark themes
