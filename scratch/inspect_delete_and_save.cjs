const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const lines = html.split('\n');

lines.forEach((line, idx) => {
    if (line.includes('saveEditTask') || line.includes('removeTaskAttachment') || line.includes('removeMtAttachment') || line.includes('removeAttachment')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
