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

// The full file + "}" parses OK. So we need to find WHERE the missing } should go.
// Binary search: find the first line where prefix[0..line] + "}" + suffix[line+1..end] + "}" fails
// but prefix[0..line-1] + "}" + suffix[line..end] + "}" succeeds

// Actually: find the line after which inserting } fixes the parse
let lo = 0, hi = lines.length - 1;
while (hi - lo > 1) {
  const mid = Math.floor((lo + hi) / 2);
  const testCode = lines.slice(0, mid+1).join('\n') + '\n}\n' + lines.slice(mid+1).join('\n');
  if (parseOk(testCode)) {
    hi = mid;
  } else {
    lo = mid;
  }
}

console.log('Missing } should be inserted around JS line: ' + hi);
console.log('Context:');
for (let i = Math.max(0, hi-5); i <= Math.min(lines.length-1, hi+5); i++) {
  const marker = i === hi ? '>>> INSERT } AFTER THIS LINE' : '';
  console.log((i+1) + ': ' + lines[i].substring(0, 100) + (marker ? '  ' + marker : ''));
}
