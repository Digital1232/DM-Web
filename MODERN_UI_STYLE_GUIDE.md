# Modern Admin Dashboard UI Style Guide

Based on the analyzed design, this guide provides implementation patterns for a clean, modern sidebar navigation system with light/dark mode support.

## Color Palette

### Primary Colors
- **Accent Blue**: `#2563eb` (blue-600) - Used for active states, buttons, and interactive elements
- **Dark Accent**: `#818cf8` (indigo-400) - Dark mode accent

### Light Mode
- **Sidebar Background**: `#ffffff` (white)
- **Text Primary**: `#1e293b` (slate-900)
- **Text Secondary**: `#64748b` (slate-500)
- **Hover Background**: `#f1f5f9` (slate-100)
- **Border**: `#e2e8f0` (slate-200)
- **Active Item Background**: `#eef2ff` (indigo-50)

### Dark Mode
- **Sidebar Background**: `#2d3748` or `#1f2937` (gray-800)
- **Text Primary**: `#f1f5f9` (slate-100)
- **Text Secondary**: `#cbd5e1` (slate-400)
- **Hover Background**: `#374151` (gray-700)
- **Border**: `#4b5563` (gray-600)
- **Active Item Background**: `#1e3a8a` (blue-900) with `#60a5fa` (blue-400) accent

## Sidebar Navigation Component

### Structure
```
Sidebar Container
├── Logo/Brand Section
├── Main Navigation
│   ├── Primary Items (Dashboard, Customers, File, etc.)
│   └── Sub-items (Indented under parent)
├── Separator
├── Secondary Items (Settings, Notifications)
├── Spacer (flex-grow)
└── User Profile Card
    ├── Avatar
    ├── User Info (Name, Email)
    └── Options Menu
```

### Active State Design
- **Left Border Accent**: 3-4px solid blue (#2563eb)
- **Background**: Light blue background (indigo-50) in light mode
- **Text**: Accent blue color
- **Smooth Transition**: 0.2s ease-in-out

### Inactive State
- **Background**: Transparent or hover color
- **Text**: Slate-500 (secondary text)
- **Icon**: Slate-400
- **Hover Effect**: Light background + text color change

## Typography

- **Font Family**: `'Inter', 'Manrope', sans-serif`
- **Menu Item Font Size**: `14px` (0.875rem)
- **Menu Item Font Weight**: `500` (normal), `600-700` (active)
- **Icon Size**: `20px` (1.25rem) for menu items
- **Sidebar Width**: `280px` (expanded), `80px` (collapsed)

## Spacing & Layout

### Sidebar Padding
- **Top/Bottom**: `1.5rem` (24px)
- **Left/Right**: `1rem` (16px)
- **Item Vertical**: `0.75rem` (12px)
- **Item Horizontal**: `1rem` (16px)

### Border Radius
- **Sidebar Container**: `16px` (if floating)
- **Active Item**: `8px`
- **Cards**: `12px`
- **Buttons**: `8px`

## Responsive Behavior

### Collapsed State (≤768px)
- **Width**: `80px`
- **Labels**: Hidden
- **Icons Only**: Displayed prominently (24px)
- **Tooltips**: Show on hover
- **User Card**: Collapsed to avatar only

### Expanded State (>768px)
- **Width**: `280px`
- **Labels**: Visible
- **Icons + Labels**: Both displayed side-by-side
- **User Card**: Full view with name and email

## Component Examples

### Menu Item Styling
```css
/* Inactive state */
.nav-item {
  @apply px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 
         hover:text-slate-900 transition-all duration-200 flex items-center gap-3
         cursor-pointer;
}

/* Active state */
.nav-item.active {
  @apply bg-indigo-50 text-indigo-600 border-l-4 border-blue-600 
         pl-2 font-semibold;
}

/* Dark mode */
html.dark .nav-item {
  @apply text-slate-400 hover:bg-gray-700 hover:text-slate-100;
}

html.dark .nav-item.active {
  @apply bg-blue-900 bg-opacity-30 text-indigo-300 border-l-indigo-400;
}
```

### Sub-menu Item Styling
```css
.nav-subitem {
  @apply px-12 py-2 text-sm text-slate-600 hover:text-slate-900 
         hover:bg-slate-50 transition-all;
}

.nav-subitem.active {
  @apply text-indigo-600 font-medium;
}

html.dark .nav-subitem {
  @apply text-slate-400 hover:text-slate-100;
}

html.dark .nav-subitem.active {
  @apply text-indigo-300;
}
```

### User Profile Card
```css
.user-card {
  @apply flex items-center gap-3 px-3 py-3 rounded-lg 
         bg-slate-50 border border-slate-200 
         hover:bg-slate-100 transition-all;
}

.user-avatar {
  @apply w-10 h-10 rounded-full object-cover;
}

.user-info {
  @apply flex-1;
}

.user-name {
  @apply font-semibold text-slate-900 text-sm;
}

.user-email {
  @apply text-xs text-slate-500 truncate;
}

html.dark .user-card {
  @apply bg-gray-700 bg-opacity-30 border-gray-600 hover:bg-gray-700;
}

html.dark .user-name {
  @apply text-slate-100;
}

html.dark .user-email {
  @apply text-slate-400;
}
```

## Dark Mode Implementation

### CSS Variables
```css
:root {
  --sidebar-bg-light: #ffffff;
  --sidebar-bg-dark: #2d3748;
  --text-primary-light: #1e293b;
  --text-primary-dark: #f1f5f9;
  --accent-color: #2563eb;
  --accent-color-dark: #818cf8;
}

html.dark {
  --sidebar-bg: var(--sidebar-bg-dark);
  --text-primary: var(--text-primary-dark);
  --accent-color: var(--accent-color-dark);
}
```

### Theme Toggle
- Check `localStorage.getItem('theme')`
- Add/remove `dark` class on `<html>` element
- Smooth transition: `transition: background-color 0.3s ease-in-out`

## Icons

- **Icon Library**: Iconify or Font Awesome
- **Icon Size**: 
  - Menu items: `20px` (1.25rem)
  - Collapsed sidebar: `24px` (1.5rem)
  - Buttons: `18px` (1.125rem)
- **Icon Color**: Match text color (slate-500 inactive, indigo-600 active)

## Animations & Transitions

- **Hover Effects**: `0.2s ease-in-out`
- **Active State**: `0.15s ease-in-out`
- **Sidebar Toggle**: `0.3s ease-in-out`
- **Theme Switch**: `0.3s ease-in-out`
- **Easing Function**: `cubic-bezier(0.4, 0, 0.2, 1)` (Tailwind standard)

## Implementation Checklist

- [ ] Create sidebar container with proper width and spacing
- [ ] Implement navigation items with hover and active states
- [ ] Add sub-menu support with proper indentation
- [ ] Create user profile card at bottom
- [ ] Implement dark mode classes and utilities
- [ ] Add sidebar collapse/expand functionality
- [ ] Implement theme toggle (light/dark)
- [ ] Test responsive behavior (mobile/tablet)
- [ ] Add smooth transitions and animations
- [ ] Ensure accessibility (keyboard navigation, ARIA labels)

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile: iOS Safari 12+, Chrome Android latest

## Performance Notes

- Use CSS transitions instead of JavaScript animations where possible
- Lazy load sub-menu items if deep nesting
- Implement virtual scrolling for long navigation lists
- Minimize repaints with transform/opacity changes
