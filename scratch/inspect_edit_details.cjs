const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8').split('\n');

for (let i = 36440 - 1; i < 36550; i++) {
    console.log(`${i + 1}: ${content[i]}`);
}
