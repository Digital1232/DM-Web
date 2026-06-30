const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('signInWithEmailAndPassword') || lines[i].includes('handleLogin') || lines[i].includes('login(')) {
        console.log(`Auth match found at line ${i + 1}`);
        console.log("Lines around it:");
        for (let j = Math.max(0, i - 10); j < Math.min(lines.length, i + 15); j++) {
            console.log(`${j + 1}: ${lines[j]}`);
        }
    }
}
