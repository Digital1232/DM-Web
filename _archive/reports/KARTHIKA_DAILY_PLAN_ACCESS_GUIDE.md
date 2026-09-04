# Karthika's Daily Plan Access - User Guide

## What Changed?
Karthika K now has access to view the Daily Plan tasks for Barath Magesh M and Immanuel Raja S. This is in addition to viewing her own tasks.

## New Features for Karthika

### 1. Daily Plan View Filter
When Karthika logs in and goes to the **Daily Plan** view, she'll see a new user filter dropdown:

```
┌─ Daily Plan ────────────────────────────────┐
│                                              │
│ User Filter: [▼ All Users]                  │
│              ├─ All Users                   │
│              ├─ Karthika K                  │
│              ├─ Barath Magesh M             │
│              └─ Immanuel Raja S             │
│                                              │
│ Date: [2026-07-16]  [All Tasks] [Carry]    │
│                                              │
│ ┌──────────────────────────────────────┐   │
│ │ Task ID │ Client │ Task │ Assignee   │   │
│ ├─────────┼────────┼──────┼────────────┤   │
│ │ JULY-42 │ NTT    │ ...  │ Barath / Immanuel ... │
│ └──────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

### 2. Available Options
When Karthika clicks the filter dropdown, she can select:

| Option | View |
|--------|------|
| **All Users** | Combined view of her tasks + Barath's tasks + Immanuel's tasks |
| **Karthika K** | Only her own tasks |
| **Barath Magesh M** | Only Barath's tasks |
| **Immanuel Raja S** | Only Immanuel's tasks |

### 3. What She Can See
#### Option: All Users (Default)
```
Date: 2026-07-16

KARTHIKA'S TASKS:
- JULY-10: Design UI mockup for Dashboard
- JULY-15: Review brand guidelines

BARATH'S TASKS:
- JULY-22: Create campaign visuals
- JULY-23: Export files for production

IMMANUEL'S TASKS:
- JULY-18: Edit video footage for YouTube
- JULY-20: Render final video output
```

#### Option: Barath Magesh M (Only)
```
Date: 2026-07-16

BARATH'S TASKS:
- JULY-22: Create campaign visuals
- JULY-23: Export files for production
```

#### Option: Immanuel Raja S (Only)
```
Date: 2026-07-16

IMMANUEL'S TASKS:
- JULY-18: Edit video footage for YouTube
- JULY-20: Render final video output
```

## Use Cases for Karthika

### 1. Coordinating with Barath
Karthika can check if Barath has design-related tasks by selecting "Barath Magesh M" to see his schedule and plan accordingly.

### 2. Collaborating with Immanuel
Karthika can view Immanuel's video production timeline and sync her graphics work with his video editing schedule.

### 3. Team Overview
By selecting "All Users", Karthika can see the combined workload of all three team members for coordination.

### 4. Planning Own Tasks
She can still switch to "Karthika K" to focus only on her assigned tasks.

## Filter Behavior

### Date Selection
The date selector works the same for all users:
- Pick a date → see tasks for that date
- Carry-over tasks from previous dates appear if they're still pending

### Status Filters
Two status filter buttons appear below the date:
- **All Tasks** - Shows all tasks (pending, in progress, completed)
- **Carry** - Shows only tasks carried over from previous dates

## Important Notes

✅ **Karthika Can:**
- View tasks for Barath and Immanuel
- Filter by date and status
- See task details, client info, and status

❌ **Karthika Cannot:**
- See other team members' tasks (Sneha, Thanush, Palanirajan, Nanjil, Murugesh)
- Edit or modify Barath/Immanuel's tasks
- Change task assignments
- Access admin features

## Live Status
✅ **Deployment Status**: LIVE (Pushed to production)
- **Deployed On**: 2026-07-16
- **Version**: Latest
- **Refresh Browser**: If you don't see the changes, hard-refresh (Ctrl+F5)

## Questions or Issues?
Contact: System Admin (nanjil@vilpower.com)

---

**Permission Model**: Daily Plan View Access is now role-based and extensible. The permission system allows granular control over which users can view which team members' tasks.
