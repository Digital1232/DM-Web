const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8').split('\n');

for (let i = 9885 - 1; i < 9925; i++) {
    console.log(`${i + 1}: ${content[i]}`);
}
