const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

function findMatches(term) {
    console.log(`\n=== SEARCH: "${term}" ===`);
    const regex = new RegExp(`.{0,50}${term}.{0,50}`, 'gi');
    let match;
    let count = 0;
    while ((match = regex.exec(content)) !== null && count < 15) {
        const line = content.substring(0, match.index).split('\n').length;
        console.log(`Line ${line}: ...${match[0].replace(/\n/g, ' ')}...`);
        count++;
    }
    console.log(`Total found: ${count}`);
}

findMatches('Content Type');
findMatches('Work Task');
findMatches('subtask');
findMatches('Caption');
