# Task 9 - Quick Reference Card

## What's New?

### Jira Task Auto-Fetch in Strategy Events
Users can now search and automatically link Jira tasks when editing strategy campaign events.

---

## How to Use (User Guide)

### Step 1: Open Strategy Event
Click on any strategy event in the calendar to open the Edit modal.

### Step 2: Search for Jira Task
- Click in the "Jira Task ID" search field
- Type 2+ characters (e.g., "marketing")
- Dropdown automatically shows matching tasks

### Step 3: Select a Task
Click any task in the dropdown to select it:
- Search field updates with task ID and summary
- Green checkmark shows "Selected"
- Red clear button (✕) appears

### Step 4: Save Event
Click "Save Strategy Event" to link the Jira task.

### Step 5: Clear if Needed
Click the red ✕ button to remove Jira selection.

---

## Feature Highlights

| Feature | Benefit |
|---------|---------|
| 🔍 Auto-Search | Type 2+ chars, results appear instantly |
| 📋 Rich Display | Shows task ID, summary, status, assignee |
| ✅ One-Click Select | Single click to link Jira task |
| ✕ Clear Button | Easy removal of selection |
| 🔗 Jira Link | Calendar shows clickable Jira link |
| 📱 Mobile Ready | Works on all device sizes |
| 🔐 Permissions | Only editors can change tasks |

---

## Function Reference

### HTML Elements
```
strategy-jira-search      Input field for search
strategy-jira-dropdown    Dropdown container
strategy-jira-id         Hidden field (stores task ID)
strategy-jira-selected   Status message
strategy-jira-clear-btn  Red clear button
```

### JavaScript Functions
```javascript
fetchJiraTasksForStrategy()           // Search Jira API
searchJiraTasksForStrategy()          // Auto-trigger on input
selectJiraTaskForStrategy(id, summary) // Select task
clearStrategyJiraSelection()          // Clear selection
loadStrategyJiraDisplay()             // Load when modal opens
```

### Keyboard Support
- Type to search
- Click to select
- Tab to navigate
- Click outside to close dropdown

---

## Technical Details

### Search Query (JQL)
Searches across:
- Task summary
- Task description
- Task key/ID

Example: `summary ~ "marketing" OR description ~ "marketing" OR key ~ "marketing"`

### API Endpoint
```
https://worksync.atlassian.net/rest/api/3/search
```

### Response Fields
- `key` - Task ID (e.g., JULY-123)
- `summary` - Task title
- `status` - Current status
- `assignee` - Task owner

### Result Limit
Returns up to 20 matching tasks, sorted by most recently updated.

---

## Error Handling

| Error | What to Do |
|-------|-----------|
| "No matching tasks found" | Try different search term |
| "Error fetching Jira tasks" | Check internet connection; try again |
| Search not working | Verify Jira API credentials |
| Selected task not saving | Check permissions; verify Firebase connection |

---

## Troubleshooting

### Dropdown not appearing?
- Type at least 2 characters
- Check browser console for errors
- Verify Jira API is accessible

### Clear button not showing?
- Refresh the page
- Verify task ID was actually selected
- Check browser localStorage

### Search results too broad?
- Be more specific with search term
- Use exact task ID if known
- Try searching by task key (e.g., JULY-123)

### Can't edit search field?
- You may not have permissions
- Ask admin/Sneha/Murugesh to grant edit access
- In view-only mode, you can still see selected task

---

## Integration Points

### With Strategy Calendar
- Selected Jira task displays as 🔗 link in calendar
- Click link opens Jira task in new tab

### With Today's Completed
- Jira tasks shown in task list
- Clickable links open Jira

### With Notifications
- Toast message on selection: "✅ Linked to Jira task JULY-123"
- Toast message on clear: "Jira task selection cleared"

---

## Browser Compatibility

✅ Chrome/Chromium  
✅ Firefox  
✅ Safari  
✅ Edge  
✅ Mobile browsers  

---

## Performance Notes

- Search query runs in <1 second typically
- Dropdown shows loading spinner while searching
- Results cached until search term changes
- No network calls until user types 2+ chars

---

## Security & Privacy

- Jira credentials used from backend
- Search queries don't expose sensitive data
- Task access controlled by Jira permissions
- Read-only field for non-admin users

---

## FAQ

**Q: Can I create a new Jira task from here?**  
A: Not currently - search finds existing tasks. New tasks must be created in Jira.

**Q: What if task is deleted from Jira after linking?**  
A: The task ID remains linked; Jira link may return 404. Re-select another task to fix.

**Q: Can I link multiple Jira tasks?**  
A: Currently one task per strategy event. Multiple linking could be added in future.

**Q: Does this work for non-Jira tasks?**  
A: Only Jira tasks. Internal tasks use different system.

**Q: Is there a task search history?**  
A: Not currently - search history cleared on page reload.

---

## Support & Feedback

Report issues to: [Support Channel]  
Feature requests: [Feature Board]  
Documentation: See TASK_9_TESTING_GUIDE.md for detailed testing procedures

---

**Last Updated**: July 11, 2026  
**Status**: Production Ready ✅  
**Version**: 1.0
