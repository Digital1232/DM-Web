const fs = require('fs');

const content = fs.readFileSync('index.html', 'utf8');
const lines = content.split('\n');

function search(term) {
    console.log(`\n=== Search: ${term} ===`);
    const regex = new RegExp(term, 'i');
    lines.forEach((line, idx) => {
        if (regex.test(line)) {
            console.log(`L${idx + 1}: ${line.trim().substring(0, 140)}`);
        }
    });
}

search('worksync/manual_tasks');
search('task_attachments');
search('renderTaskAttachmentsPreview');
