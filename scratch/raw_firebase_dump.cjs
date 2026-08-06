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
    console.log('\n=== RAW FIREBASE SNAPSHOT ===\n');

    // Check top-level worksync keys
    const root = await fetchJson(`${DB}/worksync.json?shallow=true`);
    console.log('Top-level worksync keys:', JSON.stringify(root, null, 2));

    // Check strategy_events
    const strat = await fetchJson(`${DB}/worksync/strategy_events.json`);
    console.log('\nStrategy events count:', strat ? Object.keys(strat).length : 0);
    if (strat) {
        for (const [id, ev] of Object.entries(strat)) {
            console.log(`  [${id}] date=${ev.date} title="${ev.title}" client="${ev.client}"`);
        }
    }

    // Check manual_tasks top level keys
    const manualShallow = await fetchJson(`${DB}/worksync/manual_tasks.json?shallow=true`);
    console.log('\nManual tasks user keys:', JSON.stringify(manualShallow, null, 2));

    if (manualShallow && typeof manualShallow === 'object') {
        for (const userKey of Object.keys(manualShallow)) {
            const userTasks = await fetchJson(`${DB}/worksync/manual_tasks/${userKey}.json`);
            if (!userTasks) continue;
            const taskList = Object.entries(userTasks);
            console.log(`\nUser [${userKey}]: ${taskList.length} tasks`);
            // Show sample dates
            taskList.slice(0, 5).forEach(([tid, t]) => {
                const due = t.duedate || t.due || t.date || 'no-date';
                console.log(`   ${tid} | due=${due} | "${t.desc || t.title || ''}"`);
            });
            if (taskList.length > 5) console.log(`   ... and ${taskList.length - 5} more`);
        }
    }
})();
