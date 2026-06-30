const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const getStatsFor =')) {
        console.log(`getStatsFor found at line ${i + 1}`);
        console.log("Lines around it:");
        for (let j = Math.max(0, i - 2); j < Math.min(lines.length, i + 15); j++) {
            console.log(`${j + 1}: ${lines[j]}`);
        }
    }
    if (lines[i].includes("email === 'karthikavilpower@gmail.com'") && lines[i].includes('else if')) {
        console.log(`Karthika workedTasks block found at line ${i + 1}`);
        console.log("Lines around it:");
        for (let j = Math.max(0, i - 2); j < Math.min(lines.length, i + 25); j++) {
            console.log(`${j + 1}: ${lines[j]}`);
        }
    }
}
