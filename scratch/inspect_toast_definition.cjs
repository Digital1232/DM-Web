const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const lines = htmlContent.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('id="toast"') || line.includes('class="toast') || line.includes('#toast')) {
        console.log(`index.html Line ${idx + 1}: ${line.trim().substring(0, 140)}`);
    }
});

const scriptPath = path.join(__dirname, '..', 'script.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');
const scriptLines = scriptContent.split('\n');
scriptLines.forEach((line, idx) => {
    if (line.includes('function toast(') || line.includes('const toast =')) {
        console.log(`script.js Line ${idx + 1}: ${line.trim().substring(0, 140)}`);
    }
});
