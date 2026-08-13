const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const files = fs.readdirSync(rootDir);

const deployDocs = files.filter(f => f.toLowerCase().includes('deploy') || f.toLowerCase().includes('hostinger') || f.toLowerCase().includes('vercel') || f === 'package.json');
console.log('Deployment docs/files found:', deployDocs);
