const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const lines = htmlContent.split('\n');
console.log('Total HTML lines:', lines.length);

lines.forEach((line, idx) => {
    if (line.includes('function loadQcReports()')) {
        console.log(`index.html Line ${idx + 1}: ${line.substring(0, 100)}`);
    }
    if (line.includes('function openClientQcMistakeModal')) {
        console.log(`index.html Line ${idx + 1}: ${line.substring(0, 100)}`);
    }
});
