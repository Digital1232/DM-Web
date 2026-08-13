const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const toastCssIdx = htmlContent.indexOf('.toast, #toast, #toast:popover-open');
if (toastCssIdx !== -1) {
    console.log(htmlContent.substring(toastCssIdx, toastCssIdx + 500));
}
