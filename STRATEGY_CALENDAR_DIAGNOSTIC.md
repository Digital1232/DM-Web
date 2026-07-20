# Strategy Calendar - Missing Clients & Tasks Diagnostic

## Problem Statement
Strategy Calendar is missing:
- Several clients in the filter tabs
- Many tasks that should be displayed

## Root Cause Analysis

### Issue 1: Missing Clients in Filter Tabs
**Location**: `renderStrategyClientTabs()` function (line 14754)

**Current Logic**:
```javascript
Object.values(strategyEvents).forEach(ev => {
    if (ev.client) {
        uniqueClients.add(ev.client);
    }
});
```

**Problem**: Only clients with **existing tasks** appear in tabs. If a client has no tasks yet, it won't show in the filter dropdown.

**Solution**: Build client tabs from `customClients` instead of just from events.

### Issue 2: Missing Tasks Display
**Location**: `renderStrategyCalendar()` function (line 14960-14973)

**Current Logic**:
```javascript
Object.entries(strategyEvents).forEach(([id, ev]) => {
    if (!ev.date) return; // Skip if no date
    
    // Filter by client
    if (activeStrategyClientFilter !== 'All') {
        if (activeStrategyClientFilter === 'General') {
            if (ev.client) return; // Skip if has client
        } else {
            if (ev.client !== activeStrategyClientFilter) return; // Skip if client doesn't match
        }
    }
    // Add to calendar...
});
```

**Potential Problems**:
1. Tasks without a `date` field are completely hidden
2. Tasks might not be loading from Firebase due to permission issues
3. Data sync might not be complete on page load

## Recommended Fixes

### Fix 1: Include All Available Clients in Tabs
**Change the tab building logic to include both:**
- Clients from `customClients` array (configured clients)
- Clients from existing `strategyEvents` (active clients with tasks)

**Implementation**:
```javascript
function renderStrategyClientTabs() {
    const container = document.getElementById('strategy-client-tabs-container');
    if (!container) return;

    // Get unique clients from BOTH customClients and strategyEvents
    const uniqueClients = new Set([...customClients]);
    
    Object.values(strategyEvents).forEach(ev => {
        if (ev.client) {
            uniqueClients.add(ev.client);
        }
    });

    const sortedClients = Array.from(uniqueClients).sort();
    
    // Build tabs...
}
```

### Fix 2: Add Console Logging for Debugging
**Add diagnostics to see what's happening:**
```javascript
async function initStrategyCalendar() {
    // ... existing code ...
    
    strategyEventsUnsub = onValue(ref(db, 'worksync/strategy_events'), (snap) => {
        strategyEvents = snap.val() || {};
        
        // DIAGNOSTIC LOGGING
        console.log('=== STRATEGY CALENDAR DIAGNOSTIC ===');
        console.log('Total events loaded:', Object.keys(strategyEvents).length);
        console.log('customClients available:', customClients.length, customClients);
        console.log('Unique clients in events:', 
            new Set(Object.values(strategyEvents).map(e => e.client || 'General'))
        );
        console.log('Events with valid dates:', 
            Object.values(strategyEvents).filter(e => e.date).length
        );
        
        renderStrategyClientTabs();
        renderStrategyCalendar();
        renderStrategySidebar();
    });
}
```

### Fix 3: Ensure Tasks Without Client Still Appear
**Modify the rendering logic to handle edge cases:**

```javascript
const eventsByDate = {};
Object.entries(strategyEvents).forEach(([id, ev]) => {
    if (!ev.date) {
        console.warn('Event without date:', id, ev);
        return;
    }

    // Filter by client
    if (activeStrategyClientFilter !== 'All') {
        if (activeStrategyClientFilter === 'General') {
            if (ev.client) return; // Skip if has client (only show unassigned)
        } else {
            if (ev.client !== activeStrategyClientFilter) return; // Skip if different client
        }
    }

    const d = ev.date; // YYYY-MM-DD
    if (!eventsByDate[d]) eventsByDate[d] = [];
    eventsByDate[d].push({ id, ...ev });
});
```

## Investigation Steps

### Step 1: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Note the diagnostic output showing:
   - Total events loaded
   - Available customClients
   - Unique clients in events
   - Events with valid dates

### Step 2: Check Firebase Data
1. Go to Firebase Console
2. Navigate to `worksync/strategy_events`
3. Check:
   - Total number of documents
   - Sample event structure
   - Which events have `client` field populated
   - Which events have `date` field populated

### Step 3: Check Custom Clients Config
1. Navigate to `worksync/settings/custom_clients`
2. Compare with the CLIENTS array in code
3. Verify all expected clients are present

## Data Structure Expected

### Strategy Event Structure
```javascript
{
    id: "event-abc123",
    title: "Campaign Launch",
    date: "2026-07-15",        // REQUIRED for display
    client: "Ashmithasree",     // Optional, defaults to "General"
    status: "To Do",
    owner: "user@example.com",
    desc: "Event description",
    platform: "Instagram",
    jiraTaskId: "JULY-123"      // Optional
}
```

### Custom Clients Structure
```javascript
[
    "NTT", 
    "Einstein", 
    "Ashmithasree",
    // ... more clients
]
```

## Quick Test Checklist

- [ ] Browser console shows correct number of events
- [ ] All customClients appear in filter tabs (even if no tasks)
- [ ] Events with valid dates appear on calendar
- [ ] Clicking each client tab filters correctly
- [ ] "General" tab shows unassigned events
- [ ] Each event shows title and client name

## Performance Considerations

- **Avoid loading all events into memory** if there are thousands
- Consider pagination or date-range filtering
- Firebase listener should be efficient

## Next Actions

1. **Add diagnostic logging** to identify exact issue
2. **Check Firebase data** to see if events exist
3. **Verify customClients** are properly loaded
4. **Test permissions** - ensure user can read all events
5. **Rebuild client tabs** from all available clients, not just those with tasks
