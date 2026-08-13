const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

const selectIdx = htmlContent.indexOf('id="qc-task-select"');
if (selectIdx !== -1) {
    const endSelectIdx = htmlContent.indexOf('</select>', selectIdx) + '</select>'.length;
    const buttonHtml = `
                            <button onclick="openClientQcMistakeModal()" class="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-4 py-2.5 text-xs font-bold shadow-md shadow-rose-100 transition-all flex items-center gap-2 shrink-0">
                                <iconify-icon icon="solar:shield-warning-bold" width="16"></iconify-icon>
                                Report Client QC Mistake
                            </button>`;
    htmlContent = htmlContent.substring(0, endSelectIdx) + buttonHtml + htmlContent.substring(endSelectIdx);
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    console.log('Successfully inserted Report Client QC Mistake button after qc-task-select');
}
