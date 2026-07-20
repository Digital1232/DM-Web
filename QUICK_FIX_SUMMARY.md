# 🚀 Quick Fix Summary - Jira Linking & Permissions

## 5 Issues to Fix

### 1️⃣ Permission Issue - Non-admin users see "No completed tasks"
**File:** `script.js` (around line 25880)  
**Fix:** Ensure non-admin users see their own completed tasks, not blank

**Before:**
```javascript
} else {
    usersToShow = [currentUser];  // Shows user but filters wrong
}
```

**After:**
```javascript
} else {
    usersToShow = [currentUser]; // Already correct - just verify logic
}
```

---

### 2️⃣ Link Jira Tasks in Today's Completed Section
**File:** `index.html` + `script.js`  
**Add Function:** 
```javascript
function generateJiraLink(taskId) {
    if (!taskId) return '#';
    return `https://worksync.atlassian.net/browse/${encodeURIComponent(taskId)}`;
}
```

**Change HTML:** Make task IDs clickable links using `generateJiraLink()`

---

### 3️⃣ Link Jira Tasks in Strategy Calendar Events
**File:** `script.js` (renderStrategyCalendar function)  
**Add:** Show 🔗 icon next to event titles if Jira ID exists

---

### 4️⃣ Add Jira ID Field to Edit Strategy Event Modal
**File:** `index.html` (in strategyEventModal)  
**Add:** New input field above Event Title:
```html
<input id="strategy-jira-id" placeholder="e.g., JULY-123">
```

**Update:** `openEditStrategyEventModal()` to load/save jiraTaskId

---

### 5️⃣ Show Jira Links in Strategy Sidebar
**File:** `script.js` (renderStrategySidebar function)  
**Add:** Display clickable Jira ID next to event title

---

## Files to Edit

1. **script.js**
   - Add `generateJiraLink()` function
   - Update `showFiveThirtyTaskPopup()` - fix permissions
   - Update `renderStrategyCalendar()` - add Jira links
   - Update `openEditStrategyEventModal()` - load/save Jira ID
   - Update `renderStrategySidebar()` - show Jira links

2. **index.html**
   - Update Today's Completed HTML - make task IDs clickable
   - Add strategy-jira-id field to modal
   - Export `generateJiraLink` function

---

## Testing Checklist

- [ ] Non-admin user sees own completed tasks at 5:30pm
- [ ] Task IDs in Today's Completed are clickable
- [ ] Clicking task ID opens Jira in new tab
- [ ] Can edit strategy event and add Jira ID
- [ ] Jira links show in calendar (🔗 icon)
- [ ] Jira links show in sidebar
- [ ] All Jira links open correct task

---

## Detailed Guide

See: **JIRA_LINKING_AND_PERMISSIONS_FIX.md** for complete implementation with code examples

---

## Result After Fix

✅ All users can see their completed tasks  
✅ All task IDs are clickable Jira links  
✅ Strategy events can be linked to Jira tasks  
✅ Easy access to Jira tasks from multiple places  
✅ Improved workflow integration  

---

**Estimated Time:** 30-45 minutes to implement all fixes
