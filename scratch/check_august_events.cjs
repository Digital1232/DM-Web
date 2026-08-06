const https = require('https');

const url = 'https://worksync-vilpower-default-rtdb.firebaseio.com/worksync/strategy_events.json';

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (!json) {
                console.log('No strategy events found in DB.');
                return;
            }
            const keys = Object.keys(json);
            console.log(`Total strategy events in DB: ${keys.length}`);

            const augustEvents = [];
            for (const key of keys) {
                const ev = json[key];
                if (ev && ev.date && ev.date.startsWith('2026-08')) {
                    augustEvents.push({ id: key, title: ev.title, date: ev.date, client: ev.client });
                }
            }
            console.log(`August 2026 events count: ${augustEvents.length}`);
            console.log(JSON.stringify(augustEvents, null, 2));
        } catch (e) {
            console.error('Error parsing JSON:', e.message);
            console.log('Raw response:', data.substring(0, 200));
        }
    });
}).on('error', err => {
    console.error('Fetch error:', err.message);
});
