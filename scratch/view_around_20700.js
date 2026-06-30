const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');

for (let i = 20680; i < 20735; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
}
