const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const lines = htmlContent.split('\n');
for (let i = 38840; i < Math.min(lines.length, 38980); i++) {
    console.log(`${i + 1}: ${lines[i].substring(0, 140)}`);
}
