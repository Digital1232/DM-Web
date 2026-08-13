const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const modalIdx = htmlContent.indexOf('id="clientQcMistakeModal"');
if (modalIdx !== -1) {
    console.log(htmlContent.substring(modalIdx, modalIdx + 700));
}
