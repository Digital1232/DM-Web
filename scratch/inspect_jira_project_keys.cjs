const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const filesToSearch = ['script.js', 'config.js', 'index.html'];

filesToSearch.forEach(filename => {
    const filePath = path.join(rootDir, filename);
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
        if (line.includes('JULY') || line.includes('July') || line.includes('projectKey') || line.includes('PROJECT_KEYS') || line.includes('jiraKeys')) {
            console.log(`${filename} Line ${idx + 1}: ${line.trim().substring(0, 140)}`);
        }
    });
});
