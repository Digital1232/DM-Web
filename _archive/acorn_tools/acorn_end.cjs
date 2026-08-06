const acorn = require('acorn');
const fs = require('fs');
const code = fs.readFileSync('temp_module.mjs', 'utf8');
const lines = code.split('\n');

// Count indented structure: the if(initializeApp) { at line 19 needs a } at the end
// Let's check what the last few } close
// Check if adding } at the very end (before line 7552) fixes it
const testEnd = code + '\n}\n';
try {
  acorn.parse(testEnd, { ecmaVersion: 2022, sourceType: 'module', allowAwaitOutsideFunction: true });
  console.log('Adding } at the very end fixes it!');
} catch(e) {
  console.log('Adding } at end does NOT fix: ' + e.message);
}

// Show the last 10 significant lines (non-empty)
const nonEmpty = lines.map((l, i) => ({line: i+1, text: l.trim()})).filter(x => x.text.length > 0);
console.log('\nLast 10 non-empty lines:');
nonEmpty.slice(-10).forEach(x => console.log(x.line + ': ' + x.text.substring(0, 100)));
