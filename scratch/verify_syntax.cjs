const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;
let errors = 0;

while ((match = scriptRegex.exec(html)) !== null) {
    count++;
    const code = match[1];
    if (!code.trim() || match[0].includes('src=')) continue;
    try {
        new vm.Script(code);
    } catch (e) {
        console.error(`Script block ${count} syntax error:`, e.message);
        errors++;
    }
}

if (errors === 0) {
    console.log(`Successfully checked ${count} script tags. No syntax errors found.`);
} else {
    console.error(`Found ${errors} syntax errors.`);
    process.exit(1);
}
