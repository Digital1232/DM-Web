const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Find view-qc-panel in index.html
const qcIdx = htmlContent.indexOf('id="view-qc-panel"');
if (qcIdx !== -1) {
    console.log('--- view-qc-panel HTML (first 3000 chars) ---');
    console.log(htmlContent.substring(qcIdx - 100, qcIdx + 4000));
} else {
    console.log('view-qc-panel not found');
}
