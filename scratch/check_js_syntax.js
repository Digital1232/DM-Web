const fs = require('fs');
const acorn = require('acorn');

try {
    const code = fs.readFileSync('script.js', 'utf8');
    acorn.parse(code, { ecmaVersion: 2022, sourceType: 'module' });
    console.log('script.js parsed successfully!');
} catch (e) {
    console.error('Syntax error in script.js:');
    console.error(e.message);
    const lines = fs.readFileSync('script.js', 'utf8').split('\n');
    const errLine = e.loc ? e.loc.line : 0;
    const start = Math.max(0, errLine - 10);
    const end = Math.min(lines.length, errLine + 10);
    console.error('Surrounding code:');
    for (let i = start; i < end; i++) {
        const prefix = (i + 1 === errLine) ? '=> ' : '   ';
        console.error(`${prefix}${i + 1}: ${lines[i]}`);
    }
    process.exit(1);
}
