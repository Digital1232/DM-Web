const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const scriptTagRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;
while ((match = scriptTagRegex.exec(htmlContent)) !== null) {
    count++;
    const fullTag = match[0];
    if (fullTag.includes('script.js') || fullTag.length < 300) {
        console.log(`Script ${count}:`, fullTag.substring(0, 200).replace(/\n/g, ' '));
    } else {
        console.log(`Script ${count}: Inline script of length ${fullTag.length}`);
    }
}
