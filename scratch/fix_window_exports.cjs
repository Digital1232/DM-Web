const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, '..', 'script.js');
let scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Ensure functions are assigned to window immediately inside function declaration block
const windowAssignments = `
    window.openClientQcMistakeModal = openClientQcMistakeModal;
    window.onClientQcTaskChange = onClientQcTaskChange;
    window.submitClientQcMistake = submitClientQcMistake;
    window.deleteClientQcMistake = deleteClientQcMistake;
    window.loadClientQcMistakes = loadClientQcMistakes;
    window.renderQcInspectorPerformance = renderQcInspectorPerformance;
    window.renderClientQcMistakes = renderClientQcMistakes;
`;

if (!scriptContent.includes('window.openClientQcMistakeModal = openClientQcMistakeModal;') || 
    scriptContent.indexOf('function openClientQcMistakeModal') > scriptContent.indexOf('window.openClientQcMistakeModal = openClientQcMistakeModal')) {
    
    // Insert window assignments right after deleteClientQcMistake function definition
    const deleteFuncIdx = scriptContent.indexOf('async function deleteClientQcMistake(id) {');
    if (deleteFuncIdx !== -1) {
        const endOfDeleteFunc = scriptContent.indexOf('}', deleteFuncIdx) + 1;
        scriptContent = scriptContent.substring(0, endOfDeleteFunc) + '\n' + windowAssignments + '\n' + scriptContent.substring(endOfDeleteFunc);
        console.log('Inserted immediate window assignments right after function definitions');
    }
}

fs.writeFileSync(scriptPath, scriptContent, 'utf8');
console.log('Updated script.js with immediate window bindings');
