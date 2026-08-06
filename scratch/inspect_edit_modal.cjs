const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8').split('\n');

function findFn(name) {
    console.log(`\n=== FUNCTION: ${name} ===`);
    for (let i = 0; i < content.length; i++) {
        if (content[i].includes(name)) {
            console.log(`Line ${i + 1}: ${content[i].trim()}`);
        }
    }
}

findFn('openEditTaskModal');
findFn('editTaskModal');
findFn('renderSubtasks');
findFn('toggleMtSubtasks');
