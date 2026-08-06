const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8').split('\n');

for (let i = 9670 - 1; i < 9750; i++) {
    console.log(`${i + 1}: ${content[i]}`);
}
