const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const matches = [];
const lines = htmlContent.split('\n');

lines.forEach((line, idx) => {
    if (line.includes('Task Moved to Design Completed') || line.includes('Quality Check Passed!')) {
        console.log(`Line ${idx + 1}: ${line.trim().substring(0, 140)}`);
    }
});

// Also search around line index
const targetIdx = htmlContent.indexOf('Task Moved to Design Completed');
if (targetIdx !== -1) {
    console.log('--- HTML Snippet around Task Moved to Design Completed ---');
    console.log(htmlContent.substring(targetIdx - 300, targetIdx + 500));
}
