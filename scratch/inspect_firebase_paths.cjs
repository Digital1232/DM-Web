const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, '..', 'script.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

const refMatches = scriptContent.match(/ref\(\s*db\s*,\s*['"`](.*?)['"`]\s*\)/g);
console.log('Firebase refs in script.js:', [...new Set(refMatches)]);
