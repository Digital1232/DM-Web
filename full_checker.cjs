const fs = require('fs');
const code = fs.readFileSync('temp_module.mjs', 'utf8');
const lines = code.split('\n');

let state = 'code';
let templateDepth = 0;
let braceStack = []; // stack for ${...} tracking
let codeDepth = 0; // { } depth in code
let lineNum = 0;

for (const line of lines) {
  lineNum++;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    const n = line[i+1] || '';
    
    if (state === 'lineComment') continue;
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
    if (state === 'template') {
      if (c === '\\') { i++; continue; }
      if (c === '`') { templateDepth--; if (templateDepth === 0) state = braceStack.length > 0 ? 'templateExpr' : 'code'; else state = 'template'; continue; }
      if (c === '$' && n === '{') { state = 'templateExpr'; braceStack.push(0); i++; continue; }
      continue;
    }
    
    // In code or templateExpr
    if (c === '/' && n === '/' && state !== 'templateExpr') { state = 'lineComment'; i++; continue; }
    if (c === '/' && n === '*') { state = 'blockComment'; i++; continue; }
    if (c === "'") { state = 'single'; continue; }
    if (c === '"') { state = 'double'; continue; }
    if (c === '`') { templateDepth++; state = 'template'; continue; }
    
    if (c === '{') {
      if (braceStack.length > 0) { braceStack[braceStack.length-1]++; }
      else { codeDepth++; }
    }
    if (c === '}') {
      if (braceStack.length > 0) {
        if (braceStack[braceStack.length-1] === 0) {
          braceStack.pop();
          state = 'template';
        } else {
          braceStack[braceStack.length-1]--;
        }
      } else {
        codeDepth--;
        if (codeDepth < 0) {
          console.log(`EXTRA } at line ${lineNum}: ${line.trim().substring(0,80)}`);
        }
      }
    }
  }
  if (state === 'lineComment') state = 'code';
}

console.log('\n=== FINAL ===');
console.log('codeDepth:', codeDepth, '(should be 0)');
console.log('templateDepth:', templateDepth, '(should be 0)');
console.log('braceStack:', JSON.stringify(braceStack), '(should be [])');
console.log('state:', state, '(should be code)');
