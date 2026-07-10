# Meta API Integration Plan for Social Media Analytics

## Overview
Integrate Facebook, Instagram, and other Meta platforms with the Social Media Analytics dashboard to automatically sync post performance metrics.

---

## Phase 1: Setup & Authentication

### 1.1 Meta App Configuration
- [ ] Create Meta App via [developers.facebook.com](https://developers.facebook.com)
- [ ] Get App ID and App Secret
- [ ] Add necessary product permissions:
  - Facebook Graph API (v18.0+)
  - Instagram Graph API
  - Pages API
  - Insights API
  
### 1.2 Required Permissions
- `pages_read_engagement` - Read page insights
- `pages_read_user_content` - Read page posts
- `instagram_basic` - Access Instagram basic info
- `instagram_graph_api` - Access Instagram Graph API
- `pages_manage_metadata` - Manage page settings

### 1.3 OAuth Setup
- [ ] Implement OAuth 2.0 flow for user login
- [ ] Store access tokens securely in Firebase
- [ ] Implement token refresh mechanism
- [ ] Setup redirect URI: `https://yourapp.com/auth/meta/callback`

---

## Phase 2: Backend Setup

### 2.1 Create Meta API Service
**File:** `api/meta.js`

```javascript
// Key endpoints needed:
1. POST /api/meta/connect - OAuth login
2. GET /api/meta/pages - Get user's pages
3. GET /api/meta/page/:pageId/posts - Get page posts
4. GET /api/meta/post/:postId/insights - Get post metrics
5. POST /api/meta/sync - Sync all posts and metrics
6. GET /api/meta/status - Check connection status
7. POST /api/meta/disconnect - Revoke access
```

### 2.2 Token Management
- Store refresh tokens in Firestore/Firebase
- Auto-refresh tokens before expiry
- Encrypt sensitive tokens
- Implement rate limiting (Meta has API limits)

### 2.3 Data Sync Strategy
**Auto-sync Options:**
1. **On-demand sync** - Manual button click
2. **Scheduled sync** - Every 6/12/24 hours
3. **Real-time webhooks** - Subscribe to Meta webhooks for live updates

---

## Phase 3: Frontend Integration

### 3.1 Add Meta Connection UI
**Location:** Social Analytics Header (next to "Add Entry" button)

```html
<!-- New button near Add Entry -->
<button id="meta-connect-btn" onclick="connectMetaAccount()">
  <iconify-icon icon="mdi:facebook" /> Connect Meta
</button>

<!-- Status indicator -->
<span id="meta-status-badge" class="hidden">
  Connected: @facebook_page
</span>
```

### 3.2 Sync Options UI
**Add to Social Analytics panel:**

```html
<!-- Sync Controls Section -->
<div class="flex items-center gap-3 border-b pb-4">
  <button id="manual-sync-btn" onclick="manualSyncMeta()" class="btn-secondary">
    <iconify-icon icon="solar:refresh-bold" /> Sync Meta Data
  </button>
  
  <select id="meta-sync-frequency" onchange="updateSyncFrequency()">
    <option value="manual">Manual</option>
    <option value="6hours">Every 6 Hours</option>
    <option value="12hours">Every 12 Hours</option>
    <option value="24hours">Every 24 Hours</option>
  </select>
</div>
```

### 3.3 Modify Data Entry Modal
**Add Meta fields to existing modal:**

```html
<!-- Inside saAddModal -->
<fieldset id="meta-fields-section" class="border rounded p-4 mb-4">
  <legend>Meta Source</legend>
  
  <select id="sa-meta-page">
    <option value="">Not from Meta</option>
    <!-- Populated from connected pages -->
  </select>
  
  <input type="text" id="sa-meta-post-id" placeholder="Meta Post ID" disabled>
  <span class="text-xs text-slate-400">Auto-filled when synced</span>
</fieldset>
```

---

## Phase 4: Data Mapping

### 4.1 Current Fields → Meta Fields

| Current Field | Meta API Source | Notes |
|---|---|---|
| `platform` | `"Facebook"` or `"Instagram"` | Set automatically |
| `title` | Post message/caption | First 100 chars |
| `postingDate` | `created_time` | From post object |
| `views` | `impressions` | From insights |
| `likes` | `reaction.type(LIKE).total_count` | From insights |
| `shares` | `shares` | From post object |
| `comments` | `comments.summary(true).total_count` | From post object |
| `reach` | `post_impressions_unique` | From insights |
| `followers` | Page `followers_count` | From page object |
| `link` | `story` or post permalink | Generated URL |
| `metaPostId` | `id` | For tracking/updates |

### 4.2 New Fields to Add

```javascript
{
  // ... existing fields ...
  metaPostId: "123456789",           // Meta's post ID
  metaPageId: "987654321",           // Meta's page ID
  metaSyncedAt: "2024-01-15T10:30", // Sync timestamp
  metaMetrics: {                     // Detailed metrics
    impressions: 1500,
    reactions: { LIKE: 120, LOVE: 45 },
    saveCount: 15,
    clickCount: 78
  },
  autoSynced: true                   // Flag to show it came from Meta
}
```

---

## Phase 5: Implementation Steps

### Step 1: Backend Setup (2-3 days)
- [ ] Create `api/meta.js` with OAuth flow
- [ ] Implement token storage and refresh
- [ ] Create database schema in Firebase for Meta tokens
- [ ] Build sync functions for posts and metrics

### Step 2: Frontend Connection (2 days)
- [ ] Add Meta Connect button and login flow
- [ ] Show connected pages
- [ ] Display sync status

### Step 3: Sync Implementation (3-4 days)
- [ ] Build manual sync button
- [ ] Fetch posts from connected Meta pages
- [ ] Map Meta data to current analytics structure
- [ ] Deduplicate posts (prevent duplicates when manually entered + synced)

### Step 4: Testing & Refinement (2-3 days)
- [ ] Test OAuth flow
- [ ] Verify data accuracy
- [ ] Test edge cases
- [ ] Performance optimization

### Step 5: Automation (1-2 days)
- [ ] Setup scheduled sync (Cloud Functions)
- [ ] Implement webhook receivers for real-time updates
- [ ] Add error handling and notifications

---

## Phase 6: Error Handling & Edge Cases

### Handle:
- [ ] Expired access tokens → auto-refresh
- [ ] Rate limit exceeded → queue requests
- [ ] Private accounts → show error message
- [ ] Duplicate posts → mark as "synced from Meta" in UI
- [ ] Post deleted after sync → mark as unavailable
- [ ] No metrics yet for new posts → show placeholder
- [ ] Multi-page accounts → allow selection

---

## Phase 7: Security Considerations

### Must Implement:
1. **Token Encryption** - Never store raw access tokens
2. **HTTPS Only** - All API calls over HTTPS
3. **Server-side Validation** - Verify permissions before allowing data access
4. **Rate Limiting** - Prevent API abuse (Meta limits: 200 calls/hour for development)
5. **Audit Log** - Track who accessed what Meta data
6. **Scope Minimization** - Request only necessary permissions
7. **Token Expiry** - Implement automatic refresh 5 min before expiry

---

## Phase 8: UI/UX Features

### Enhancements:
```html
<!-- Sync Status Indicator -->
<div id="meta-sync-status" class="p-3 rounded bg-blue-50">
  <span class="text-xs font-bold text-blue-600">
    <iconify-icon icon="solar:loading-bold" class="animate-spin" />
    Last synced: 2 hours ago
  </span>
</div>

<!-- Post Source Badge -->
<div class="post-badge">
  <span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
    <iconify-icon icon="mdi:facebook" /> Synced
  </span>
</div>

<!-- Auto-Sync Toggle -->
<label class="flex items-center gap-2">
  <input type="checkbox" id="auto-sync-toggle" onchange="toggleAutoSync()" />
  <span>Enable Auto-Sync</span>
</label>
```

---

## Phase 9: API Rate Limits & Costs

### Meta Limits:
- Development: 200 API calls/hour
- Production: Depends on app review
- Each post fetch = 1 call
- Each insight metric = 1 call

### Optimization:
- Batch requests where possible
- Cache results for 1 hour
- Fetch insights only for new posts
- Use webhook for real-time data instead of polling

---

## Implementation Checklist

### Week 1: Backend
- [ ] Setup Meta App
- [ ] OAuth flow
- [ ] Token management
- [ ] Database schema

### Week 2: Frontend & Sync
- [ ] UI components
- [ ] Manual sync
- [ ] Data mapping
- [ ] Deduplication

### Week 3: Testing & Automation
- [ ] Testing
- [ ] Scheduled sync
- [ ] Webhooks (optional)
- [ ] Documentation

---

## Files to Create/Modify

```
Project Root
├── api/
│   ├── meta.js (NEW) - Meta API wrapper
│   ├── meta-auth.js (NEW) - OAuth handler
│   └── meta-sync.js (NEW) - Sync scheduler
├── index.html (MODIFY)
│   ├── Add Meta Connect button
│   ├── Add sync controls
│   └── Modify analytics modal
├── config.js (MODIFY)
│   ├── Add Meta App ID
│   └── Add API endpoints
└── META_API_INTEGRATION_PLAN.md (THIS FILE)
```

---

## Cost Analysis

- **Meta API**: Free (up to development limits)
- **Tokens Storage**: Firebase (already using)
- **Processing**: Cloud Functions (minimal cost)
- **Development Time**: ~2-3 weeks

---

## Next Steps

1. **Get Meta API Credentials**
   - Go to [developers.facebook.com](https://developers.facebook.com)
   - Create app → Select "Business"
   - Add Facebook & Instagram products
   - Get App ID/Secret

2. **Review Meta Permissions**
   - Submit app review for required permissions
   - May take 3-7 days

3. **Start Backend Implementation**
   - Begin with `api/meta.js`
   - Setup OAuth flow
   - Test token management

4. **Parallel: Prepare Frontend**
   - Design Connect button placement
   - Plan UI for sync controls
   - Update modal structure

---

## References

- [Meta Graph API Docs](https://developers.facebook.com/docs/graph-api)
- [Facebook Insights API](https://developers.facebook.com/docs/graph-api/reference/page/insights)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api)
- [OAuth 2.0 Guide](https://developers.facebook.com/docs/facebook-login/web)
- [API Limits & Throttling](https://developers.facebook.com/docs/graph-api/overview/rate-limiting)
