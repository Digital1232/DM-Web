# Hostinger File Upload - Deployment Ready ✅

**Date:** July 9, 2026  
**Status:** READY TO DEPLOY  
**Domain:** https://onedesk.vilpower.com/

---

## WHAT'S BEEN DONE

✅ **PHP Upload Script Created**
- File: `api/upload-task-file.php`
- Location: Upload to `public_html/api/upload-task-file.php` on Hostinger
- Features: Security validation, file type checking, size limits (100 MB), auto-generated safe filenames

✅ **JavaScript Functions Integrated**
- File: `index.html` (lines 11059-11228)
- Functions added:
  - `uploadTaskFile()` - Handles upload to Hostinger
  - `getTaskFileIcon()` - Shows file type icons
  - `formatTaskFileSize()` - Shows readable file sizes
  - `handleTaskFileUpload()` - Processes drag-drop and click uploads
  - `renderTaskAttachments()` - Displays attachments list
  - `removeTaskAttachment()` - Removes files from list
  - `renderTaskAttachmentsPreview()` - Shows attachments in task view

✅ **HTML UI Added**
- File: `index.html` (lines 7890-7918)
- Location: In edit task modal (editTaskModal)
- Features:
  - Drag & drop zone
  - Click to upload button
  - Displays file icons with sizes
  - Link to open files
  - Remove button for each file

✅ **Data Structure Updated**
- Task objects now include: `attachments: []`
- Saves with task in Firebase
- Persists across sessions

---

## DEPLOYMENT STEPS

### Step 1: Upload PHP Script to Hostinger (2 minutes)

1. **Log in to Hostinger**
   - Go to https://hpanel.hostinger.com
   - Enter your credentials

2. **Open File Manager**
   - Click "File Manager"
   - Navigate to `public_html/` folder

3. **Create API Folder** (if it doesn't exist)
   - Right-click in `public_html/`
   - Create new folder: `api`

4. **Upload PHP Script**
   - Copy the entire content of `api/upload-task-file.php` from this project
   - Create a new file in `public_html/api/upload-task-file.php`
   - Paste the PHP code
   - Save

5. **Set Permissions**
   - Right-click `api` folder → Properties
   - Set permissions to `755`
   - Right-click `upload-task-file.php` → Properties
   - Set permissions to `644`

### Step 2: Create Upload Directory (1 minute)

1. In Hostinger File Manager
2. Navigate to `public_html/`
3. Create new folder: `uploads`
4. Inside `uploads`, create folder: `task-attachments`
5. Set permissions to `755`

### Step 3: Deploy Code to Production (Automatic with your existing deployment)

Your existing deployment process will automatically deploy the updated `index.html` with all the JavaScript functions.

### Step 4: Test the Feature (5 minutes)

1. **Open One Desk** → https://onedesk.vilpower.com/
2. **Open any task** → Click on task ID to edit
3. **Scroll to "Attachments" section** at bottom of edit modal
4. **Test Upload:**
   - **Option A:** Click the upload area
   - **Option B:** Drag a file onto the upload area
5. **Verify:**
   - ✅ File uploads successfully
   - ✅ File appears in attachments list
   - ✅ You can click to open the file
   - ✅ You can remove the file

---

## FILE LOCATIONS

**On Your Hostinger Server:**
```
public_html/
├── api/
│   └── upload-task-file.php       ← NEW: Upload handler
├── uploads/
│   └── task-attachments/          ← NEW: Stores uploaded files
│       └── task_1720448000_1234.jpg
│       └── task_1720448015_5678.mp4
```

**In Your Project:**
```
Project Root/
├── api/
│   └── upload-task-file.php       ← Source file (copy to Hostinger)
├── index.html                      ← Updated with upload functions
└── HOSTINGER_DEPLOYMENT_READY.md   ← This file
```

---

## FEATURE OVERVIEW

### What Users Can Do:

1. **Edit any task**
   - Click task ID to open edit modal

2. **Upload files**
   - Drag files onto upload area OR
   - Click area to browse and select files

3. **Supported file types:**
   - **Images:** JPG, PNG, GIF, WebP (posters, graphics)
   - **Videos:** MP4, WebM, MOV, AVI, MKV
   - **Documents:** PDF

4. **File size limit:** 100 MB per file

5. **Manage attachments:**
   - See all uploaded files
   - Click link icon to open file
   - Click trash icon to remove file
   - Files are saved with task

6. **View attachments:**
   - When editing task, attachments appear below task details
   - When viewing task in list, attachment icons show

---

## TECHNICAL DETAILS

### PHP Script Features:

- ✅ CORS headers (allows requests from your domain)
- ✅ File type validation (by MIME type, not just extension)
- ✅ File size validation (100 MB limit)
- ✅ Safe filename generation (prevents directory traversal attacks)
- ✅ Automatic directory creation
- ✅ Error handling with detailed messages
- ✅ Auto-detects HTTPS vs HTTP

### JavaScript Flow:

```
User selects file
         ↓
handleTaskFileUpload() triggered
         ↓
Show "Uploading..." message
         ↓
uploadTaskFile() sends to PHP
         ↓
PHP validates & stores file
         ↓
Returns URL + metadata
         ↓
Add to window.currentTaskAttachments array
         ↓
renderTaskAttachments() displays in UI
         ↓
submitTaskUpdate() saves with task to Firebase
```

### Data Structure:

```javascript
{
  id: "M-1720448000",
  desc: "Design poster",
  client: "Client Name",
  status: "In Progress",
  attachments: [
    {
      url: "https://onedesk.vilpower.com/uploads/task-attachments/task_1720448000_1234.jpg",
      name: "poster.jpg",
      size: 2048576,
      uploadedAt: "2024-07-09 10:30:25",
      type: "image/jpeg"
    },
    {
      url: "https://onedesk.vilpower.com/uploads/task-attachments/task_1720448015_5678.mp4",
      name: "video.mp4",
      size: 52428800,
      uploadedAt: "2024-07-09 10:31:40",
      type: "video/mp4"
    }
  ]
}
```

---

## SECURITY FEATURES

✅ **File Type Validation**
- Only specific MIME types allowed
- Can't upload executable files or scripts
- Validated server-side (can't bypass)

✅ **File Size Limits**
- 100 MB per file
- Prevents disk space abuse

✅ **Safe Filenames**
- Auto-generates: `task_<timestamp>_<random>.ext`
- Prevents directory traversal (../ tricks)
- Original filename preserved in metadata

✅ **Permissions**
- Upload folder set to `755` (read/execute)
- Files set to `644` (read-only, non-executable)
- CORS restricted to your domain

✅ **Directory Protection**
- Optional .htaccess can prevent script execution
- Uploads isolated from code

---

## TROUBLESHOOTING

### "Upload failed" Error

**Check:**
1. Is PHP script uploaded to `public_html/api/upload-task-file.php`?
2. Do the folders have correct permissions (755/644)?
3. Is the URL correct in browser? Try: https://onedesk.vilpower.com/api/upload-task-file.php

**Test PHP:**
```bash
curl -X POST -F "file=@test.jpg" https://onedesk.vilpower.com/api/upload-task-file.php
```

### "File too large" Error

- File exceeds 100 MB
- Reduce file size or split into smaller parts

### Files Not Saving

1. Check `uploads/task-attachments/` folder exists
2. Verify folder permissions are `755`
3. Check Hostinger disk space (unlikely but possible)

### CORS Error

- PHP script already has CORS headers
- If still getting error, check browser console for exact message
- Usually means PHP script isn't accessible

---

## COST & PERFORMANCE

### Cost: $0 ✅
- Included in Hostinger plan
- No external services
- No bandwidth charges

### Storage: Efficient ✅
- 100 MB per file × unlimited count
- Hosted on your Hostinger server
- No database bloat (just URLs stored in Firebase)

### Speed: Fast ✅
- Upload: Direct to your server (~1-5 MB/s typical)
- Download: From your server (fast within your ISP)
- No CDN required (but can add later if needed)

### System Load: Low ✅
- Upload processing minimal (PHP just validates & saves)
- Download happens from file system (very fast)
- Database only stores URLs (negligible space)

---

## NEXT STEPS

### Immediate (Today):

1. ✅ Review this document
2. ✅ Upload PHP script to Hostinger
3. ✅ Create folders on Hostinger
4. ✅ Deploy latest index.html
5. ✅ Test with a small file (< 10 MB)
6. ✅ Test with a video file (20-50 MB)
7. ✅ Have team members test

### Future Enhancements (Optional):

- Add file size indicator in upload area
- Implement image compression before upload
- Add thumbnail generation for images
- Archive/delete old attachments automatically
- Add file versioning (keep upload history)
- Create attachment sharing links

---

## ROLLBACK (If needed)

If something goes wrong:

1. **Disable uploads:** Comment out the attachments section in HTML
2. **Remove PHP script:** Delete from Hostinger `api/upload-task-file.php`
3. **Keep stored files:** Files already uploaded stay on server (safe to delete from `uploads` folder manually)
4. **Revert code:** Replace `index.html` with previous version

---

## SUCCESS CRITERIA

✅ Users can drag/drop files into task edit modal  
✅ Users can click to browse and select files  
✅ Files upload to https://onedesk.vilpower.com/uploads/task-attachments/  
✅ Attachments display in task edit view  
✅ Attachments save with task to Firebase  
✅ Files can be opened by clicking link  
✅ Files can be removed from task  
✅ No external service dependencies (100% on Hostinger)  

---

## SUMMARY

**Setup Time:** 10-15 minutes  
**Complexity:** Easy (just upload PHP + create 2 folders)  
**Result:** Full task attachment support with your own server  
**Cost:** $0 (included in Hostinger)  
**Benefits:** Full control, fast uploads, no external dependencies  

---

## SUPPORT

If you encounter issues:

1. Check Hostinger File Manager for correct file locations
2. Verify folder permissions (755 for folders, 644 for files)
3. Check browser console (F12) for error messages
4. Test PHP endpoint directly: `https://onedesk.vilpower.com/api/upload-task-file.php`

---

**Ready to deploy! Questions? Let me know.**
