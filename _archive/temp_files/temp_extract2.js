const fs = require('fs');
const text = fs.readFileSync('index.html','utf8');
const start = text.indexOf('<script type="module">');
const end = text.indexOf('</script>', start);
if(start < 0 || end < 0) { throw new Error('script tag not found'); }
const script = text.slice(start + '<script type="module">'.length, end);
fs.writeFileSync('temp_module_script.js', script, 'utf8');
console.log('wrote', script.length, 'chars');
