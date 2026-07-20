const fs = require('fs');
const acorn = require('acorn');

let html = fs.readFileSync('index.html', 'utf8');

// Normalize line endings to LF for easier replacement
const originalLength = html.length;
html = html.replace(/\r\n/g, '\n');

const target = `            }
                if (!tasks) return [];`;

const replacement = `            }

            function getPostedJiraTasks() {
                if (!tasks) return [];`;

if (!html.includes(target)) {
    console.error("Error: Target pattern not found in index.html!");
    process.exit(1);
}

html = html.replace(target, replacement);
console.log("Found and replaced target pattern.");

// Now extract and parse all script tags
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
        acorn.parse(m.content, { ecmaVersion: 2022, sourceType: m.isModule ? 'module' : 'script' });
        console.log(`Script tag ${idx + 1} parsed successfully!`);
    } catch (e) {
        if (!m.isModule) {
            try {
                acorn.parse(m.content, { ecmaVersion: 2022, sourceType: 'module' });
                console.log(`Script tag ${idx + 1} parsed successfully as module!`);
                return;
            } catch (e2) {}
        }
        console.error(`Error in script tag ${idx + 1}:`, e.message);
        const htmlOffset = html.slice(0, m.start + 1 + e.pos).split('\n').length;
        console.error(`Approximate index.html line: ${htmlOffset}`);
        
        const lines = m.content.split('\n');
        const errLine = m.content.slice(0, e.pos).split('\n').length;
        console.error(`Err line in script: ${errLine}`);
        const startLine = Math.max(0, errLine - 5);
        const endLine = Math.min(lines.length, errLine + 5);
        for (let i = startLine; i < endLine; i++) {
            console.error(`${i + 1}: ${lines[i]}`);
        }
    }
});
