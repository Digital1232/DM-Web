const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8').split('\n');

console.log('=== openAddTaskModal ===');
for (let i = 35050 - 1; i < 35170; i++) {
    console.log(`${i + 1}: ${content[i]}`);
}

console.log('\n=== handleMtContentTypeChange & related ===');
for (let i = 35480 - 1; i < 35550; i++) {
    console.log(`${i + 1}: ${content[i]}`);
}
