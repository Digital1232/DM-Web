const fs = require('fs');
const code = fs.readFileSync('temp_module.mjs', 'utf8');
const lines = code.split('\n');

// Track state
let state = 'code'; // code, single, double, lineComment, blockComment
let templateDepth = 0; // how many nested template literals we're in
let braceDepthInTemplate = []; // stack of brace depths when entering ${...}

let lineNum = 0;
for (const line of lines) {
  lineNum++;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    const n = line[i+1] || '';
    
    if (state === 'lineComment') continue; // handled at end of line
    
    if (state === 'blockComment') {
      if (c === '*' && n === '/') { state = 'code'; i++; }
      continue;
    }
    
    if (state === 'single') {
      if (c === '\\') { i++; continue; }
      if (c === "'") state = 'code';
      continue;
    }
    
    if (state === 'double') {
      if (c === '\\') { i++; continue; }
      if (c === '"') state = 'code';
      continue;
    }
    
    // We're in 'code' state (which includes inside ${...} of template literals)
    if (c === '/' && n === '/') { state = 'lineComment'; i++; continue; }
    if (c === '/' && n === '*') { state = 'blockComment'; i++; continue; }
    if (c === "'") { state = 'single'; continue; }
    if (c === '"') { state = 'double'; continue; }
    
    if (c === '`') {
      if (templateDepth > 0 && braceDepthInTemplate.length > 0 && braceDepthInTemplate[braceDepthInTemplate.length-1] === 0) {
        // Closing a template literal that was opened inside ${...}
        // Actually this means we're inside a ${...} and opened a nested template, now closing it
        templateDepth--;
      } else if (templateDepth > 0 && braceDepthInTemplate.length === 0) {
        // Closing the outermost template
        templateDepth--;
      } else {
        // Opening a new template literal
        templateDepth++;
      }
      continue;
    }
    
    if (templateDepth > 0) {
      if (c === '$' && n === '{') {
        braceDepthInTemplate.push(0);
        i++; // skip the {
        continue;
      }
      if (braceDepthInTemplate.length > 0) {
        if (c === '{') {
          braceDepthInTemplate[braceDepthInTemplate.length-1]++;
        }
        if (c === '}') {
          if (braceDepthInTemplate[braceDepthInTemplate.length-1] === 0) {
            braceDepthInTemplate.pop(); // exiting ${...}
          } else {
            braceDepthInTemplate[braceDepthInTemplate.length-1]--;
          }
        }
      }
    }
  }
  state = state === 'lineComment' ? 'code' : state;
  
  // Log when template depth changes significantly
  if (templateDepth > 2) {
    console.log(`Line ${lineNum}: templateDepth=${templateDepth}, braceStack=${JSON.stringify(braceDepthInTemplate)}, text: ${line.trim().substring(0, 100)}`);
  }
}

console.log('\n=== FINAL STATE ===');
console.log('templateDepth:', templateDepth);
console.log('braceDepthInTemplate:', JSON.stringify(braceDepthInTemplate));
console.log('state:', state);
