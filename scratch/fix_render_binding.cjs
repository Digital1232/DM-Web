const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, '..', 'script.js');
let scriptContent = fs.readFileSync(scriptPath, 'utf8');

if (!scriptContent.includes('window.renderClientQcMistakes = renderClientQcMistakes;')) {
    const target = 'window.openClientQcMistakeModal = openClientQcMistakeModal;';
    scriptContent = scriptContent.replace(target, 'window.renderClientQcMistakes = renderClientQcMistakes;\n    ' + target);
    fs.writeFileSync(scriptPath, scriptContent, 'utf8');
    console.log('Added window.renderClientQcMistakes binding');
} else {
    console.log('window.renderClientQcMistakes already present');
}
