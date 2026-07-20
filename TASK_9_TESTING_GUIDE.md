# Task 9 - Testing Guide: Auto-Fetch Jira Tasks in Strategy Events

## Quick Test Steps

### Test 1: Modal Opens with Existing Jira Task
1. Open a strategy event that has a previously linked Jira task
2. The modal should:
   - Show the Jira task ID in the search field (e.g., "JULY-123")
   - Display "✅ Selected: JULY-123" message below
   - Show red clear button (✕)

**Expected Result**: Previously selected task displays correctly ✅

---

### Test 2: Search and Auto-Fetch
1. Open a strategy event modal (create new one if needed)
2. Type in the search field (e.g., "Marketing" or "Campaign")
3. After typing 2 characters:
   - Dropdown should appear below
   - Should show matching Jira tasks with:
     - Task ID (e.g., JULY-123)
     - Task summary
     - Status badge (📌 In Progress)
     - Assignee badge (👤 John Doe)

**Expected Result**: Dropdown auto-fetches and displays matching tasks ✅

---

### Test 3: Select Task from Dropdown
1. From Test 2, with dropdown showing results
2. Click on any task in the dropdown
3. Should see:
   - Search field updates to "TASK-ID: Task Summary"
   - "✅ Selected: TASK-ID - Task Summary" message appears
   - Red clear button (✕) becomes visible
   - Dropdown closes
   - Success toast: "✅ Linked to Jira task TASK-ID"

**Expected Result**: Task selection works, display updates, clear button shows ✅

---

### Test 4: Clear Selection
1. From Test 3, with a task selected
2. Click the red ✕ (clear) button
3. Should see:
   - Search field clears
   - Message changes to "No task selected"
   - Red clear button hides
   - Info toast: "Jira task selection cleared"

**Expected Result**: Selection cleared, button hidden, UI resets ✅

---

### Test 5: Dropdown Auto-Close
1. Open strategy modal and search for a task
2. Dropdown appears with results
3. Click somewhere outside the dropdown/search area
4. Dropdown should close

**Expected Result**: Clicking outside closes dropdown ✅

---

### Test 6: Save Event with Jira Task
1. Search and select a Jira task (Test 3)
2. Fill in other fields:
   - Event Title: "Test Campaign"
   - Date: Select a date
   - Assignee: Select from dropdown
   - Format: Poster or Video
3. Click "Save Strategy Event" button
4. Modal should close
5. Open the same event again
6. The Jira task selection should still be there

**Expected Result**: Jira task selection persists after save ✅

---

### Test 7: Permissions - Non-Admin User
1. Log in as non-admin user (if applicable)
2. Open strategy event modal
3. The strategy-jira-search field should:
   - Be readonly (cannot type)
   - Still show selected task if exists
   - Still display clear button (if task selected)

**Expected Result**: Field is read-only, permissions respected ✅

---

### Test 8: Mobile/Responsive
1. Open strategy modal on mobile device or narrow window
2. Test search field wraps properly
3. Dropdown displays correctly
4. Buttons are easily clickable
5. Clear button shows/hides properly

**Expected Result**: Layout is responsive and usable ✅

---

### Test 9: Error Handling - No Results
1. Search for something unlikely to exist (e.g., "xyzabc123")
2. Should see:
   - Dropdown shows: "No matching Jira tasks found"
   - No errors in browser console
   - Can try new search

**Expected Result**: Graceful error handling ✅

---

### Test 10: Error Handling - API Failure
1. Disconnect internet or simulate API failure
2. Try to search for tasks
3. Should see:
   - Dropdown shows: "Error fetching Jira tasks"
   - No app crash
   - Can try again once connection restored

**Expected Result**: API errors handled gracefully ✅

---

## Browser Console Checks

Open browser developer tools (F12) and check:
- [ ] No JavaScript errors
- [ ] No warnings about missing elements
- [ ] Jira API calls logged if network tab enabled

---

## Visual Checklist

- [ ] Search input has correct styling (slate background, border, focus ring)
- [ ] Search button (magnifying glass) is visible and clickable
- [ ] Clear button (✕) is red and only shows when task selected
- [ ] Dropdown has shadow and proper z-index (above modal)
- [ ] Selected task message shows in green/blue (checkmark ✅)
- [ ] Toast messages appear at bottom of screen
- [ ] All text is readable (no overflow)
- [ ] Color scheme matches dark mode (if enabled)

---

## Regression Testing

Check that these existing features still work:
- [ ] Strategy calendar displays events
- [ ] Strategy events show Jira links in calendar view
- [ ] Today's Completed section shows Jira links
- [ ] Event editing works for other fields
- [ ] Event deletion works
- [ ] Permission system still works

---

## Test Data Suggestions

For testing, create strategy events with:
- **Title 1**: "Summer Marketing Campaign" → Should find JIRA tasks with "marketing"
- **Title 2**: "Q3 Product Launch" → Should find JIRA tasks with "product"
- **Title 3**: "Client Onboarding Process" → Should find JIRA tasks with "onboarding"

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Dropdown not showing after typing | Check browser console for API errors; verify Jira credentials |
| Clear button not showing | Refresh page; check if task ID is properly saved |
| Search field not responding | Check permissions; verify user is admin/editor |
| Tasks not saving | Check Firebase rules and Jira API integration |
| Dropdown doesn't close on outside click | Check if click event listener is firing |

---

## Success Criteria

✅ All 10 tests pass  
✅ No console errors  
✅ Visual design matches mockup  
✅ Permissions enforced correctly  
✅ Data persists after save  
✅ Mobile responsive works  

---

**Status**: Ready for QA Testing ✅
