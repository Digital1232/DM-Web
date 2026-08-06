# Jira-Style Add Task Modal Redesign – Requirements

## Overview

Redesign the `addTaskModal` to closely match the Jira UI screenshot provided, featuring a two-column split layout (title + content left, sidebar details right), clean inline-style Jira detail rows, full drag-and-drop file upload, and updated field set.

## User Story

As a user creating tasks in WorkSync, I want the Add Task modal to feel like Jira—with a clear left panel for main content and a right sidebar for details—so that I can quickly fill in task information using familiar UI patterns.

## Key Requirements

### 1. Modal Layout – Two-Column Split

- **Left Panel** (7 columns): Main content area with task type badge + title, description, caption, subtasks, and activity
- **Right Panel** (5 columns): Sidebar with Jira-style "Details" accordion containing assignee, reporter, task type, status, priority, client, post date, due date, start date
- Responsive: Stack vertically on mobile; two-column on desktop (lg: and up)

### 2. Left Panel – Main Content Area

#### 2.1 Header (Task Type Badge + Title)
- Display task type badge inline with heading (e.g., "JULY-741 New Task")
- Use icon indicators: General Task, Internal Task, Learning

#### 2.2 Task Summary / Title
- Large editable text input
- Placeholder: "What needs to be done?"
- Required field

#### 2.3 Key Details, Notes & Requirements
- Rich textarea for task description
- ID: `mt-internal-description` (preserved from current)
- Placeholder: "Task details, deliverables, social media copy, hashtags, requirements..."

#### 2.4 Caption Field
- **NEW**: Add `<textarea id="mt-caption">` labeled "Caption"
- Positioned directly below Key Details textarea
- For attaching captions, post text, or social media copy

#### 2.5 Linked Subtasks
- Kept exactly as-is from current modal
- Progress bar when subtasks exist
- Count badge

#### 2.6 Activity Section
- Replaced with `setupJiraActivitySystem()` container div
- Comment compose box with quick-reply chips
- Activity tabs: All, Comments, History
- Integrated file attachment (moved from footer)

### 3. Right Panel – Sidebar Details (Jira-Style)

"Details" accordion with clean inline label-value rows (matching Jira screenshot):

| Row | Field | Element | Notes |
|-----|-------|---------|-------|
| 1 | Assignee | `mt-assignee` select | Dropdown with "Assign to me" link |
| 2 | Reporter | Static display | Current user name (read-only) |
| 3 | Task Type | `mt-task-type` select | Jira-style dropdown |
| 4 | Content Type | `mt-content-type` | Dropdown (Poster/Video/Printing/Web/Other) |
| 5 | Status | `mt-status` / `mt-internal-status` | Jira dropdown |
| 6 | Priority | `mt-priority` / `mt-internal-priority` | Jira dropdown |
| 7 | Client | `mt-client` | Replaces Labels section (no labels chip system) |
| 8 | Post Date | `mt-postdate` / `mt-internal-postdate` | Date input |
| 9 | Due Date | `mt-duedate` / `mt-internal-duedate` | Date input with auto-fill hint |
| 10 | Start Date | `mt-startdate` | **NEW** date input |

**Labels → Clients**: The label chip system (`mt-labels-picker`, `mt-label-input`, `mt-labels-value`) is **removed**. The existing `mt-client` dropdown already fills this role.

### 4. File Upload Redesign

**Current Issue**: Tiny paperclip button in comment footer is hard to see.

**New Design**:
- Add a proper drag-and-drop upload zone in the left panel (below Activity section or within Activity)
- Include `ondragover`, `ondrop`, `onchange` handlers → `handleMtFileUpload()`
- Visual "Drop files or click to attach" zone (Jira-style)
- Click-to-browse fallback via hidden `<input type="file">`

### 5. Field Behavior & Constraints

#### 5.1 Existing Field IDs (Preserved)

All existing field IDs used by `submitManualTask()` are preserved exactly so the save logic continues to work:

- `mt-title`
- `mt-internal-description`
- `mt-client`
- `mt-task-type`
- `mt-assignee`
- `mt-status` / `mt-internal-status`
- `mt-priority` / `mt-internal-priority`
- `mt-postdate` / `mt-internal-postdate`
- `mt-duedate` / `mt-internal-duedate`
- `mt-content-type`

#### 5.2 New Field IDs

- `mt-caption` (textarea)
- `mt-startdate` (date input)

#### 5.3 Removed Sections

- ❌ **No Automation section** – completely omitted
- ❌ **No Clockify section** – completely omitted
- ❌ **No Labels section** – `mt-client` dropdown fills this role

### 6. Modal Header & Actions

- **Header**: Task type badge + "Create Task" heading + close button
- **Action Buttons**:
  - Primary: "Create Task" (indigo)
  - Secondary: "Start Now" (emerald)

### 7. Empty States & Defaults

- Assignee defaults to current user
- Status defaults to "To do" (internal) or first status in list (manual)
- Priority defaults to "Medium"
- Content Type defaults to none (user selects)

## Acceptance Criteria

- [ ] Modal layout matches Jira screenshot: 7-col left, 5-col right
- [ ] All task fields are present and properly labeled
- [ ] `mt-caption` textarea renders and can be saved
- [ ] `mt-startdate` date input renders and can be saved
- [ ] File upload zone is visible and functional (drag-and-drop + click)
- [ ] No label chip system in modal (client dropdown replaces it)
- [ ] All existing field IDs preserved for `submitManualTask()` compatibility
- [ ] Modal opens without errors when "Add Task" button clicked
- [ ] Task creation works with new modal layout
- [ ] Activity system initializes with new modal
- [ ] Responsive design: stacks on mobile, 2-col on desktop

## Notes

- The entire `addTaskModal` HTML block (lines ~9118–9498 in index.html) will be replaced
- The `openAddTaskModal()` JS function will be updated to reset `mt-caption` and `mt-startdate`
- The `submitManualTask()` function will be updated to read and save `mt-caption` and `mt-startdate`
- File upload handler improvements to `handleMtFileUpload()` will be applied
