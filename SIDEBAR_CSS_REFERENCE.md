# Icon-Only Sidebar CSS Reference

## Core CSS Classes

### Container: `aside.sidebar-collapsed`
```css
aside.sidebar-collapsed {
    width: 76px !important;
    min-width: 76px !important;
    transition: width 0.3s ease-in-out;
}
```
- Collapsible sidebar main container
- 76px width (optimized for icon-only display)
- Smooth width transition on collapse/expand

---

### Toggle Button: `aside.sidebar-collapsed #sidebar-toggle-btn`
```css
aside.sidebar-collapsed #sidebar-toggle-btn {
    width: 40px !important;
    height: 40px !important;
    padding: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    margin: 0 auto !important;
    border-radius: 8px !important;
    background: #f1f5f9 !important;
    color: #64748b !important;
    transition: all 0.2s ease-in-out !important;
}

aside.sidebar-collapsed #sidebar-toggle-btn:hover {
    background: #e2e8f0 !important;
    color: #4f46e5 !important;
}
```
- 40×40px square with 8px radius
- Light background that darkens on hover
- Icon color changes to brand color on hover

---

### Navigation Container: `aside.sidebar-collapsed nav`
```css
aside.sidebar-collapsed nav {
    width: 100%;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    gap: 0rem !important;
    padding: 0.5rem 0.375rem !important;
}
```
- Flex column layout
- Center alignment for icons
- No gap (margin handled per button)
- Minimal padding (6px sides, 8px top/bottom)

---

### Navigation Buttons: `aside.sidebar-collapsed nav button`
```css
aside.sidebar-collapsed nav button {
    width: 48px !important;
    height: 48px !important;
    min-width: 48px !important;
    min-height: 48px !important;
    padding: 0 !important;
    margin: 4px auto !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    flex-direction: column !important;
    gap: 0 !important;
    position: relative !important;
    overflow: visible !important;
    text-indent: -9999px !important;
    font-size: inherit !important;
    line-height: normal !important;
    border-radius: 12px !important;
    background: transparent !important;
    color: #64748b !important;
    transition: all 0.2s ease-in-out !important;
}
```
- 48×48px square buttons
- 4px margin between items
- 12px border radius (slight rounding)
- Centered content with flexbox
- Text hidden with text-indent
- Smooth 0.2s transitions for all properties

---

### Hover State: `aside.sidebar-collapsed nav button:hover`
```css
aside.sidebar-collapsed nav button:hover {
    background: #f1f5f9 !important;
    color: #475569 !important;
}
```
- Light background fade
- Darker text color
- Icons enlarge via separate rule (see below)

---

### Active State: `aside.sidebar-collapsed nav button.nav-active`
```css
aside.sidebar-collapsed nav button.nav-active {
    background: rgba(79, 70, 229, 0.1) !important;
    color: #4f46e5 !important;
    border-left: 4px solid #4f46e5 !important;
    margin-left: calc(auto - 4px) !important;
}

aside.sidebar-collapsed nav button.nav-active iconify-icon {
    color: #4f46e5 !important;
}
```
- Semi-transparent indigo background (10% opacity)
- Brand color text and icon
- 4px left border accent
- Margin adjustment to accommodate border

---

### Icon Styles: `aside.sidebar-collapsed nav button iconify-icon`
```css
aside.sidebar-collapsed nav button iconify-icon {
    display: inline-flex !important;
    width: 20px !important;
    height: 20px !important;
    margin: 0 !important;
    text-indent: 0 !important;
    flex-shrink: 0 !important;
    transition: transform 0.2s ease-in-out !important;
}

/* Icon enlarge on hover */
aside.sidebar-collapsed nav button:hover iconify-icon {
    transform: scale(1.1) !important;
}
```
- 20×20px square
- Centered with inline-flex
- 10% scale increase on hover (smooth)
- Text indent reset for icon rendering

---

### Badge Display: `aside.sidebar-collapsed nav button span[id*="badge"]`
```css
aside.sidebar-collapsed nav button span[id*="badge"] {
    display: inline-flex !important;
    position: absolute !important;
    top: 0px !important;
    right: 0px !important;
    width: 18px !important;
    height: 18px !important;
    text-indent: 0 !important;
    margin: 0 !important;
    font-size: 10px !important;
    font-weight: bold !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: 9999px !important;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}
```
- 18×18px circular badge
- Positioned top-right corner (0, 0)
- 10px bold text
- White text with colored backgrounds (inherited)
- Subtle drop shadow

---

### Section Dividers: `aside.sidebar-collapsed nav > div:not(:has(> button))`
```css
aside.sidebar-collapsed nav > div:not(:has(> button)) {
    display: block !important;
    width: 40px !important;
    height: 1px !important;
    background: #e2e8f0 !important;
    margin: 0.5rem 0 !important;
}
```
- Thin horizontal dividers
- 40px width (slightly narrower than buttons)
- Light gray color (#e2e8f0)
- 8px margin above/below
- Separates navigation groups

---

### Section Titles: `aside.sidebar-collapsed nav > p`
```css
aside.sidebar-collapsed nav > p {
    display: none !important;
}
```
- Hides all section title paragraphs
- Keeps interface clean in collapsed state

---

### Tooltips: `aside.sidebar-collapsed nav button:hover::after`
```css
aside.sidebar-collapsed nav button:hover::after {
    content: attr(data-label);
    position: absolute;
    left: calc(100% + 12px);
    top: 50%;
    transform: translateY(-50%);
    background: #1f2937;
    color: white;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    white-space: nowrap;
    font-size: 0.75rem;
    font-weight: 500;
    pointer-events: none;
    z-index: 100;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    text-indent: 0;
}

aside.sidebar-collapsed nav button:hover::before {
    content: '';
    position: absolute;
    left: calc(100% + 6px);
    top: 50%;
    transform: translateY(-50%);
    border: 4px solid transparent;
    border-right-color: #1f2937;
    pointer-events: none;
    z-index: 100;
}
```
- Tooltip appears on right side
- 12px gap from button
- Dark background (#1f2937)
- Arrow pointer using before element
- Tooltip stays centered vertically
- Font: 12px, weight 500, no-wrap

---

## Dark Mode Styles

### Base: `html.dark aside.sidebar-collapsed`
```css
html.dark aside.sidebar-collapsed #sidebar-toggle-btn {
    background: #1e2a3a !important;
    color: #64748b !important;
}

html.dark aside.sidebar-collapsed #sidebar-toggle-btn:hover {
    background: #253347 !important;
    color: #818cf8 !important;
}
```

### Navigation Items: `html.dark aside.sidebar-collapsed nav button`
```css
html.dark aside.sidebar-collapsed nav button {
    color: #94a3b8 !important;
}

html.dark aside.sidebar-collapsed nav button:hover {
    background: #1e2a3a !important;
    color: #cbd5e1 !important;
}
```

### Active Items: `html.dark aside.sidebar-collapsed nav button.nav-active`
```css
html.dark aside.sidebar-collapsed nav button.nav-active {
    background: rgba(79, 70, 229, 0.15) !important;
    color: #818cf8 !important;
}

html.dark aside.sidebar-collapsed nav button.nav-active iconify-icon {
    color: #818cf8 !important;
}
```

### Dividers: `html.dark aside.sidebar-collapsed nav > div`
```css
html.dark aside.sidebar-collapsed nav > div:not(:has(> button)) {
    background: #253347 !important;
}
```

### Profile Widget: `html.dark aside.sidebar-collapsed .mt-auto`
```css
html.dark aside.sidebar-collapsed .mt-auto > div {
    background: #1e2a3a !important;
    border-color: #253347 !important;
}

html.dark aside.sidebar-collapsed .mt-auto button:hover {
    background: #253347 !important;
    color: #f87171 !important;
}
```

### Tooltips: `html.dark aside.sidebar-collapsed nav button:hover::after`
```css
html.dark aside.sidebar-collapsed nav button:hover::after {
    background: #f1f5f9;
    color: #1f2937;
}

html.dark aside.sidebar-collapsed nav button:hover::before {
    border-right-color: #f1f5f9;
}
```

---

## Profile Widget Styles

### Container: `.mt-auto`
```css
aside.sidebar-collapsed .mt-auto {
    padding: 0.5rem !important;
}
```

### Profile Card: `.mt-auto > div`
```css
aside.sidebar-collapsed .mt-auto > div {
    padding: 0.5rem !important;
    flex-direction: column !important;
}
```

### Avatar: `.mt-auto img`
```css
aside.sidebar-collapsed .mt-auto img {
    width: 40px !important;
    height: 40px !important;
}
```

### Text (Hidden): `.mt-auto > div > div:last-child`
```css
aside.sidebar-collapsed .mt-auto > div > div:last-child {
    display: none !important;
}
```

### Logout Button: `.mt-auto button`
```css
aside.sidebar-collapsed .mt-auto button {
    width: 36px !important;
    height: 36px !important;
    padding: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
}
```

---

## HTML Structure Notes

### Button Template
```html
<button onclick="switchView('dashboard')" 
        id="nav-dashboard" 
        data-label="Dashboard"
        class="nav-active w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group text-left">
    <iconify-icon icon="solar:widget-3-linear" width="20"
        class="group-hover:scale-110 transition-transform"></iconify-icon>
    Dashboard
    <span id="dashboard-badge"
        class="hidden ml-auto bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">0</span>
</button>
```

### Key Attributes
- `data-label` - Used for tooltip content
- `id="nav-*"` - Unique identifier for styling
- `id="*-badge"` - Badge element
- `.nav-active` - Applied when view is active
- `.hidden` - Badge visibility (JS controlled)

---

## Color Palette Reference

| Use Case | Light Mode | Dark Mode | CSS Value |
|----------|-----------|-----------|-----------|
| Icon Normal | #64748b | #94a3b8 | slate-500/400 |
| Icon Hover | #475569 | #cbd5e1 | slate-600/200 |
| Icon Active | #4f46e5 | #818cf8 | indigo-600/400 |
| BG Normal | transparent | transparent | - |
| BG Hover | #f1f5f9 | #1e2a3a | slate-100/dark |
| BG Active | rgba(79,70,229,0.1) | rgba(79,70,229,0.15) | indigo/opacity |
| Divider | #e2e8f0 | #253347 | slate-200/700 |
| Button BG | #f1f5f9 | #1e2a3a | slate-100/dark |
| Button Hover | #e2e8f0 | #253347 | slate-200/darker |
| Text/Label | white | white | - |
| Label BG | #1f2937 | #f1f5f9 | gray-800/light |

---

## Key Implementation Notes

1. **z-index Management**
   - Tooltips: `z-index: 100`
   - Sidebar: `z-index: 50` (mobile)
   - Water widget: `z-index: 9990`

2. **Transitions**
   - Button states: `0.2s ease-in-out`
   - Sidebar width: `0.3s ease-in-out`
   - No transitions on initial load

3. **Text Hiding**
   - Using `text-indent: -9999px` for accessibility
   - Preserves semantic HTML
   - Tooltips re-enable text with `text-indent: 0`

4. **Flexbox Centering**
   - All buttons use `display: flex` with `align-items: center` and `justify-content: center`
   - Icons perfectly centered at 20×20px
   - Badges positioned absolutely for overlap

5. **Responsive Considerations**
   - Mobile drawer mode uses different width (16rem)
   - Collapse styles override on screens > 768px
   - Water widget repositions based on sidebar state

