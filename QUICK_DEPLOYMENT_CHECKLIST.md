# Quick Deployment Checklist - Task File Upload

**Domain:** https://onedesk.vilpower.com/  
**Time Required:** 10-15 minutes

---

## ✅ HOSTINGER SETUP (Do this first)

### [ ] Step 1: Access Hostinger
- [ ] Go to https://hpanel.hostinger.com
- [ ] Log in with your credentials
- [ ] Open File Manager

### [ ] Step 2: Create Folder Structure
- [ ] Navigate to `public_html/`
- [ ] Create folder: `api` (if doesn't exist)
- [ ] Inside `api`, set permissions to `755`
- [ ] Create folder: `uploads`
- [ ] Inside `uploads`, create folder: `task-attachments`
- [ ] Set `uploads` and `task-attachments` permissions to `755`

### [ ] Step 3: Upload PHP Script
- [ ] Copy code from `api/upload-task-file.php` in this project
- [ ] Create new file: `public_html/api/upload-task-file.php`
- [ ] Paste the PHP code
- [ ] Set file permissions to `644`

### [ ] Step 4: Verify Upload
- [ ] Visit https://onedesk.vilpower.com/api/upload-task-file.php in browser
- [ ] Should show: `{"success":false,"error":"No file uploaded or upload error","details":"No file was uploaded"}`
- [ ] ✅ If you see this message, PHP script is working!

---

## ✅ CODE DEPLOYMENT (Automatic or manual)

### [ ] Step 5: Deploy Latest Code
- [ ] Deploy updated `index.html` to your hosting
- [ ] All JavaScript functions already integrated
- [ ] All HTML UI already added
- [ ] Database schema already updated

---

## ✅ TESTING (Do this after deployment)

### [ ] Step 6: Test Upload Feature

**Login to One Desk:**
- [ ] Go to https://onedesk.vilpower.com/
- [ ] Log in with your account

**Open a Task:**
- [ ] Find any existing task
- [ ] Click on task ID to edit it

**Test Attachments Section:**
- [ ] Scroll down to see "Attachments" section
- [ ] [ ] Upload a small image (< 10 MB):
  - [ ] Click the upload area OR
  - [ ] Drag an image file into the area
  - [ ] Should see loading spinner
  - [ ] Should see file appear in list
  - [ ] Click link icon to verify file opens
  - [ ] Click trash icon to remove

- [ ] Upload a video (< 50 MB):
  - [ ] Same steps as image
  - [ ] Verify video file appears

- [ ] Upload a PDF:
  - [ ] Same steps
  - [ ] Verify PDF file appears

**Test Saving:**
- [ ] Click "Update Task" button
- [ ] Close modal
- [ ] Open same task again
- [ ] Verify attachments are still there ✅

**Test Removing:**
- [ ] Click trash icon on an attachment
- [ ] Attachment should disappear from list
- [ ] Click "Update Task"
- [ ] Open task again
- [ ] Verify attachment is gone ✅

---

## ✅ PRODUCTION CHECKS

### [ ] Step 7: Team Testing
- [ ] Have another team member test
- [ ] Test with different browsers (Chrome, Safari, Firefox)
- [ ] Test on mobile (if applicable)
- [ ] Test with various file types

### [ ] Step 8: Monitor
- [ ] Check Hostinger storage usage
- [ ] Verify uploaded files are accessible
- [ ] Monitor for any errors

---

## ⚠️ IF SOMETHING GOES WRONG

### Upload not working?
1. [ ] Verify PHP script is in `public_html/api/upload-task-file.php`
2. [ ] Verify folder permissions are `755`
3. [ ] Check browser console (F12) for error messages
4. [ ] Try visiting PHP endpoint directly: https://onedesk.vilpower.com/api/upload-task-file.php

### Files not saving after update?
1. [ ] Check if Firebase is connected (should be, not changed)
2. [ ] Try uploading again
3. [ ] Check browser console for errors

### "File too large" error?
1. [ ] Limit file size to 100 MB or less
2. [ ] Or contact Hostinger to increase PHP limit if needed

### Nothing appears after uploading?
1. [ ] Refresh page (F5)
2. [ ] Open task again to verify save worked
3. [ ] Check browser console for JavaScript errors

---

## 📋 FILE REFERENCE

**PHP Script Location (Hostinger):**
```
public_html/
├── api/
│   └── upload-task-file.php          ← NEW
├── uploads/
│   └── task-attachments/             ← NEW
```

**Source Files (This Project):**
```
index.html                             ← Updated (lines 11059-11228)
api/upload-task-file.php               ← NEW
HOSTINGER_DEPLOYMENT_READY.md          ← Instructions
QUICK_DEPLOYMENT_CHECKLIST.md          ← This file
```

---

## 📊 QUICK STATS

- **Setup Time:** 10-15 minutes
- **Upload Limit:** 100 MB per file
- **Supported Types:** JPG, PNG, GIF, WebP, MP4, WebM, MOV, AVI, MKV, PDF
- **Storage Location:** Your Hostinger server
- **Cost:** $0 (included in plan)
- **External Dependencies:** None

---

## ✅ FINAL CHECKLIST

- [ ] PHP script uploaded to Hostinger
- [ ] Folders created and permissions set
- [ ] Latest `index.html` deployed
- [ ] Tested file upload (small image)
- [ ] Tested file upload (video)
- [ ] Tested file save with task
- [ ] Tested file removal
- [ ] Team members tested
- [ ] No errors in browser console
- [ ] Ready for production ✅

---

**Time to Complete: 10-15 minutes**  
**Difficulty: Easy**  
**Ready to Deploy: YES ✅**
