const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const lines = htmlContent.split('\n');
for (let i = 38845; i < 38885; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
}
