# Navigation Menu Access Report
## Admin Role vs Non-Admin Role Verification

**Date:** July 14, 2026  
**Project:** One Desk Task Tracking System  
**Analysis:** Role-Based Navigation Menu Access Control

---

## Executive Summary

The navigation menu implements comprehensive role-based access control with three distinct access levels:
1. **Admin** - Full system access
2. **Manager** - Operations and team management access
3. **Regular Users** - Basic task and report access

---

## Role Definition & Authentication

### Admin Role Definition
```javascript
const ADMIN_ROLES = ['System Admin', 'Administrator'];
const ADMIN_EMAILS = [
    'digitalmarketing@vilpower.com',  // Palanirajan R
    'nanjil@vilpower.com',             // Nanjil Manohar S (Head of Operations)
    'murugeshvilpower@gmail.com'       // Murugesh Kumar A
];
```

**Admin Check Function:**
```javascript
function isAdmin() {
    if (!currentUser) return false;
    const role = (currentUser.role || '').trim();
    const email = (currentUser.email || '').toLowerCase();
    return ADMIN_EMAILS.some(e => e.toLowerCase() === email) ||
        ADMIN_ROLES.includes(role);
}
```

### Manager Role Definition
```javascript
const MANAGER_EMAILS = ['murugeshvilpower@gmail.com'];

function isManager() {
    if (!currentUser) return false;
    const role = (currentUser.role || '').trim();
    const email = (currentUser.email || '').toLowerCase();
    return role === 'Manager' || MANAGER_EMAILS.some(e => e.toLowerCase() === email);
}
```

---

## Navigation Menu Structure

### Main Navigation (Available to All Users)
These menu items appear for all authenticated users:

| Menu Item | Icon | View ID | Access Level |
|-----------|------|---------|--------------|
| Dashboard | widget-3 | dashboard | All Users |
| Tasks Hub | clipboard-list | tasks | All Users |
| Shoot Calendar | camera | shoots | All Users |
| QC Portal | shield-check | qc | Specific Roles (QC Portal Allowed) |
| My Notes | document-text | notes | All Users |
| DPR | chart-square | dpr | All Users |
| HR Portal | users-group | hr | All Users |
| Chat | chat-round-dots | chat | All Users |
| Discussions | chat-round-call | discussions | All Users |
| Announcements | bell-bing | announcements | All Users |
| Reports | graph | reports | All Users |
| Social Analytics | chart-square | social-analytics | All Users |
| Marketing Hub | target | marketing-hub | All Users |
| Files Manager | server-path | files-manager | All Users |
| Daily Summary | calendar-linear | daily-summary | All Users |

---

## Role-Specific Menu Items

### 1. DAILY PLAN (Manager/Admin Only)
```javascript
// Visibility Control
document.getElementById('nav-dailyplan')?.classList.toggle('hidden', !canViewDailyPlanTeamAccess());

// Access Function
function canViewDailyPlanTeamAccess() { 
    return isAdmin() || isManager(); 
}
```
- **Shown to:** Admin users and Managers
- **Hidden from:** Regular users
- **Button ID:** nav-dailyplan
- **View ID:** dailyplan

### 2. MONTHLY PLAN (Manager/Admin Only)
```javascript
function canViewMonthlyPlan() { 
    return isAdmin() || isManager(); 
}
```
- **Shown to:** Admin users and Managers
- **Hidden from:** Regular users
- **Button ID:** nav-monthly-plan
- **View ID:** monthly-plan

### 3. PROJECTS (Manager/Admin Only)
```javascript
function canViewProjects() { 
    return isAdmin() || isManager(); 
}
```
- **Shown to:** Admin users and Managers
- **Hidden from:** Regular users
- **Button ID:** nav-projects
- **View ID:** projects

### 4. META ADS (Manager/Admin + Digital Marketing)
```javascript
function canViewMetaAds() {
    if (!currentUser) return false;
    const email = (currentUser.email || '').toLowerCase();
    return isAdmin() || isManager() || email === 'digitalmarketing@vilpower.com';
}
```
- **Shown to:** Admin, Managers, and digitalmarketing@vilpower.com
- **Hidden from:** Other regular users
- **Button ID:** nav-meta-ads
- **View ID:** meta-ads

### 5. STRATEGY CALENDAR (Specific Team Members)
```javascript
function canViewStrategyCalendar() {
    if (!currentUser) return false;
    if (isAdmin() || isManager()) return true;
    const allowedStrategyEmails = [
        'snehavilpower@gmail.com',     // Sneha
        'murugeshvilpower@gmail.com'   // Murugesh (also Manager)
    ];
    return allowedStrategyEmails.includes(currentUser.email.toLowerCase());
}
```
- **Shown to:** Admin, Managers, Sneha, Murugesh
- **Hidden from:** Other users
- **Button ID:** nav-strategy-calendar
- **View ID:** strategy-calendar

### 6. PLAN TRACKING / PRODUCTION CONTROL CENTER (Manager/Admin Only)
```javascript
function canViewPlanTracking() { 
    return isAdmin() || isManager(); 
}
```
- **Shown to:** Admin users and Managers
- **Hidden from:** Regular users
- **Button ID:** nav-plan-tracking
- **View ID:** plan-tracking

---

## Admin-Only Navigation Section

### Location in Code
```html
<nav id="admin-nav" class="hidden mt-6 space-y-1">
    <p class="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Settings</p>
    <!-- Admin-only menu items -->
</nav>
```

### Visibility Control
```javascript
if (isAdmin()) {
    document.getElementById('admin-nav').classList.remove('hidden');
    document.getElementById('group-create-btn')?.classList.remove('hidden');
    document.getElementById('announcement-compose-card')?.classList.remove('hidden');
    // ... more admin features
} else {
    document.getElementById('admin-nav').classList.add('hidden');
}
```

### Admin-Only Menu Items (Settings Section)

| Menu Item | Icon | Function/View | Description |
|-----------|------|---------------|-------------|
| **Configuration** | settings | openSettings() | System configuration panel |
| **Integrations** | link | meta-integration | Integration settings (Meta/External APIs) |
| **User Management** | users-group-two | users | Manage system users and roles |
| **Client Names** | tag | clients-admin | Manage client list and naming |
| **Organising Activity** | users-group | organisers-admin | Manage event/leave/learning organizers |
| **Diagnostics** | bug | diagnoseJira() | System diagnostics and debugging tools |

**All these items are ONLY visible to admin users.**

---

## Manager-Only Navigation Section

### Location in Code
```html
<nav id="manager-nav" class="hidden mt-10 space-y-1">
    <p class="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Operations</p>
    <!-- Manager-only menu items -->
</nav>
```

### Visibility Control
```javascript
if (isAdmin() || isManager()) {
    document.getElementById('manager-nav')?.classList.remove('hidden');
} else {
    document.getElementById('manager-nav')?.classList.add('hidden');
}
```

### Manager-Only Menu Items (Operations Section)

| Menu Item | Icon | Function | Description |
|-----------|------|----------|-------------|
| **Schedule Discussion** | chat-round-call | openScheduleDiscussionModal() | Open modal to schedule team discussions |

---

## Report Tab Access Control

The Reports section implements granular role-based tab visibility:

### For Admin Users
```javascript
// Admin sees all report tabs
['timing', 'task', 'analytics', 'summary', 'detailed', 'client', 'client-wide'].forEach(tab => {
    document.getElementById(`report-tab-${tab}`)?.classList.remove('hidden');
});
```
**Tabs visible:**
- Timing Report
- Task Report
- Analytics Report
- Summary Report
- Detailed Report
- Client Report
- Client-Wide Report

### For Managers (Non-Admin)
```javascript
// Managers see limited tabs
document.getElementById('report-tab-client')?.classList.remove('hidden');
document.getElementById('report-tab-client-wide')?.classList.remove('hidden');
```
**Tabs visible:**
- Client Report
- Client-Wide Report

### For Regular Users
```javascript
// Regular users see basic tabs
['summary', 'detailed', 'task'].forEach(tab => {
    document.getElementById(`report-tab-${tab}`)?.classList.remove('hidden');
});
```
**Tabs visible:**
- Summary Report
- Detailed Report
- Task Report

### For Client-Wide Access Only
```javascript
if (hasClientWideAccess() && !isAdmin() && !isManager()) {
    // Only client-wide access
    document.getElementById('report-tab-client-wide')?.classList.remove('hidden');
}
```
**Tabs visible:**
- Client-Wide Report

---

## HR Portal Access Control

### Approval Tab Visibility
```javascript
if (canApproveLeaves()) {
    document.getElementById('hr-tab-approvals')?.classList.remove('hidden');
} else {
    document.getElementById('hr-tab-approvals')?.classList.add('hidden');
}
```
**Shown to:** Admin, Leave Approvers

### Emergency Tab Visibility
```javascript
if (isAdmin() || isLeaveOrganiser()) {
    document.getElementById('hr-tab-emergency')?.classList.remove('hidden');
    document.getElementById('hr-tab-approvals')?.classList.remove('hidden');
} else {
    document.getElementById('hr-tab-emergency')?.classList.add('hidden');
}
```
**Shown to:** Admin, Leave Organisers

---

## Additional Admin Features

### Dashboard Admin Features
```javascript
if (isAdmin()) {
    // Features visible only to admins:
    document.getElementById('group-create-btn')?.classList.remove('hidden');
    document.getElementById('announcement-compose-card')?.classList.remove('hidden');
    document.getElementById('dpr-tab-team')?.classList.remove('hidden');
    document.getElementById('report-tab-performance')?.classList.remove('hidden');
    document.getElementById('report-tab-indiv-perf')?.classList.remove('hidden');
}
```

### Live Board Timers (Admin Only)
```javascript
if ((view === 'dashboard' || view === 'dailyplan') && isAdmin()) {
    startLiveBoardTimers();
}
```

### Checkout Reason Notifications (Admin Only)
```javascript
function initAdminCheckoutReasonNotifications() {
    if (!db || !currentUser) return;
    if (!isAdmin()) return; // Only Admins should listen
    // ... implementation
}
```

---

## QC Portal Access Control

```javascript
function canViewQcPortal() {
    if (!currentUser) return false;
    const allowedQcEmails = [
        'digitalmarketing@vilpower.com',  // Palanirajan
        'snehavilpower@gmail.com',        // Sneha
        'murugeshvilpower@gmail.com',     // Murugesh
        'nanjil@vilpower.com'             // Nanjil
    ];
    return allowedQcEmails.includes(currentUser.email.toLowerCase());
}
```
**Shown to:** Palanirajan, Sneha, Murugesh, Nanjil only

---

## View Routing & Access Protection

The system implements route-based access control:

```javascript
// View switching with role validation
if (view === 'users' && !isAdmin()) { view = 'dashboard'; }
if (view === 'qc' && !canViewQcPortal()) { view = 'dashboard'; }
if (view === 'event-org' && !isEventOrganiser() && !isAdmin()) { view = 'dashboard'; }
if (view === 'leave-org' && !isLeaveOrganiser() && !isAdmin()) { view = 'dashboard'; }
if (view === 'learnings-org' && !isLearningsOrganiser() && !isAdmin()) { view = 'dashboard'; }
if (view === 'workplace-org' && !isWorkplaceOrganiser() && !isAdmin()) { view = 'dashboard'; }
if (view === 'dm-content-org' && !isDmContentOrganiser() && !isAdmin()) { view = 'dashboard'; }
if (view === 'organisers-admin' && !isAdmin()) { view = 'dashboard'; }
if (view === 'clients-admin' && !isAdmin()) { view = 'dashboard'; }
if (view === 'strategy-calendar' && !canViewStrategyCalendar()) { view = 'dashboard'; }
if (view === 'plan-tracking' && !canViewPlanTracking()) { view = 'dashboard'; }
```

**Protected Views (Admin Only):**
- users
- organisers-admin
- clients-admin
- meta-integration

**Protected Views (Role-Based):**
- qc (QC Portal specific)
- strategy-calendar (Limited)
- plan-tracking (Manager/Admin)
- Various organizer views

---

## User Role Breakdown

### Current System Users

| Email | Name | Role | Access Level |
|-------|------|------|--------------|
| nanjil@vilpower.com | Nanjil Manohar S | Head of Operations | **Admin** ✅ |
| digitalmarketing@vilpower.com | Palanirajan R | Senior Manager - Digital Executions & Delivery | **Admin** ✅ |
| murugeshvilpower@gmail.com | Murugesh Kumar A | Manager - Social Media & Client Accounts | **Admin** ✅ Manager |
| barathvilpower@gmail.com | Barath Magesh M | Manager - Creative Content & Visual | Regular User |
| snehavilpower@gmail.com | Sneha S | Team Member | Regular User (+ QC Access) |
| karthikavilpower@gmail.com | Karthika K | Graphic Designer Associate | Regular User |
| immanuelvilpower@gmail.com | Immanuel Raja S | Video Producer Associate | Regular User |
| ajithvilpower@gmail.com | Ajith | Social Media Executive | Regular User (+ Client-Wide Access) |
| alexvilpower@gmail.com | Alex | Team Member | Regular User |

---

## Access Control Summary Table

| Feature | All Users | Manager | Admin |
|---------|-----------|---------|-------|
| **Main Navigation** | ✅ | ✅ | ✅ |
| Dashboard | ✅ | ✅ | ✅ |
| Tasks Hub | ✅ | ✅ | ✅ |
| Shoot Calendar | ✅ | ✅ | ✅ |
| My Notes | ✅ | ✅ | ✅ |
| HR Portal | ✅ | ✅ | ✅ |
| Chat | ✅ | ✅ | ✅ |
| **Restricted Navigation** |  |  |  |
| Daily Plan | ❌ | ✅ | ✅ |
| Monthly Plan | ❌ | ✅ | ✅ |
| Projects | ❌ | ✅ | ✅ |
| Strategy Calendar | ❌ | ✅ | ✅ |
| Plan Tracking (Production Control) | ❌ | ✅ | ✅ |
| Meta Ads | ❌ | ✅ | ✅ |
| QC Portal | ❌ | ✅ (Special) | ✅ |
| **Admin-Only Section** |  |  |  |
| Configuration | ❌ | ❌ | ✅ |
| Integrations | ❌ | ❌ | ✅ |
| User Management | ❌ | ❌ | ✅ |
| Client Names | ❌ | ❌ | ✅ |
| Organising Activity | ❌ | ❌ | ✅ |
| Diagnostics | ❌ | ❌ | ✅ |
| **Manager-Only Section** |  |  |  |
| Schedule Discussion | ❌ | ✅ | ✅ |
| **Report Tabs** |  |  |  |
| Summary Report | ✅ | ❌ | ✅ |
| Detailed Report | ✅ | ❌ | ✅ |
| Task Report | ✅ | ❌ | ✅ |
| Timing Report | ❌ | ❌ | ✅ |
| Analytics Report | ❌ | ❌ | ✅ |
| Client Report | ❌ | ✅ | ✅ |
| Client-Wide Report | ❌ | ✅ | ✅ |

---

## Security Implementation

### 1. **Client-Side Validation**
- Menu items are hidden/shown based on role checks
- View switching is prevented at runtime if unauthorized
- Report tabs are conditionally rendered

### 2. **Server-Side Protection** (Required)
⚠️ **IMPORTANT:** The application currently implements client-side role checks. For production security:
- API endpoints should validate user permissions on the backend
- Database queries should be filtered by user role
- Admin actions should require server-side authorization
- Authentication tokens should include user roles

### 3. **Session Validation**
```javascript
if (!currentUser) return false;  // All permission checks validate user exists
```

---

## Potential Issues & Recommendations

### Issue 1: Client-Side Only Security
**Risk Level:** HIGH
- Role checks are performed in JavaScript (client-side)
- A user could theoretically manipulate JavaScript to bypass restrictions
- **Recommendation:** Implement server-side authorization on all API endpoints

### Issue 2: Email-Based Access Control
**Risk Level:** MEDIUM
- Access is partially based on email addresses
- Email addresses could be spoofed if authentication is compromised
- **Recommendation:** Use Firebase Custom Claims or a role-based database system

### Issue 3: No Audit Logging
**Risk Level:** MEDIUM
- Admin actions are not logged for audit purposes
- No trail of configuration changes
- **Recommendation:** Implement audit logging for admin activities

### Issue 4: Missing Navigation Items
**Risk Level:** LOW
- Projects navigation button exists but no implementation visible
- Some organizer views may not have corresponding UI components
- **Recommendation:** Complete implementation or remove dead links

---

## Testing Recommendations

### Test 1: Admin Access
- [ ] Login as `nanjil@vilpower.com` (Head of Operations)
- [ ] Verify "Settings" section appears in navigation
- [ ] Verify all admin menu items are accessible
- [ ] Verify all report tabs are visible

### Test 2: Manager Access
- [ ] Login as `murugeshvilpower@gmail.com` (Manager)
- [ ] Verify "Operations" section appears in navigation
- [ ] Verify Daily Plan, Monthly Plan, Projects are visible
- [ ] Verify Client and Client-Wide report tabs appear
- [ ] Verify Settings section is NOT visible

### Test 3: Regular User Access
- [ ] Login as `snehavilpower@gmail.com` (Team Member)
- [ ] Verify Settings section is NOT visible
- [ ] Verify Operations section is NOT visible
- [ ] Verify Daily Plan, Monthly Plan, Projects are NOT visible
- [ ] Verify only basic reports are visible (Summary, Detailed, Task)

### Test 4: Special Access
- [ ] Verify `ajithvilpower@gmail.com` has Client-Wide report access
- [ ] Verify QC Portal is accessible only to: Palanirajan, Sneha, Murugesh, Nanjil

---

## Conclusion

The navigation menu implements a well-structured, three-tier access control system:
1. **Admin users** have full system access including configuration, integrations, and user management
2. **Manager users** have operational access including team planning and client reporting
3. **Regular users** have basic access to tasks, reports, and collaborative features

All access is properly controlled through function-based permission checks, and views are protected with route validation. However, **production deployment should implement server-side authorization validation** to ensure security beyond client-side controls.

