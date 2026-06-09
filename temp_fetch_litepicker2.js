const https = require('https');
const fs = require('fs');
https.get('https://cdn.jsdelivr.net/npm/litepicker/dist/litepicker.js', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('litepicker_head.txt', data.split('\n').slice(0,20).join('\n'), 'utf8');
  });
}).on('error', err => { fs.writeFileSync('litepicker_head.txt', 'ERR '+err.message, 'utf8'); });
