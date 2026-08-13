const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const lines = htmlContent.split('\n');
console.log('Lines 12940 to 13000 of index.html:');
for (let i = 12939; i < Math.min(lines.length, 13000); i++) {
    console.log(`${i + 1}: ${lines[i].substring(0, 120)}`);
}
