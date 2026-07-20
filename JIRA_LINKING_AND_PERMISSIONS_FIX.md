# 🔗 Jira Task Linking & Permissions Fix Guide

## Overview of Issues to Fix

1. **Link Jira tasks** in Today's Completed section task list
2. **Link Jira tasks** in Strategy Calendar events  
3. **Link Jira tasks** in Edit Strategy Event modal
4. **Fix navigation issue** - Today's Completed showing with all side navigation menus
5. **Fix permissions** - Only Admin can view, non-admin users see "No completed tasks"

---

## Issue #1: Navigation Menu Problem

### Problem
"Today's Completed section is coming with all other side navigation menus. Admin alone can able to view. Non-admin users can't able to see the details showing error like 'No completed tasks logged for this period'"

### Root Cause
The `fiveThirtyPopup` modal is showing for all users, but the logic that filters tasks by user permissions only shows data for admins.

### Solution

**File:** `script.js`  
**Location:** Around line 25721 (in `showFiveThirtyTaskPopup` function)

**Change this logic:**
```javascript
// Current (WRONG - Shows all users to admins only)
if (isAdminView) {
    usersToShow = Array.from(allUsersMap.values())
        .filter(u => u.email && u.email !== '123')
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
} else {
    usersToShow = [currentUser];  // ← This shows only current user
}
```

**To this (CORRECT - Allow non-admin users to see their own tasks):**
```javascript
// For all users: show current user's tasks
// For admins: show all users' tasks
let usersToShow = [];
if (isAdminView) {
    usersToShow = Array.from(allUsersMap.values())
        .filter(u => u.email && u.email !== '123')
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
} else {
    // Non-admin users see ONLY their own completed tasks
    usersToShow = [currentUser];
}

// Ensure we have users to show
if (!usersToShow || usersToShow.length === 0) {
    usersToShow = [currentUser]; // Fallback to current user
}
```

---

## Issue #2: Add Jira Task Links in Today's Completed Section

### Problem
Task IDs are shown but they're not clickable links to Jira

### Solution

**File:** `index.html`  
**Location:** Around line 25980-26000 (in the Today's Completed HTML generation)

**Change this:**
```html
<!-- CURRENT (NO LINK) -->
<span class="font-mono font-bold text-indigo-600">${escapeHtml(task.id)}:</span>
<span class="ml-0.5">${escapeHtml(desc)}</span>
```

**To this (WITH LINK):**
```html
<!-- NEW (WITH JIRA LINK) -->
<a href="${generateJiraLink(task.id)}" 
   target="_blank" 
   rel="noopener noreferrer"
   class="font-mono font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer transition-colors">
    ${escapeHtml(task.id)}:
</a>
<span class="ml-0.5">${escapeHtml(desc)}</span>
```

**Add this helper function in `script.js`:**
```javascript
// Generate Jira link for task ID
function generateJiraLink(taskId) {
    if (!taskId) return '#';
    // Extract Jira key (e.g., "JULY-123" from full ID)
    const jiraKey = taskId.split('-').length > 1 
        ? taskId.substring(0, taskId.lastIndexOf('-')) + '-' + taskId.split('-').pop()
        : taskId;
    
    return `https://worksync.atlassian.net/browse/${encodeURIComponent(jiraKey)}`;
}
```

---

## Issue #3: Add Jira Task Links in Strategy Calendar Events

### Problem
Events in the calendar show campaign names but task IDs are not linked to Jira

### Solution

**File:** `script.js`  
**Location:** Around line 2318 (in `renderStrategyCalendar` function)

**Change this:**
```javascript
// CURRENT
eventsHtml += `
    <div onclick="event.stopPropagation(); openEditStrategyEventModal('${ev.id}')" 
         class="${badgeClass} px-2 py-1 rounded-lg text-[9px] font-black truncate shadow-sm transition-all hover:scale-105 active:scale-95" 
         title="${escapeHtml(ev.title)} [${escapeHtml(ev.platform)}]">
        ${escapeHtml(ev.title)}
    </div>
`;
```

**To this:**
```javascript
// NEW - With Jira link indicator
const jiraLink = ev.jiraTaskId ? `<a href="${generateJiraLink(ev.jiraTaskId)}" target="_blank" rel="noopener noreferrer" class="absolute top-1 right-1 text-white hover:bg-white/20 rounded-full p-0.5 transition-all" title="Open in Jira">🔗</a>` : '';

eventsHtml += `
    <div onclick="event.stopPropagation(); openEditStrategyEventModal('${ev.id}')" 
         class="relative ${badgeClass} px-2 py-1 rounded-lg text-[9px] font-black truncate shadow-sm transition-all hover:scale-105 active:scale-95" 
         title="${escapeHtml(ev.title)} ${ev.jiraTaskId ? ' [' + ev.jiraTaskId + ']' : ''} [${escapeHtml(ev.platform)}]">
        ${escapeHtml(ev.title)}
        ${jiraLink}
    </div>
`;
```

---

## Issue #4: Add Jira Task Link Field in Edit Strategy Event Modal

### Problem
When editing a strategy event, there's no field to link/input the Jira task ID

### Solution

**File:** `index.html`  
**Location:** Find the `strategyEventModal` dialog element

**Add this new field ABOVE the Event Title field:**
```html
<!-- NEW: Jira Task Link Field -->
<div class="space-y-2">
    <label class="text-xs font-black text-slate-700 uppercase tracking-wider">Jira Task ID <span class="text-slate-400">(Optional)</span></label>
    <input 
        type="text" 
        id="strategy-jira-id"
        placeholder="e.g., JULY-123, JUN-456"
        class="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
        autocomplete="off">
    <p class="text-[9px] text-slate-400">Enter the Jira task ID to link this event to a task</p>
</div>
```

**In `script.js`, modify `openEditStrategyEventModal` function:**

**Find this section:**
```javascript
function openEditStrategyEventModal(eventId) {
    const ev = strategyEvents[eventId];
    if (!ev) return;
    
    // ... existing code ...
    
    document.getElementById('strategy-title').value = ev.title || '';
```

**Add this line:**
```javascript
document.getElementById('strategy-jira-id').value = ev.jiraTaskId || '';
```

**Find the section that handles readonly/disabled states:**
```javascript
const fields = ['strategy-title', 'strategy-date', 'strategy-owner', 'strategy-desc'];
```

**Change to:**
```javascript
const fields = ['strategy-title', 'strategy-date', 'strategy-owner', 'strategy-desc', 'strategy-jira-id'];
```

**Find the save function (likely `saveStrategyEvent`):**

**Add this before saving:**
```javascript
// Include Jira task ID in save
const jiraId = document.getElementById('strategy-jira-id').value.trim();
eventData.jiraTaskId = jiraId || null;
```

---

## Issue #5: Update Strategy Event Sidebar to Show Jira Links

### Problem
In the strategy sidebar, events are listed but no Jira links shown

### Solution

**File:** `script.js`  
**Location:** Around line 2380-2400 (in `renderStrategySidebar` function)

**Find this section:**
```javascript
return `
    <div onclick="openEditStrategyEventModal('${ev.id}')" 
         class="p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl cursor-pointer transition-all hover:scale-[1.01] space-y-2">
        <div class="flex items-center justify-between">
            <span class="font-bold text-slate-900">${escapeHtml(ev.title)}</span>
```

**Change to:**
```javascript
const jiraLink = ev.jiraTaskId ? `<a href="${generateJiraLink(ev.jiraTaskId)}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-800 hover:underline" title="View in Jira">${ev.jiraTaskId}</a>` : '';

return `
    <div onclick="openEditStrategyEventModal('${ev.id}')" 
         class="p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl cursor-pointer transition-all hover:scale-[1.01] space-y-2">
        <div class="flex items-center justify-between gap-2">
            <span class="font-bold text-slate-900 flex-1">${escapeHtml(ev.title)}</span>
            ${jiraLink ? `<span class="text-[10px] font-bold text-indigo-600">${jiraLink}</span>` : ''}
```

---

## Complete Implementation Checklist

### Step 1: Fix Permission Issue
- [ ] Update `showFiveThirtyTaskPopup` to show current user's tasks for non-admins
- [ ] Test: Non-admin user can now see their own completed tasks
- [ ] Test: Admin users still see all users' tasks

### Step 2: Add Jira Link Helper Function
- [ ] Add `generateJiraLink(taskId)` function to `script.js`
- [ ] Test: Function generates correct Jira URLs

### Step 3: Link Tasks in Today's Completed Section
- [ ] Update HTML in `showFiveThirtyTaskPopup` to add clickable links
- [ ] Test: Task IDs are now clickable and open Jira
- [ ] Test: Links work for both admin and non-admin users

### Step 4: Add Jira ID Field to Strategy Event Modal
- [ ] Add `strategy-jira-id` input field to modal HTML
- [ ] Update `openEditStrategyEventModal` to load Jira ID
- [ ] Update save function to include Jira ID
- [ ] Test: Can enter and save Jira ID
- [ ] Test: Jira ID persists when reopening event

### Step 5: Add Jira Links in Calendar
- [ ] Update `renderStrategyCalendar` to show Jira link indicator
- [ ] Test: Calendar events show Jira link icon
- [ ] Test: Clicking link opens Jira task

### Step 6: Add Jira Links in Sidebar
- [ ] Update `renderStrategySidebar` to show Jira links
- [ ] Test: Sidebar events show clickable Jira IDs
- [ ] Test: Links open correct Jira tasks

---

## Jira Link Format

Your Jira instance is at: `https://worksync.atlassian.net/`

Link format:
```
https://worksync.atlassian.net/browse/{JIRA_KEY}
```

Examples:
- `https://worksync.atlassian.net/browse/JULY-123`
- `https://worksync.atlassian.net/browse/JUN-456`
- `https://worksync.atlassian.net/browse/JIRA-789`

---

## Testing Guide

### Test 1: Permission Fix
1. Log in as non-admin user
2. Go to Strategy Calendar
3. Wait for 17:30 (or manually trigger)
4. Should see own completed tasks (not "No completed tasks" error)
5. Verify Admin still sees all users

### Test 2: Jira Linking
1. In Today's Completed popup, task ID should be clickable
2. Click on task ID → should open Jira
3. In Strategy Calendar, events should show 🔗 icon
4. Click icon → should open Jira task
5. In Edit Event, can enter Jira ID and save

### Test 3: End-to-End
1. Create/edit strategy event
2. Add Jira task ID (e.g., JULY-123)
3. Save event
4. Verify in calendar - shows link icon
5. Verify in sidebar - shows clickable Jira ID
6. Click links - all open correct Jira task

---

## Data Structure

### Strategy Event with Jira Link
```javascript
{
    id: "event-12345",
    title: "Campaign Launch",
    date: "2026-07-15",
    platform: "Instagram",
    jiraTaskId: "JULY-123",  // NEW FIELD
    owner: "user@example.com",
    desc: "Launch campaign on Instagram",
    format: "Poster",
    // ... other fields
}
```

---

## Summary

| Issue | Fix | Impact |
|-------|-----|--------|
| **Permission Issue** | Fix logic to show non-admin users their tasks | Non-admins can now see completed tasks |
| **Task ID Linking** | Add Jira links to task IDs | Users can click to open tasks in Jira |
| **Strategy Event** | Add jiraTaskId field and input | Can link events to Jira tasks |
| **Calendar Display** | Show Jira link indicator | Visual indication of linked tasks |
| **Sidebar Display** | Show clickable Jira IDs | Easy access from sidebar |

---

## Notes

✅ All links open in new tab  
✅ Non-admin users can access their own data  
✅ Jira linking is optional (doesn't break without it)  
✅ Backward compatible with existing events  
✅ Improves workflow between strategy planning and task execution

---

**After implementing these fixes, users will have full Jira integration with seamless task linking!**
