const fs = require('fs');
const code = fs.readFileSync('temp_module_script.js', 'utf8').split('\n');
for (let i = 0; i < code.length; i++) {
  const line = code[i];
  if (line.includes('await ')) {
    let start = Math.max(0, i - 10);
    let foundAsync = false;
    for (let j = i; j >= start; j--) {
      const l = code[j].trim();
      if (/^(async\s+function|async\s*\(|const\s+\w+\s*=\s*async\s*\(|let\s+\w+\s*=\s*async\s*\(|var\s+\w+\s*=\s*async\s*\(|\w+\s*=\s*async\s*\()/ .test(l)) { foundAsync = true; break; }
      if (/^(function|const|let|var|\w+\s*=\s*\(?\w*\)?\s*=>|\w+\s*\([^)]*\)\s*\{)/.test(l) && !/async/.test(l)) break;
    }
    if (!foundAsync) {
      console.log('await outside async at line', i + 1, line);
    }
  }
}
