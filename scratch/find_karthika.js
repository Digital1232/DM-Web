const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes('karthika') || lines[i].toLowerCase().includes('anithavilpower')) {
        console.log(`Line ${i + 1}: ${lines[i].trim()}`);
    }
}
