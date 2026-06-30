const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Karthika (anithavilpower) should only update')) {
        console.log(`Comment found at line ${i + 1}`);
        console.log("Lines around it:");
        for (let j = Math.max(0, i - 2); j < Math.min(lines.length, i + 18); j++) {
            console.log(`${j + 1}: ${lines[j]}`);
        }
        break;
    }
}
