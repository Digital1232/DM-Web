# WorkSync — Firebase Realtime Database Model

> **Root:** `https://worksync-vilpower-default-rtdb.firebaseio.com/worksync/`
>
> All paths below are relative to `worksync/`.  
> `eKey(email)` = email with `.` and `@` replaced by `_`  
> e.g. `nanjil@vilpower.com` → `nanjil_vilpower_com`

---

## Table of Contents

1. [users](#1-users)
2. [manual_tasks](#2-manual_tasks)
3. [timelogs](#3-timelogs)
4. [attendance_events](#4-attendance_events)
5. [qc_reports](#5-qc_reports)
6. [announcements](#6-announcements)
7. [conversations](#7-conversations)
8. [messages](#8-messages)
9. [requests](#9-requests)
10. [daily_plans](#10-daily_plans)
11. [discussions](#11-discussions)
12. [notes](#12-notes)
13. [strategy_events](#13-strategy_events)
14. [sneha_work_selections](#14-sneha_work_selections)
15. [dpr_entries](#15-dpr_entries)
16. [monthly_organisers](#16-monthly_organisers)
17. [event_ideas](#17-event_ideas)
18. [workplace_ideas](#18-workplace_ideas)
19. [dm_content_ideas](#19-dm_content_ideas)
20. [learning_logs](#20-learning_logs)

---

## 1. `users`

**Path:** `worksync/users/{eKey(email)}`  
**Key:** encoded email — e.g. `nanjil_vilpower_com`  
**Access:** All authenticated users can read. Own record writable by user; admin can write all.

```jsonc
{
  "email": "nanjil@vilpower.com",
  "name": "Nanjil Manohar S",
  "role": "Head of Operations",
  "avatar": "Nanjil",               // seed for DiceBear avatar
  "profilePicture": "<base64>",     // uploaded photo (base64 string)
  "online": true,                   // real-time presence flag
  "lastSeen": 1717900000000,        // Unix ms timestamp
  "team": "All",                    // e.g. "Creative Team", "All"
  "phone": "+91 99999 00000",
  "empId": "VP-001",
  "birthday": "1990-06-15",         // "YYYY-MM-DD"
  "uid": "firebase_auth_uid",
  "updatedAt": 1717900000000,

  // Active task tracker (set when user starts a task, null when cleared)
  "currentTask": {
    "taskId": "M-1717900000000",
    "taskDesc": "Design banner for NTT",
    "state": "working",             // "working" | "on_hold"
    "startedAt": 1717900000000,
    "updatedAt": 1717900000000
  }
}
```

**Sub-paths written directly:**
- `users/{key}/online` → `false` on logout / Firebase `onDisconnect`
- `users/{key}/currentTask` → object on task start, `null` on task end

---

## 2. `manual_tasks`

**Path:** `worksync/manual_tasks/{eKey(userEmail)}/{taskId}`  
**Key:** `taskId` = `"M-{timestamp}"` for user-created tasks, `"LEARN-{sanitized_email}"` for auto-created learning tasks  
**Access:** User reads/writes own subtree. Admins read/write all subtrees.

```jsonc
{
  "id": "M-1717900000000",
  "desc": "Create banner for NTT campaign",   // display title (NOT "title")
  "client": "NTT",                            // must match CLIENTS list in config.js
  "status": "To do",                          // see Internal Task Statuses below
  "priority": "High",                         // "Low" | "Medium" | "High"
  "assignee": "Nanjil Manohar S",             // display name
  "assigneeEmail": "nanjil@vilpower.com",
  "manual": true,                             // always true for manual/internal tasks
  "taskType": "internal",                     // "internal" | "task"
  "userId": "nanjil@vilpower.com",            // determines which subtree this lives in
  "createdAt": 1717900000000,
  "duedate": "2026-06-15",                    // optional, "YYYY-MM-DD"
  "order": 3,                                 // optional, for drag-drop reordering
  "notes": "Check with client first"          // optional free-text notes
}
```

**Internal Task Statuses:**  
`To do` · `Shoot Needed` · `In Progress` · `Completed` · `Hold` · `Learnings` · `Discussion`

**Learning task ID pattern:**  
`LEARN-{email.replace(/[@.]/g, '_')}` e.g. `LEARN-nanjil_vilpower_com`

---

## 3. `timelogs`

**Path:** `worksync/timelogs/{pushId}`  
**Key:** Firebase push ID (auto-generated)  
**Access:** User reads own (filtered by `userId`). Admins read all.

```jsonc
{
  "taskId": "M-1717900000000",
  "taskDesc": "Create banner for NTT campaign",
  "client": "NTT",
  "userId": "nanjil@vilpower.com",
  "userName": "Nanjil Manohar S",
  "startTime": 1717900000000,
  "endTime": 1717903600000,
  "durationSeconds": 3600,
  "durationFormatted": "1h 00m 00s",
  "date": "2026-06-09",            // "YYYY-MM-DD"
  "state": "completed"
}
```

> QC-related time logs use `taskDesc: "[QC] {task description}"` to distinguish them in reports.

**Indexed by:** `userId` (for per-user queries)

---

## 4. `attendance_events`

**Path:** `worksync/attendance_events/{pushId}`  
**Key:** Firebase push ID  
**Access:** User reads own. Admins read all.

```jsonc
{
  "type": "check_in",         // "check_in" | "break_start" | "break_end" | "check_out"
  "userId": "nanjil@vilpower.com",
  "userName": "Nanjil Manohar S",
  "timestamp": 1717900000000,
  "date": "2026-06-09",       // "YYYY-MM-DD"
  "duration": 1800000         // ms — only present on "break_end" and "check_out"
}
```

**Indexed by:** `userId`, `date`

---

## 5. `qc_reports`

**Path:** `worksync/qc_reports/{pushId}`  
**Key:** Firebase push ID  
**Access:** All authenticated users read. QC users write.

```jsonc
{
  "taskId": "MAY-123",
  "taskDesc": "Design poster for Einstein",
  "assignee": "Barath Magesh M",
  "assigneeEmail": "barathvilpower@gmail.com",
  "qcUser": "Nanjil Manohar S",
  "qcEmail": "nanjil@vilpower.com",
  "type": "poster",             // "poster" | "video"
  "rating": 4,                  // 1–5, auto-calculated from qcScore
  "notes": "Good composition, minor alignment issue",
  "durationSeconds": 720,
  "mistakeItems": [             // array of failed check items as "Category|Item"
    "Typography|Font size inconsistent",
    "Colors|Brand color mismatch"
  ],
  "checkedCount": 18,           // passed items count
  "totalCount": 20,
  "qcScore": 90,                // percentage 0–100
  "timestamp": 1717900000000,
  "date": "2026-06-09"
}
```

---

## 6. `announcements`

**Path:** `worksync/announcements/{pushId}`  
**Key:** Firebase push ID  
**Access:** All authenticated users read (last 50). Admins write and delete.

```jsonc
{
  "title": "Team Meeting Tomorrow",
  "body": "Please join the all-hands meeting at 10 AM.",
  "postedBy": "Nanjil Manohar S",
  "postedByEmail": "nanjil@vilpower.com",
  "timestamp": 1717900000000
}
```

**Query:** `limitToLast(50)` ordered by push key (chronological).  
**Notification listener:** `onChildAdded limitToLast(1)` for real-time popup.

---

## 7. `conversations`

**Path:** `worksync/conversations/{convId}`  
**Key:** For DMs: `"{eKey(emailA)}_{eKey(emailB)}"` (sorted). For groups: Firebase push ID.  
**Access:** All authenticated users read. Members write.

**DM shape:**
```jsonc
{
  "type": "dm",
  "members": {
    "nanjil_vilpower_com": true,
    "digitalmarketing_vilpower_com": true
  },
  "lastMessage": "See you tomorrow",
  "lastTimestamp": 1717900000000
}
```

**Group shape:**
```jsonc
{
  "type": "group",
  "name": "Creative Team",
  "profilePicture": "<base64 or null>",
  "members": {
    "nanjil_vilpower_com": true,
    "barathvilpower_gmail_com": true
  },
  "memberCount": 4,
  "createdBy": "nanjil@vilpower.com",
  "createdByName": "Nanjil Manohar S",
  "createdAt": 1717900000000,
  "lastMessage": "Design approved!",
  "lastTimestamp": 1717900000000
}
```

---

## 8. `messages`

**Path:** `worksync/messages/{convId}/{pushId}`  
**Key:** Firebase push ID  
**Access:** Conversation members only.

```jsonc
{
  "senderEmail": "nanjil@vilpower.com",
  "senderName": "Nanjil Manohar S",
  "text": "The designs look great!",
  "timestamp": 1717900000000,

  // Read receipts — keyed by eKey(email)
  "readBy": {
    "nanjil_vilpower_com": true,
    "barathvilpower_gmail_com": true
  },

  // Attachment (optional)
  "attachmentUrl": "<base64 or null>",
  "attachmentType": "image/png",        // MIME type
  "attachmentName": "banner.png",

  // Edit / unsend
  "editedAt": 1717900001000,            // present only if edited
  "unsent": false,                      // true if message was unsent
  "unsentAt": null,

  // Reactions — emoji key → set of user keys
  "reactions": {
    "👍": {
      "nanjil_vilpower_com": true
    },
    "🎉": {
      "barathvilpower_gmail_com": true
    }
  }
}
```

**Query:** `limitToLast(50)` per conversation. New message notification via `onChildAdded limitToLast(1)`.

---

## 9. `requests`

**Path:** `worksync/requests/{pushId}`  
**Key:** Firebase push ID  
**Access:** User reads/writes own. Approvers and admins read all and write status fields.

**Leave request:**
```jsonc
{
  "type": "leave",
  "userId": "barathvilpower@gmail.com",
  "userName": "Barath Magesh M",
  "userRole": "Manager - Creative Content & Visual",
  "leaveType": "One day Leave",         // "One day Leave" | "Casual Leave" | etc.
  "leaveDuration": "full",              // "full" | "first_half" | "second_half"
  "leaveDurationLabel": "Full Day",
  "leaveDays": 1,                       // 0.5 for half-day
  "fromDate": "2026-06-20",
  "toDate": "2026-06-20",
  "reason": "Personal work",
  "status": "pending",                  // "pending" | "approved" | "rejected"
  "submittedAt": 1717900000000,

  // Multi-step approval chain
  "approvalChain": [
    "digitalmarketing@vilpower.com",
    "nanjil@vilpower.com"
  ],
  "approvals": [
    {
      "approverEmail": "digitalmarketing@vilpower.com",
      "approverName": "Palanirajan R",
      "step": 0,
      "status": "approved",
      "approvedAt": 1717900100000,
      "note": "Approved"
    },
    {
      "approverEmail": "nanjil@vilpower.com",
      "approverName": "Nanjil Manohar S",
      "step": 1,
      "status": "pending",
      "approvedAt": null,
      "note": null
    }
  ],
  "currentApprovalStep": 1,
  "reviewedBy": "nanjil@vilpower.com",  // final reviewer
  "reviewNote": "",
  "reviewedAt": null
}
```

**Permission request:**
```jsonc
{
  "type": "permission",
  "userId": "thanushvilpower@gmail.com",
  "userName": "Thanush V",
  "userRole": "Manager - Digital Content Productions",
  "date": "2026-06-10",
  "fromTime": "14:00",
  "toTime": "15:30",
  "reason": "Medical appointment",
  "status": "pending",
  "submittedAt": 1717900000000,
  "approvalChain": ["digitalmarketing@vilpower.com", "nanjil@vilpower.com"],
  "approvals": [ /* same structure as leave */ ],
  "currentApprovalStep": 0
}
```

**Saturday off request:**
```jsonc
{
  "type": "saturday",
  "userId": "immanuelvilpower@gmail.com",
  "userName": "Immanuel Raja S",
  "userRole": "Video Producer Associate",
  "date": "2026-06-14",               // the Saturday date
  "reason": "Saturday Weekoff",
  "status": "pending",
  "submittedAt": 1717900000000,
  "approvalChain": ["digitalmarketing@vilpower.com", "nanjil@vilpower.com"],
  "approvals": [ /* same structure */ ],
  "currentApprovalStep": 0
}
```

---

## 10. `daily_plans`

**Path:** `worksync/daily_plans/{eKey(userEmail)}/{taskId}`  
**Key:** task ID (`"M-{ts}"`, Jira issue key, etc.)  
**Access:** Admins write. User reads own subtree.

```jsonc
{
  "date": "2026-06-09",               // "YYYY-MM-DD" — the plan date
  "assignedBy": "nanjil@vilpower.com",
  "assignedAt": 1717900000000
}
```

> Batch writes use `update(ref(db), multiPathObject)` — a single root-level PATCH covering multiple `worksync/daily_plans/...` paths at once.

---

## 11. `discussions`

**Path:** `worksync/discussions/{discussionId}`  
**Key:** `"DISC-{timestamp}"` or custom ID  
**Access:** All authenticated users read. Creator and participants write.

```jsonc
{
  "id": "DISC-1717900000000",
  "title": "Campaign strategy for NTT Q3",
  "participants": [
    "nanjil@vilpower.com",
    "digitalmarketing@vilpower.com"
  ],
  "status": "pending",                // "pending" | "in-progress" | "done"
  "createdBy": "nanjil@vilpower.com",
  "createdAt": 1717900000000,
  "joinedBy": [
    "digitalmarketing@vilpower.com"
  ]
}
```

---

## 12. `notes`

**Path:** `worksync/notes/{eKey(userEmail)}/{pushId}`  
**Key:** Firebase push ID  
**Access:** User reads/writes own subtree only (private notes).

```jsonc
{
  "title": "Client call summary",
  "body": "Discussed campaign goals and timeline...",
  "createdAt": 1717900000000,
  "updatedAt": 1717900000000
}
```

---

## 13. `strategy_events`

**Path:** `worksync/strategy_events/{pushId}`  
**Key:** Firebase push ID  
**Access:** All authenticated users read. Admins/organisers write.

```jsonc
{
  "title": "Q3 Strategy Review",
  "date": "2026-07-01",               // "YYYY-MM-DD"
  "description": "Full team strategy session",
  "createdAt": 1717900000000,
  "createdBy": "nanjil@vilpower.com"
  // Additional event-specific fields as needed
}
```

---

## 14. `sneha_work_selections`

**Path:** `worksync/sneha_work_selections/{pushId}`  
**Key:** Firebase push ID  
**Access:** Specific user (Sneha) writes. Admins read.

```jsonc
{
  "userId": "snehavilpower@gmail.com",
  "taskId": "MAY-456",
  "taskDesc": "Video edit for Einstein",
  "timestamp": 1717900000000
}
```

> This is a special workflow where the user selects which task they are committing to before starting, logged for daily summary reporting.

---

## 15. `dpr_entries`

**Path:** `worksync/dpr_entries/{pushId}`  
**Key:** Firebase push ID  
**Access:** User writes own. Admins read all.

```jsonc
{
  "date": "2026-06-09",               // "YYYY-MM-DD"
  "month": "2026-06",                 // "YYYY-MM" — for monthly filtering
  "category": "Design",               // task category
  "count": 5,                         // number of tasks completed (0 if status ≠ "worked")
  "status": "worked",                 // "worked" | "on_leave" | "holiday" | etc.
  "notes": "Completed 5 posters",
  "userId": "barathvilpower@gmail.com",
  "userName": "Barath Magesh M",
  "userRole": "Manager - Creative Content & Visual",
  "createdAt": 1717900000000
}
```

**Indexed by:** `month` (for monthly DPR views)

---

## 16. `monthly_organisers`

**Path:** `worksync/monthly_organisers`  
**Key:** Single document (not a collection)  
**Access:** Admins write. All authenticated users read.

```jsonc
{
  "allocationId": "1717900000000",    // timestamp string, changes on each re-allocation

  "event": {
    "email": "nanjil@vilpower.com",
    "name": "Nanjil Manohar S",
    "count": 3                        // number of event ideas submitted this month
  },

  "leave": {
    "email": "digitalmarketing@vilpower.com",
    "name": "Palanirajan R",
    "count": 7                        // number of leave requests processed this month
  },

  "learnings": {
    "email": "murugeshvilpower@gmail.com",
    "name": "Murugesh Kumar A",
    "type": "Video Tutorial",         // learning format e.g. "Article" | "Video Tutorial"
    "duration": "30 minutes",         // target duration e.g. "30 minutes"
    "count": 2                        // learning logs submitted this month
  },

  "workplace": {
    "email": "thanushvilpower@gmail.com",
    "name": "Thanush V",
    "count": 1                        // workplace suggestions submitted this month
  },

  "dmContent": {
    "email": "barathvilpower@gmail.com",
    "name": "Barath Magesh M",
    "count": 4                        // DM content ideas submitted this month
  }
}
```

> Sub-path `monthly_organisers/{organiserKey}/count` is updated incrementally via `update()` each time an organiser submits a new entry.

---

## 17. `event_ideas`

**Path:** `worksync/event_ideas/{pushId}`  
**Key:** Firebase push ID  
**Access:** Event Organiser (current month) and admins write. All users read.

```jsonc
{
  "title": "Team Outing to Mahabalipuram",
  "details": "A full day trip with activities and team lunch...",
  "userId": "nanjil@vilpower.com",
  "userName": "Nanjil Manohar S",
  "createdAt": 1717900000000
}
```

**Indexed by:** `createdAt`

---

## 18. `workplace_ideas`

**Path:** `worksync/workplace_ideas/{pushId}`  
**Key:** Firebase push ID  
**Access:** Workplace Organiser (current month) and admins write. All users read.

```jsonc
{
  "title": "Standing desk request",
  "details": "Adding standing desk options would improve ergonomics...",
  "userId": "thanushvilpower@gmail.com",
  "userName": "Thanush V",
  "createdAt": 1717900000000
}
```

**Indexed by:** `createdAt`

---

## 19. `dm_content_ideas`

**Path:** `worksync/dm_content_ideas/{pushId}`  
**Key:** Firebase push ID  
**Access:** DM Content Organiser (current month) and admins write. All users read.

```jsonc
{
  "title": "Einstein campaign copy — June batch",
  "details": "Post 1: Headline copy...\nPost 2: Body copy...",
  "userId": "barathvilpower@gmail.com",
  "userName": "Barath Magesh M",
  "createdAt": 1717900000000
}
```

**Indexed by:** `createdAt`

---

## 20. `learning_logs`

**Path:** `worksync/learning_logs/{pushId}`  
**Key:** Firebase push ID  
**Access:** Learnings Organiser (current month) and admins write. All users read.

```jsonc
{
  "title": "CSS Grid Deep Dive",
  "details": "Covered grid-template-areas, auto-fill vs auto-fit...",
  "userId": "murugeshvilpower@gmail.com",
  "userName": "Murugesh Kumar A",
  "createdAt": 1717900000000
}
```

**Indexed by:** `createdAt`

> **Note:** `learning_logs` is the manual log of learning sessions shared by the organiser.  
> Auto-created daily learning tasks live in `manual_tasks/{eKey(email)}/LEARN-{sanitized_email}`.

---

## Key Patterns & Conventions

### `eKey(email)` encoding
Replaces `.` and `@` with `_` to make email addresses valid Firebase path segments.
```
nanjil@vilpower.com       →  nanjil_vilpower_com
digitalmarketing@vilpower.com  →  digitalmarketing_vilpower_com
barathvilpower@gmail.com  →  barathvilpower_gmail_com
```

### Task Types
| `taskType` | Source | Path |
|---|---|---|
| `"internal"` | Manually created in app | `manual_tasks/{user}/{id}` |
| `"task"` | Manually created (non-internal) | `manual_tasks/{user}/{id}` |
| *(no taskType)* | Synced from Jira | In-memory only (not in Firebase) |

### Admin vs User Data Access
| Collection | Regular User | Admin |
|---|---|---|
| `manual_tasks` | Own subtree only | All users' subtrees |
| `timelogs` | Filtered by `userId` | Full collection |
| `attendance_events` | Filtered by `userId` | Full collection |
| `requests` | Own requests | All requests |
| `daily_plans` | Own subtree | All subtrees |
| `notes` | Own subtree | Not accessible (private) |

### Organiser Collections
Five parallel idea/log collections each tied to a rotating monthly organiser:

| Collection | Organiser key | Purpose |
|---|---|---|
| `event_ideas` | `monthly_organisers.event` | Team event planning |
| `workplace_ideas` | `monthly_organisers.workplace` | Workplace improvement suggestions |
| `dm_content_ideas` | `monthly_organisers.dmContent` | Social media content drafts |
| `learning_logs` | `monthly_organisers.learnings` | Learning session notes |
| *(leave managed via requests)* | `monthly_organisers.leave` | Leave request processing |

---

## Firebase Security Rules (Recommended)

```json
{
  "rules": {
    "worksync": {
      "users": {
        "$userKey": {
          ".read": "auth != null",
          ".write": "auth != null && ($userKey === auth.token.email.replace('.','_').replace('@','_') || root.child('worksync/users/' + auth.token.email.replace('.','_').replace('@','_') + '/role').val() === 'System Admin')"
        }
      },
      "manual_tasks": {
        "$userKey": {
          ".read": "auth != null && ($userKey === auth.token.email.replace('.','_').replace('@','_') || root.child('worksync/users/' + auth.token.email.replace('.','_').replace('@','_') + '/role').val() === 'System Admin')",
          ".write": "auth != null && ($userKey === auth.token.email.replace('.','_').replace('@','_') || root.child('worksync/users/' + auth.token.email.replace('.','_').replace('@','_') + '/role').val() === 'System Admin')"
        }
      },
      "notes": {
        "$userKey": {
          ".read": "auth != null && $userKey === auth.token.email.replace('.','_').replace('@','_')",
          ".write": "auth != null && $userKey === auth.token.email.replace('.','_').replace('@','_')"
        }
      },
      "$other": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

---

## 21. `storage_nodes` (New)

**Path:** `worksync/storage_nodes/{nodeId}`  
**Key:** `nodeId` (Firebase push ID or static IP slug)  
**Access:** All authenticated users read. Admins write/manage.

```jsonc
{
  "nodeId": "192_168_1_50",
  "userId": "nanjil@vilpower.com",
  "systemName": "Nanjil-Desktop",
  "staticIp": "192.168.1.50",
  "status": "online",                 // "online" | "offline"
  "totalCapacityBytes": 1000000000000,
  "usedCapacityBytes": 250000000000,
  "createdAt": 1717900000000,
  "lastHeartbeat": 1717900000000
}
```

---

## 22. `file_registry` (New)

**Path:** `worksync/file_registry/{pushId}`  
**Key:** Firebase push ID  
**Access:** All authenticated users read. Users write when uploading.

```jsonc
{
  "fileId": "FILE-1717900000000",
  "clientId": "NTT",                  // Matches CLIENTS list
  "nodeId": "192_168_1_50",           // FK to storage_nodes
  "filename": "Q3_Campaign_Assets.zip",
  "relativePath": "/storage/NTT/Q3_Campaign_Assets.zip",
  "fileSizeBytes": 50000000,
  "uploadedBy": "nanjil@vilpower.com",
  "uploadTimestamp": 1717900000000
}
```
