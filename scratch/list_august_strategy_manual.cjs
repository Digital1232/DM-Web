const https = require('https');

const DB = 'https://worksync-vilpower-default-rtdb.firebaseio.com';

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
        }).on('error', reject);
    });
}

(async () => {
    console.log('\n=== SCANNING FIREBASE FOR AUGUST MANUAL TASKS (Strategy Calendar) ===\n');

    // 1. Check strategy_events for August
    const stratEvents = await fetchJson(`${DB}/worksync/strategy_events.json`);
    const augStratEvents = [];
    if (stratEvents && typeof stratEvents === 'object') {
        for (const [id, ev] of Object.entries(stratEvents)) {
            if (ev && ev.date && ev.date.startsWith('2026-08')) {
                augStratEvents.push({ id, title: ev.title, date: ev.date, client: ev.client, jiraId: ev.jiraId || ev.jiraTaskId || '' });
            }
        }
    }
    console.log(`Strategy Events (August 2026): ${augStratEvents.length}`);
    if (augStratEvents.length > 0) {
        augStratEvents.forEach(e => console.log(`  [${e.date}] ${e.id} | "${e.title}" | client: ${e.client || 'none'} | jira: ${e.jiraId || 'none'}`));
    }

    // 2. Check manual_tasks for August due dates
    const manualRoot = await fetchJson(`${DB}/worksync/manual_tasks.json`);
    const augManualTasks = [];
    if (manualRoot && typeof manualRoot === 'object') {
        for (const [userKey, userTasks] of Object.entries(manualRoot)) {
            if (!userTasks || typeof userTasks !== 'object') continue;
            for (const [taskId, task] of Object.entries(userTasks)) {
                const due = task.duedate || task.due || task.date || '';
                if (due.startsWith('2026-08')) {
                    // Only strategy-type tasks: those with strategyEvent flag or STRAT- prefix
                    const isStrategyTask = task.strategyEvent || task.isStrategyTask || taskId.startsWith('STRAT-') || task.type === 'strategy';
                    if (isStrategyTask) {
                        augManualTasks.push({ userKey, taskId, title: task.desc || task.title || taskId, date: due, client: task.client || 'none' });
                    }
                }
            }
        }
    }
    console.log(`\nManual Strategy Tasks (August 2026): ${augManualTasks.length}`);
    if (augManualTasks.length > 0) {
        augManualTasks.forEach(t => console.log(`  [${t.date}] ${t.taskId} | "${t.title}" | client: ${t.client} | user: ${t.userKey}`));
    }

    console.log('\n--- SUMMARY ---');
    console.log(`Total to delete: ${augStratEvents.length + augManualTasks.length} items`);
    console.log('  strategy_events :', augStratEvents.length);
    console.log('  manual_tasks    :', augManualTasks.length);

    // Save IDs for the delete script
    const fs = require('fs');
    fs.writeFileSync('./scratch/_aug_delete_targets.json', JSON.stringify({ augStratEvents, augManualTasks }, null, 2));
    console.log('\nTargets saved to scratch/_aug_delete_targets.json');
})();
