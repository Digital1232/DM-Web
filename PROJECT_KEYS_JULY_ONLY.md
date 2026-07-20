# Project Keys Update - July Only

## Summary
Removed May and June project keys. The system now uses only JULY as the project key for all Jira operations.

## Changes Made

### 1. config.js
**File**: `config.js` (Line 29)

**Before**:
```javascript
projectKeys: ['MAY', 'JUN', 'JULY'],
```

**After**:
```javascript
projectKeys: ['JULY'],
```

### 2. script.js - Configuration
**File**: `script.js` (Line 121)

**Before**:
```javascript
projectKeys: ['MAY', 'JUN', 'JULY'],
```

**After**:
```javascript
projectKeys: ['JULY'],
```

### 3. script.js - Date-Based Logic (Shoot Planning)
**File**: `script.js` (Lines 2605-2607)

**Before**:
```javascript
const isJuly = date && date.split('-')[1] === '07';
const isJune = date && date.split('-')[1] === '06';
const projectKey = isJuly ? 'JULY' : (isJune ? 'JUN' : JIRA.projectKey);
```

**After**:
```javascript
const projectKey = 'JULY';
```

**Impact**: When users schedule shoots or tasks, they always use JULY project

### 4. script.js - Date-Based Logic (Create Task)
**File**: `script.js` (Lines 8963-8964)

**Before**:
```javascript
const curMonth = new Date().getMonth(); // 6 is July, 5 is June
const projectKey = curMonth === 6 ? 'JULY' : (curMonth === 5 ? 'JUN' : JIRA.projectKey);
```

**After**:
```javascript
const projectKey = 'JULY';
```

**Impact**: When creating tasks, regardless of current date, always use JULY

## What This Means

✅ **All Jira operations now use JULY project key**
- Task creation
- Task updates
- Task searches
- Jira syncs
- Manual task entry

✅ **Simplified logic**
- No more month-based project selection
- No May or June references
- Cleaner, more maintainable code

✅ **Consistent behavior**
- Same project key used everywhere
- No confusion about which project a task belongs to
- Predictable Jira integration

## Testing

To verify the changes work:

1. Create a new task → Should go to JULY project
2. Schedule a shoot → Should use JULY project
3. Sync Jira data → Should only pull from JULY project
4. Search for tasks → Should only search JULY project

## Files Modified

| File | Changes | Lines |
|------|---------|-------|
| config.js | Updated projectKeys array | 29 |
| script.js | Updated projectKeys config | 121 |
| script.js | Removed May/June date logic (shoots) | 2605-2607 |
| script.js | Removed May/June date logic (tasks) | 8963-8964 |

## Rollback (if needed)

If you need to revert to using May and June:

### config.js
```javascript
projectKeys: ['MAY', 'JUN', 'JULY'],
```

### script.js - Line 121
```javascript
projectKeys: ['MAY', 'JUN', 'JULY'],
```

### script.js - Lines 2605-2607
```javascript
const isJuly = date && date.split('-')[1] === '07';
const isJune = date && date.split('-')[1] === '06';
const projectKey = isJuly ? 'JULY' : (isJune ? 'JUN' : JIRA.projectKey);
```

### script.js - Lines 8963-8964
```javascript
const curMonth = new Date().getMonth(); // 6 is July, 5 is June
const projectKey = curMonth === 6 ? 'JULY' : (curMonth === 5 ? 'JUN' : JIRA.projectKey);
```

---

**Status**: ✅ Complete

**Date**: July 14, 2026

**Impact**: Low - Configuration change only, logic simplified
