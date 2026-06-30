const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');

for (let i = 20745; i < 20800; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
}
