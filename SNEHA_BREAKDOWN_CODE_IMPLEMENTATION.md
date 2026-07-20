# Code Implementation: Sneha's Task Breakdown

## Overview
This document provides the exact code needed to implement Sneha's task breakdown display in the index.html file.

## Part 1: Helper Functions

Add these functions to your script section (before renderCompletedTasksHub if it exists):

```javascript
// ══════════════════════════════════════════════════════════════════
// SNEHA'S TASK BREAKDOWN FUNCTIONS
// ══════════════════════════════════════════════════════════════════

const SNEHA_EMAIL_LC = 'snehavilpower@gmail.com';

/**
 * Get all task IDs where Sneha did work (content selections, QC, or internal)
 * Returns a Set<string> of task IDs
 */
function getSnehaTaskIds() {
    const ids = new Set();
    
    // Add tasks from Sneha's content selections
    (globalSnehaSelections || []).forEach(s => {
        if (s.taskId && (s.userId || '').toLowerCase() === SNEHA_EMAIL_LC) {
            ids.add(s.taskId);
        }
    });
    
    // Add tasks from Sneha's QC reviews
    (allQcReports || []).forEach(r => {
        if (r.taskId && (r.qcEmail || '').toLowerCase().trim() === SNEHA_EMAIL_LC) {
            ids.add(r.taskId);
        }
    });
    
    // Add Sneha's internally assigned tasks
    (tasks || []).forEach(t => {
        if (t && t.id && isInternalTask(t) && (t.assigneeEmail || t.userId || '').toLowerCase() === SNEHA_EMAIL_LC) {
            ids.add(t.id);
        }
    });
    
    return ids;
}

/**
 * Check if a task is in Sneha's work set
 */
function isSnehaWorkedTask(t) {
    return !!(t && t.id && getSnehaTaskIds().has(t.id));
}

/**
 * Get the work items/labels for Sneha on this task
 * Returns array of strings like ["Poster Content", "Captions", "QC Reviewed"]
 */
function getSnehaTaskLabels(t) {
    if (!t || !t.id) return [];
    
    const labels = new Set();
    
    // Get content selections Sneha made
    (globalSnehaSelections || []).forEach(s => {
        if (s.taskId === t.id && (s.userId || '').toLowerCase() === SNEHA_EMAIL_LC) {
            (s.selectedItems || []).forEach(item => labels.add(item));
        }
    });
    
    // Check if Sneha reviewed this task's QC
    if ((allQcReports || []).some(r => 
        r.taskId === t.id && 
        (r.qcEmail || '').toLowerCase().trim() === SNEHA_EMAIL_LC)) {
        labels.add('QC Reviewed');
    }
    
    // Check if it's an internal task assigned to Sneha
    if (!labels.size && isInternalTask(t) && 
        (t.assigneeEmail || t.userId || '').toLowerCase() === SNEHA_EMAIL_LC) {
        labels.add('Internal');
    }
    
    return Array.from(labels);
}

/**
 * Format task breakdown for display
 * Example: "Alumni Registration Poster [ Poster Content, Captions ]"
 * Returns: { title: string, breakdown: string, category: string }
 */
function formatSnehaTaskBreakdown(t) {
    const labels = getSnehaTaskLabels(t);
    const title = t.desc || t.title || 'No Description';
    
    let breakdown = '';
    let category = 'Other';
    
    if (labels.length > 0) {
        breakdown = `[ ${labels.join(', ')} ]`;
        
        // Determine category
        if (labels.includes('QC Reviewed')) {
            category = 'QC Review';
        } else if (labels.some(l => l !== 'QC Reviewed' && l !== 'Internal')) {
            category = 'Content Work';
        } else if (labels.includes('Internal')) {
            category = 'Internal';
        }
    }
    
    return {
        title: title,
        breakdown: breakdown,
        category: category,
        labels: labels
    };
}

/**
 * Get primary work category for a task
 * Returns: "Content Work" | "QC Review" | "Internal" | "Other"
 */
function getSnehaWorkCategory(t) {
    const { category } = formatSnehaTaskBreakdown(t);
    return category;
}

/**
 * Format complete display string for Sneha's completed tasks
 * Example: "Alumni Registration Poster [ Poster Content, Captions ] • Content Work"
 */
function formatSnehaCompletedTaskDisplay(t) {
    const { title, breakdown, category } = formatSnehaTaskBreakdown(t);
    
    if (breakdown) {
        return `${title} ${breakdown} • ${category}`;
    }
    return title;
}

/**
 * Render HTML for task breakdown section
 * Used in completed tasks list and daily summary
 */
function renderTaskBreakdownBadges(t, cssClass = '') {
    const labels = getSnehaTaskLabels(t);
    if (!labels.length) return '';
    
    const badgeHtml = labels.map(label => `
        <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-50 text-violet-600 border border-violet-100/50 ${cssClass}">
            ${escapeHtml(label)}
        </span>
    `).join('');
    
    return badgeHtml;
}

/**
 * Render detailed breakdown card (for expanded view)
 */
function renderTaskBreakdownCard(t) {
    const { title, breakdown, category, labels } = formatSnehaTaskBreakdown(t);
    const client = t.client || 'Others';
    const status = t.status || 'Unknown';
    const completedDate = getTaskCompletedDate(t) || 'Not completed';
    
    if (!breakdown) return '';
    
    return `
        <div class="bg-violet-50 border border-violet-100 rounded-xl p-3 mb-3">
            <div class="flex flex-col gap-2">
                <div>
                    <p class="text-[10px] font-bold text-violet-600 uppercase tracking-wider mb-1">Work Breakdown</p>
                    <p class="text-xs font-semibold text-slate-900">${escapeHtml(title)}</p>
                </div>
                <div class="flex flex-wrap gap-1.5">
                    ${labels.map(label => `
                        <span class="inline-flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg text-[9px] font-bold text-violet-700 border border-violet-100">
                            <iconify-icon icon="solar:checklist-minimalistic-bold" width="12" class="text-violet-500"></iconify-icon>
                            ${escapeHtml(label)}
                        </span>
                    `).join('')}
                </div>
                <div class="grid grid-cols-2 gap-2 pt-2 border-t border-violet-100">
                    <div>
                        <p class="text-[9px] text-violet-600 font-bold uppercase">Category</p>
                        <p class="text-xs font-bold text-slate-700">${category}</p>
                    </div>
                    <div>
                        <p class="text-[9px] text-violet-600 font-bold uppercase">Status</p>
                        <p class="text-xs font-bold text-slate-700">${escapeHtml(status)}</p>
                    </div>
                    <div>
                        <p class="text-[9px] text-violet-600 font-bold uppercase">Client</p>
                        <p class="text-xs font-bold text-slate-700">${escapeHtml(client)}</p>
                    </div>
                    <div>
                        <p class="text-[9px] text-violet-600 font-bold uppercase">Completed</p>
                        <p class="text-xs font-bold text-slate-700">${completedDate}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}
```

## Part 2: Update Task Rendering

### In the completed tasks list rendering:

**Current code (in renderCompletedTasksHub):**
```javascript
listContainer.innerHTML = filtered.map(t => {
    const taskDate = getTaskCompletedDate(t) || '—';
    const assName = assigneeName(t);
    const client = t.client || 'Others';
    const isManual = !!t.manual;
    const sneaLabels = getSnehaTaskLabels(t);
    
    return `
        <div class="hover:bg-slate-50/80 transition-all p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 last:border-b-0 cursor-pointer"
             onclick="openEditTaskModal('${t.id}')">
            // ... rest of html
        </div>
    `;
}).join('');
```

**Enhanced code (with breakdown):**
```javascript
listContainer.innerHTML = filtered.map(t => {
    const taskDate = getTaskCompletedDate(t) || '—';
    const assName = assigneeName(t);
    const client = t.client || 'Others';
    const isManual = !!t.manual;
    
    // NEW: Get breakdown info
    const breakdown = formatSnehaTaskBreakdown(t);
    const hasBreakdown = breakdown.labels.length > 0;
    
    return `
        <div class="hover:bg-slate-50/80 transition-all p-5 flex flex-col gap-3 border-b border-slate-100 last:border-b-0 cursor-pointer"
             onclick="openEditTaskModal('${t.id}')">
            
            <!-- Task Header -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center flex-wrap gap-2 mb-1.5">
                        <span class="text-xs font-black px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 font-mono">${t.id}</span>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wider">${escapeHtml(client)}</span>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100/50 uppercase tracking-wider">${escapeHtml(t.status)}</span>
                        ${isManual ? `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100/40">Manual</span>` : ''}
                    </div>
                    
                    <!-- Task Title with Breakdown -->
                    <h5 class="text-sm font-bold text-slate-900 leading-snug">
                        ${escapeHtml(breakdown.title)}
                        ${hasBreakdown ? `<span class="text-slate-500 font-normal"> ${breakdown.breakdown}</span>` : ''}
                    </h5>
                </div>
                
                <div class="flex items-center gap-6 text-xs text-slate-500 font-medium">
                    <div class="flex flex-col gap-0.5 md:items-end">
                        <span class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Assignee</span>
                        <span class="font-bold text-slate-800">${escapeHtml(assName)}</span>
                    </div>
                    <div class="flex flex-col gap-0.5 md:items-end">
                        <span class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Finished</span>
                        <span class="font-semibold text-slate-600">${taskDate}</span>
                    </div>
                    <button onclick="event.stopPropagation(); openEditTaskModal('${t.id}')"
                            class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                        <iconify-icon icon="solar:pen-linear" width="16"></iconify-icon>
                    </button>
                </div>
            </div>
            
            <!-- NEW: Breakdown Details (if Sneha worked on it) -->
            ${hasBreakdown ? `
                <div class="mt-2 pt-2 border-t border-slate-100">
                    <div class="flex flex-wrap gap-1.5">
                        ${breakdown.labels.map(label => `
                            <span class="text-[9px] font-bold px-2 py-0.5 rounded bg-violet-50 text-violet-600 border border-violet-100/50">
                                ${escapeHtml(label)}
                            </span>
                        `).join('')}
                    </div>
                    <p class="text-[9px] text-slate-400 font-semibold mt-1">Category: ${breakdown.category}</p>
                </div>
            ` : ''}
        </div>
    `;
}).join('');
```

## Part 3: Today's Completed Popup Enhancement

In the "Today's Completed Tasks" popup (typically shown at 5:30 PM):

```javascript
// Format each task with breakdown
const taskDisplay = t => {
    const breakdown = formatSnehaTaskBreakdown(t);
    return breakdown.breakdown 
        ? `${breakdown.title} ${breakdown.breakdown}`
        : breakdown.title;
};

// In the popup rendering:
const completedTasksHtml = completedTasks.map(t => `
    <div class="mb-3 p-3 bg-slate-50 rounded-lg">
        <p class="text-xs font-bold text-slate-900">✓ ${escapeHtml(taskDisplay(t))}</p>
        <p class="text-[9px] text-slate-500 mt-1">${t.client || 'Other'} • ${t.status || 'Complete'}</p>
    </div>
`).join('');
```

## Part 4: Integration Points

### 1. Firebase Data Loading
Ensure you're loading:
- `globalSnehaSelections` - from `worksync/sneha_work_selections`
- `allQcReports` - from `worksync/qc_reports`
- `tasks` - from `worksync/tasks`

```javascript
// These should already exist, verify they're populated
onValue(ref(db, 'worksync/sneha_work_selections'), snap => {
    globalSnehaSelections = Object.values(snap.val() || {});
    if (activeTasksTab === 'completed') renderCompletedTasksHub();
});

onValue(ref(db, 'worksync/qc_reports'), snap => {
    allQcReports = Object.values(snap.val() || {});
    if (activeTasksTab === 'completed') renderCompletedTasksHub();
});
```

### 2. Export Functions
Make functions available globally:
```javascript
window.formatSnehaTaskBreakdown = formatSnehaTaskBreakdown;
window.getSnehaTaskLabels = getSnehaTaskLabels;
window.renderTaskBreakdownBadges = renderTaskBreakdownBadges;
window.renderTaskBreakdownCard = renderTaskBreakdownCard;
```

## Part 5: CSS Styling (Optional - for better appearance)

Add to your style section if needed:
```css
/* Sneha's breakdown styling */
.task-breakdown-section {
    background: #f5f3ff;
    border: 1px solid #ede9fe;
    padding: 0.75rem;
    border-radius: 0.5rem;
    margin-top: 0.5rem;
}

.breakdown-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    background: #f5f3ff;
    color: #7c3aed;
    padding: 0.25rem 0.625rem;
    border-radius: 0.375rem;
    font-size: 0.625rem;
    font-weight: 700;
    border: 1px solid #ede9fe;
}

.breakdown-badge:hover {
    background: #ede9fe;
    color: #6d28d9;
}

/* Dark mode */
html.dark .task-breakdown-section {
    background: rgba(124, 58, 237, 0.1);
    border-color: rgba(124, 58, 237, 0.2);
}

html.dark .breakdown-badge {
    background: rgba(124, 58, 237, 0.1);
    color: #a78bfa;
    border-color: rgba(124, 58, 237, 0.2);
}

html.dark .breakdown-badge:hover {
    background: rgba(124, 58, 237, 0.15);
    color: #c4b5fd;
}
```

## Testing Checklist

- [ ] `getSnehaTaskIds()` returns correct task IDs
- [ ] `getSnehaTaskLabels(t)` returns correct labels
- [ ] `formatSnehaTaskBreakdown(t)` formats correctly
- [ ] Breakdown displays in completed tasks list
- [ ] Breakdown displays in Today's Completed popup
- [ ] Labels show in correct colors (violet)
- [ ] Category shows correctly (Content Work, QC Review, Internal)
- [ ] Click on task opens editor modal
- [ ] Mobile responsive (stacked on small screens)
- [ ] Dark mode colors apply correctly
- [ ] Firebase data loads correctly
- [ ] Works for multiple content items (Poster, Captions, Video)

---
**Implementation Difficulty**: Medium  
**Time to Implement**: 30-45 minutes  
**Files to Modify**: index.html (JavaScript section)
