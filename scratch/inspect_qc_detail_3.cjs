const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const qcIdx = htmlContent.indexOf('id="view-qc-panel"');
if (qcIdx !== -1) {
    console.log('--- view-qc-panel HTML (part 3) ---');
    console.log(htmlContent.substring(qcIdx + 10000, qcIdx + 16000));
}
