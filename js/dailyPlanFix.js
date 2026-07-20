// Daily Plan Fix - Verify all functions are globally available
// This file is loaded AFTER index.html to ensure all functions are properly defined

console.log('[Daily Plan Fix] Verifying Daily Plan functions...');

setTimeout(() => {
    // Verify functions are available
    const requiredFunctions = [
        'addTaskToApSelection',
        'removeTaskFromApSelection',
        'renderApSelectedTasks',
        'updateDpUserLabel',
        'handleDpUserCheckChange'
    ];

    const missingFunctions = [];
    requiredFunctions.forEach(fn => {
        if (typeof window[fn] !== 'function') {
            missingFunctions.push(fn);
            console.warn(`[Daily Plan Fix] WARNING: ${fn} is not defined on window object`);
        }
    });

    if (missingFunctions.length === 0) {
        console.log('[Daily Plan Fix] ✅ All Daily Plan functions are properly loaded');
        console.log('[Daily Plan Fix] Ready to add tasks to Daily Plan');
    } else {
        console.error('[Daily Plan Fix] ❌ Missing functions:', missingFunctions);
    }

    // Log the availability
    console.log('[Daily Plan Fix] Function availability:');
    requiredFunctions.forEach(fn => {
        console.log(`  - ${fn}: ${typeof window[fn]}`);
    });
}, 100);
