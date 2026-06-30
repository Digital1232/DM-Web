const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');

const results = [];
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('updateTaskStatus') || lines[i].includes('changeTaskStatus') || lines[i].includes('moveTask')) {
        results.push({ line: i + 1, content: lines[i].trim() });
    }
}

console.log(`Found ${results.length} matches:`);
results.forEach(r => console.log(`${r.line}: ${r.content}`));
