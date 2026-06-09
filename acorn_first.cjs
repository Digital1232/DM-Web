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

// Find the FIRST line where the prefix (up to that line) needs a } to parse
// This is the line where the unclosed construct begins
for (let i = 0; i < 100; i++) {
  const prefix = lines.slice(0, i+1).join('\n');
  // Check if this prefix can be completed with just window exports and }
  const withClose = prefix + '\n' + '}'.repeat(20);
  if (!parseOk(withClose)) continue;
  
  // Now check WITHOUT closing braces
  // Find how many } are needed
  for (let j = 0; j <= 5; j++) {
    if (parseOk(prefix + '\n' + '}'.repeat(j))) {
      if (j > 0) console.log('At JS line ' + (i+1) + ', needs ' + j + ' closing braces: ' + lines[i].trim().substring(0, 60));
      break;
    }
  }
}

// Also check the try { } catch { } structure at the beginning
console.log('\n--- First 20 lines ---');
for (let i = 0; i < 20; i++) {
  console.log((i+1) + ': ' + lines[i].trim().substring(0, 80));
}
