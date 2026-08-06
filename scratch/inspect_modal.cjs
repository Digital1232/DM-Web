const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8').split('\n');

function printLines(start, end) {
    console.log(`\n=== LINES ${start} TO ${end} ===`);
    for (let i = start - 1; i < Math.min(end, content.length); i++) {
        console.log(`${i + 1}: ${content[i]}`);
    }
}

printLines(9670, 9735);
printLines(9800, 10020);
