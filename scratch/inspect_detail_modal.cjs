const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const qcDetailIdx = htmlContent.indexOf('id="qcReportDetailModal"');
if (qcDetailIdx !== -1) {
    console.log(htmlContent.substring(qcDetailIdx, qcDetailIdx + 800));
}
