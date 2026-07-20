# WorkSync Daily Summary Email - Design Specifications

## Design System Reference

This document provides detailed design specifications for the WorkSync Daily Summary email template.

---

## 📐 Layout & Dimensions

### Email Container
```
Max Width: 950px
Min Width: 300px (mobile)
Background: #ffffff
```

### Header Section
```
Height: ~200px (desktop), ~250px (mobile)
Background: Linear gradient (135deg, #6366f1 0%, #7c3aed 100%)
Border Bottom: 4px solid #4f46e5
Padding: 40px 32px (desktop), 24px 16px (mobile)
```

### Content Section
```
Padding: 40px 32px (desktop), 24px 16px (mobile)
Max Width: 950px
Spacing Between Sections: 32px (desktop), 24px (mobile)
```

### Footer Section
```
Background: #f8fafc
Border Top: 1px solid #e2e8f0
Padding: 24px 32px
```

---

## 🎨 Color Palette

### Primary Colors
```
Indigo Blue:    #6366f1  (Primary brand color)
Deep Purple:    #7c3aed  (Secondary brand color)
```

### Secondary Colors
```
Amber/Gold:     #fcd34d  (Top performers)
Light Slate:    #f8fafc  (Background)
Medium Slate:   #f1f5f9  (Card backgrounds)
Dark Slate:     #1e293b  (Text)
```

### Status Badge Colors
```
Working:  Background: #d1fae5  |  Text: #065f46  (Green)
Break:    Background: #fef3c7  |  Text: #92400e  (Amber)
Hold:     Background: #fed7aa  |  Text: #92400e  (Orange)
Offline:  Background: #f3f4f6  |  Text: #6b7280  (Grey)
```

### Accent Colors
```
Success (Active):     #10b981  (Teal)
Warning (Attention):  #f59e0b  (Amber)
Alert (Issue):        #ef4444  (Red)
Info (Insight):       #6d28d9  (Purple)
```

### Grayscale
```
#1e293b  Text (Primary)
#475569  Text (Secondary)
#64748b  Text (Tertiary)
#94a3b8  Text (Quaternary)
#e2e8f0  Borders
#f1f5f9  Dividers
#f8fafc  Light backgrounds
#ffffff  White backgrounds
```

---

## 🔤 Typography

### Font Family
```
Primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
         'Helvetica Neue', Arial, sans-serif

Monospace: 'Courier New', monospace
(Used for task IDs and time values)
```

### Font Sizes

#### Desktop
```
Header Title:      32px
Section Titles:    16px
Card Labels:       12px
KPI Values:        36px
Body Text:         14px
Small Text:        12px
Extra Small:       11px
```

#### Mobile
```
Header Title:      24px
Section Titles:    14px
Body Text:         13px
Small Text:        11px
KPI Values:        28px
```

### Font Weights

| Usage | Weight | CSS |
|-------|--------|-----|
| Header Title | 900 | font-weight: 900 |
| Section Title | 900 | font-weight: 900 |
| Card Label | 700 | font-weight: 700 |
| KPI Value | 900 | font-weight: 900 |
| Table Header | 700 | font-weight: 700 |
| Body Text | 400 | font-weight: 400 |
| Emphasis | 600 | font-weight: 600 |

### Line Heights
```
Headings:    1.0 (tight)
Labels:      1.2
Body Text:   1.6 (readable)
Lists:       1.6
```

### Letter Spacing
```
Headings:      -0.5px
Labels:        0.5px (uppercase)
Body Text:     0px
```

---

## 📦 Components

### KPI Card
```
Background:     Linear gradient(135deg, #f8fafc 0%, #f1f5f9 100%)
Border:         1px solid #e2e8f0
Border Radius:  12px
Padding:        20px
Shadow:         0 1px 3px rgba(15, 23, 42, 0.06)
Margin:         0 (grid handles spacing)
Transition:     none

Children:
- Icon: 28px (emoji)
- Label: 12px, uppercase, #64748b
- Value: 36px, bold, #6366f1
```

### Status Badge
```
Display:        inline-block
Padding:        4px 10px
Border Radius:  20px (pill shape)
Font Size:      12px
Font Weight:    600
Text Align:     center

States:
- Working:  background #d1fae5, color #065f46
- Break:    background #fef3c7, color #92400e
- Hold:     background #fed7aa, color #92400e
- Offline:  background #f3f4f6, color #6b7280
```

### Performer Card
```
Background:     Linear gradient(135deg, #fef9e7 0%, #fef3c7 100%)
Border:         2px solid #fcd34d
Border Radius:  12px
Padding:        20px
Text Align:     center

Children:
- Badge: 36px emoji
- Name: 14px, bold, #1e293b
- Metric: 12px, gray
```

### Alert Box
```
Background:     #fee2e2 (or success variant #d1fae5)
Border Left:    4px solid #ef4444
Border Radius:  8px
Padding:        16px

Success variant:
Background:     #d1fae5
Border Left:    4px solid #10b981
```

### Table
```
Cell Padding:   12px 16px
Border:         1px solid #e2e8f0
Alternating:    #f8fafc, #ffffff backgrounds
Header:         #f1f5f9 background
Font Size:      14px
```

### Section Title
```
Font Size:      16px
Font Weight:    900
Color:          #1e293b
Margin:         32px 0 20px 0
Padding:        0 0 12px 0
Border Bottom:  2px solid #e2e8f0
Letter Spacing: 0.5px
Text Transform: uppercase
```

### List Items
```
List Style:     none (custom bullets)
Padding:        0 0 0 20px (left indent)
Margin:         6px 0
Font Size:      13px
Line Height:    1.6
Color:          (varies by section)
```

---

## 🎯 Spacing Standards

### External Spacing
```
Header Padding:         40px 32px (desktop), 24px 16px (mobile)
Content Padding:        40px 32px (desktop), 24px 16px (mobile)
Footer Padding:         24px 32px
```

### Internal Component Spacing
```
Card Padding:           20px
Card Gap (grid):        16px (desktop), 12px (mobile)
Section Gap:            32px (desktop), 24px (mobile)
List Item Gap:          6-12px
Button Padding:         8-12px
```

### Vertical Rhythm
```
Large Section Gap:      32px
Standard Section Gap:   20px
Component Gap:          16px
Item Gap:               8px
Tight Gap:              4px
```

---

## 🎭 Visual Effects

### Shadows
```
Subtle Shadow:   0 1px 3px rgba(15, 23, 42, 0.06)
Light Shadow:    0 4px 6px rgba(15, 23, 42, 0.08)
Card Shadow:     0 1px 3px rgba(15, 23, 42, 0.06)
Header Shadow:   None (uses border instead)
```

### Gradients
```
Header Gradient:  linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)
Card Gradient:    linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)
Performer Card:   linear-gradient(135deg, #fef9e7 0%, #fef3c7 100%)
Insights Box:     linear-gradient(135deg, #ede9fe 0%, #f3e8ff 100%)
Recommendations:  linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)
```

### Border Radius
```
Section Cards:    12px
Badges:           20px (pill shape)
Alert Box:        8px
Input Fields:     12px
Image Corners:    12px
```

---

## 📱 Responsive Breakpoints

### Desktop (950px and above)
```
3-column grids
Large fonts
Full padding (40px 32px)
All features visible
```

### Tablet (768px - 949px)
```
2-column grids where applicable
Medium fonts
Adjusted padding (32px 24px)
All features visible
```

### Mobile (300px - 767px)
```
1-column stacked layout
Smaller fonts (12-24px)
Reduced padding (24px 16px)
Touch-friendly sizing
Simplified tables (horizontal scroll)
```

---

## ✅ Accessibility

### Color Contrast
```
Text on White:          #1e293b (minimum 7:1 contrast)
Text on Light Blue:     #1e293b or #065f46
Badge Text:             Meets WCAG AA (4.5:1+)
Links/Emphasis:         Sufficient contrast maintained
```

### Font Sizes
```
Minimum Body Text:      13px on mobile, 14px desktop
Labels/Captions:        11px minimum
Header Text:            Clear hierarchy (24-36px)
```

### Spacing
```
Touch Targets:          Minimum 44x44px
List Items:             Comfortable spacing
Links/Buttons:          Clickable area sufficient
```

### Structure
```
Semantic HTML:          Proper heading hierarchy
Alternative Text:       Emojis used for icons
Table Headers:          Proper th elements
```

---

## 🎨 Design Tokens Summary

### Tokens Reference
```
Colors:
- --primary:      #6366f1
- --secondary:    #7c3aed
- --accent:       #fcd34d
- --bg-light:     #f8fafc
- --bg-medium:    #f1f5f9
- --text-primary: #1e293b
- --text-secondary: #475569
- --text-tertiary:  #64748b

Typography:
- --font-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto
- --font-mono:    'Courier New', monospace
- --size-xs:      11px
- --size-sm:      12px
- --size-base:    14px
- --size-lg:      16px
- --size-xl:      32px
- --size-2xl:     36px

Spacing:
- --space-xs:     4px
- --space-sm:     8px
- --space-md:     12px
- --space-lg:     16px
- --space-xl:     20px
- --space-2xl:    32px
- --space-3xl:    40px

Radius:
- --radius-sm:    8px
- --radius-md:    12px
- --radius-lg:    20px

Shadows:
- --shadow-sm:    0 1px 3px rgba(15, 23, 42, 0.06)
- --shadow-md:    0 4px 6px rgba(15, 23, 42, 0.08)
```

---

## 📋 Component Library

### Available Components

| Component | File | Status |
|-----------|------|--------|
| KPI Card | HTML/CSS | ✅ Included |
| Status Badge | HTML/CSS | ✅ Included |
| Performer Card | HTML/CSS | ✅ Included |
| Alert Box | HTML/CSS | ✅ Included |
| Table | HTML/CSS | ✅ Included |
| List Item | HTML/CSS | ✅ Included |
| Section Title | HTML/CSS | ✅ Included |
| Header | HTML/CSS | ✅ Included |
| Footer | HTML/CSS | ✅ Included |

---

## 🎯 Design Principles

1. **Clear Hierarchy**
   - Large KPI numbers (36px)
   - Clear section titles
   - Readable body text

2. **Visual Consistency**
   - Consistent color usage
   - Uniform spacing
   - Similar component styles

3. **Professional Appearance**
   - Gradients and shadows
   - Rounded corners
   - Proper whitespace

4. **Accessibility**
   - High contrast ratios
   - Readable fonts
   - Semantic structure

5. **Responsive Design**
   - Works on all devices
   - Flexible layouts
   - Adaptive typography

6. **Email Compatibility**
   - Inline CSS only
   - Table-based layouts
   - Fallback colors
   - No external resources

---

## 📊 Visual Hierarchy

### Primary Elements (Most Important)
- KPI values (36px, bold, blue)
- Section titles (16px, bold, dark)
- Top performer badges (🥇🥈🥉)

### Secondary Elements
- Employee names in table
- Task counts and metrics
- Status badges

### Tertiary Elements
- Labels and captions
- Helper text
- Footer information

---

## 🔍 Quality Checklist

- [ ] Colors match brand specifications
- [ ] Typography hierarchy is clear
- [ ] Spacing is consistent
- [ ] Components are properly aligned
- [ ] Mobile layout is responsive
- [ ] Email clients render correctly
- [ ] Accessibility standards met
- [ ] All sections visible and readable
- [ ] Professional appearance confirmed
- [ ] Design is print-friendly (if needed)

---

## 📞 Design Support

For design questions or clarifications:
1. Reference this specifications document
2. Check the HTML template for implementation
3. Review sample email output
4. Test in target email clients

---

**Version**: 1.0  
**Last Updated**: July 2026  
**Status**: Complete ✅  
**Compatibility**: All modern email clients
