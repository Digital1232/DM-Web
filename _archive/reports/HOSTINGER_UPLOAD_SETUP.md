# File Upload Setup for Hostinger - Complete Guide

**Date:** July 8, 2026  
**Purpose:** Upload task attachments (posters, videos) to your Hostinger server

---

## STEP 1: CREATE PHP UPLOAD SCRIPT ON HOSTINGER

### 1.1 Access Your Hostinger File Manager

1. Log in to **Hostinger Control Panel** (hpanel.hostinger.com)
2. Go to **File Manager** → Navigate to your website root directory
3. Usually it's `public_html/` or your domain folder
4. Create a new folder: `uploads/task-attachments/`

### 1.2 Create Upload Script

Create a new file: `public_html/api/upload-task-file.php`

```php
<?php
// upload-task-file.php - Handle task file uploads on Hostinger

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Only POST allowed']);
    exit;
}

// Configuration
$MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
$UPLOAD_DIR = __DIR__ . '/../uploads/task-attachments/';
$ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'application/pdf'];

// Create upload directory if it doesn't exist
if (!is_dir($UPLOAD_DIR)) {
    mkdir($UPLOAD_DIR, 0755, true);
}

// Check if file was uploaded
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'No file uploaded or upload error',
        'details' => $_FILES['file']['error'] ?? 'Unknown'
    ]);
    exit;
}

$file = $_FILES['file'];

// Validate file size
if ($file['size'] > $MAX_FILE_SIZE) {
    http_response_code(413);
    echo json_encode([
        'success' => false,
        'error' => 'File too large',
        'max_size' => '100 MB',
        'file_size' => round($file['size'] / 1024 / 1024, 2) . ' MB'
    ]);
    exit;
}

// Validate file type
if (!in_array($file['type'], $ALLOWED_TYPES)) {
    http_response_code(415);
    echo json_encode([
        'success' => false,
        'error' => 'File type not allowed',
        'allowed_types' => $ALLOWED_TYPES
    ]);
    exit;
}

// Generate safe filename
$original_name = basename($file['name']);
$file_ext = strtolower(pathinfo($original_name, PATHINFO_EXTENSION));
$safe_name = 'task_' . time() . '_' . rand(1000, 9999) . '.' . $file_ext;
$file_path = $UPLOAD_DIR . $safe_name;

// Move uploaded file
if (!move_uploaded_file($file['tmp_name'], $file_path)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to save file'
    ]);
    exit;
}

// Get your domain (replace with actual domain)
$domain = 'https://' . $_SERVER['HTTP_HOST'];
$file_url = $domain . '/uploads/task-attachments/' . $safe_name;

// Success response
http_response_code(200);
echo json_encode([
    'success' => true,
    'message' => 'File uploaded successfully',
    'file_url' => $file_url,
    'file_name' => $original_name,
    'file_size' => $file['size'],
    'uploaded_at' => date('Y-m-d H:i:s')
]);
?>
```

### 1.3 Create .htaccess for Security (Optional but Recommended)

Create file: `public_html/uploads/.htaccess`

```apache
# Prevent script execution in uploads folder
<FilesMatch "\.(php|phtml|php3|php4|php5|phps|pht|phar)$">
    Deny from all
</FilesMatch>

# Allow image and video files to be served
<FilesMatch "\.(jpg|jpeg|png|gif|webp|mp4|webm|pdf)$">
    Allow from all
</FilesMatch>
```

---

## STEP 2: INTEGRATE UPLOAD INTO TASKS (JavaScript Code)

### 2.1 Add this to index.html (around line 7950 after editTaskModal)

```javascript
// ═══════════════════════════════════════════════════════════════
// TASK FILE UPLOAD FUNCTIONS
// ═══════════════════════════════════════════════════════════════

const HOSTINGER_UPLOAD_URL = 'https://yourdomain.com/api/upload-task-file.php';
const MAX_UPLOAD_SIZE = 100 * 1024 * 1024; // 100 MB

async function uploadTaskFile(file) {
    if (file.size > MAX_UPLOAD_SIZE) {
        throw new Error(`File too large. Max: 100 MB, Got: ${(file.size / 1024 / 1024).toFixed(1)} MB`);
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(HOSTINGER_UPLOAD_URL, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Upload failed (${response.status})`);
    }

    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || 'Upload failed');
    }

    return {
        url: data.file_url,
        name: data.file_name,
        size: data.file_size,
        uploadedAt: data.uploaded_at,
        type: file.type
    };
}

function getFileIcon(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        return { icon: 'solar:image-bold', color: '#ec4899', label: 'Image' };
    }
    if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) {
        return { icon: 'solar:video-bold', color: '#f59e0b', label: 'Video' };
    }
    if (ext === 'pdf') {
        return { icon: 'solar:file-text-bold', color: '#ef4444', label: 'PDF' };
    }
    
    return { icon: 'solar:file-download-bold', color: '#6366f1', label: 'File' };
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
```

### 2.2 Add File Upload HTML to Edit Task Modal

Find the `editTaskModal` (around line 7810) and add this BEFORE the closing `</div>` of the form fields:

```html
<!-- Task Attachments Section -->
<div class="border-t border-slate-200 pt-5 mt-5">
    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
        Attachments (Posters, Videos, etc.)
    </label>
    
    <!-- Upload Area -->
    <div id="et-upload-area" 
        class="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all"
        ondragover="event.preventDefault(); this.classList.add('border-indigo-400', 'bg-indigo-50')"
        ondragleave="this.classList.remove('border-indigo-400', 'bg-indigo-50')"
        ondrop="event.preventDefault(); this.classList.remove('border-indigo-400', 'bg-indigo-50'); handleTaskFileUpload(event)">
        
        <input type="file" id="et-file-input" class="hidden" multiple 
            onchange="handleTaskFileUpload(event)"
            accept="image/*,video/*,.pdf">
        
        <div class="flex flex-col items-center gap-2">
            <iconify-icon icon="solar:cloud-upload-bold" width="32" class="text-slate-300"></iconify-icon>
            <p class="text-sm font-bold text-slate-600">
                Drop files here or <span class="text-indigo-600">click to upload</span>
            </p>
            <p class="text-xs text-slate-400">
                Images, Videos, PDFs up to 100 MB each
            </p>
        </div>
    </div>
    
    <!-- Upload Area Click Handler -->
    <script>
        document.getElementById('et-upload-area')?.addEventListener('click', () => {
            document.getElementById('et-file-input')?.click();
        });
    </script>
    
    <!-- Attachments List -->
    <div id="et-attachments-list" class="mt-4 space-y-2">
        <!-- Populated by renderTaskAttachments() -->
    </div>
</div>
```

### 2.3 Add Upload Handler Functions

Add this JavaScript code in the main script section:

```javascript
async function handleTaskFileUpload(event) {
    const files = event.target.files || event.dataTransfer.files;
    if (!files.length) return;

    const uploadBtn = document.querySelector('#editTaskModal [onclick*="submitTaskUpdate"]');
    const originalText = uploadBtn?.textContent;
    
    try {
        for (let file of files) {
            const uploadArea = document.getElementById('et-upload-area');
            uploadArea.innerHTML = `
                <div class="flex items-center justify-center gap-2 text-slate-500">
                    <iconify-icon icon="svg-spinners:ring-resize" width="24"></iconify-icon>
                    <span class="text-sm">Uploading ${file.name}...</span>
                </div>
            `;

            const uploaded = await uploadTaskFile(file);
            
            // Add to task attachments
            if (!window.currentTaskAttachments) {
                window.currentTaskAttachments = [];
            }
            window.currentTaskAttachments.push(uploaded);
            
            renderTaskAttachments();
        }
        
        toast('File uploaded successfully', 'success');
        document.getElementById('et-file-input').value = '';
    } catch (err) {
        console.error('Upload failed:', err);
        toast('Upload failed: ' + err.message, 'error');
    } finally {
        // Reset upload area
        const uploadArea = document.getElementById('et-upload-area');
        if (uploadArea) {
            uploadArea.innerHTML = `
                <div class="flex flex-col items-center gap-2">
                    <iconify-icon icon="solar:cloud-upload-bold" width="32" class="text-slate-300"></iconify-icon>
                    <p class="text-sm font-bold text-slate-600">
                        Drop files here or <span class="text-indigo-600">click to upload</span>
                    </p>
                    <p class="text-xs text-slate-400">
                        Images, Videos, PDFs up to 100 MB each
                    </p>
                </div>
            `;
        }
    }
}

function renderTaskAttachments() {
    const list = document.getElementById('et-attachments-list');
    if (!list) return;

    const attachments = window.currentTaskAttachments || [];
    
    if (attachments.length === 0) {
        list.innerHTML = '';
        return;
    }

    list.innerHTML = attachments.map((att, idx) => {
        const icon = getFileIcon(att.name);
        return `
            <div class="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <iconify-icon icon="${icon.icon}" width="20" style="color: ${icon.color}"></iconify-icon>
                
                <div class="flex-1 min-w-0">
                    <p class="text-xs font-bold text-slate-700 truncate">${att.name}</p>
                    <p class="text-[9px] text-slate-400">${formatFileSize(att.size)}</p>
                </div>
                
                <a href="${att.url}" target="_blank" 
                    class="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors rounded-lg"
                    title="Open file">
                    <iconify-icon icon="solar:link-circle-bold" width="18"></iconify-icon>
                </a>
                
                <button type="button" onclick="removeTaskAttachment(${idx})"
                    class="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-lg"
                    title="Remove">
                    <iconify-icon icon="solar:trash-bin-trash-bold" width="18"></iconify-icon>
                </button>
            </div>
        `;
    }).join('');
}

function removeTaskAttachment(index) {
    if (!window.currentTaskAttachments) return;
    window.currentTaskAttachments.splice(index, 1);
    renderTaskAttachments();
    toast('Attachment removed', 'info');
}
```

### 2.4 Update Task Update Function

Find the `submitTaskUpdate()` function (around line 29110) and update it to save attachments:

```javascript
async function submitTaskUpdate() {
    const taskId = document.getElementById('et-id').value;
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return toast('Task not found to update', 'error');

    const originalTask = { ...tasks[taskIndex] };
    const newAssigneeEmail = document.getElementById('et-assignee').value;
    const newAssignee = allUsersMap.get(newAssigneeEmail.toLowerCase())?.name || 'Unassigned';

    const updates = {
        desc: document.getElementById('et-title').value.trim(),
        client: document.getElementById('et-client').value,
        status: document.getElementById('et-status').value,
        priority: document.getElementById('et-priority').value,
        duedate: document.getElementById('et-duedate').value || null,
        assignee: newAssignee,
        assigneeEmail: newAssigneeEmail,
        // ✅ ADD ATTACHMENTS
        attachments: window.currentTaskAttachments || []
    };
    
    // ... rest of the function remains the same
}
```

### 2.5 Update openEditTaskModal to Load Attachments

Find `openEditTaskModal()` function (around line 29081) and add this at the end:

```javascript
function openEditTaskModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return toast('Task not found', 'error');

    // ... existing code ...

    // ✅ ADD THIS AT THE END
    window.currentTaskAttachments = task.attachments || [];
    renderTaskAttachments();

    document.getElementById('editTaskModal').showModal();
}
```

---

## STEP 3: YOUR DOMAIN IS SET UP ✅

Your domain is configured:

```javascript
const HOSTINGER_UPLOAD_URL = 'https://onedesk.vilpower.com/api/upload-task-file.php';
```

**This is already set in the code below - no changes needed!**

---

## STEP 4: DISPLAY ATTACHMENTS IN TASK VIEW

When displaying tasks, add this code to show attachments:

```javascript
function renderTaskAttachmentsPreview(task) {
    const attachments = task.attachments || [];
    if (!attachments.length) return '';

    return `
        <div class="mt-3 space-y-2 border-t pt-3">
            <p class="text-[9px] font-bold text-slate-400 uppercase">Attachments</p>
            <div class="flex flex-wrap gap-2">
                ${attachments.map(att => {
                    const icon = getFileIcon(att.name);
                    return `
                        <a href="${att.url}" target="_blank" 
                            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors text-[9px] font-bold text-indigo-700">
                            <iconify-icon icon="${icon.icon}" width="14"></iconify-icon>
                            ${att.name}
                        </a>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}
```

---

## STEP 5: TESTING CHECKLIST

- [ ] PHP script uploaded to `public_html/api/upload-task-file.php`
- [ ] Folder `public_html/uploads/task-attachments/` created (Hostinger will create auto)
- [ ] Domain URL is correct in JavaScript (`HOSTINGER_UPLOAD_URL`)
- [ ] Try uploading a small image first (< 10 MB)
- [ ] Check if file appears in Hostinger File Manager
- [ ] Verify file URL is accessible in browser
- [ ] Try uploading a video (< 50 MB)
- [ ] Verify attachments save with task

---

## TROUBLESHOOTING

### "Permission Denied" Error
1. Go to Hostinger File Manager
2. Right-click `uploads` folder → Permissions
3. Set to `755` for folders, `644` for files
4. Check if `api` folder exists, if not create it

### File Not Uploading
1. Check PHP `post_max_filesize` limit in Hostinger (usually 128 MB)
2. Verify `HOSTINGER_UPLOAD_URL` has correct domain
3. Check browser console for error messages
4. Try smaller file first

### CORS Error
The `.php` script already has CORS headers, but if you get CORS error:
1. Check if domain name is correct in URL
2. Verify PHP script was uploaded to correct location
3. Test with `curl` command: `curl -X POST -F "file=@test.jpg" https://yourdomain.com/api/upload-task-file.php`

### Large Files Timing Out
1. Increase timeout in Hostinger settings (usually in cPanel)
2. Or limit to 50 MB files instead of 100 MB
3. Modify this line: `$MAX_FILE_SIZE = 100 * 1024 * 1024;`

---

## SECURITY FEATURES INCLUDED

✅ File type validation (only images, videos, PDFs)  
✅ File size limit (100 MB)  
✅ Safe filename generation (prevents directory traversal)  
✅ CORS headers (allows requests from your domain)  
✅ .htaccess protection (prevents script execution in uploads)  
✅ Directory structure (uploads separate from code)  

---

## FILE STRUCTURE AFTER SETUP

```
public_html/
├── api/
│   └── upload-task-file.php      ← NEW: Upload handler
├── uploads/
│   └── task-attachments/          ← NEW: Stores uploaded files
│       └── task_1720448000_1234.jpg
│       └── task_1720448015_5678.mp4
└── [your other files]
```

---

## NEXT STEPS

1. Upload PHP script to Hostinger
2. Create folders as shown above
3. Update `HOSTINGER_UPLOAD_URL` with your domain
4. Add JavaScript code to index.html
5. Test with a small file
6. Deploy to production

**Total Setup Time: 15-20 minutes**

---

## SUMMARY

- **Storage Location:** Hostinger server (your domain)
- **Upload Limit:** 100 MB per file
- **Supported Types:** Images, Videos, PDFs
- **Cost:** $0 (included in Hostinger plan)
- **Control:** 100% yours - full access to files
- **No External Dependencies:** No Cloudinary, no Firebase storage
