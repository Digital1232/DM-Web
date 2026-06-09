const acorn = require('acorn');
const fs = require('fs');
const code = fs.readFileSync('temp_module.mjs', 'utf8');
try {
  acorn.parse(code, { ecmaVersion: 2022, sourceType: 'module', allowAwaitOutsideFunction: true });
  console.log('PARSE OK');
} catch(e) {
  console.log('PARSE ERROR at line ' + e.loc.line + ', col ' + e.loc.column);
  console.log('Message: ' + e.message);
  const lines = code.split('\n');
  const start = Math.max(0, e.loc.line - 5);
  const end = Math.min(lines.length, e.loc.line + 3);
  for (let i = start; i < end; i++) {
    const marker = i === e.loc.line - 1 ? '>>>' : '   ';
    console.log(marker + ' ' + (i+1) + ': ' + lines[i].substring(0, 120));
  }
}
