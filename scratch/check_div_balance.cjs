const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Find all <div> and </div> occurrences and check line numbers
const lines = htmlContent.split('\n');
let openCount = 0;
let closeCount = 0;

lines.forEach((line, idx) => {
    const open = (line.match(/<div/g) || []).length;
    const close = (line.match(/<\/div>/g) || []).length;
    openCount += open;
    closeCount += close;
});

console.log('Total Open Divs:', openCount);
console.log('Total Close Divs:', closeCount);
