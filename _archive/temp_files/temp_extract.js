const fs = require('fs');
const text = fs.readFileSync('index.html','utf8');
console.log(text.indexOf('type="module"'));
