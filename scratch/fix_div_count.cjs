const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const openCount = (htmlContent.match(/<div[\s>]/g) || []).length;
const closeCount = (htmlContent.match(/<\/div>/g) || []).length;

console.log('Open divs:', openCount, 'Close divs:', closeCount);
