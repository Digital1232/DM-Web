const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../index.html');
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

console.log('Lines 15615 to 15725 snippet:');
for (let i = 15615; i < 15655; i++) {
    console.log(`${i+1}: ${lines[i]}`);
}
