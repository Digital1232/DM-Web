const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, '..', 'script.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

const lines = scriptContent.split('\n');
console.log('Total script lines:', lines.length);

// Find loadQcReports line
lines.forEach((line, idx) => {
    if (line.includes('function loadQcReports()')) {
        console.log('loadQcReports at line:', idx + 1);
    }
    if (line.includes('window.loadQcReports = loadQcReports')) {
        console.log('window exports at line:', idx + 1);
    }
});
