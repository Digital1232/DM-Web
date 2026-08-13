const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const lines = htmlContent.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('clientQcMistakeModal')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
