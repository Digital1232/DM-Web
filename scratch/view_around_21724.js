const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');

for (let i = 21700; i < 21740; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
}
