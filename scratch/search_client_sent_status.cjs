const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, '..', 'script.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Search for status values in script.js
const statusMatches = scriptContent.match(/['"`]([A-Za-z0-9\s_-]*Client[A-Za-z0-9\s_-]*)['"`]/gi);
console.log('Client status occurrences:', [...new Set(statusMatches)]);

// Search for tasks status values used in app
const statusValues = scriptContent.match(/status\s*===\s*['"`](.*?)['"`]/g);
console.log('Status equality checks:', [...new Set(statusValues)]);
