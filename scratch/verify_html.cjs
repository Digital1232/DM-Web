const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

console.log('HTML Total length:', htmlContent.length);

const dialogsOpen = (htmlContent.match(/<dialog/g) || []).length;
const dialogsClose = (htmlContent.match(/<\/dialog>/g) || []).length;
console.log('Dialogs open:', dialogsOpen, 'close:', dialogsClose);

const divOpen = (htmlContent.match(/<div/g) || []).length;
const divClose = (htmlContent.match(/<\/div>/g) || []).length;
console.log('Divs open:', divOpen, 'close:', divClose);

const hasModal = htmlContent.includes('id="clientQcMistakeModal"');
console.log('clientQcMistakeModal present:', hasModal);

const hasInspectorSection = htmlContent.includes('id="qc-inspector-performance-container"');
console.log('qc-inspector-performance-container present:', hasInspectorSection);

const hasMistakesLog = htmlContent.includes('id="client-qc-mistakes-container"');
console.log('client-qc-mistakes-container present:', hasMistakesLog);
