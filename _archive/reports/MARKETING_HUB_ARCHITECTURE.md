# Marketing Hub Architecture & Implementation Plan

## Overview
The Marketing Hub is a centralized digital marketing integration platform built seamlessly into One Desk. It uses the existing architecture patterns (switchView, cards, dark mode, toasts, modals, and responsive design) while introducing a tab-based interface for managing multiple digital marketing platforms.

## Architecture Design

### 1. Navigation Integration
- **Primary Navigation Button**: "Marketing Hub" in sidebar (replaces "Meta Ads")
  - `onclick="switchView('marketing-hub')"`
  - `id="nav-marketing-hub"`
  - Icon: `solar:target-bold-duotone`

- **Settings Submenu**: Add under Settings
  - "Integrations" → "Meta" (Settings → Integrations → Meta)
  - `onclick="switchView('settings-integrations-meta')"`
  - `id="nav-settings-integrations-meta"`

### 2. Tab System Architecture
The Marketing Hub uses a tabbed interface with 8 main tabs. Each tab is a separate panel toggled via a tab button.

```
Marketing Hub
├── Overview (default)
├── Connections
├── Facebook
├── Instagram
├── Meta Ads
├── Analytics
├── Reports
├── AI Insights
└── Settings
```

**Tab Structure:**
- Tab container: `id="mh-tabs-container"`
- Tab buttons: `class="mh-tab-btn"` with `data-tab="tab-name"`
- Tab content panels: `id="mh-tab-overview"`, `id="mh-tab-connections"`, etc.
- Active tab styling: `mh-tab-active` class

### 3. View Panel Structure
```html
<div id="view-marketing-hub-panel" class="hidden space-y-6 fade-in overflow-y-auto">
  <!-- Header with title and actions -->
  <div class="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
    <!-- Title, Refresh, Settings buttons -->
  </div>

  <!-- Tab Navigation -->
  <div id="mh-tabs-container" class="flex gap-2 border-b border-slate-100 overflow-x-auto">
    <!-- Tab buttons -->
  </div>

  <!-- Tab Content Areas -->
  <div id="mh-tab-overview" class="mh-tab-content"><!-- Overview --></div>
  <div id="mh-tab-connections" class="mh-tab-content hidden"><!-- Connections --></div>
  <div id="mh-tab-facebook" class="mh-tab-content hidden"><!-- Facebook --></div>
  <!-- More tabs... -->
</div>
```

### 4. Data Models

#### Marketing Connection (Firestore)
```javascript
Collection: marketing_integrations
Document: {
  userId: string,
  provider: "meta" | "facebook" | "instagram" | "google" | "linkedin" | "youtube",
  businessId: string,
  businessName: string,
  
  // Meta/Facebook specific
  pageId: string,
  pageName: string,
  pageAccessToken: string (encrypted),
  
  // Instagram specific
  instagramId: string,
  instagramUsername: string,
  profilePicture: string,
  
  // Ads specific
  adAccountId: string,
  adAccountName: string,
  currency: string,
  timezone: string,
  
  // Common fields
  permissions: [string],
  accessToken: string (encrypted),
  refreshToken: string (encrypted),
  expiresAt: timestamp,
  connectedAt: timestamp,
  updatedAt: timestamp,
  lastSync: timestamp,
  status: "active" | "expired" | "disconnected"
}
```

### 5. API Layer Structure

**File: `/api/marketingService.js`**
- Provider-based abstraction
- Each provider implements common interface
- Methods: connect(), disconnect(), getProfile(), sync(), getData()

**File: `/services/providers/MetaProvider.js`**
- Implements IMarketingProvider interface
- Handles Meta OAuth flow
- Token management
- API calls to Meta Graph API

**Backend Routes:**
- POST /api/marketing/connect/:provider
- GET /api/marketing/callback/:provider
- GET /api/marketing/profile
- POST /api/marketing/sync
- POST /api/marketing/disconnect/:provider
- GET /api/marketing/analytics
- GET /api/marketing/campaigns
- GET /api/marketing/posts

### 6. Component Patterns

**Platform Card (Connected):**
```html
<div class="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
  <div class="flex items-start justify-between mb-4">
    <div class="flex items-center gap-3">
      <img src="platform-logo.png" alt="Platform" class="w-8 h-8">
      <div>
        <h3 class="text-sm font-bold text-slate-900">Platform Name</h3>
        <p class="text-xs text-slate-500">Connected</p>
      </div>
    </div>
    <span class="bg-emerald-100 text-emerald-600 text-xs font-bold px-2.5 py-1 rounded-full">CONNECTED</span>
  </div>
  <div class="space-y-2 text-sm">
    <p class="text-slate-600">Last Sync: <span class="font-bold">2 hours ago</span></p>
    <p class="text-slate-600">Last Updated: <span class="font-bold">Today at 2:30 PM</span></p>
  </div>
  <button class="mt-4 w-full bg-slate-50 hover:bg-slate-100 text-slate-600 py-2 rounded-xl text-xs font-bold transition-all">
    Manage
  </button>
</div>
```

**Premium Hero Card (Not Connected):**
```html
<div class="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200 rounded-3xl p-12 shadow-lg">
  <div class="flex items-center gap-6">
    <div class="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-md">
      <img src="meta-logo.png" alt="Meta" class="w-12 h-12">
    </div>
    <div class="flex-1">
      <h2 class="text-2xl font-black text-slate-900 mb-2">Meta Business Integration</h2>
      <p class="text-slate-600 mb-4">Connect your Meta Business Account to access Facebook Pages, Instagram Professional Accounts, and Meta Ads all in one place.</p>
      <div class="flex gap-3">
        <button onclick="connectMetaBusiness()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all">
          Connect Meta Account
        </button>
        <button onclick="openMetaLearnMore()" class="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-6 py-2.5 rounded-xl font-bold transition-all">
          Learn More
        </button>
      </div>
    </div>
  </div>
</div>
```

### 7. Existing Code Reuse

**Components to reuse:**
- Toast notifications: `toast(msg, type, duration)`
- Loading spinner: `<iconify-icon icon="solar:loading-bold" class="animate-spin">`
- Skeleton loaders: Existing pattern with `animate-pulse`
- Modal dialogs: Dialog HTML element with close button pattern
- Responsive grids: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6`
- Cards: `bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/40 border border-slate-100`
- Buttons: Primary `bg-indigo-600 hover:bg-indigo-700`, Secondary `bg-slate-50 hover:bg-slate-100`
- Icons: Iconify solar icons with width="20" or "24"
- Dark mode: HTML.dark CSS patterns with !important overrides

**Helper functions to use:**
- `eKey(email)`: For safe key formatting
- `updateSystemStatus(ok, message, isAutoSync)`: For sync status updates
- `formatTime(seconds)`: For time display
- `escapeHtml(value)`: For HTML sanitization

### 8. State Management
```javascript
// Global state
let currentMarketingTab = 'overview';
let marketingConnections = {}; // Provider → connection data
let marketingAnalytics = {}; // Cached analytics data
let marketingSyncStatus = {}; // Sync status per provider
```

### 9. Key Functions

**Navigation & Tab Management:**
- `switchView('marketing-hub')`: Main view switch
- `switchMarketingTab(tabName)`: Switch between tabs
- `renderMarketingOverview()`: Render overview tab
- `renderMarketingConnections()`: Render connections tab
- etc.

**Data Management:**
- `loadMarketingConnections()`: Fetch all connections
- `syncMarketingData()`: Trigger sync
- `loadMarketingAnalytics()`: Load analytics data

**OAuth & Connection:**
- `connectMarketingProvider(provider)`: Initiate OAuth
- `handleMarketingCallback()`: Handle OAuth callback
- `disconnectMarketingProvider(provider)`: Disconnect account

### 10. Permissions & Access Control
```javascript
function canAccessMarketingHub() {
  // Check if user has permissions
  return isAdmin() || hasMarketingPermission(currentUser);
}

function canViewMarketingAnalytics() {
  // Check analytics permission
  return isAdmin() || hasAnalyticsPermission(currentUser);
}
```

### 11. Dark Mode Integration
All components automatically respect `html.dark` class. Custom dark mode CSS rules:
```css
html.dark #view-marketing-hub-panel {
  background-color: #0f1117;
}

html.dark .mh-platform-card {
  background-color: #1a2236;
  border-color: #253347;
}

html.dark .mh-hero-card {
  background: linear-gradient(135deg, #1e2a4a, #1a2236);
  border-color: #253347;
}
```

### 12. Responsive Design
- Desktop (1280px+): Full tabs, 4-column grids, side-by-side layouts
- Tablet (768px-1279px): Stacked tabs with horizontal scroll, 2-column grids
- Mobile (<768px): Vertical tab scroll, single column, hamburger for platform menu

### 13. Error Handling & Edge Cases
- OAuth cancelled: Show toast, return to connections tab
- Expired token: Show warning banner, prompt refresh
- Rate limit: Implement backoff, show user feedback
- No accounts: Show beautiful empty states with CTAs
- Network errors: Retry with exponential backoff

### 14. Future Extensibility
The architecture supports adding new providers without changing existing code:
1. Create new provider class implementing IMarketingProvider
2. Add provider-specific routes in backend
3. Add provider tab and UI components
4. Register provider in provider registry

**Planned providers:**
- Google Ads (Google Ads)
- Google Analytics (Analytics)
- LinkedIn (LinkedIn)
- YouTube (YouTube)
- TikTok (TikTok)
- X/Twitter (X)
- Pinterest (Pinterest)

## Implementation Phases

### Phase 1: Core Infrastructure
- Navigation setup (Marketing Hub nav button)
- Tab system HTML & CSS
- Overview tab (platform cards)
- Connection state management

### Phase 2: Meta Integration
- OAuth flow implementation
- Connection management UI
- Meta provider service
- Facebook page data display

### Phase 3: Analytics & Reporting
- Analytics tab implementation
- Reports tab implementation
- Chart integrations
- Data visualization

### Phase 4: AI Insights & Polish
- AI Insights tab
- Settings tab
- Comprehensive error handling
- Performance optimization
- Testing & QA

---

## File Structure
```
project-root/
├── index.html (updated with Marketing Hub view & modals)
├── script.js (updated with switchView & marketing functions)
├── styles/
│  └── marketing-hub.css (dark mode & custom styles)
├── js/
│  ├── modules/
│  │  ├── marketingHub.js (main orchestration)
│  │  ├── marketingTabs.js (tab management)
│  │  ├── marketingUI.js (component rendering)
│  │  └── marketingState.js (state management)
│  └── services/
│     ├── marketingService.js (API abstraction)
│     ├── metaService.js (Meta API calls)
│     └── authService.js (OAuth handling)
└── api/
   ├── marketing.js (backend routes)
   └── providers/
      └── meta.js (Meta provider implementation)
```

---

This architecture ensures the Marketing Hub integrates seamlessly with One Desk while maintaining scalability for future provider additions.
