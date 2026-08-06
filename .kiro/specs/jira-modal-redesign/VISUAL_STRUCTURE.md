# Jira-Style Add Task Modal – Visual Structure

## Modal Layout Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Create Task                                                           ✕  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────┐ ┌──────────────────────┐   │
│  │ LEFT PANEL (Main Content - 2/3 width)  │ │ RIGHT SIDEBAR (1/3)  │   │
│  │                                         │ │                      │   │
│  │ ┌─ Task Title (3xl, bold, editable) ─┐ │ │ ⚙ Details           │   │
│  │ │ Enter task title...                 │ │ │ ─────────────────── │   │
│  │ └─────────────────────────────────────┘ │ │ Assignee  ⊙ Name   │   │
│  │                                         │ │           Assign me │   │
│  │ ▼ Key Details (Expandable)            │ │                      │   │
│  │  Description                          │ │ Reporter  ⊙ Name    │   │
│  │  Edit description →                   │ │                      │   │
│  │  [Description textarea]               │ │ Priority  = Medium   │   │
│  │  Caption                              │ │ [Details...]        │   │
│  │  [Caption textarea]                   │ │                      │   │
│  │                                       │ │ ─────────────────── │   │
│  │ ▼ Subtasks (Expandable)              │ │ Content Type        │   │
│  │  [████████░░] 100% Done              │ │ [Poster] [Video]... │   │
│  │                                       │ │                      │   │
│  │  Work | Pri. | Assignee | Status    │ │ ─────────────────── │   │
│  │  ─────────────────────────────────── │ │ [Save] [Cancel]    │   │
│  │  JULY-742 │ M  │ ⊙      │ Done ✓   │ │                      │   │
│  │                                       │ │                      │   │
│  │ ▼ Activity (Expandable)              │ │                      │   │
│  │  [All] [Comments] [History]         │ │                      │   │
│  │                                       │ │                      │   │
│  │  [Comment feed with avatars]         │ │                      │   │
│  │  ⊙ Comment Input...                 │ │                      │   │
│  │  [Looks good!] [Need help?] [...]   │ │                      │   │
│  │  [Save] [Cancel]                    │ │                      │   │
│  │                                       │ │                      │   │
│  └────────────────────────────────────────┘ └──────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Section Breakdown

### Left Panel - Key Details (Expandable)

```
▼ Key Details
  Description
  Edit description ← Click to focus textarea
  
  [Full editable description textarea]
  
  Caption
  [Full editable caption textarea]
```

### Left Panel - Subtasks (Expandable)

```
▼ Subtasks    ... ┃  +
  [████████░░] 100% Done  (Progress bar green)
  
  Work          Priority  Assignee  Status
  ─────────────────────────────────────────
  JULY-742      M         ⊙ Name    Done ✓
  (Thumbnail)
  
  Linked work items
  Add linked work item
```

### Left Panel - Activity (Expandable)

```
▼ Activity
  [All] [Comments] [History]
  
  Comment Feed:
  ⊙ User Name    3 hours ago
    Comment text here...
    
  ⊙ Another User  Yesterday
    Comment text...
  
  Comment Input:
  ┌────────────────────────────┐
  │ ⊙ Your Avatar              │
  │ Type a comment...          │
  │ [formatting toolbar]       │
  │ [Looks good!] [Need help?] │
  │ [File upload] [Save]       │
  └────────────────────────────┘
```

### Right Sidebar - Details Accordion

```
⚙ Details
─────────────────────────────────────
Assignee
  ⊙ Name
  "Assign to me" →

Reporter
  ⊙ Name
  
Priority
  = Medium

Status
  [Dropdown]

Client
  [Dropdown]

Post Date
  [Date Picker]

Due Date
  [Date Picker with warning icon]

Start Date
  [Date Picker]

Content Type
  [Poster] [Video] [Printing] [Web] [Other]

Video Thumbnail Preview (Conditional)
  ⊙ Auto-Subtask
  Thumbnail task for video
  
─────────────────────────────────────
Created 9 July 2026
Updated 29 minutes ago

[Create Task] [Start Now]
```

## Responsive Layout

### Desktop (lg+)
```
┌──────────────────────────────────────┐
│ ┌──────────────┐ ┌────────────────┐  │
│ │  Left (2/3)  │ │ Right (1/3)    │  │
│ │              │ │                │  │
│ │              │ │                │  │
│ └──────────────┘ └────────────────┘  │
└──────────────────────────────────────┘
```

### Tablet/Mobile (< lg)
```
┌──────────────────┐
│ ┌──────────────┐  │
│ │  Left Panel  │  │
│ │  (Full)      │  │
│ └──────────────┘  │
│ ┌──────────────┐  │
│ │ Right Sidebar│  │
│ │ (Stacked)    │  │
│ └──────────────┘  │
└──────────────────┘
```

## Expandable Section Behavior

### Collapsed State
```
▶ Section Name
  (Content hidden, uses minimal space)
```

### Expanded State
```
▼ Section Name
  ┌─ Content begins ─┐
  │ Visible content  │
  │ (Full height)    │
  └──────────────────┘
```

**Click behavior**: 
- Click header or chevron to toggle
- Chevron rotates 90° (▶ ↔ ▼)
- Content smoothly appears/disappears
- Multiple sections can be open

## Color Palette

| Element | Color | Usage |
|---------|-------|-------|
| Background | `bg-white` | Main area |
| Right Sidebar | `bg-slate-50` | Details area |
| Borders | `border-slate-200` | Dividers |
| Text Primary | `text-slate-900` | Titles, main text |
| Text Secondary | `text-slate-700` | Body text |
| Text Tertiary | `text-slate-500` | Labels, secondary |
| Primary Button | `bg-indigo-600` | Create Task |
| Secondary Button | `bg-emerald-600` | Start Now |
| Icons | `text-slate-400` | Interactive icons |
| Hover | `hover:text-slate-600` | Interaction feedback |

## Typography

| Element | Style | Size |
|---------|-------|------|
| Task Title | Bold, black | 3xl (36px) |
| Section Header | Bold, uppercase | sm (14px) |
| Field Label | Bold, gray, uppercase | xs (12px) |
| Body Text | Regular, dark gray | sm (14px) |
| Small Text | Regular, light gray | xs (12px) |
| Comments | Regular, dark gray | sm (14px) |

## Interactive Elements

### Buttons
```
Primary: [Create Task]        bg-indigo-600 hover:bg-indigo-700
Secondary: [Start Now]        bg-emerald-600 hover:bg-emerald-700
Tertiary: [Assign to me] →    text-indigo-600 hover:underline
```

### Inputs
```
Text Input:  bg-white border-slate-200 focus:border-indigo-400
Textarea:    bg-white border-slate-200 focus:ring-indigo-500/20
Dropdown:    bg-white border-slate-200 focus:border-indigo-400
Date Picker: bg-white border-slate-200 focus:border-indigo-400
```

### Links
```
Edit Link:   text-indigo-600 hover:underline
Assign Me:   text-indigo-600 hover:underline text-sm font-bold
```

## Spacing Standards

| Element | Spacing | Usage |
|---------|---------|-------|
| Panel Padding | `p-8` | Outer padding of panels |
| Section Gap | `space-y-8` | Between major sections |
| Line Gap | `space-y-2` | Between form rows |
| Button Gap | `gap-3` | Between buttons |
| Avatar Gap | `gap-2` | Around avatars/names |

## Animation

| Element | Animation | Duration |
|---------|-----------|----------|
| Expand/Collapse | Smooth fade + slide | 200ms |
| Hover | Subtle background | 150ms |
| Focus | Ring expand | 200ms |
| Progress Bar | Width transition | 500ms |

---

**Visual design matches Jira's clean, professional aesthetic while optimizing for the specific task creation workflow.**
