const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

const selectIdx = htmlContent.indexOf('id="qc-task-select"');
if (selectIdx !== -1) {
    console.log('Snippet around qc-task-select:');
    console.log(htmlContent.substring(selectIdx - 50, selectIdx + 300));
}
