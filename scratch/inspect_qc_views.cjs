const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const scriptPath = path.join(__dirname, '..', 'script.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

console.log('HTML length:', htmlContent.length);

// Extract section IDs in HTML
const sectionIds = htmlContent.match(/id="view-[a-zA-Z0-9_-]+"/g);
console.log('Views in HTML:', sectionIds);

// Find qc-portal / view-qc area in HTML
const qcViewMatch = htmlContent.match(/<div[^>]*id="view-qc"[^>]*>([\s\S]*?)<\/div>\s*<!-- End View QC -->/i) || 
                    htmlContent.match(/id="view-qc"[\s\S]{0,2000}/);

if (qcViewMatch) {
    console.log('QC View snippet length:', qcViewMatch[0].length);
}

// Check where Murugesh is checked or mentioned in script.js
const murugeshRefs = [];
const lines = scriptContent.split('\n');
lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('murugesh')) {
        murugeshRefs.push({ line: idx + 1, text: line.trim() });
    }
});
console.log('Murugesh references count:', murugeshRefs.length);
console.log('Sample Murugesh references:', murugeshRefs.slice(0, 10));

