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
    console.log('\n=== ALL AUGUST 2026 MANUAL TASKS (ALL USERS) ===\n');

    const manualRoot = await fetchJson(`${DB}/worksync/manual_tasks.json`);
    const found = [];

    if (manualRoot && typeof manualRoot === 'object') {
        for (const [userKey, userTasks] of Object.entries(manualRoot)) {
            if (!userTasks || typeof userTasks !== 'object') continue;
            for (const [taskId, task] of Object.entries(userTasks)) {
                const due = task.duedate || task.due || task.date || '';
                if (due.startsWith('2026-08') || due.startsWith('08/') ) {
                    found.push({
                        userKey,
                        taskId,
                        title: task.desc || task.title || task.summary || taskId,
                        date: due,
                        client: task.client || '',
                        status: task.status || '',
                        type: task.type || (task.manual ? 'manual' : ''),
                        strategyEvent: task.strategyEvent || false
                    });
                }
            }
        }
    }

    console.log(`Total August manual tasks: ${found.length}`);
    found.forEach((t, i) => {
        console.log(`\n[${i+1}] taskId  : ${t.taskId}`);
        console.log(`     userKey : ${t.userKey}`);
        console.log(`     title   : ${t.title}`);
        console.log(`     date    : ${t.date}`);
        console.log(`     client  : ${t.client}`);
        console.log(`     status  : ${t.status}`);
        console.log(`     type    : ${t.type}`);
        console.log(`     strategy: ${t.strategyEvent}`);
    });

    const fs = require('fs');
    fs.writeFileSync('./scratch/_aug_all_manual.json', JSON.stringify(found, null, 2));
    console.log('\n\nSaved to scratch/_aug_all_manual.json');
})();
