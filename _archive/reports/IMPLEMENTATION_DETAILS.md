# Implementation Details - Task File Upload Feature

**Date:** July 9, 2026  
**Domain:** https://onedesk.vilpower.com/

---

## FILES MODIFIED & CREATED

### 1. NEW FILE: `api/upload-task-file.php`

**Purpose:** Handle file uploads on Hostinger server

**Location:** Deploy to `public_html/api/upload-task-file.php` on Hostinger

**Key Features:**
- Accepts multipart form data with file
- Validates file type via MIME check (not just extension)
- Enforces 100 MB size limit
- Generates safe filenames with timestamp
- Returns JSON response with file URL and metadata
- Includes CORS headers for cross-domain access

**Functions:**
- POST endpoint only
- CORS preflight (OPTIONS) support
- Error handling with detailed messages

**Key Code Section:**
```php
// File type validation
$ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf'
];

// Safe filename generation
$safe_name = 'task_' . time() . '_' . rand(10000, 99999) . '.' . $file_ext;

// Response
{
  "success": true,
  "file_url": "https://onedesk.vilpower.com/uploads/task-attachments/...",
  "file_name": "original_name.jpg",
  "file_size": 2048576,
  "uploaded_at": "2024-07-09 10:30:25"
}
```

---

### 2. MODIFIED FILE: `index.html`

#### 2.1 Added JavaScript Functions (Lines 11059-11228)

**Location in file:** After `uploadPhoto()` function

**New Functions Added:**

```javascript
// Configuration
const HOSTINGER_UPLOAD_URL = 'https://onedesk.vilpower.com/api/upload-task-file.php';
const MAX_UPLOAD_SIZE = 100 * 1024 * 1024; // 100 MB

// Main upload handler
async function uploadTaskFile(file)
  → Sends file to Hostinger
  → Validates response
  → Returns: { url, name, size, uploadedAt, type }

// UI handler for file selection
async function handleTaskFileUpload(event)
  → Processes drag-drop and click events
  → Shows upload progress
  → Adds to currentTaskAttachments array
  → Renders updated list

// UI rendering
function renderTaskAttachments()
  → Displays attachment list with icons
  → Shows file size
  → Adds open/remove buttons

function removeTaskAttachment(index)
  → Removes file from list
  → Updates display

// Utility functions
function getTaskFileIcon(fileName)
  → Returns appropriate icon for file type
  → Shows icon + color + label

function formatTaskFileSize(bytes)
  → Converts bytes to readable format
  → Example: "5.2 MB"

function renderTaskAttachmentsPreview(task)
  → Shows attachments as badges
  → Used for task preview/list views
```

**Key Global Variable:**
```javascript
window.currentTaskAttachments = [];  // Holds attachments during edit
```

#### 2.2 Added HTML UI (Lines 7890-7918)

**Location:** In `editTaskModal` dialog, after description field

**HTML Structure:**
```html
<!-- Attachments Section -->
<div class="border-t border-slate-200 pt-5 mt-5">
  <label>Attachments (Posters, Videos, etc.)</label>
  
  <!-- Upload Area -->
  <div id="et-upload-area" 
    ondragover="..."
    ondragleave="..."
    ondrop="..."
    onclick="...">
    
    <!-- Hidden File Input -->
    <input type="file" id="et-file-input" multiple
      onchange="handleTaskFileUpload(event)"
      accept="image/*,video/*,.pdf">
    
    <!-- Display Prompt -->
    <p>Drop files here or click to upload</p>
  </div>
  
  <!-- Attachments List -->
  <div id="et-attachments-list"></div>
</div>
```

#### 2.3 Updated `openEditTaskModal()` Function (Line 29345)

**Added:**
```javascript
// Load existing attachments
window.currentTaskAttachments = task.attachments || [];
renderTaskAttachments();
```

**Effect:** When editing a task, loads existing attachments into memory and displays them

#### 2.4 Updated `submitTaskUpdate()` Function (Line 29372)

**Added to updates object:**
```javascript
attachments: window.currentTaskAttachments || []
```

**Effect:** Saves all attachments with the task to Firebase

---

## DATA STRUCTURE CHANGES

### Task Object Before:
```javascript
{
  id: "M-1720448000",
  desc: "Design poster",
  client: "Client Name",
  status: "In Progress",
  priority: "High",
  assignee: "Barath Magesh M",
  assigneeEmail: "barathvilpower@gmail.com",
  manual: true,
  createdAt: 1720448000000,
  duedate: "2024-07-15",
  description: "Design a poster for promotion"
}
```

### Task Object After:
```javascript
{
  id: "M-1720448000",
  desc: "Design poster",
  client: "Client Name",
  status: "In Progress",
  priority: "High",
  assignee: "Barath Magesh M",
  assigneeEmail: "barathvilpower@gmail.com",
  manual: true,
  createdAt: 1720448000000,
  duedate: "2024-07-15",
  description: "Design a poster for promotion",
  attachments: [                           // ← NEW FIELD
    {
      url: "https://onedesk.vilpower.com/uploads/task-attachments/task_1720448000_1234.jpg",
      name: "poster-v1.jpg",
      size: 2048576,
      uploadedAt: "2024-07-09 10:30:25",
      type: "image/jpeg"
    }
  ]
}
```

---

## UPLOAD FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER UPLOADS FILE                           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  handleTaskFileUpload(event)                                    │
│  • Receives file from drag-drop or click                       │
│  • Gets file from event.target.files or event.dataTransfer    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  uploadTaskFile(file)                                           │
│  • Validates file size (< 100 MB)                              │
│  • Creates FormData with file                                  │
│  • POSTs to HOSTINGER_UPLOAD_URL                               │
│  • Shows loading indicator                                     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  HOSTINGER PHP SCRIPT (upload-task-file.php)                   │
│  • Receives multipart form data                                │
│  • Validates file:                                             │
│    - MIME type check                                           │
│    - Size check (< 100 MB)                                     │
│    - Generates safe filename                                   │
│  • Saves to /uploads/task-attachments/                         │
│  • Returns JSON response                                       │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  JavaScript receives response                                   │
│  • Extracts: url, name, size, uploadedAt                       │
│  • Adds to window.currentTaskAttachments[]                      │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  renderTaskAttachments()                                        │
│  • Displays all attachments in edit modal                       │
│  • Shows file icon + name + size                               │
│  • Adds open/remove buttons                                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  USER CLICKS "UPDATE TASK"                                      │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  submitTaskUpdate()                                             │
│  • Collects form data (title, client, status, etc.)            │
│  • Includes: attachments: window.currentTaskAttachments         │
│  • Saves task to Firebase with attachment URLs                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  TASK SAVED IN FIREBASE                                         │
│  • Full task object stored including attachments array         │
│  • Files remain on Hostinger server                            │
│  • URLs point to Hostinger file locations                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## LOAD FLOW DIAGRAM

```
┌──────────────────────────────────────────────────────────────┐
│           USER OPENS TASK TO EDIT                            │
│           (clicks task ID)                                   │
└──────────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│  openEditTaskModal(taskId)                                   │
│  • Finds task in tasks[] array                               │
│  • Loads all task fields into form inputs                    │
└──────────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│  window.currentTaskAttachments = task.attachments || []      │
│  • Loads existing attachments from task object               │
│  • If no attachments, empty array                            │
└──────────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│  renderTaskAttachments()                                     │
│  • Loops through currentTaskAttachments                       │
│  • Renders each as list item with icon                       │
│  • Adds open/remove buttons                                  │
└──────────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│  EDIT MODAL DISPLAYS                                         │
│  • All form fields populated                                 │
│  • Attachments list visible                                  │
│  • User can add/remove attachments                           │
└──────────────────────────────────────────────────────────────┘
```

---

## KEY CODE SNIPPETS

### Upload Handler:
```javascript
async function uploadTaskFile(file) {
    if (file.size > MAX_UPLOAD_SIZE) {
        throw new Error(`File too large. Max: 100 MB`);
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(HOSTINGER_UPLOAD_URL, {
        method: 'POST',
        body: formData
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error);

    return {
        url: data.file_url,
        name: data.file_name,
        size: data.file_size,
        uploadedAt: data.uploaded_at,
        type: file.type
    };
}
```

### Attachment List Rendering:
```javascript
function renderTaskAttachments() {
    const list = document.getElementById('et-attachments-list');
    const attachments = window.currentTaskAttachments || [];
    
    if (attachments.length === 0) {
        list.innerHTML = '';
        return;
    }

    list.innerHTML = attachments.map((att, idx) => {
        const icon = getTaskFileIcon(att.name);
        return `
            <div class="flex items-center gap-3 bg-slate-50 p-3 rounded-xl">
                <iconify-icon icon="${icon.icon}" width="20" 
                    style="color: ${icon.color}"></iconify-icon>
                
                <div class="flex-1">
                    <p class="text-xs font-bold text-slate-700">${escapeHtml(att.name)}</p>
                    <p class="text-[9px] text-slate-400">${formatTaskFileSize(att.size)}</p>
                </div>
                
                <a href="${att.url}" target="_blank" class="p-1.5 text-slate-400 hover:text-indigo-600">
                    <iconify-icon icon="solar:link-circle-bold" width="18"></iconify-icon>
                </a>
                
                <button type="button" onclick="removeTaskAttachment(${idx})" 
                    class="p-1.5 text-slate-400 hover:text-rose-600">
                    <iconify-icon icon="solar:trash-bin-trash-bold" width="18"></iconify-icon>
                </button>
            </div>
        `;
    }).join('');
}
```

### Task Update with Attachments:
```javascript
async function submitTaskUpdate() {
    const taskId = document.getElementById('et-id').value;
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    const updates = {
        desc: document.getElementById('et-title').value.trim(),
        client: document.getElementById('et-client').value,
        status: document.getElementById('et-status').value,
        priority: document.getElementById('et-priority').value,
        duedate: document.getElementById('et-duedate').value || null,
        assignee: newAssignee,
        assigneeEmail: newAssigneeEmail,
        attachments: window.currentTaskAttachments || []  // ← NEW
    };
    
    Object.assign(tasks[taskIndex], updates);
    await update(ref(db, `worksync/manual_tasks/${userKey}/${taskId}`), updates);
    
    renderTasks();
}
```

---

## INTEGRATION POINTS

### 1. Task Edit Modal
- Location: `#editTaskModal`
- Integration: Added attachment section with upload UI
- Interaction: Loads/saves attachments with task

### 2. Firebase Database
- Integration: Stores `attachments` array with task
- Data: URLs only (not files themselves)
- Impact: Minimal storage increase

### 3. Hostinger Server
- Integration: Receives uploads via PHP
- Storage: `/uploads/task-attachments/` directory
- Access: Files served via HTTPS

---

## ERROR HANDLING

### File Upload Errors:

1. **File Too Large**
   ```javascript
   if (file.size > MAX_UPLOAD_SIZE) {
       throw new Error(`File too large. Max: 100 MB, Got: ${(file.size / 1024 / 1024).toFixed(1)} MB`);
   }
   ```

2. **Invalid File Type**
   ```php
   if (!in_array($real_mime, $ALLOWED_TYPES)) {
       return error: 'File type not allowed';
   }
   ```

3. **Upload Network Error**
   ```javascript
   if (!response.ok) {
       const error = await response.json().catch(() => ({}));
       throw new Error(error.error || `Upload failed (${response.status})`);
   }
   ```

### User-Facing Messages:
- "File uploaded successfully" ✅
- "Upload failed: [error message]" ❌
- "Attachment removed" ℹ️
- "File too large. Max: 100 MB" ❌

---

## TESTING SCENARIOS

### ✅ Successful Upload
1. Click upload area
2. Select image file (< 100 MB)
3. File uploads and appears in list
4. Click link to verify file opens
5. Click Update Task
6. Reopen task to verify persistence

### ✅ Large File Upload
1. Select video (50-100 MB)
2. Upload processes (may take few seconds)
3. File appears in list
4. Can open and play in browser

### ✅ Multiple Files
1. Upload image
2. Upload video
3. Upload PDF
4. All three appear in list
5. All save together

### ✅ File Removal
1. Upload file
2. Click trash icon
3. File removed from list
4. Update task
5. File gone on reload

### ✅ Error Handling
1. Try uploading >100 MB file → Error message
2. Try uploading .exe file → Error (blocked by MIME check)
3. Try uploading from offline → Error message
4. Try with very slow connection → Upload may timeout

---

## PERFORMANCE CHARACTERISTICS

### Upload Speed:
- Typical: 1-5 MB/s (direct to Hostinger)
- Large files (100 MB): 20-100 seconds
- Speed depends on internet connection

### Storage:
- Per file metadata: ~200 bytes
- Per attachment in task: ~2 KB
- 1000 attachments: ~2 MB in Firebase
- Impact: Minimal

### Database Read/Write:
- No change (still reading/writing same task)
- Just slightly larger task object
- Negligible impact

### UI Rendering:
- Loading spinner shown during upload
- Attachment list renders instantly
- No performance impact on main app

---

## SECURITY VALIDATION

### File Type Validation:
```php
$ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf'
];

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$real_mime = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($real_mime, $ALLOWED_TYPES)) {
    // Reject
}
```

### Filename Safety:
```php
$safe_name = 'task_' . time() . '_' . rand(10000, 99999) . '.' . $file_ext;
// Result: task_1720448000_12345.jpg
// Prevents: directory traversal (../)
```

### Permissions:
```
Folders: 755 (drwxr-xr-x) - execute needed to list/access
Files:   644 (-rw-r--r--) - read-only, no execute
```

---

## DEPLOYMENT VERIFICATION

### Pre-Deployment Checklist:
- [ ] PHP script syntax checked
- [ ] JavaScript functions tested
- [ ] HTML UI display verified
- [ ] Database schema updated
- [ ] Error handling in place
- [ ] Security features enabled

### Post-Deployment Testing:
- [ ] PHP endpoint accessible
- [ ] File upload works
- [ ] Files saved to correct location
- [ ] Attachments persist with task
- [ ] Can open/download files
- [ ] Can remove files
- [ ] No console errors

---

## DOCUMENTATION PROVIDED

1. **TASK_FILE_UPLOAD_COMPLETE.md**
   - Complete overview and documentation

2. **HOSTINGER_DEPLOYMENT_READY.md**
   - Deployment instructions

3. **QUICK_DEPLOYMENT_CHECKLIST.md**
   - Quick reference checklist

4. **HOSTINGER_UPLOAD_SETUP.md**
   - Detailed setup guide

5. **IMPLEMENTATION_DETAILS.md**
   - This document

6. **FEATURE_SUMMARY.txt**
   - Quick summary and reference

---

## ROLLBACK PROCEDURE

If needed to rollback:

1. **Disable UI:**
   ```javascript
   // Comment out in index.html
   // const HOSTINGER_UPLOAD_URL = '...';
   ```

2. **Remove PHP Script:**
   ```
   Delete: public_html/api/upload-task-file.php
   ```

3. **Keep Files Safe:**
   ```
   Leave: public_html/uploads/task-attachments/
   (Can delete manually later if needed)
   ```

4. **Revert Code:**
   ```
   Replace index.html with previous version
   ```

---

## COMPLETION STATUS

✅ Backend (PHP Script) - Complete  
✅ Frontend (JavaScript Functions) - Complete  
✅ UI (HTML) - Complete  
✅ Database Schema - Complete  
✅ Error Handling - Complete  
✅ Security - Complete  
✅ Documentation - Complete  
✅ Testing - Ready  
✅ Deployment - Ready  

**Status:** READY FOR PRODUCTION
