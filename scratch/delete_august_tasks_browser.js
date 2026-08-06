// =====================================================================
// PASTE THIS ENTIRE SCRIPT INTO YOUR BROWSER CONSOLE
// while logged in on the WorkSync app (Strategy Calendar page)
// =====================================================================
// It will:
//  1. SCAN all strategy_events with August 2026 dates
//  2. SCAN all manual_tasks with August 2026 due dates
//  3. LIST them clearly so you can review
//  4. Ask for your confirmation
//  5. DELETE them all from Firebase
// =====================================================================

(async () => {
    const { ref, remove, get } = window.__firebaseRtdb || {};

    // Try to get Firebase refs from the app's context
    const dbRef = (path) => {
        if (typeof ref === 'function' && window.db) return ref(window.db, path);
        throw new Error('Firebase db not found in window. Make sure you are on the WorkSync app page.');
    };

    const getVal = async (path) => {
        const snap = await get(dbRef(path));
        return snap.val();
    };

    console.log('%c=== AUGUST 2026 CLEANUP SCRIPT ===', 'color:orange;font-weight:bold;font-size:14px');

    // ── 1. Strategy Events ─────────────────────────────────────────────
    const stratData = await getVal('worksync/strategy_events');
    const augStratEvents = [];
    if (stratData) {
        for (const [id, ev] of Object.entries(stratData)) {
            if (ev?.date?.startsWith('2026-08')) {
                augStratEvents.push({ id, title: ev.title, date: ev.date, client: ev.client });
            }
        }
    }

    // ── 2. Manual Tasks ────────────────────────────────────────────────
    const manualRoot = await getVal('worksync/manual_tasks');
    const augManualTasks = [];
    if (manualRoot) {
        for (const [userKey, userTasks] of Object.entries(manualRoot)) {
            if (!userTasks || typeof userTasks !== 'object') continue;
            for (const [taskId, task] of Object.entries(userTasks)) {
                const due = task.duedate || task.due || task.date || '';
                if (due.startsWith('2026-08')) {
                    augManualTasks.push({ userKey, taskId, title: task.desc || task.title || taskId, date: due, client: task.client || '' });
                }
            }
        }
    }

    // ── 3. Print findings ──────────────────────────────────────────────
    console.log(`\n📅 Strategy Events in August: ${augStratEvents.length}`);
    augStratEvents.forEach(e => console.log(`   [${e.date}] ${e.id} | "${e.title}" | client:${e.client}`));

    console.log(`\n📋 Manual Tasks in August: ${augManualTasks.length}`);
    augManualTasks.forEach(t => console.log(`   [${t.date}] ${t.taskId} | "${t.title}" | client:${t.client} | user:${t.userKey}`));

    const total = augStratEvents.length + augManualTasks.length;
    console.log(`\n%cTotal items to delete: ${total}`, 'color:red;font-weight:bold');

    if (total === 0) {
        console.log('%cNothing to delete. All clear!', 'color:green;font-weight:bold');
        return;
    }

    // ── 4. Confirm ─────────────────────────────────────────────────────
    const confirmed = confirm(
        `⚠️ ABOUT TO DELETE ${total} ITEMS from August 2026:\n` +
        `  • ${augStratEvents.length} strategy event(s)\n` +
        `  • ${augManualTasks.length} manual task(s)\n\n` +
        `This CANNOT be undone. Proceed?`
    );

    if (!confirmed) {
        console.log('%cCancelled. Nothing was deleted.', 'color:green;font-weight:bold');
        return;
    }

    // ── 5. Delete ──────────────────────────────────────────────────────
    let deleted = 0, failed = 0;

    for (const ev of augStratEvents) {
        try {
            await remove(dbRef(`worksync/strategy_events/${ev.id}`));
            console.log(`✅ Deleted strategy event: ${ev.id} "${ev.title}"`);
            deleted++;
        } catch (e) {
            console.error(`❌ Failed strategy event ${ev.id}:`, e.message);
            failed++;
        }
    }

    for (const t of augManualTasks) {
        try {
            await remove(dbRef(`worksync/manual_tasks/${t.userKey}/${t.taskId}`));
            console.log(`✅ Deleted manual task: ${t.taskId} "${t.title}"`);
            deleted++;
        } catch (e) {
            console.error(`❌ Failed manual task ${t.taskId}:`, e.message);
            failed++;
        }
    }

    console.log(`\n%c=== DONE: ${deleted} deleted, ${failed} failed ===`, 'color:lime;font-weight:bold;font-size:14px');

    // Refresh the strategy calendar if it's open
    if (typeof renderStrategyCalendar === 'function') renderStrategyCalendar();
    if (typeof renderStrategySidebar === 'function') renderStrategySidebar();
    if (typeof renderTasks === 'function') renderTasks();
    if (typeof updateStats === 'function') updateStats();
})();
