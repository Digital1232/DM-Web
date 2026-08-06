# Jira-Style Add Task Modal Redesign – Design Document

## Visual Design Reference

The modal is designed to match the Jira ticket view shown in the provided screenshot, featuring:

- Clean two-column layout (main content left, details sidebar right)
- Minimalist, professional styling with proper whitespace
- Inline label-value pairs in the Details section (matching Jira's style)
- Clear visual hierarchy with task type badge and large title

## Layout Breakdown

### Modal Container
- `class="rounded-3xl shadow-2xl p-0 w-full max-w-5xl"`
- Border-less, full-height with max constraints
- Flex column with sticky header

### Header Bar
- Background: `bg-slate-50/60`
- Border bottom: `border-b border-slate-100`
- Content: Task type badge + heading + close button
- Height: Fixed (shrink-0)

### Content Grid
- `grid grid-cols-1 lg:grid-cols-12 gap-0`
- Responsive: 1 column on mobile, 12 columns on lg+
- Scrollable (overflow-y-auto on flex-1)

#### Left Panel (7 cols)
- `lg:col-span-7 p-6 border-r border-slate-100 space-y-5 overflow-y-auto`
- Sections in order:
  1. Task Type Icon Row (buttons: General, Internal, Learning)
  2. Title Input
  3. Key Details Textarea (Description)
  4. Caption Textarea (NEW)
  5. Linked Subtasks (table with progress)
  6. Activity Section (feed + comment compose)

#### Right Panel (5 cols)
- `lg:col-span-5 p-6 bg-slate-50/40 space-y-5 overflow-y-auto`
- Sections in order:
  1. Content Type Buttons (Poster, Video, Printing, Web, Other)
  2. Video Thumbnail Preview (conditional)
  3. Details Accordion:
     - Assignee (with "Assign to me" link)
     - Reporter (static)
     - Task Type (dropdown)
     - Content Type (dropdown) – or remove if duplicating buttons
     - Status (dropdown)
     - Priority (dropdown)
     - Client (dropdown – replaces labels)
     - Post Date (date input)
     - Due Date (date input)
     - Start Date (date input – NEW)
  4. Quick Info Strip (created date, platform)
  5. Action Buttons (Create Task, Start Now)

## Color Palette

| Element | Color | Usage |
|---------|-------|-------|
| Background | `bg-white`, `bg-slate-50/40` | Modal bg, panel bg |
| Text | `text-slate-900`, `text-slate-700`, `text-slate-400` | Headings, body, labels |
| Border | `border-slate-100`, `border-slate-200` | Dividers, input borders |
| Focus Ring | `focus:ring-indigo-500/20`, `focus:ring-4` | Input focus states |
| Primary Button | `bg-indigo-600 hover:bg-indigo-700` | Create Task |
| Secondary Button | `bg-emerald-600 hover:bg-emerald-700` | Start Now |
| Task Type Badge | `bg-indigo-50 border-indigo-100 text-indigo-700` | Header badge |
| Content Type Buttons | Colored states (rose/purple/amber/blue/slate) | Active button colors |

## Typography

| Element | Style | Usage |
|---------|-------|-------|
| Modal Heading | `text-sm font-black` | "Create Task" title |
| Section Label | `text-[10px] font-bold text-slate-400 uppercase tracking-widest` | "Task Summary", "Assignee", etc. |
| Input Text | `text-base font-black` (title), `text-xs font-medium` (textarea) | User input |
| Details Values | `text-sm font-semibold` | Right panel values |
| Required Indicator | `text-rose-400 font-black` | `*` after required labels |

## Spacing & Sizing

| Element | Size | Usage |
|---------|------|-------|
| Modal Max Width | `max-w-5xl` | Main container |
| Modal Max Height | `max-h-[92vh]` | Content area |
| Padding (panels) | `p-6` | Left/right panel padding |
| Gap Between Sections | `space-y-5` | Vertical spacing |
| Input Padding | `px-4 py-3` (title), `p-4` (textarea) | Field padding |
| Border Radius | `rounded-3xl` (modal), `rounded-xl` (inputs) | Shape |

## Interactive Elements

### Buttons

**Task Type Selector** (Icon Button Row)
- Default: `border-slate-200 bg-white text-slate-500`
- Active: `border-indigo-500 bg-indigo-50 text-indigo-700`
- Hover: `hover:border-slate-300 hover:bg-slate-50`
- Transition: `transition-all`

**Content Type Selector** (Grid of 5)
- Default: `border-slate-200 bg-white text-slate-500`
- Hover: Color-specific borders/backgrounds (rose/purple/amber/blue)
- Active: Match the color theme
- Transition: `transition-all`

**Quick Reply Chips** (Comment section)
- Default: `bg-slate-50 border-slate-200 text-slate-500`
- Hover: Color-specific (emerald/blue/rose/emerald)
- Transition: `transition-all`

### Dropdowns (Jira Custom Select)

All dropdowns use `window.initJiraSelect()` for Jira-style appearance:
- Fields: assignee, status, priority, client, content type
- Styling: TBD by existing Jira Select implementation

### Date Inputs

- `type="date"` native inputs
- Styling: `bg-white border border-slate-200 rounded-xl px-3 py-2.5`
- Focus: `focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400`
- Hint text: Small amber badge with "Auto: post −4 days" for due date

### Textareas

- Multi-line input with resize disabled
- Placeholder: Context-specific
- Focus: `focus:ring-4 focus:ring-indigo-500/10`
- Font: Monospace for code/details, standard for description

## Responsive Behavior

| Breakpoint | Layout | Changes |
|------------|--------|---------|
| Mobile (< lg) | 1 column, stacked | No border-right, full-width panels |
| Tablet (lg) | 2 columns | Show border-right between panels |
| Desktop (lg+) | 2 columns (7+5) | Standard layout |

## Accessibility

- All labels properly associated with inputs (via `<label for="...">`)
- Required fields marked with `*` and announced in label
- Close button has proper icon and keyboard support
- Headings use proper semantic hierarchy (`<h3>` for modal title)
- Color not sole indicator (icons + text used for status)
- Sufficient contrast: text on bg (WCAG AA minimum)
- Focus indicators visible (ring outlines on inputs)

## Animation & Transitions

- Input focus: `transition-all` with ring expansion
- Button hover: `hover:` states with color change
- Modal appearance: `showModal()` with browser default (fade + scale)
- Quick reply chips: Color fade on hover (`transition-all`)

## State Management

### Active Task Type
- Reflected in button active state (border + background color)
- Hidden select updated simultaneously
- Affects visible fields (manual vs. internal task fields)

### Content Type Selection
- Button visual feedback (colored border + background)
- Hidden input value updated
- Triggers conditional rendering (video thumbnail preview)

### Focus States
- Title field auto-focused when modal opens
- Tab navigation follows source order
- Escape key closes modal (native behavior)

## Error Handling

- Toast notifications for validation errors:
  - "Enter a task title"
  - "Select a client"
- Button state feedback during submission:
  - Disabled state during POST
  - Loading spinner in button text

## Notes for Implementation

- Use Tailwind CSS classes throughout (existing project pattern)
- Keep all existing field IDs for backward compatibility
- Ensure Jira custom select initialized after modal visible (`setTimeout 60ms`)
- Activity system initialization must happen after DOM visible
- File upload zone can be styled with Tailwind + inline SVG icon
- Consider mobile:hidden for right panel if space is tight on small screens
