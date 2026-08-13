const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, '..', 'script.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

const lines = scriptContent.split('\n');

lines.forEach((line, idx) => {
    if (line.includes('getAllTasks') || line.includes('function getTask') || line.includes('isInternalTask') || line.includes('allTaskPool')) {
        console.log(`Line ${idx + 1}: ${line.trim().substring(0, 140)}`);
    }
});
