const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const modalStart = htmlContent.indexOf('id="clientQcMistakeModal"');
const modalEnd = htmlContent.indexOf('</dialog>', modalStart);
const modalSnippet = htmlContent.substring(modalStart, modalEnd);

console.log('--- Entire clientQcMistakeModal snippet ---');
console.log(modalSnippet);
