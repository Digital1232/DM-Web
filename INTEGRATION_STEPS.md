# Task File Upload - Integration Steps
**Domain:** https://onedesk.vilpower.com  
**Setup Date:** July 8, 2026

---

## QUICK START (5 Steps)

### Step 1: Upload PHP Script to Hostinger

1. Log in to **Hostinger Control Panel** (hpanel.hostinger.com)
2. Go to **File Manager**
3. Navigate to `public_html/` folder
4. Create folder: `api` (if doesn't exist)
5. Create new file: `upload-task-file.php`
6. Copy the PHP code from `HOSTINGER_UPLOAD_SETUP.md` (section 1.2)
7. Paste it into the file
8. Save

**File should be at:** `public_html/api/upload-task-file.php`

---

### Step 2: Create Upload Directory

In Hostinger File Manager:
1. Navigate to `public_html/`
2. Create folder: `uploads`
3. Inside `uploads/`, create folder: `task-attachments`

**Final path:** `public_html/uploads/task-attachments/`

(Hostinger will auto-create this on first upload, but creating it now ensures permissions are correct)

---

### Step 3: Add JavaScript Code to index.html

1. Open `index.html` in editor
2. Find a good location to add the upload functions - right after the last function definition (around line 35000+)
3. Paste the entire content of `TASK_FILE_UPLOAD_CODE.js`
4. Save the file

**This adds all the upload functions**

---

### Step 4: Add HTML to Task Modal

1. In `index.html`, find `editTaskModal` (search for: `id="editTaskModal"`)
2. Look for the closing `</div>` of the form fields section
3. It should be right before: `<div class="flex items-center gap-4 mt-8">` (the buttons section)
4. **Before those buttons**, insert the HTML from `TASK_UPLOAD_HTML.html`
5. Save

**The attachment section should appear above the Delete/Update buttons**

---

### Step 5: Update Two Functions

Find and update these two existing functions:

#### Update #1: `openEditTaskModal()` function

Find this function (search for: `function openEditTaskModal(taskId)`)

At the **very end** of the function, **before the closing `}`**, add:

```javascript
// Load existing attachments
window.currentTaskAttachments = task.attachments || [];
renderTaskAttachments();
```

**Example of where it goes:**

```javascript
function openEditTaskModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return toast('Task not found', 'error');

    // ... existing code for populating fields ...

    const deleteBtn = document.querySelector('#editTaskModal button[onclick="deleteManualTask()"]');
    if (deleteBtn) deleteBtn.classList.toggle('hidden', isMorningLearningTask(task));

    // ← ADD THESE 2 LINES HERE
    window.currentTaskAttachments = task.attachments || [];
    renderTaskAttachments();
    // ← END ADD

    document.getElementById('editTaskModal').showModal();
}
```

#### Update #2: `submitTaskUpdate()` function

Find this function (search for: `function submitTaskUpdate()`)

Find the section that creates the `updates` object:

```javascript
const updates = {
    desc: document.getElementById('et-title').value.trim(),
    client: document.getElementById('et-client').value,
    status: document.getElementById('et-status').value,
    priority: document.getElementById('et-priority').value,
    duedate: document.getElementById('et-duedate').value || null,
    assignee: newAssignee,
    assigneeEmail: newAssigneeEmail,
};
```

**Add this line before the closing `}`:**

```javascript
const updates = {
    desc: document.getElementById('et-title').value.trim(),
    client: document.getElementById('et-client').value,
    status: document.getElementById('et-status').value,
    priority: document.getElementById('et-priority').value,
    duedate: document.getElementById('et-duedate').value || null,
    assignee: newAssignee,
    assigneeEmail: newAssigneeEmail,
    attachments: window.currentTaskAttachments || []  // ← ADD THIS LINE
};
```

---

## VERIFICATION CHECKLIST

After completing all steps, verify:

- [ ] PHP file exists at: `public_html/api/upload-task-file.php`
- [ ] Folders exist: `uploads/` and `uploads/task-attachments/`
- [ ] JavaScript functions added to index.html
- [ ] HTML attachment section added to editTaskModal
- [ ] `openEditTaskModal()` updated with attachment loading code
- [ ] `submitTaskUpdate()` updated with attachments save code
- [ ] index.html saved and deployed

---

## TESTING THE FEATURE

1. **Open One Desk** (https://onedesk.vilpower.com)
2. **Click on any task** to edit it
3. **Scroll down** to see the "Attachments" section
4. **Click the upload area** or drag & drop a small image (< 10 MB)
5. **Verify:**
   - File uploads successfully
   - File name appears in list
   - File size shows correctly
   - Can click link icon to open file in new tab
   - Can click trash icon to remove

6. **Update the task** by clicking "Update Task" button
7. **Close and reopen** the task
8. **Verify** attachments are still there

---

## TROUBLESHOOTING

### Upload Button Appears But Upload Fails

**Check:**
1. PHP script is at correct path: `public_html/api/upload-task-file.php`
2. Domain URL in code is correct: `https://onedesk.vilpower.com/api/upload-task-file.php`
3. Browser console shows error (F12 → Console)
4. Check Hostinger server logs for PHP errors

**Fix:**
```
In browser console, you'll see the actual error:
- "Failed to fetch" = PHP script not found
- "CORS error" = Domain URL wrong
- "File type not allowed" = File type issue
- "File too large" = File > 100 MB
```

### Files Not Saving with Task

**Check:**
1. `submitTaskUpdate()` has `attachments: window.currentTaskAttachments || []` added
2. Task is updating successfully (check if other changes save)

### Upload Area Not Visible

**Check:**
1. HTML was pasted in correct location (before buttons)
2. index.html was saved
3. Page was refreshed/redeployed

### "Permission Denied" in Hostinger

**Fix:**
1. Right-click `uploads` folder in File Manager
2. Click "Permissions"
3. Set to `755` (for folders)
4. Apply to all files/folders

---

## SECURITY NOTES

✅ PHP script validates:
- Only images, videos, PDFs allowed
- Max 100 MB per file
- Safe filenames (no path traversal)
- CORS headers set for cross-domain requests

✅ Hostinger `.htaccess` protects:
- No PHP code execution in uploads folder
- Only image/video/PDF files accessible

---

## FILE STRUCTURE AFTER SETUP

```
public_html/
├── api/
│   └── upload-task-file.php          ← NEW: Upload handler
├── uploads/
│   └── task-attachments/              ← NEW: File storage
│       ├── task_1720448000_1234.jpg   ← Uploaded files
│       ├── task_1720448015_5678.mp4   ← Will appear here
│       └── ...
└── index.html                         ← MODIFIED: Added JS & HTML
```

---

## WHAT HAPPENS WHEN USER UPLOADS

1. **User clicks upload area or drags file**
2. **JavaScript sends POST request** to `https://onedesk.vilpower.com/api/upload-task-file.php`
3. **PHP script:**
   - Validates file type and size
   - Generates safe filename
   - Moves file to `uploads/task-attachments/`
   - Returns URL to file
4. **JavaScript:**
   - Displays file in list with icon
   - Shows file size
   - Saves URL in `window.currentTaskAttachments`
5. **When user clicks "Update Task":**
   - Attachments array saved to database
6. **When user opens task again:**
   - Attachments load from database
   - User can view, download, or delete attachments

---

## DEPLOYMENT

After testing locally:

1. **Commit and push to Git**
2. **Deploy to production**
3. Test again on live domain

If using Vercel or Git deployment:
- index.html changes will deploy automatically
- Make sure PHP script is uploaded to Hostinger (separate from main code repo)

---

## ESTIMATED TIME

- Upload PHP script: **3 minutes**
- Create folders: **2 minutes**
- Add JavaScript code: **2 minutes**
- Add HTML to modal: **3 minutes**
- Update 2 functions: **3 minutes**
- Testing: **5 minutes**

**Total: ~20 minutes**

---

## FILES REFERENCED

1. `HOSTINGER_UPLOAD_SETUP.md` - PHP script code
2. `TASK_FILE_UPLOAD_CODE.js` - All JavaScript functions
3. `TASK_UPLOAD_HTML.html` - HTML for attachment section
4. `index.html` - Main file to modify

---

## NEXT STEPS

1. ✅ Complete Step 1-5 above
2. ✅ Test feature with small file
3. ✅ Test with larger file (10+ MB)
4. ✅ Deploy to production
5. ✅ Share with team

---

## SUPPORT

**If you need help:**

1. Check troubleshooting section above
2. Check browser console (F12 → Console) for errors
3. Check Hostinger file structure matches exactly
4. Verify domain URL is correct
5. Try with different file type (image first, then video)

**Common success indicators:**
- ✅ Upload area appears in task edit modal
- ✅ Can drag files into upload area
- ✅ Files appear in list with correct size
- ✅ Files can be opened in new tab
- ✅ Task updates and attachments persist
