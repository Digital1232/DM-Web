const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const filesToSearch = ['script.js', 'config.js', 'index.html', 'package.json'];

filesToSearch.forEach(filename => {
    const filePath = path.join(rootDir, filename);
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
        if (line.toLowerCase().includes('palanirajan') || line.includes('jiraRequest') || line.includes('gsUrl') || line.includes('JIRA.')) {
            if (line.toLowerCase().includes('palanirajan') || line.includes('gsUrl') || line.includes('Authorization') || line.includes('email') || line.includes('auth')) {
                console.log(`${filename} Line ${idx + 1}: ${line.trim().substring(0, 140)}`);
            }
        }
    });
});
