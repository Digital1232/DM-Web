// Daily Plan Fix - Verify all functions are globally available
// This file is loaded AFTER index.html to ensure all functions are properly defined

console.log('[Daily Plan Fix] Verifying Daily Plan functions...');

const requiredFunctions = [
    'addTaskToApSelection',
    'removeTaskFromApSelection',
    'renderApSelectedTasks',
    'updateDpUserLabel',
    'handleDpUserCheckChange'
];

let attempts = 0;
const maxAttempts = 50; // 50 * 200ms = 10 seconds max wait time

const checkInterval = setInterval(() => {
    attempts++;
    const missingFunctions = [];
    requiredFunctions.forEach(fn => {
        if (typeof window[fn] !== 'function') {
            missingFunctions.push(fn);
        }
    });

    if (missingFunctions.length === 0) {
        clearInterval(checkInterval);
        console.log('[Daily Plan Fix] ✅ All Daily Plan functions are properly loaded after ' + (attempts * 200) + 'ms');
        console.log('[Daily Plan Fix] Ready to add tasks to Daily Plan');
    } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.error('[Daily Plan Fix] ❌ Missing functions after 10s:', missingFunctions);
        console.log('[Daily Plan Fix] Function availability:');
        requiredFunctions.forEach(fn => {
            console.log(`  - ${fn}: ${typeof window[fn]}`);
        });
    }
}, 200);
