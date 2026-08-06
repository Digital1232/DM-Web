const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

function findMatches(term) {
    console.log(`\n=== SEARCH: "${term}" ===`);
    const regex = new RegExp(`.{0,60}${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.{0,60}`, 'gi');
    let match;
    let count = 0;
    while ((match = regex.exec(content)) !== null && count < 15) {
        const line = content.substring(0, match.index).split('\n').length;
        console.log(`Line ${line}: ...${match[0].replace(/\n/g, ' ')}...`);
        count++;
    }
}

findMatches('Content Type');
findMatches('Work Task');
findMatches('subtask');
findMatches('Caption');
findMatches('auto');
