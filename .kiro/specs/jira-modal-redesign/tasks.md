# Jira-Style Add Task Modal Redesign – Implementation Tasks

## Task 1: Replace addTaskModal HTML (Left & Right Panels)

- [ ] 1.1 Backup current `addTaskModal` block (lines ~9118–9498)
- [ ] 1.2 Replace HTML with new Jira-faithful design:
  - Left panel (7 cols): Title, description, caption, subtasks, activity
  - Right panel (5 cols): Details sidebar with assignee, reporter, type, status, priority, client, dates
  - Remove labels section entirely
  - Keep all existing field IDs unchanged
  - Add `mt-caption` textarea (NEW)
  - Add `mt-startdate` date input (NEW)
- [ ] 1.3 Verify modal renders without layout breaks
- [ ] 1.4 Test responsive design (mobile stack, desktop 2-col)

## Task 2: Update openAddTaskModal Reset Logic

- [ ] 2.1 Open `script.js` and find `openAddTaskModal()` function
- [ ] 2.2 Add resets for new fields:
  - Reset `mt-caption` value to empty string
  - Reset `mt-startdate` value to empty string
- [ ] 2.3 Update activity system initialization:
  - Call `setupJiraActivitySystem()` if activity system is to be integrated
  - Ensure activity feed clears on modal open
- [ ] 2.4 Preserve existing resets (title, description, dates, assignee, etc.)
- [ ] 2.5 Test modal opens with clean form

## Task 3: Update submitManualTask to Read & Save New Fields

- [ ] 3.1 Open `script.js` and find `submitManualTask()` function
- [ ] 3.2 Add field reads:
  - `const caption = document.getElementById('mt-caption')?.value?.trim() || '';`
  - `const startDate = document.getElementById('mt-startdate')?.value || '';`
- [ ] 3.3 Update task object creation to include new fields:
  - Include `caption` in task object if present
  - Include `startDate` in task object if present
- [ ] 3.4 Test task creation saves new fields to Firebase
- [ ] 3.5 Verify old field reading logic still works

## Task 4: Enhance File Upload Handler

- [ ] 4.1 Add drag-and-drop zone to left panel (below Activity)
- [ ] 4.2 Implement `ondragover`, `ondrop` handlers → `handleMtFileUpload()`
- [ ] 4.3 Add visual feedback:
  - Highlight drop zone on dragover (e.g., blue border, light background)
  - Show "Drop files here" message
  - Revert styling on dragleave
- [ ] 4.4 Preserve click-to-browse fallback (hidden file input)
- [ ] 4.5 Test file upload with drag-and-drop
- [ ] 4.6 Test file upload via click-to-browse

## Task 5: Integration & Testing

- [ ] 5.1 Open modal from "Add Task" button → verify layout renders correctly
- [ ] 5.2 Fill in all fields (title, description, caption, start date, etc.)
- [ ] 5.3 Create task → verify task object includes caption and start date
- [ ] 5.4 Check Firebase to confirm new fields are persisted
- [ ] 5.5 Test "Start Now" button still works with new modal
- [ ] 5.6 Test Jira custom dropdowns initialize properly
- [ ] 5.7 Test responsive design on mobile/tablet
- [ ] 5.8 Verify activity system displays correctly in new modal
- [ ] 5.9 Test file upload (drag-and-drop + click)
- [ ] 5.10 Verify all existing functionality preserved (no regressions)

## Task 6: Polish & Review

- [ ] 6.1 Review modal styling matches Jira screenshot
- [ ] 6.2 Check spacing, colors, fonts are consistent
- [ ] 6.3 Test keyboard navigation (Tab, Enter, Escape)
- [ ] 6.4 Verify accessibility (labels, ARIA, contrast)
- [ ] 6.5 Document any changes to field behavior
- [ ] 6.6 User review: Does modal feel like Jira?

## File Changes Summary

| File | Action | Details |
|------|--------|---------|
| `index.html` | MODIFY | Replace `addTaskModal` block (~lines 9118–9498) with Jira redesign |
| `script.js` | MODIFY | Update `openAddTaskModal()` reset logic + `submitManualTask()` field reads |
| `script.js` | MODIFY | Enhance `handleMtFileUpload()` with drag-and-drop |

---

## Notes

- All existing field IDs preserved for backward compatibility
- No database schema changes needed (new fields added as optional)
- Activity system integration may require coordinator if using `setupJiraActivitySystem()`
- Jira custom dropdowns initialized via `window.initJiraSelect()` (existing function)
