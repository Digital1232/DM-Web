const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, '..', 'script.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

const functionsToTest = [
    'openClientQcMistakeModal',
    'onClientQcTaskChange',
    'submitClientQcMistake',
    'deleteClientQcMistake',
    'loadClientQcMistakes',
    'renderQcInspectorPerformance',
    'renderClientQcMistakes'
];

functionsToTest.forEach(fn => {
    const fnDef = scriptContent.includes(`function ${fn}`);
    const winDef = scriptContent.includes(`window.${fn} = ${fn}`);
    console.log(`Function '${fn}': Defined=${fnDef}, BoundToWindow=${winDef}`);
});
