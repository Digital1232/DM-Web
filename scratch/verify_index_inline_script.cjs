const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const lines = htmlContent.split('\n');
console.log('Total HTML lines:', lines.length);

lines.forEach((line, idx) => {
    if (line.includes('function openClientQcMistakeModal') || line.includes('window.openClientQcMistakeModal')) {
        console.log(`Line ${idx + 1}: ${line.trim().substring(0, 120)}`);
    }
});
