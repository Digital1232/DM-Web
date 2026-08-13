const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const modalStart = htmlContent.indexOf('id="clientQcMistakeModal"');
const modalEnd = htmlContent.indexOf('</dialog>', modalStart);
const modalSnippet = htmlContent.substring(modalStart, modalEnd);

const lines = modalSnippet.split('\n');
let openTotal = 0;
let closeTotal = 0;

lines.forEach((line, idx) => {
    const open = (line.match(/<div[\s>]/g) || []).length;
    const close = (line.match(/<\/div>/g) || []).length;
    openTotal += open;
    closeTotal += close;
    console.log(`Line ${idx + 1}: open=${openTotal}, close=${closeTotal} | ${line.trim()}`);
});
