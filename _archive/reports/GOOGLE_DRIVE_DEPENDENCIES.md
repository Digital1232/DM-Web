# Google Drive Integration - Dependencies & Installation

## Required Dependencies

The Google Drive integration requires these npm packages:

```json
{
  "dependencies": {
    "googleapis": "^118.0.0",
    "node-fetch": "^2.7.0",
    "firebase-admin": "^12.0.0"
  }
}
```

## Installation Steps

### Step 1: Add Dependencies to package.json

If you have a `package.json` file, add these to the `dependencies` section:

```bash
npm install googleapis node-fetch firebase-admin
```

Or install individually:

```bash
npm install googleapis@118.0.0
npm install node-fetch@2.7.0
npm install firebase-admin@12.0.0
```

### Step 2: Verify Installation

Check that dependencies are installed:

```bash
npm list googleapis node-fetch firebase-admin
```

Should output something like:
```
├── googleapis@118.0.0
├── node-fetch@2.7.0
└── firebase-admin@12.0.0
```

### Step 3: For Vercel Deployment

The dependencies will be automatically installed during Vercel build from `package.json`.

Make sure your `package.json` includes:
```json
{
  "name": "worksync",
  "version": "1.0.0",
  "dependencies": {
    "googleapis": "^118.0.0",
    "node-fetch": "^2.7.0",
    "firebase-admin": "^12.0.0"
  }
}
```

---

## What Each Package Does

### googleapis
- **Purpose**: Interact with Google APIs (including Google Drive)
- **Used for**: Upload, delete, list files in Google Drive
- **Size**: ~2.5 MB
- **Docs**: https://github.com/googleapis/google-api-nodejs-client

### node-fetch
- **Purpose**: Make HTTP requests in Node.js
- **Used for**: API communication (fallback for fetch in older Node versions)
- **Size**: ~50 KB
- **Docs**: https://github.com/node-fetch/node-fetch

### firebase-admin
- **Purpose**: Firebase backend SDK
- **Used for**: Authentication, Firestore database, storing file references
- **Size**: ~3 MB
- **Docs**: https://firebase.google.com/docs/admin/setup

---

## Version Notes

- **Node.js version**: 18+ (required for Google APIs v2)
- **Vercel**: Supports all required versions
- **Local development**: Install Node 18.x or 20.x

---

## Troubleshooting

### "Cannot find module 'googleapis'"
```bash
# Solution: Install the package
npm install googleapis
```

### "Cannot find module 'firebase-admin'"
```bash
# Solution: Install the package
npm install firebase-admin
```

### Module version conflicts
```bash
# Solution: Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Build fails on Vercel
1. Check that `package.json` has all dependencies
2. Commit `package.json` changes to git
3. Redeploy Vercel (it will reinstall dependencies)

---

## API File Structure

The Google Drive API file (`/api/googleDrive.js`) includes all necessary imports:

```javascript
const admin = require('firebase-admin');
const { google } = require('googleapis');
const fetch = require('node-fetch');
```

These imports are handled by the installed packages above.

---

## Optional: Development Setup

If developing locally and want to test Google Drive uploads:

```bash
# Install globally for development
npm install -g nodemon

# Run API server locally
nodemon api/googleDrive.js
```

This requires all environment variables to be set in `.env.local`.

---

## Dependency Size Impact

Total size of added dependencies: ~6 MB

**Vercel impact**: Minimal (dependencies are installed at build time, not included in function payload)

**Frontend impact**: Zero (these are backend-only packages)

---

## Security Notes

- **googleapis**: Official Google package, maintained by Google
- **node-fetch**: Popular, well-maintained package
- **firebase-admin**: Official Firebase package, maintained by Google

All packages are from official, trusted sources and regularly updated.

---

## Update Instructions

To update to newer versions:

```bash
# Check for outdated packages
npm outdated

# Update all packages
npm update

# Or update specific package
npm update googleapis
```

---

## Compatibility

- ✅ Works with Node.js 18, 20, 22
- ✅ Compatible with Vercel serverless functions
- ✅ Compatible with Express.js
- ✅ Compatible with Firebase functions
- ❌ Not compatible with browser/client-side (backend only)

---

## Next Steps

After installing dependencies:

1. ✅ Add environment variables to `.env.local` (see GOOGLE_DRIVE_SETUP_GUIDE.md)
2. ✅ Create Google Cloud service account (see GOOGLE_DRIVE_SETUP_GUIDE.md)
3. ✅ Deploy to Vercel with updated `package.json`
4. ✅ Test file upload in chat

---

## Package Lock

Make sure to commit `package-lock.json` to git for consistent installations:

```bash
git add package.json package-lock.json
git commit -m "Add Google Drive integration dependencies"
```

