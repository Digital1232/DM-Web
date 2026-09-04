# 🧪 Quick Test - Sneha's Task Breakdown

## Test It Right Now (2 minutes)

### Step 1: Open Browser Console
- Press **F12** (or right-click → Inspect)
- Go to **Console** tab

### Step 2: Trigger the Popup
Copy and paste this:
```javascript
showFiveThirtyTaskPopup(true)
```

### Step 3: Look for Breakdown
In the popup, you should see tasks like:

```
JIRA-456: Alumni Registration Poster [ Poster Content, Captions ] • Content Work
```

---

## ✅ What You're Looking For

### Format Check ✓
- [ ] Task ID shown (JIRA-123)
- [ ] Task title shown
- [ ] Items in brackets: `[ Item1, Item2 ]`
- [ ] Category after: `• Content Work`
- [ ] Status badge shown

### Color Check ✓
- [ ] Breakdown text is **purple**
- [ ] Category text is **gray**
- [ ] Other elements styled correctly

### Content Check ✓
- [ ] Poster Content (if selected)
- [ ] Captions (if selected)
- [ ] Video Thumbnail (if selected)
- [ ] QC Reviewed (if QC done)
- [ ] Internal (if internal task)

---

## 📋 Expected Output

### When You Run the Command

Popup should appear with something like:

```
┌─────────────────────────────────────────────────────┐
│ ✅ Today's Completed Tasks                          │
│ Grouped by client — 17:30 daily summary     [✕]    │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ALUMNI ASSOCIATION [1 task]                        │
│                                                     │
│  ✓ JIRA-456: Alumni Registration Poster            │
│    [ Poster Content, Captions ] • Content Work     │
│    ✓ Done                                           │
│                                                     │
│ TECH STARTUP [1 task]                              │
│                                                     │
│  ✓ JIRA-457: Video Production                      │
│    [ Video Thumbnail ] • Content Work              │
│    ✓ Done                                           │
│                                                     │
├─────────────────────────────────────────────────────┤
│                            [Close]                  │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 Test Scenarios

### Scenario 1: Sneha with Content Work
**Expected**: Shows `[ Poster Content, Captions ]` with purple color

### Scenario 2: Sneha with Video
**Expected**: Shows `[ Video Thumbnail ]` with purple color

### Scenario 3: Sneha with QC Review
**Expected**: Shows `[ QC Reviewed ]` with purple color

### Scenario 4: Admin Viewing All
**Expected**: Shows all users and their tasks with breakdowns

### Scenario 5: Non-Admin Viewing Own Tasks
**Expected**: Shows only their own tasks with breakdowns

---

## 🔍 Debug Commands

If something looks wrong, try these in console:

```javascript
// Check if functions exist
typeof getSnehaTaskLabels
// Should return: "function"

typeof formatTaskBreakdown  
// Should return: "function"

// Check if data is loaded
console.log('Sneha selections:', snehaSelections)
console.log('QC reports:', qcReports)

// Test a specific task
const testTask = tasks.find(t => t.id === 'JIRA-456');
console.log('Test task:', testTask);
const breakdown = formatTaskBreakdown('JIRA-456', testTask, snehaSelections, qcReports);
console.log('Breakdown:', breakdown);
// Should show: { breakdown: "[ ... ]", category: "...", labels: [...] }

// Trigger popup
showFiveThirtyTaskPopup(true)
```

---

## ✅ Success Indicators

**You're good if**:
1. ✅ Popup opens without errors
2. ✅ Tasks display with breakdown in brackets
3. ✅ Breakdown is purple colored
4. ✅ Category shows in gray
5. ✅ No console errors

**Red flags**:
- ❌ Popup doesn't open
- ❌ Breakdown doesn't show
- ❌ Breakdown text is wrong color
- ❌ Console shows errors

---

## 🆘 If It Doesn't Work

### Problem: Popup doesn't open
**Solution**:
1. Check console for errors: `Uncaught ...`
2. Verify functions exist: `typeof showFiveThirtyTaskPopup`
3. Try: `document.getElementById('fiveThirtyPopup').showModal()`

### Problem: Breakdown not showing
**Solution**:
1. Check if `snehaSelections` is populated
2. Verify tasks have `status === 'Done'` or similar
3. Confirm Sneha made selections for tasks

### Problem: Wrong formatting
**Solution**:
1. Check `formatTaskBreakdown()` output
2. Verify bracket formatting
3. Check category logic

### Problem: Colors wrong
**Solution**:
1. Check CSS classes applied
2. Verify `text-purple-600` for breakdown
3. Verify `text-slate-500` for category

---

## 📞 Need Help?

### Console Command Reference

```javascript
// Open popup manually
showFiveThirtyTaskPopup(true)

// Check data
console.log(snehaSelections)      // Sneha's work selections
console.log(qcReports)            // QC reviews
console.log(tasks)                // All tasks

// Test functions
getSnehaTaskLabels('JIRA-456', snehaSelections, qcReports)
formatTaskBreakdown('JIRA-456', tasks[0], snehaSelections, qcReports)

// Check if task is in database
tasks.find(t => t.id === 'JIRA-456')

// Filter today's completed
tasks.filter(t => t.status === 'Done').slice(0, 5)
```

---

## 🎯 Full Test Checklist

- [ ] Browser console open
- [ ] Command pasted: `showFiveThirtyTaskPopup(true)`
- [ ] Popup appeared
- [ ] Tasks displaying
- [ ] Breakdown visible (purple brackets)
- [ ] Category visible (gray text)
- [ ] No console errors
- [ ] Items correct
- [ ] Color correct
- [ ] Status badge showing

---

## ⏱️ Expected Time
- **Test trigger**: 30 seconds
- **Verify display**: 1 minute
- **Check details**: 30 seconds
- **Total**: ~2 minutes

---

## 📝 Report Results

After testing, check:
- [ ] Is breakdown showing?
- [ ] Are items correct?
- [ ] Are colors right?
- [ ] Any errors?

---

## 🚀 Once Confirmed Working

Share with Sneha:
> "Check the Today's Completed Tasks popup at 5:30 PM to see what you worked on today with breakdown of content items!"

---

**Last Updated**: July 14, 2026  
**Status**: Ready to Test  
**Command**: `showFiveThirtyTaskPopup(true)`  
**Expected Time**: 2 minutes  

---

**Ready? Press F12 and paste the command! 🎯**
