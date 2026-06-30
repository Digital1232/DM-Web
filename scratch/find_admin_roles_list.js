const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const ADMIN_ROLES =') || lines[i].includes('const ADMIN_EMAILS =')) {
        console.log(`ADMIN list found at line ${i + 1}: ${lines[i]}`);
    }
}
