# Task File Upload - Deployment Checklist
**Domain:** https://onedesk.vilpower.com  
**Date:** July 8, 2026  
**Status:** ✅ FRONTEND CODE READY - AWAITING HOSTINGER SETUP

---

## WHAT'S BEEN DONE ✅

### Frontend Implementation (COMPLETE)
- ✅ Added HTML attachment upload section to task edit modal
- ✅ Added all JavaScript functions for file upload handling
- ✅ Updated `openEditTaskModal()` to load existing attachments
- ✅ Updated `submitTaskUpdate()` to save attachments with tasks
- ✅ No compilation errors in index.html

### Files Modified
1. `index.html` - Added upload UI and functions (lines 7887-7920, 29118, 37707-37886)

### What's NOT Done Yet ⏳
- PHP script needs to be uploaded to Hostinger
- Upload directory needs to be created on Hostinger

---

## NEXT STEPS (Hostinger Setup)

### STEP 1: Upload PHP Script

**Time: 5 minutes**

1. Log in to **Hostinger Control Panel**
   - Go to: https://hpanel.hostinger.com
   
2. Navigate to **File Manager**
   - Click on File Manager
   - Select your domain folder

3. Create folder structure:
   - Create: `api` folder (if doesn't exist)
   - Path: `public_html/api/`

4. Create file: `upload-task-file.php`
   - In the `api` folder
   - Full path: `public_html/api/upload-task-file.php`

5. Copy PHP code from `HOSTINGER_UPLOAD_SETUP.md` (Section 1.2)
   - Paste into the file
   - Save

**✓ This takes ~5 minutes**

---

### STEP 2: Create Upload Directory

**Time: 2 minutes**

In Hostinger File Manager:

1. Navigate to `public_html/`
2. Create folder: `uploads`
3. Inside `uploads`, create: `task-attachments`

**Final structure:**
```
public_html/
├── api/
│   └── upload-task-file.php        ← Upload handler
├── uploads/
│   └── task-attachments/            ← Where files will be stored
└── [other files]
```

**✓ This takes ~2 minutes**

---

## TESTING AFTER SETUP

### Local Testing

1. **Open One Desk**
   - Go to: https://onedesk.vilpower.com

2. **Edit any task**
   - Click on a task in your task list
   - Scroll down to see "Attachments" section

3. **Try uploading a file**
   - Click in the upload area
   - Select a small image (< 10 MB)
   - Wait for "File uploaded successfully" message

4. **Verify upload**
   - File should appear in the list
   - Should show file name and size
   - Should have an open link icon
   - Should have a delete/trash icon

5. **Update task**
   - Click "Update Task" button
   - Task should save successfully

6. **Reopen task**
   - Close the modal
   - Open the same task again
   - Attachment should still be there

7. **Test different file types**
   - Try image (.jpg, .png)
   - Try video (.mp4)
   - Try PDF

---

## TROUBLESHOOTING

### Issue: Upload button appears but nothing happens

**Solution:**
1. Check browser console (F12 → Console tab)
2. Look for error messages
3. Common errors:
   - "Failed to fetch" = PHP script not at correct path
   - "CORS error" = Wrong domain URL
   - "404 Not Found" = PHP file doesn't exist

**Check:**
- Is PHP file at: `public_html/api/upload-task-file.php`? ✓
- Is domain URL correct: `https://onedesk.vilpower.com`? ✓

### Issue: "Permission Denied" error

**Solution:**
1. In Hostinger File Manager, right-click `uploads` folder
2. Select "Permissions"
3. Set to: `755` (for folders), `644` (for files)
4. Click "Apply to all files/folders"
5. Try upload again

### Issue: File upload hangs/times out

**Solution:**
1. Try smaller file first (< 10 MB)
2. Check file type (images/videos/PDFs only)
3. If still hangs after 5 minutes, contact Hostinger support

### Issue: Attachment doesn't save with task

**Solution:**
1. Check if task updates are working (other changes should save)
2. Check browser console for JavaScript errors
3. Verify `submitTaskUpdate()` function has `attachments` field

---

## DEPLOYMENT COMMANDS

If using Git deployment:

```bash
# After implementing:
git add index.html
git commit -m "Add task file upload feature - upload to Hostinger server"
git push origin main

# Don't forget PHP script!
# Must be uploaded manually to Hostinger File Manager
```

---

## VERIFICATION CHECKLIST

Before considering this complete, verify:

### Frontend
- [ ] Upload area visible in task edit modal
- [ ] Can drag files into upload area
- [ ] Can click to select files
- [ ] Upload works with images
- [ ] Upload works with videos
- [ ] Upload works with PDFs
- [ ] Can remove attachments
- [ ] Attachments persist after task update
- [ ] Attachments display when reopening task

### Hostinger Setup
- [ ] PHP file at: `public_html/api/upload-task-file.php`
- [ ] Folders created: `public_html/uploads/task-attachments/`
- [ ] Permissions set correctly (755 for folders)
- [ ] Can access PHP endpoint in browser

---

## FINAL CHECKLIST

### Code Ready ✅
- [x] index.html modified
- [x] HTML upload section added
- [x] JavaScript functions added
- [x] Functions integrated with existing code
- [x] No compilation errors

### Hostinger Setup ⏳
- [ ] PHP script uploaded to `public_html/api/upload-task-file.php`
- [ ] Upload directories created
- [ ] Permissions verified

### Testing ⏳
- [ ] Can upload images
- [ ] Can upload videos
- [ ] Can upload PDFs
- [ ] Files persist after task update
- [ ] Team tested and approved

### Documentation ✅
- [x] Integration steps documented (`INTEGRATION_STEPS.md`)
- [x] Setup guide created (`HOSTINGER_UPLOAD_SETUP.md`)
- [x] Code files provided (`TASK_FILE_UPLOAD_CODE.js`)
- [x] HTML template provided (`TASK_UPLOAD_HTML.html`)

---

## QUICK REFERENCE

### File Locations
- **Frontend Code:** `index.html` (lines 7887-7920, 29118, 37707-37886)
- **PHP Script (to create):** `public_html/api/upload-task-file.php` on Hostinger
- **Upload Directory (to create):** `public_html/uploads/task-attachments/` on Hostinger

### Domain
- **Upload Endpoint:** `https://onedesk.vilpower.com/api/upload-task-file.php`
- **Live App:** `https://onedesk.vilpower.com`

### File Types Supported
- **Images:** JPG, PNG, GIF, WebP
- **Videos:** MP4, WebM, MOV, AVI
- **Documents:** PDF
- **Max Size:** 100 MB per file

---

## NEXT IMMEDIATE ACTION

1. **Go to Hostinger File Manager**
2. **Create:** `public_html/api/` folder
3. **Upload:** `upload-task-file.php` (copy from HOSTINGER_UPLOAD_SETUP.md)
4. **Create:** `public_html/uploads/task-attachments/` folders
5. **Test** task file upload feature

**Estimated Time for Setup: 10 minutes**

---

## TEAM COMMUNICATION

You can share this with your team:

> ✅ **Task File Upload Feature is Ready!**
>
> We've implemented the ability to upload files (images, videos, PDFs) directly to tasks in One Desk.
>
> **How it works:**
> 1. Open any task
> 2. Scroll to "Attachments" section
> 3. Drag files or click to select
> 4. Files upload to your Hostinger server
> 5. Attachments save with the task
>
> **File size limit:** 100 MB each
> **Supported formats:** Images, Videos, PDFs
>
> This is now fully integrated - just needs the PHP script uploaded to Hostinger to be live!

---

## SUPPORT

For any issues:
1. Check troubleshooting section above
2. Check browser console (F12) for errors
3. Verify PHP file exists and permissions are correct
4. Test with smaller file first
5. Contact support if needed
