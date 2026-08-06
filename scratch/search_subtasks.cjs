const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

function findFn(name) {
    console.log(`\n=== FUNCTION / TERM: ${name} ===`);
    const regex = new RegExp(`.{0,100}${name}.{0,200}`, 'gi');
    let match;
    let count = 0;
    while ((match = regex.exec(content)) !== null && count < 10) {
        const line = content.substring(0, match.index).split('\n').length;
        console.log(`Line ${line}:\n${match[0].replace(/\n/g, ' ')}\n`);
        count++;
    }
}

findFn('submitManualTask');
findFn('handleMtContentTypeChange');
findFn('mt-caption');
findFn('et-caption');
findFn('auto-subtask');
findFn('autoSubtask');
findFn('subtasks');
