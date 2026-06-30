const fs = require('fs');
const acorn = require('acorn');

const html = fs.readFileSync('index.html', 'utf8');

const matches = [];
let pos = 0;
while (true) {
    const start = html.indexOf('<script', pos);
    if (start === -1) break;
    const tagEnd = html.indexOf('>', start);
    if (tagEnd === -1) break;
    const end = html.indexOf('</script>', tagEnd);
    if (end === -1) break;
    
    const tagHeader = html.slice(start, tagEnd + 1);
    const isModule = tagHeader.includes('type="module"');
    
    const content = html.slice(tagEnd + 1, end);
    matches.push({ start, end, content, isModule });
    pos = end + 9;
}

console.log(`Found ${matches.length} script tags.`);
matches.forEach((m, idx) => {
    try {
        console.log(`Parsing script tag ${idx + 1} (isModule: ${m.isModule})...`);
        acorn.parse(m.content, { ecmaVersion: 2022, sourceType: m.isModule ? 'module' : 'script' });
        console.log(`Script tag ${idx + 1} parsed successfully!`);
    } catch (e) {
        // Try parsing as module just in case
        if (!m.isModule) {
            try {
                acorn.parse(m.content, { ecmaVersion: 2022, sourceType: 'module' });
                console.log(`Script tag ${idx + 1} parsed successfully as module!`);
                return;
            } catch (e2) {
                // Ignore e2, throw original e
            }
        }
        console.error(`Error in script tag ${idx + 1}:`, e.message);
        
        // Print the lines around the error
        const errPos = e.pos;
        const upToErr = m.content.slice(0, errPos);
        const lineOffset = upToErr.split('\n').length;
        
        // Find line number in the original index.html file
        const htmlOffset = html.slice(0, m.start + 1 + e.pos).split('\n').length;
        console.error(`Approximate index.html line: ${htmlOffset}`);
        
        const lines = m.content.split('\n');
        const startLine = Math.max(0, lineOffset - 10);
        const endLine = Math.min(lines.length, lineOffset + 10);
        for (let i = startLine; i < endLine; i++) {
            console.error(`${i + 1}: ${lines[i]}`);
        }
        process.exit(1);
    }
});
