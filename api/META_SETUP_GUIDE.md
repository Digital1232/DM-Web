# Meta API Backend Setup Guide

## Files Created

This backend implementation includes 4 main files:

1. **meta-config.js** - Configuration constants
2. **meta.js** - Core Meta Graph API service
3. **meta-tokens.js** - Secure token storage and management
4. **meta-sync.js** - Data sync and import service

---

## Installation & Setup

### Step 1: Get Meta App Credentials

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create a new App (select "Business" type)
3. Add "Facebook Graph API" product
4. Add "Instagram Graph API" product
5. Go to Settings → Basic and copy:
   - **App ID**
   - **App Secret**

### Step 2: Configure Environment Variables

Create a `.env` file in your project root:

```env
REACT_APP_META_APP_ID=YOUR_APP_ID
REACT_APP_META_APP_SECRET=YOUR_APP_SECRET
REACT_APP_META_REDIRECT_URI=http://localhost:3000/auth/meta/callback
```

For production:
```env
REACT_APP_META_REDIRECT_URI=https://yourdomain.com/auth/meta/callback
```

### Step 3: Setup OAuth Redirect URI

1. In Meta Developer Dashboard → App Settings → Basic
2. Add to "Valid OAuth Redirect URIs":
   - Development: `http://localhost:3000/auth/meta/callback`
   - Production: `https://yourdomain.com/auth/meta/callback`

### Step 4: Submit App for Review

To access user data, submit your app for the following permissions:

- `pages_read_engagement` - Read page insights
- `pages_read_user_content` - Read page posts
- `instagram_basic` - Instagram Basic Display
- `instagram_graph_api` - Instagram Graph API

---

## Usage in Your App

### Initialize Services

In your main HTML file (after Firebase setup):

```html
<script src="api/meta-config.js"></script>
<script src="api/meta.js"></script>
<script src="api/meta-tokens.js"></script>
<script src="api/meta-sync.js"></script>

<script>
    // Initialize Meta API Service
    const metaAPI = new MetaAPIService(
        'YOUR_APP_ID',
        'YOUR_APP_SECRET',
        'http://localhost:3000/auth/meta/callback'
    );

    // Initialize Token Service (after Firebase is loaded)
    let metaTokens = null;
    let metaSync = null;

    // Setup when user logs in
    function initializeMetaServices() {
        const userId = currentUser.uid;
        metaTokens = new MetaTokenService(db, userId);
        metaSync = new MetaSyncService(db, metaAPI, metaTokens);
    }
</script>
```

### Example 1: User Login & Connect Page

```javascript
// 1. Generate login URL
async function connectMetaAccount() {
    const loginUrl = metaAPI.getLoginUrl();
    window.open(loginUrl, 'Meta Login', 'width=800,height=600');
}

// 2. Handle OAuth callback (in your redirect page)
async function handleMetaCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (!code) {
        console.error('No authorization code received');
        return;
    }

    try {
        // Exchange code for token
        const shortToken = await metaAPI.exchangeCodeForToken(code);

        // Convert to long-lived token
        const longToken = await metaAPI.getLongLivedToken(shortToken.accessToken);

        // Get user info
        const userInfo = await metaAPI.getUserInfo(longToken.accessToken);

        // Save token
        await metaTokens.saveTokens({
            accessToken: longToken.accessToken,
            refreshToken: shortToken.accessToken,
            expiresAt: new Date(Date.now() + longToken.expiresIn * 1000),
            platform: 'facebook',
            pageId: userInfo.id,
            pageName: userInfo.name,
        });

        toast('Meta account connected successfully!', 'success');
        window.close();
    } catch (error) {
        console.error('Meta callback error:', error);
        toast('Failed to connect Meta account', 'error');
    }
}
```

### Example 2: Manual Sync

```javascript
// Trigger manual sync
async function manualSyncMeta() {
    const btn = document.getElementById('manual-sync-btn');
    btn.disabled = true;
    btn.innerHTML = '<iconify-icon icon="solar:loading-bold" class="animate-spin" /> Syncing...';

    try {
        const results = await metaSync.manualSync(currentUser.uid);

        if (results.success) {
            toast(`Successfully synced ${results.posts.length} posts!`, 'success');
            
            // Refresh analytics dashboard
            filterSocialAnalytics();
        } else {
            const errorMsg = results.errors.map(e => 
                typeof e === 'string' ? e : e.error
            ).join(', ');
            toast(`Sync failed: ${errorMsg}`, 'error');
        }
    } catch (error) {
        console.error('Manual sync error:', error);
        toast('Sync failed: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<iconify-icon icon="solar:refresh-bold" /> Sync Meta Data';
    }
}
```

### Example 3: Show Connected Pages

```javascript
// Display connected pages
async function showConnectedPages() {
    try {
        const pages = await metaTokens.getConnectedPages();

        if (pages.length === 0) {
            console.log('No connected pages');
            return;
        }

        console.log('Connected Pages:');
        pages.forEach(page => {
            console.log(`- ${page.pageName} (${page.platform})`);
            console.log(`  Last synced: ${page.lastUsed}`);
        });
    } catch (error) {
        console.error('Error getting pages:', error);
    }
}
```

### Example 4: Scheduled Sync

```javascript
let syncIntervalId = null;

// Start auto-sync every 12 hours
function enableAutoSync() {
    syncIntervalId = metaSync.startScheduledSync(currentUser.uid, 720); // 720 minutes = 12 hours
    toast('Auto-sync enabled (every 12 hours)', 'success');
}

// Stop auto-sync
function disableAutoSync() {
    metaSync.stopScheduledSync(syncIntervalId);
    toast('Auto-sync disabled', 'info');
}

// Check sync status
function checkSyncStatus() {
    const status = metaSync.getSyncStatus();
    console.log('Sync Status:', status);
    // Output: { syncInProgress: false, lastSyncTime: 1234567890, ... }
}
```

---

## API Methods Reference

### MetaAPIService

#### Authentication
- `getLoginUrl(scope)` - Generate OAuth login URL
- `exchangeCodeForToken(code)` - Exchange auth code for token
- `getLongLivedToken(shortToken)` - Extend token duration

#### Data Fetching
- `getUserInfo(token)` - Get current user info
- `getFacebookPages(token)` - Get user's Facebook pages
- `getInstagramBusinessAccount(pageId, token)` - Get linked Instagram account
- `getFacebookPagePosts(pageId, token, options)` - Get page posts
- `getFacebookPostInsights(postId, token)` - Get post metrics
- `getInstagramMedia(igAccountId, token, options)` - Get Instagram posts
- `getInstagramMediaInsights(mediaId, token)` - Get Instagram metrics

#### Utilities
- `cachedFetch(url, ttl)` - Fetch with caching
- `clearCache()` - Clear all cache
- `clearOldCache(maxAge)` - Clear old cached entries

### MetaTokenService

#### Token Management
- `saveTokens(tokenData)` - Store new token
- `getAllTokens()` - Get all user's tokens
- `getToken(tokenId)` - Get specific token
- `getValidAccessToken(tokenId, metaAPI)` - Get fresh token (auto-refresh if needed)
- `refreshToken(tokenId, metaAPI)` - Manually refresh token
- `deleteToken(tokenId)` - Remove token
- `markTokenInvalid(tokenId)` - Mark as expired

#### Page Management
- `getConnectedPages()` - Get all connected pages
- `getTokensByPlatform(platform)` - Filter by Facebook/Instagram

### MetaSyncService

#### Sync Operations
- `manualSync(userId)` - Sync all connected pages
- `syncPage(tokenId, platform, userId)` - Sync single page
- `startScheduledSync(userId, intervalMinutes)` - Enable auto-sync
- `stopScheduledSync(intervalId)` - Disable auto-sync
- `getSyncStatus()` - Check sync state

---

## Firebase Database Structure

Tokens are stored at:
```
worksync/meta_tokens/{userId}/{tokenId}
  ├── accessToken (encrypted)
  ├── refreshToken (encrypted)
  ├── expiresAt
  ├── platform (facebook | instagram)
  ├── pageId
  ├── pageName
  ├── savedAt
  ├── lastUsed
  ├── status (active | invalid)
  ├── lastRefreshed
  └── userId

worksync/social_analytics/{userKey}/{entryId}
  ├── ... existing fields ...
  ├── metaPostId
  ├── metaPageId
  ├── metaSyncedAt
  ├── autoSynced (true | false)
  └── metaMetrics { impressions, engagement, reach, ... }
```

---

## Error Handling

Common errors and solutions:

### "Rate limit exceeded"
- Development limit is 200 calls/hour
- Solution: Increase sync interval to 2+ hours

### "Token expired"
- Auto-refresh will attempt recovery
- Solution: Re-authenticate if refresh fails

### "Invalid redirect URI"
- Make sure URI in code matches Meta settings
- Solution: Update in .env and Meta Developer settings

### "Permission denied"
- Check if app is approved for required scopes
- Solution: Submit app for review in Meta Developer dashboard

---

## Security Best Practices

1. **Never expose App Secret** - Keep in backend only, use environment variables
2. **Encrypt tokens** - Implement proper AES encryption (TODO in meta-tokens.js)
3. **Use HTTPS** - All API calls must be over HTTPS in production
4. **Validate requests** - Verify OAuth state parameter
5. **Minimal permissions** - Only request necessary scopes
6. **Audit logs** - Track token usage and sync operations
7. **Token rotation** - Refresh regularly even if not expired

---

## Testing Checklist

- [ ] Meta app created and configured
- [ ] OAuth redirect URI added to Meta app settings
- [ ] Environment variables set correctly
- [ ] Can generate login URL
- [ ] OAuth callback works
- [ ] Token saved to Firebase
- [ ] Manual sync works
- [ ] Posts appear in analytics dashboard
- [ ] Duplicate detection works
- [ ] Auto-sync enabled and runs on schedule

---

## Production Deployment

Before going live:

1. **Get app approved** - Submit for required permissions
2. **Update URLs** - Change all localhost URLs to production domain
3. **Enable HTTPS** - All endpoints must be HTTPS
4. **Implement encryption** - Use proper encryption for tokens (crypto-js library)
5. **Setup error monitoring** - Use Sentry or similar
6. **Test edge cases** - Rate limits, expired tokens, invalid pages
7. **Setup logging** - Log all sync operations for debugging
8. **Rate limit monitoring** - Alert when approaching limits

---

## Troubleshooting

### Check logs:
```javascript
// Enable debug logging
localStorage.setItem('DEBUG_META', 'true');

// View sync status
console.log(metaSync.getSyncStatus());

// View all tokens
metaTokens.getAllTokens().then(tokens => console.log(tokens));
```

### Reset tokens:
```javascript
// Delete all tokens for fresh start
const tokens = await metaTokens.getAllTokens();
for (const token of tokens) {
    await metaTokens.deleteToken(token.id);
}
```

---

## Next Steps

1. Add these methods to your existing HTML file's JavaScript
2. Add UI buttons for "Connect Meta" and "Sync Data"
3. Modify the analytics modal to show auto-synced fields
4. Test with your Meta app credentials
5. Submit app for review if needed
6. Deploy to production

---

## Support

For issues with:
- **Meta API**: [developers.facebook.com/docs](https://developers.facebook.com/docs)
- **OAuth flow**: [OAuth 2.0 Guide](https://developers.facebook.com/docs/facebook-login/web)
- **Graph API**: [API Reference](https://developers.facebook.com/docs/graph-api)
