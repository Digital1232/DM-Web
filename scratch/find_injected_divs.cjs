const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// 1. clientQcMistakeModal
const modalStart = htmlContent.indexOf('id="clientQcMistakeModal"');
const modalEnd = htmlContent.indexOf('</dialog>', modalStart);
const modalSnippet = htmlContent.substring(modalStart, modalEnd);
const modalOpen = (modalSnippet.match(/<div[\s>]/g) || []).length;
const modalClose = (modalSnippet.match(/<\/div>/g) || []).length;
console.log('Modal divs -> open:', modalOpen, 'close:', modalClose);

// 2. qc-inspector-performance-container
const inspectorStart = htmlContent.indexOf('id="qc-inspector-performance-container"');
const inspectorEnd = htmlContent.indexOf('id="client-qc-mistakes-container"');
const inspectorSnippet = htmlContent.substring(inspectorStart, inspectorEnd);
const inspectorOpen = (inspectorSnippet.match(/<div[\s>]/g) || []).length;
const inspectorClose = (inspectorSnippet.match(/<\/div>/g) || []).length;
console.log('Inspector divs -> open:', inspectorOpen, 'close:', inspectorClose);

// 3. client-qc-mistakes-container
const mistakesStart = htmlContent.indexOf('id="client-qc-mistakes-container"');
const mistakesEnd = htmlContent.indexOf('id="qc-reports-container"');
const mistakesSnippet = htmlContent.substring(mistakesStart, mistakesEnd);
const mistakesOpen = (mistakesSnippet.match(/<div[\s>]/g) || []).length;
const mistakesClose = (mistakesSnippet.match(/<\/div>/g) || []).length;
console.log('Mistakes divs -> open:', mistakesOpen, 'close:', mistakesClose);
