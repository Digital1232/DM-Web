# 🔄 Header Toggle Guide

## Overview

The application now has **TWO separate headers** that can be switched anytime:

1. **Enhanced Productivity Header** (DEFAULT) - Modern, feature-rich
2. **Legacy Global Header** (HIDDEN) - Classic, lightweight

---

## How to Toggle Headers

### Method 1: Using JavaScript Console (Quick Test)

Open browser console (F12 or Ctrl+Shift+I) and type:

```javascript
// Toggle between headers
toggleBetweenHeaders();
```

**That's it!** The header will switch instantly.

---

### Method 2: Call from HTML Button

Add this button anywhere in your page to create a toggle switch:

```html
<button onclick="toggleBetweenHeaders()" class="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-all">
    🔄 Switch Header
</button>
```

---

### Method 3: Programmatically in JavaScript

```javascript
// Force to Productivity Header
document.querySelector('header:not(#legacy-global-header)').classList.remove('hidden');
document.getElementById('legacy-global-header').classList.add('hidden');
localStorage.setItem('headerMode', 'productivity');

// Force to Legacy Header
document.querySelector('header:not(#legacy-global-header)').classList.add('hidden');
document.getElementById('legacy-global-header').classList.remove('hidden');
localStorage.setItem('headerMode', 'legacy');
```

---

## Your Preference is Saved

When you toggle headers, your choice is saved to **LocalStorage**. 

**Next time you reload the page, it will remember your preference!**

---

## Side-by-Side Comparison

| Feature | Productivity Header | Legacy Header |
|---------|-------------------|---------------|
| **Sync Badge** | ✅ Yes | ❌ No |
| **Live Timer** | ✅ Yes | ✅ Yes |
| **Quick Actions** | ✅ Yes | ✅ Yes |
| **Session Modal** | ✅ Yes | ❌ No |
| **System Status** | ❌ No | ✅ Yes |
| **Notification Bell** | ✅ Yes | ✅ Yes |
| **Theme Toggle** | ✅ Yes | ✅ Yes |
| **Profile Menu** | ✅ Yes | ✅ Yes |
| **Responsive** | ✅ Better | ✅ Good |
| **Modern Design** | ✅ Yes | ❌ No |

---

## What's in Each Header

### Enhanced Productivity Header
```
[Menu] [Title] | [Sync Badge] [Timer] [Actions] | [🔔] [🌙] [👤]
```

**Key Features:**
- Real-time sync visibility
- Live work timer
- One-click session control
- Session details modal
- Modern, responsive design

### Legacy Global Header
```
[Menu] [Title] | [System Status] [🔔] | [Timer Bar] | [🌙] [👤]
```

**Key Features:**
- System status indicator
- Classic timer bar
- Simpler interface
- Lightweight
- All legacy functionality

---

## Which Header Should I Use?

### Use Productivity Header if you:
- Want to see sync status immediately
- Want real-time timer in header
- Want session details on demand
- Use desktop/tablet
- Prefer modern design

### Use Legacy Header if you:
- Prefer simpler interface
- Want lightweight header
- Like the classic design
- Need system status indicator
- Have older devices

---

## How to Check Current Header

Open browser console and type:

```javascript
// Check which header is active
const legacy = document.getElementById('legacy-global-header');
console.log(legacy.classList.contains('hidden') ? '✅ Productivity' : '✅ Legacy');
```

Or check LocalStorage:

```javascript
console.log(localStorage.getItem('headerMode'));  // Shows 'productivity' or 'legacy'
```

---

## Clear Header Preference

If you want to reset to default (Productivity):

```javascript
localStorage.removeItem('headerMode');
location.reload(); // Refresh page
```

---

## Troubleshooting

### Problem: Both headers showing
**Solution:**
```javascript
// Make sure only one is visible
document.querySelector('header:not(#legacy-global-header)').classList.remove('hidden');
document.getElementById('legacy-global-header').classList.add('hidden');
```

### Problem: Neither header showing
**Solution:**
```javascript
// Show productivity header
document.querySelector('header:not(#legacy-global-header)').classList.remove('hidden');
// Reload page
location.reload();
```

### Problem: Toggle not working
**Solution:**
- Open browser console (F12)
- Check for JavaScript errors
- Type `typeof toggleBetweenHeaders` - should show "function"
- Try calling it: `toggleBetweenHeaders()`

---

## For Developers

### HTML Structure
```html
<!-- Main Productivity Header -->
<header class="h-16 glass-header...">
    <!-- Productivity components -->
</header>

<!-- Alternative Legacy Header -->
<header id="legacy-global-header" class="hidden h-16 glass-header...">
    <!-- Legacy components -->
</header>
```

### JavaScript Functions
```javascript
toggleBetweenHeaders()      // Toggle between headers
restoreHeaderPreference()   // Load saved preference on page load
```

### LocalStorage Key
```javascript
localStorage.getItem('headerMode')  // Returns 'productivity' or 'legacy'
```

---

## Keyboard Shortcut (Optional)

Add this to quickly toggle headers:

```javascript
document.addEventListener('keydown', (e) => {
    // Press Ctrl+H to toggle headers
    if (e.ctrlKey && e.key === 'h') {
        toggleBetweenHeaders();
        e.preventDefault();
    }
});
```

---

## Notes

✅ **Both headers work perfectly**  
✅ **All functionality preserved**  
✅ **Preference saved across sessions**  
✅ **No conflicts or issues**  
✅ **Easy to switch anytime**  

---

**Quick Test:** Open console and type `toggleBetweenHeaders()` to see it in action!
