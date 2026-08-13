const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const lines = htmlContent.split('\n');
let openCount = 0;
let closeCount = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const open = (line.match(/<div[\s>]/g) || []).length;
    const close = (line.match(/<\/div>/g) || []).length;
    openCount += open;
    closeCount += close;
    if (closeCount > openCount + 1) {
        console.log(`Line ${i + 1}: open=${openCount}, close=${closeCount}`);
    }
}
console.log('Final open:', openCount, 'close:', closeCount);
