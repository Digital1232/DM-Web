const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Search for existing modals
const modalMatches = [];
const regex = /id="([a-zA-Z0-9_-]*Modal[a-zA-Z0-9_-]*)"/g;
let match;
while ((match = regex.exec(htmlContent)) !== null) {
    modalMatches.push(match[1]);
}
console.log('Modals in index.html:', modalMatches);

// Find location of qcReportDetailModal
const qcModalIdx = htmlContent.indexOf('id="qcReportDetailModal"');
if (qcModalIdx !== -1) {
    console.log('Found qcReportDetailModal around index:', qcModalIdx);
    console.log(htmlContent.substring(qcModalIdx - 200, qcModalIdx + 500));
}
