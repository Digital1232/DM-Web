const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8').split('\n');

function findLineNumbers(term) {
    console.log(`\n=== FIND: ${term} ===`);
    for (let i = 0; i < content.length; i++) {
        if (content[i].includes(term)) {
            console.log(`Line ${i + 1}: ${content[i]}`);
        }
    }
}

findLineNumbers('id="mt-caption"');
findLineNumbers('id="mt-content-type"');
findLineNumbers('id="et-caption-wrap"');
findLineNumbers('function toggleMtFields');
findLineNumbers('function openAddTaskModal');
findLineNumbers('function submitManualTask');
findLineNumbers('function editTaskModal');
