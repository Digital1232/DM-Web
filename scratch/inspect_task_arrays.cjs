const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, '..', 'script.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Search for task array definitions in script.js
const arrayMatches = scriptContent.match(/let\s+([a-zA-Z0-9_]*[tT]ask[a-zA-Z0-9_]*)\s*=\s*\[/g);
console.log('Task arrays in script.js:', arrayMatches);

// Search for where Jira tasks are stored or combined into all tasks
const jiraMatches = scriptContent.match(/jiraTasks|allTasks|tasks|manualTasks/g);
console.log('Jira tasks occurrences count:', jiraMatches ? jiraMatches.length : 0);
