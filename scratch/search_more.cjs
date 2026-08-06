const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8').split('\n');

function findMatches(term) {
    console.log(`\n=== SEARCH: ${term} ===`);
    for (let i = 0; i < content.length; i++) {
        if (content[i].includes(term)) {
            console.log(`Line ${i + 1}: ${content[i].trim()}`);
        }
    }
}

findMatches('openAddTaskModal');
findMatches('handleMtContentTypeChange');
findMatches('mt-content-type');
findMatches('mt-space');
findMatches('handleMtPostDateChange');
findMatches('video-thumb-preview');
