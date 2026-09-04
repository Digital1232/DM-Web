# Google Drive File Upload Setup Guide

## Overview
This setup enables direct file uploads to Google Drive from the chat. Files are uploaded to Google Drive instead of storing them in Firebase or Cloudinary, providing unlimited storage and better document management.

## Architecture
```
User uploads file in chat
           ↓
Frontend converts file to base64
           ↓
Sends to /api/google-drive/upload endpoint
           ↓
Backend uploads to Google Drive
           ↓
Stores reference in Firebase
           ↓
File link sent in chat message
```

---

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Note your **Project ID**

---

## Step 2: Enable Google Drive API

1. In Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Google Drive API"
3. Click **Enable**
4. Go to **APIs & Services** > **Credentials**

---

## Step 3: Create Service Account

1. Click **Create Credentials** > **Service Account**
2. Fill in details:
   - **Service account name**: `worksync-chat-uploader`
   - **Service account ID**: Auto-generated (leave as is)
   - **Description**: "Chat file uploads to Google Drive"
3. Click **Create and Continue**
4. Grant roles (optional, can skip):
   - Skip the optional step
5. Click **Done**

---

## Step 4: Create and Download Private Key

1. Go to **APIs & Services** > **Credentials**
2. Find your service account (should be listed)
3. Click on it to open details
4. Go to **Keys** tab
5. Click **Add Key** > **Create new key**
6. Choose **JSON** format
7. Click **Create**
8. File will download (save it safely)

---

## Step 5: Extract Credentials from JSON Key

Open the downloaded JSON file and copy these values to `.env.local`:

```json
{
  "type": "service_account",
  "project_id": "YOUR_PROJECT_ID",        ← Copy this
  "private_key_id": "YOUR_PRIVATE_KEY_ID", ← Copy this
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",  ← Copy this
  "client_email": "SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com", ← Copy this
  "client_id": "YOUR_CLIENT_ID",
  ...
}
```

---

## Step 6: Update .env.local

Replace placeholder values with your credentials:

```env
# Google Drive Configuration
GOOGLE_DRIVE_PROJECT_ID=your-project-id
GOOGLE_DRIVE_PRIVATE_KEY_ID=your-private-key-id
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQI....\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_CLIENT_EMAIL=worksync-chat-uploader@your-project-id.iam.gserviceaccount.com
GOOGLE_DRIVE_CLIENT_ID=your-client-id
GOOGLE_DRIVE_CHAT_FOLDER_ID=root
```

**Important Notes:**
- The `GOOGLE_DRIVE_PRIVATE_KEY` must include literal `\n` characters (not actual newlines)
- Keep this file secure - it contains sensitive credentials
- Never commit `.env.local` to git

---

## Step 7: Create Chat Folder in Google Drive (Optional)

To organize uploads in a specific folder:

1. Create a folder in your Google Drive named "WorkSync Chat Files"
2. Right-click the folder > **Share**
3. Add the service account email as editor:
   - `worksync-chat-uploader@your-project-id.iam.gserviceaccount.com`
4. Get the **Folder ID** from the URL:
   ```
   https://drive.google.com/drive/folders/FOLDER_ID_HERE
   ```
5. Update `.env.local`:
   ```env
   GOOGLE_DRIVE_CHAT_FOLDER_ID=FOLDER_ID_HERE
   ```

---

## Step 8: Deploy to Vercel

1. Push code with updated `.env.local` to your repository
2. In Vercel project settings, add environment variables:
   - `GOOGLE_DRIVE_PROJECT_ID`
   - `GOOGLE_DRIVE_PRIVATE_KEY_ID`
   - `GOOGLE_DRIVE_PRIVATE_KEY`
   - `GOOGLE_DRIVE_CLIENT_EMAIL`
   - `GOOGLE_DRIVE_CLIENT_ID`
   - `GOOGLE_DRIVE_CHAT_FOLDER_ID`

3. Redeploy your Vercel project

---

## Step 9: Test the Integration

1. Open your WorkSync app
2. Go to any chat conversation
3. Attach a file using the file button (📎)
4. Send the message
5. Check your Google Drive:
   - Files should appear in "Chat Files" folder
   - Organized by conversation ID

---

## File Organization in Google Drive

```
Chat Files (root folder)
├── conversation-id-1/
│   ├── document1.pdf
│   ├── image1.jpg
│   └── spreadsheet.xlsx
├── conversation-id-2/
│   ├── report.docx
│   └── data.csv
└── conversation-id-3/
    └── presentation.pptx
```

Each conversation gets its own folder, and all files are organized by date uploaded.

---

## Troubleshooting

### "Unauthorized: Invalid credentials"
- ❌ Private key format is wrong (should have `\n` not actual newlines)
- ✅ Use the exact format from the JSON file
- ✅ Verify all credentials are copied correctly

### "Permission denied"
- ❌ Service account email not added to the chat folder
- ✅ Share the folder with the service account email
- ✅ Ensure permissions are set to "Editor"

### "Quota exceeded"
- ❌ Too many uploads at once
- ✅ Wait a moment before uploading again
- ✅ Check Google Drive storage limits

### Files not appearing in Google Drive
- ❌ Folder ID is incorrect
- ✅ Use `root` if no specific folder
- ✅ Check the folder ID in the URL
- ❌ Service account doesn't have access
- ✅ Verify the account is added to the folder

### "fileBuffer is empty"
- ❌ File wasn't read properly
- ✅ Try uploading again
- ✅ Check file size is not 0 bytes

---

## API Endpoints

### Upload File
```
POST /api/google-drive/upload
Content-Type: application/json
Authorization: Bearer {idToken}

{
  "fileName": "document.pdf",
  "fileBuffer": "base64_encoded_content",
  "mimeType": "application/pdf",
  "conversationId": "conversation-id"
}

Response:
{
  "success": true,
  "data": {
    "driveFileId": "file-id",
    "fileName": "document.pdf",
    "webViewLink": "https://drive.google.com/file/d/file-id/view",
    "webContentLink": "https://drive.google.com/uc?id=file-id&export=download"
  }
}
```

### Get Shareable Link
```
POST /api/google-drive/shareable-link
Authorization: Bearer {idToken}

{
  "driveFileId": "file-id"
}
```

### List Files in Conversation
```
GET /api/google-drive/list?conversationId=conversation-id
Authorization: Bearer {idToken}
```

### Delete File
```
POST /api/google-drive/delete
Authorization: Bearer {idToken}

{
  "driveFileId": "file-id"
}
```

---

## Security Best Practices

1. **Keep credentials secure**
   - Never commit `.env.local` to git
   - Use `.gitignore` to exclude it
   - Regenerate if accidentally exposed

2. **Limit service account permissions**
   - Only grant Drive API access
   - Limit to specific folder if possible
   - Regularly audit access logs

3. **Monitor storage**
   - Set up quotas for your Google Workspace
   - Monitor uploaded file sizes
   - Implement file retention policies

4. **Audit trail**
   - All uploads are logged to Firebase
   - Files include metadata (uploader, timestamp)
   - Conversation history is preserved

---

## File Size Limits

- **Per file**: 100 MB (configurable)
- **Per conversation**: No hard limit
- **Total Google Drive**: Depends on your Google account

---

## Supported File Types

The system supports all file types that Google Drive supports:
- Documents: PDF, DOCX, TXT, ODT
- Spreadsheets: XLSX, CSV, XLS, ODS
- Presentations: PPTX, PPT, ODP
- Images: JPG, PNG, GIF, BMP, SVG
- Videos: MP4, AVI, MOV, MKV (must be < 100MB)
- Archives: ZIP, RAR, 7Z
- Code: JS, PY, HTML, CSS, JSON, etc.
- And many more...

---

## Backup & Recovery

Google Drive automatically:
- Maintains version history
- Allows file recovery from trash (30 days)
- Syncs across devices
- Backs up to Google Cloud

For critical conversations:
- Periodically export chat history
- Download important files locally
- Use Google Drive backup and sync feature

---

## Performance Notes

- Initial upload may take a few seconds (depending on file size)
- Firebase reference is stored immediately
- Users see "uploading..." indicator during process
- Large files (10-100MB) may take 10-30 seconds
- Network speed affects upload time

---

## Future Enhancements

Possible improvements:
1. Progress bar for large file uploads
2. Automatic virus scanning integration
3. File preview in chat
4. Automatic file expiration policies
5. Batch download feature
6. File commenting/annotations
7. Collaborative editing links
