const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');

const query = 'Jira';
const results = [];
for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(query.toLowerCase())) {
        results.push({ line: i + 1, content: lines[i].trim() });
    }
}

console.log(`Found ${results.length} matches for "${query}":`);
results.slice(0, 100).forEach(r => {
    console.log(`${r.line}: ${r.content}`);
});
