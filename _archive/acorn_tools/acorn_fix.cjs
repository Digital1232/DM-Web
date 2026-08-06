const acorn = require('acorn');
const fs = require('fs');
const code = fs.readFileSync('temp_module.mjs', 'utf8');

// Binary search: find the LAST line where the prefix parses successfully
// by wrapping with closing constructs
const lines = code.split('\n');
const total = lines.length;

// Try adding different closers to see what's missing
const closers = [
  { name: 'one }', suffix: '\n}' },
  { name: 'two }', suffix: '\n}\n}' },
  { name: 'three }', suffix: '\n}\n}\n}' },
  { name: 'one } catch{}', suffix: '\n} catch(e) {}' },
  { name: 'try close', suffix: '\n} catch(e) {}\n}' },
];

for (const closer of closers) {
  try {
    acorn.parse(code + closer.suffix, { ecmaVersion: 2022, sourceType: 'module', allowAwaitOutsideFunction: true });
    console.log('FIXED by adding: ' + closer.name);
    break;
  } catch(e) {
    console.log('NOT fixed by ' + closer.name + ': ' + e.message);
  }
}
