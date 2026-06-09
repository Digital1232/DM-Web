const acorn = require('acorn');
const fs = require('fs');
const code = fs.readFileSync('temp_module.mjs', 'utf8');
const lines = code.split('\n');

function parseOk(text) {
  try {
    acorn.parse(text, { ecmaVersion: 2022, sourceType: 'module', allowAwaitOutsideFunction: true });
    return true;
  } catch(e) { return false; }
}

// The approach: try removing each } one at a time to see which one is extra
// Actually we need to ADD a }, so let's find where.
// Try inserting } at each line between 3700-3800
for (let i = 3700; i < 3760; i++) {
  const testCode = lines.slice(0, i+1).join('\n') + '\n}\n' + lines.slice(i+1).join('\n');
  if (parseOk(testCode)) {
    console.log('Inserting } after JS line ' + (i+1) + ' FIXES the error');
    console.log('  Line ' + (i+1) + ': ' + lines[i].trim().substring(0, 80));
    break;
  }
}

// Also try around saveCurrentTaskState (JS line ~2228)
// The function is at HTML line 4765, script starts at 2537, so JS line = 4765-2537 = 2228
const saveTaskLine = 4765 - 2537;
console.log('\nsaveCurrentTaskState is at JS line ~' + saveTaskLine);
for (let i = saveTaskLine - 5; i < saveTaskLine + 30; i++) {
  const testCode = lines.slice(0, i+1).join('\n') + '\n}\n' + lines.slice(i+1).join('\n');
  if (parseOk(testCode)) {
    console.log('Inserting } after JS line ' + (i+1) + ' ALSO FIXES the error');
    console.log('  Line ' + (i+1) + ': ' + lines[i].trim().substring(0, 80));
    break;
  }
}
