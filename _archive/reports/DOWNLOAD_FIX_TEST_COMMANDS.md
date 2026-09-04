# Download Fix - Browser Console Test Commands

## Quick Verification

Open your browser's DevTools (F12) and paste these commands in the Console tab.

### 1. Test the Malformed URL Detection Regex

```javascript
// The regex pattern that fixes the URLs
const pattern = /\/fl_attachment:[^/]*\//;

// Your broken URL
const brokenUrl = "https://res.cloudinary.com/dhmcegvco/image/upload/fl_attachment:document.pdf/v1786616434/worksync_chat/qvk6jnardlthifcj3utl.pdf";

// Check if pattern matches
console.log("Pattern matches broken URL:", pattern.test(brokenUrl));
// Expected output: true

// Show what gets removed
console.log("Matched text:", brokenUrl.match(pattern)[0]);
// Expected output: /fl_attachment:document.pdf/

// Show the fixed URL
const fixedUrl = brokenUrl.replace(pattern, '/');
console.log("Fixed URL:", fixedUrl);
// Expected output: https://res.cloudinary.com/dhmcegvco/image/upload/v1786616434/worksync_chat/qvk6jnardlthifcj3utl.pdf
```

### 2. Test URL Format Validation

```javascript
// Valid URLs
try {
    new URL("https://res.cloudinary.com/dhmcegvco/image/upload/f_pdf/v1786616434/test.pdf");
    console.log("✓ Valid Cloudinary URL passes validation");
} catch(e) {
    console.log("✗ Valid URL failed:", e.message);
}

// Invalid URL
try {
    new URL("not a valid url");
    console.log("✗ Invalid URL passed (shouldn't happen)");
} catch(e) {
    console.log("✓ Invalid URL correctly rejected:", e.message);
}
```

### 3. Simulate the Full Fix Process

```javascript
function simulateDownloadFix(url) {
    console.log("=== DOWNLOAD FIX SIMULATION ===");
    console.log("1. Input URL:", url);
    
    let fixedUrl = url;
    
    // Step 1: Detect and remove malformed parameters
    if (fixedUrl.includes('cloudinary.com')) {
        const beforeFix = fixedUrl;
        fixedUrl = fixedUrl.replace(/\/fl_attachment:[^/]*\//, '/');
        
        if (beforeFix !== fixedUrl) {
            console.log("2. ✓ Removed malformed fl_attachment parameter");
            console.log("   Before:", beforeFix);
            console.log("   After:", fixedUrl);
        } else {
            console.log("2. ℹ No malformed fl_attachment found");
        }
        
        // Step 2: Add correct PDF transformation if needed
        if (fixedUrl.includes('/image/upload/') && !fixedUrl.includes('/f_pdf')) {
            const before = fixedUrl;
            fixedUrl = fixedUrl.replace('/image/upload/', '/image/upload/f_pdf/');
            console.log("3. ✓ Added f_pdf transformation");
            console.log("   Before:", before);
            console.log("   After:", fixedUrl);
        }
    }
    
    // Step 3: Validate final URL
    try {
        new URL(fixedUrl);
        console.log("4. ✓ Final URL is valid");
    } catch(e) {
        console.log("4. ✗ Final URL is invalid:", e.message);
    }
    
    console.log("=== FINAL RESULT ===");
    console.log("Output URL:", fixedUrl);
    return fixedUrl;
}

// Test with the actual broken URL
simulateDownloadFix("https://res.cloudinary.com/dhmcegvco/image/upload/fl_attachment:document.pdf/v1786616434/worksync_chat/qvk6jnardlthifcj3utl.pdf");
```

Expected output:
```
=== DOWNLOAD FIX SIMULATION ===
1. Input URL: https://res.cloudinary.com/dhmcegvco/image/upload/fl_attachment:document.pdf/v1786616434/worksync_chat/qvk6jnardlthifcj3utl.pdf
2. ✓ Removed malformed fl_attachment parameter
   Before: https://res.cloudinary.com/dhmcegvco/image/upload/fl_attachment:document.pdf/v1786616434/worksync_chat/qvk6jnardlthifcj3utl.pdf
   After: https://res.cloudinary.com/dhmcegvco/image/upload/v1786616434/worksync_chat/qvk6jnardlthifcj3utl.pdf
3. ✓ Added f_pdf transformation
   Before: https://res.cloudinary.com/dhmcegvco/image/upload/v1786616434/worksync_chat/qvk6jnardlthifcj3utl.pdf
   After: https://res.cloudinary.com/dhmcegvco/image/upload/f_pdf/v1786616434/worksync_chat/qvk6jnardlthifcj3utl.pdf
4. ✓ Final URL is valid
=== FINAL RESULT ===
Output URL: https://res.cloudinary.com/dhmcegvco/image/upload/f_pdf/v1786616434/worksync_chat/qvk6jnardlthifcj3utl.pdf
```

### 4. Test MIME Type Handling

```javascript
// Test MIME type detection
function testMimeTypeCorrection(mimeType) {
    let correctedType = mimeType;
    
    if (mimeType.includes('postscript') || 
        mimeType.includes('illustrator') || 
        mimeType.includes('vnd.adobe')) {
        correctedType = 'application/pdf';
    }
    
    console.log(`Input: ${mimeType}`);
    console.log(`Output: ${correctedType}`);
    console.log(`Changed: ${mimeType !== correctedType ? 'YES ✓' : 'NO'}`);
    console.log('---');
}

// Test various MIME types
testMimeTypeCorrection('application/pdf');        // Should stay PDF
testMimeTypeCorrection('application/postscript'); // Should become PDF
testMimeTypeCorrection('application/illustrator'); // Should become PDF
testMimeTypeCorrection('application/vnd.adobe.illustrator'); // Should become PDF
testMimeTypeCorrection('image/jpeg'); // Should stay JPEG
```

## Manual Testing Steps

### Test 1: Download PDF with Broken URL
1. Go to chat and find PDF attachment
2. Right-click → "Inspect Element"
3. In DevTools, find the download button's onclick attribute
4. Look for the URL being passed
5. Verify it gets cleaned up (check Network tab in DevTools)

### Test 2: Check Browser Network Tab
1. Open chat with PDF
2. Open DevTools (F12) → Network tab
3. Click Download button
4. Look for the fetch request to Cloudinary
5. Should see `/f_pdf/` in the URL (not `/fl_attachment:*`)
6. Response should be 200 OK (not 400 Bad Request)

### Test 3: Verify File Downloads
1. Click Download on PDF attachment
2. File should download successfully
3. Open downloaded file - should open as PDF
4. Check filename - should be correct (not changed)

## Troubleshooting Commands

### Check if downloadFile function exists
```javascript
console.log("downloadFile function exists:", typeof downloadFile === 'function');
```

### Check if viewOrOpenPdf function exists
```javascript
console.log("viewOrOpenPdf function exists:", typeof viewOrOpenPdf === 'function');
```

### Test download with a sample URL
```javascript
// This won't actually download, just tests the URL fixing logic
const testUrl = "https://res.cloudinary.com/dhmcegvco/image/upload/fl_attachment:test.pdf/v123/file.pdf";
const fileName = "test-document.pdf";

console.log("Testing downloadFile with URL:", testUrl);
// Uncomment below to actually test (will try to download):
// downloadFile(testUrl, fileName);
```

### Monitor Toast Messages
```javascript
// Check what toast messages are shown
window.addEventListener('DOMContentLoaded', () => {
    const originalToast = window.toast;
    window.toast = function(msg, type) {
        console.log(`[TOAST ${type.toUpperCase()}]: ${msg}`);
        if (originalToast) originalToast(msg, type);
    };
});
```

## Expected Behavior After Fix

| Action | Expected Result |
|--------|-----------------|
| Click Download | File downloads (no 400 error) ✓ |
| Check filename | Matches original name ✓ |
| Open file | Opens as PDF (not .ai) ✓ |
| Check Network tab | URL has `/f_pdf/` not `/fl_attachment:*` ✓ |
| Error console | No JavaScript errors ✓ |

---

**Note**: Run these commands in the browser console (F12) on the page with the download functionality.
