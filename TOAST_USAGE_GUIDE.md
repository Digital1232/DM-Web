# Toast Notification Usage Guide

## Quick Overview

Toasts are lightweight notification popups that automatically hide after a specified duration. They're perfect for quick feedback messages like "Success!", "Error occurred", or "Data saved".

## Basic Usage

```javascript
import { toast } from './utils.js';

// Info message (default)
toast('Your message here');

// Success message
toast('Operation completed successfully!', 'success');

// Error message  
toast('Something went wrong', 'error');

// Custom duration (5 seconds)
toast('This will auto-hide in 5 seconds', 'info', 5000);
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `msg` | string | required | The message to display in the toast |
| `type` | string | `'info'` | Toast type: `'info'`, `'success'`, or `'error'` |
| `duration` | number | `3000` | How long (in milliseconds) before auto-hiding |

## Toast Types

### Info Toast
```javascript
toast('This is an informational message', 'info');
```
- **Icon**: Information circle
- **Color**: Indigo/Blue
- **Use Case**: General notifications, tips, reminders

### Success Toast
```javascript
toast('Data saved successfully!', 'success');
```
- **Icon**: Check circle
- **Color**: Emerald/Green
- **Use Case**: Successful operations, confirmations

### Error Toast
```javascript
toast('Failed to update record', 'error');
```
- **Icon**: Danger/alert circle
- **Color**: Rose/Red
- **Use Case**: Errors, failures, warnings

## Real-World Examples

### After Saving Data
```javascript
async function saveData() {
    try {
        const response = await fetch('/api/save', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            toast('Data saved successfully!', 'success', 3000);
        } else {
            toast('Failed to save data', 'error', 4000);
        }
    } catch (error) {
        toast('Error: ' + error.message, 'error', 5000);
    }
}
```

### Syncing Data
```javascript
async function syncData() {
    try {
        toast('Syncing data...', 'info', 2000);
        
        const result = await fetch('/api/sync', { method: 'POST' });
        const data = await result.json();
        
        if (data.success) {
            toast(`Synced ${data.count} items`, 'success', 3000);
        } else {
            toast(`Sync failed: ${data.error}`, 'error', 4000);
        }
    } catch (error) {
        toast('Sync error: ' + error.message, 'error');
    }
}
```

### User Actions
```javascript
function deleteItem(itemId) {
    if (confirm('Are you sure?')) {
        fetch(`/api/items/${itemId}`, { method: 'DELETE' })
            .then(() => toast('Item deleted', 'success'))
            .catch(err => toast('Delete failed: ' + err.message, 'error'));
    }
}
```

## Duration Guidelines

- **Very Quick** (1000-2000ms): Loading started, minor confirmations
- **Standard** (3000ms): Default - most common use case
- **Longer** (4000-5000ms): Error messages, important info
- **Extra Long** (6000ms+): Complex error messages, critical alerts

```javascript
// Quick notification
toast('Loading...', 'info', 1500);

// Standard notification
toast('Done!', 'success');

// Give user time to read error
toast('Sorry, something went wrong. Please try again.', 'error', 5000);
```

## Best Practices

✅ **DO**:
- Keep messages concise and clear
- Use appropriate types (info/success/error) for context
- Show toasts for important user actions
- Use shorter durations for quick confirmations

❌ **DON'T**:
- Show toasts for every minor action
- Use overly long messages
- Show multiple toasts at once (they stack)
- Use success toast for negative outcomes

## Auto-Hide Behavior

- Toasts automatically hide after the specified duration
- Hovering over a toast does NOT prevent auto-hide
- Multiple rapid toasts will replace the previous one
- When hidden, toasts don't interfere with other page elements

## Styling

### Light Mode
- **Info**: Blue icon on indigo background
- **Success**: Green icon on emerald background  
- **Error**: Red icon on rose background

### Dark Mode
- All toasts automatically adjust to dark theme
- Background becomes dark blue/gray
- Text and icons remain visible and readable

## Customizing

To modify toast appearance, edit the CSS in `index.html`:

```css
.toast {
    /* Position and size */
    bottom: 20px;  /* Distance from bottom */
    right: 20px;   /* Distance from right */
    z-index: 9999; /* Layer order */
    /* Animation */
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
                opacity 0.3s ease;
}
```

## Troubleshooting

### Toast not appearing
- Check that the `#toast` element exists in HTML
- Verify CSS class `.show` is being added
- Check browser console for errors

### Toast not hiding
- Ensure `duration` parameter is set correctly
- Check that JavaScript timer isn't being cleared elsewhere
- Look for other code interfering with the class removal

### Multiple toasts at once
- Current implementation shows one toast at a time
- To queue multiple toasts, wrap them in setTimeout delays:
```javascript
toast('First message', 'info', 3000);
setTimeout(() => {
    toast('Second message', 'success', 3000);
}, 3500);
```

## Technical Details

- **Animation**: CSS transforms for performance
- **Fade Effect**: Opacity transition for smooth appearance
- **Position**: Fixed to viewport bottom-right
- **Z-index**: 9999 ensures visibility above other elements
- **Duration**: Configurable in milliseconds (default 3 seconds)
