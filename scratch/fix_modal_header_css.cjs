const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

const targetModalHeaderStart = htmlContent.indexOf('id="clientQcMistakeModal"');
if (targetModalHeaderStart === -1) {
    console.error('clientQcMistakeModal not found in index.html');
    process.exit(1);
}

const headerDivStart = htmlContent.indexOf('<div class="bg-gradient-to-r from-rose-600', targetModalHeaderStart);
const headerDivEnd = htmlContent.indexOf('</div>', headerDivStart) + '</div>'.length;

if (headerDivStart === -1) {
    console.error('Header div start not found in clientQcMistakeModal');
    process.exit(1);
}

const newHeaderDivHtml = `<div style="background: linear-gradient(135deg, #e11d48 0%, #b45309 100%); color: #ffffff;" class="p-6 text-white flex justify-between items-center border-b border-rose-700/20">
            <div class="flex items-center gap-3">
                <div style="background: rgba(255, 255, 255, 0.25);" class="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm">
                    <iconify-icon icon="solar:shield-warning-bold" width="24" style="color: #ffffff;"></iconify-icon>
                </div>
                <div>
                    <h3 style="color: #ffffff;" class="text-base font-black tracking-tight drop-shadow-sm">Log Client-Reported QC Mistake</h3>
                    <p style="color: #fecdd3;" class="text-[11px] font-semibold opacity-95">Record client feedback on QC missed errors for task audit reports</p>
                </div>
            </div>
            <button onclick="document.getElementById('clientQcMistakeModal').close()" style="background: rgba(0, 0, 0, 0.2); color: #ffffff;" class="w-8 h-8 rounded-full hover:bg-black/40 flex items-center justify-center transition-all shrink-0" title="Close Modal">
                <iconify-icon icon="solar:close-circle-bold" width="20" style="color: #ffffff;"></iconify-icon>
            </button>
        </div>`;

htmlContent = htmlContent.substring(0, headerDivStart) + newHeaderDivHtml + htmlContent.substring(headerDivEnd);

fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('Successfully updated modal header styling in index.html');
