const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
    if (line.includes('modal') && (line.includes('task') || line.includes('Task'))) {
        console.log(`L${idx + 1}: ${line.trim().substring(0, 140)}`);
    }
});
