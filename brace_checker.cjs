const fs = require('fs');
const code = fs.readFileSync('temp_module.mjs', 'utf8');
let depth = 0;
let minDepth = 0;
let minDepthLine = 0;
let inSingle = false, inDouble = false, inTemplate = 0, inLineComment = false, inBlockComment = false;
let escaped = false;
let lineNum = 1;
let braceStack = [];

for (let i = 0; i < code.length; i++) {
  const c = code[i];
  const n = code[i+1] || '';
  
  if (c === '\n') { lineNum++; inLineComment = false; }
  
  if (inLineComment) continue;
  if (inBlockComment) {
    if (c === '*' && n === '/') { inBlockComment = false; i++; }
    continue;
  }
  
  if (escaped) { escaped = false; continue; }
  if (c === '\\' && (inSingle || inDouble || inTemplate > 0)) { escaped = true; continue; }
  
  if (inSingle) { if (c === "'") inSingle = false; continue; }
  if (inDouble) { if (c === '"') inDouble = false; continue; }
  if (inTemplate > 0) {
    if (c === '`') { inTemplate--; continue; }
    if (c === '$' && n === '{') { inTemplate++; i++; depth++; braceStack.push(lineNum); continue; }
    continue;
  }
  
  if (c === '/' && n === '/') { inLineComment = true; i++; continue; }
  if (c === '/' && n === '*') { inBlockComment = true; i++; continue; }
  if (c === "'") { inSingle = true; continue; }
  if (c === '"') { inDouble = true; continue; }
  if (c === '`') { inTemplate++; continue; }
  
  if (c === '{') { depth++; braceStack.push(lineNum); }
  if (c === '}') { 
    depth--;
    if (braceStack.length) braceStack.pop();
    if (depth < minDepth) { minDepth = depth; minDepthLine = lineNum; }
  }
}

console.log('Final depth:', depth);
console.log('inTemplate:', inTemplate);
console.log('inSingle:', inSingle);
console.log('inDouble:', inDouble);
console.log('inBlockComment:', inBlockComment);
if (depth > 0) {
  console.log('Unclosed braces. Last opens at lines:', braceStack.slice(-5).join(', '));
}
if (depth < 0) {
  console.log('Extra closing braces. First goes negative at line:', minDepthLine);
}
