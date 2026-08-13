const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

['script.js', 'index.html'].forEach(filename => {
    const filePath = path.join(rootDir, filename);
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
        if (line.includes('bg-gradient') && (line.includes('header') || line.includes('Modal') || line.includes('title') || line.includes('theme') || line.includes('linear-gradient'))) {
            console.log(`${filename} Line ${idx + 1}: ${line.trim().substring(0, 140)}`);
        }
    });
});
