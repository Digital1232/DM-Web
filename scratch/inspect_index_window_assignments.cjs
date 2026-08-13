const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const lines = htmlContent.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('window.loadQcReports')) {
        console.log(`index.html Line ${idx + 1}: ${line.substring(0, 140)}`);
    }
});
