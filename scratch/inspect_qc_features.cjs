const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, '..', 'script.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

console.log('Script length:', scriptContent.length);

// Search for QC related functions
const matches = scriptContent.match(/function\s+[a-zA-Z0-9_]*[qQ][cC][a-zA-Z0-9_]*/g);
console.log('QC Functions found:', [...new Set(matches)]);

// Search for Client delivery related functions
const clientMatches = scriptContent.match(/function\s+[a-zA-Z0-9_]*[cC]lient[a-zA-Z0-9_]*/g);
console.log('Client Functions found:', [...new Set(clientMatches)]);

// Search for report related functions
const reportMatches = scriptContent.match(/function\s+[a-zA-Z0-9_]*[rR]eport[a-zA-Z0-9_]*/g);
console.log('Report Functions found:', [...new Set(reportMatches)]);
