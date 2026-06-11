const fs = require('fs');
const acorn = require('acorn');

const html = fs.readFileSync('index.html', 'utf8');

// Find the <script type="module"> block
const scriptStartTag = '<script type="module">';
const scriptEndTag = '</script>';

const startIndex = html.indexOf(scriptStartTag);
if (startIndex === -1) {
    console.error('Could not find starting <script type="module">');
    process.exit(1);
}

const contentStart = startIndex + scriptStartTag.length;
const endIndex = html.indexOf(scriptEndTag, contentStart);
if (endIndex === -1) {
    console.error('Could not find ending </script>');
    process.exit(1);
}

const jsCode = html.substring(contentStart, endIndex);
console.log(`Extracted JS code of length ${jsCode.length} characters.`);

try {
    acorn.parse(jsCode, { ecmaVersion: 2022, sourceType: 'module', allowAwaitOutsideFunction: true });
    console.log('✅ JS MODULE SYNTAX OK!');
} catch (e) {
    console.error('❌ JS MODULE SYNTAX ERROR at line ' + e.loc.line + ', col ' + e.loc.column);
    console.error('Message: ' + e.message);
    const lines = jsCode.split('\n');
    const start = Math.max(0, e.loc.line - 5);
    const end = Math.min(lines.length, e.loc.line + 5);
    for (let i = start; i < end; i++) {
        const marker = i === e.loc.line - 1 ? '>>>' : '   ';
        console.error(marker + ' ' + (i+1) + ': ' + lines[i].substring(0, 120));
    }
    process.exit(1);
}
