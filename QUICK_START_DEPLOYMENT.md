# Quick Start: Deploy Google Drive Integration

**Estimated time**: 20-30 minutes

---

## 1️⃣ Get Google Drive Credentials (5 min)

### Get your credentials:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project (or use existing)
3. Enable Google Drive API
4. Create Service Account
5. Generate JSON key file
6. Download the file

### Extract from JSON file:
```json
{
  "project_id": "your-project-id",
  "private_key_id": "your-key-id", 
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "service-account@your-project.iam.gserviceaccount.com",
  "client_id": "your-client-id"
}
```

---

## 2️⃣ Update .env.local (2 min)

```bash
# Open .env.local and add:
GOOGLE_DRIVE_PROJECT_ID=your-project-id
GOOGLE_DRIVE_PRIVATE_KEY_ID=your-key-id
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQI...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_CLIENT_EMAIL=service-account@your-project.iam.gserviceaccount.com
GOOGLE_DRIVE_CLIENT_ID=your-client-id
GOOGLE_DRIVE_CHAT_FOLDER_ID=root
```

**⚠️ Important**: Keep literal `\n` in the PRIVATE_KEY value (not actual newlines)

---

## 3️⃣ Install Dependencies (3 min)

```bash
npm install googleapis node-fetch firebase-admin
```

Or update `package.json` manually:
```json
{
  "dependencies": {
    "googleapis": "^118.0.0",
    "node-fetch": "^2.7.0",
    "firebase-admin": "^12.0.0"
  }
}
```

Then run: `npm install`

---

## 4️⃣ Commit Changes (2 min)

```bash
git add package.json package-lock.json api/googleDrive.js index.html
git commit -m "Add Google Drive file upload integration"
git push origin main
```

**Don't commit .env.local** - it contains secrets!

---

## 5️⃣ Configure Vercel (5 min)

1. Go to Vercel dashboard
2. Select your project
3. Settings → Environment Variables
4. Add each variable:
   - `GOOGLE_DRIVE_PROJECT_ID`
   - `GOOGLE_DRIVE_PRIVATE_KEY_ID`
   - `GOOGLE_DRIVE_PRIVATE_KEY`
   - `GOOGLE_DRIVE_CLIENT_EMAIL`
   - `GOOGLE_DRIVE_CLIENT_ID`
   - `GOOGLE_DRIVE_CHAT_FOLDER_ID` = `root`

5. Click Save
6. Redeploy project

---

## 6️⃣ Share Google Drive Folder (Optional, 3 min)

To organize in a specific folder:

1. Create folder "WorkSync Chat Files" in Google Drive
2. Right-click → Share
3. Add email: `service-account@your-project.iam.gserviceaccount.com`
4. Give "Editor" permission
5. Copy folder ID from URL
6. Update Vercel env: `GOOGLE_DRIVE_CHAT_FOLDER_ID=your-folder-id`
7. Redeploy

---

## 7️⃣ Test (3 min)

### Local test:
```bash
npm start
# Go to chat, upload small file (< 10MB)
# Check Google Drive for the file
```

### Production test:
1. Wait for Vercel deployment (2-5 min)
2. Go to your live app
3. Upload a file in chat
4. File should appear in Google Drive within 5 seconds
5. File link should be in chat message

---

## ✅ Verification Checklist

- [ ] Google Cloud service account created
- [ ] Private key downloaded
- [ ] .env.local updated with credentials
- [ ] npm install completed successfully
- [ ] package.json has new dependencies
- [ ] Changes committed to git
- [ ] Vercel environment variables set
- [ ] Vercel redeployed
- [ ] Test upload successful
- [ ] File appears in Google Drive
- [ ] Users can download the file

---

## Troubleshooting

### "Unauthorized" error
```
❌ Check: Are credentials in .env.local?
✅ Fix: Copy exact values from JSON file
```

### "Module not found" error
```
❌ Check: Did npm install complete?
✅ Fix: Run: npm install googleapis node-fetch firebase-admin
```

### File not uploading
```
❌ Check: Is Vercel deployment complete?
✅ Fix: Wait 2-5 minutes for deployment, try again
```

### Permission denied
```
❌ Check: Is service account shared to Google Drive folder?
✅ Fix: Share "Chat Files" folder with service account email
```

### Can't find PRIVATE_KEY errors
```
❌ Check: Did you add literal \n characters?
✅ Fix: Use \n not actual newlines in .env.local
```

---

## File Locations

- **Backend API**: `api/googleDrive.js`
- **Frontend update**: `index.html` (sendMessage function)
- **Config**: `.env.local`
- **Docs**: `GOOGLE_DRIVE_SETUP_GUIDE.md`

---

## What Users See

### Before Upload:
```
Chat input box with [📎 File] button
```

### After Selecting File:
```
File appears below input:
┌─ document.pdf ─┐
│  2.3 MB        │  [×]
└────────────────┘
```

### After Sending:
```
Message: "Check this document"
Attachment: 📎 document.pdf
[Click to download from Google Drive]
```

---

## Support

### Still have issues?

1. Check `GOOGLE_DRIVE_SETUP_GUIDE.md` for detailed setup
2. Review `CHANGES_LOG.md` for what changed
3. See `GOOGLE_DRIVE_IMPLEMENTATION_SUMMARY.md` for architecture
4. Check Vercel build logs for errors
5. Verify all env variables are set

---

## Next: Share with Team

Once deployed and tested:

1. Share `GOOGLE_DRIVE_USER_GUIDE.md` with users
2. Tell them they can now upload files to chat
3. Files go directly to Google Drive
4. Organized by conversation

---

## Done! 🎉

Your chat now has Google Drive integration!

Files upload directly → stored in Google Drive → organized by conversation → shareable links in chat.
