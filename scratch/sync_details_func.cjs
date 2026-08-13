const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, '..', 'script.js');
let scriptContent = fs.readFileSync(scriptPath, 'utf8');

if (!scriptContent.includes('function openClientMistakeDetails')) {
    const openDetailCode = `function openClientMistakeDetails(id) {
        const mistake = (allClientQcMistakes || []).find(m => m.id === id);
        if (!mistake) return toast('Mistake record not found', 'error');

        const modal = document.getElementById('clientMistakeDetailModal');
        const content = document.getElementById('client-mistake-detail-content');
        if (!modal || !content) return;

        let badgeClass = 'bg-rose-50 text-rose-600 border-rose-200';
        if (mistake.severity === 'Minor') badgeClass = 'bg-amber-50 text-amber-600 border-amber-200';
        else if (mistake.severity === 'Critical') badgeClass = 'bg-red-100 text-red-700 border-red-300 font-black';

        content.innerHTML = \`
            <div class="flex items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                    <span class="text-xs font-mono font-black text-indigo-600 uppercase tracking-wider">\${escapeHtml(mistake.taskId || 'TASK')}</span>
                    <h4 class="text-sm font-bold text-slate-900 mt-0.5">\${escapeHtml(mistake.taskDesc || 'No Task Description')}</h4>
                </div>
                <div class="text-right shrink-0">
                    <span class="text-xs font-bold px-3 py-1 rounded-full border \${badgeClass}">
                        \${escapeHtml(mistake.severity || 'Major')} (-\${mistake.penaltyPoints || 50}%)
                    </span>
                </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">QC Inspector</p>
                    <p class="font-black text-slate-800">\${escapeHtml(mistake.qcUser || 'Sneha S')}</p>
                    <p class="text-[10px] text-slate-400 truncate">\${escapeHtml(mistake.qcEmail || '')}</p>
                </div>
                <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Reported By</p>
                    <p class="font-black text-slate-800">\${escapeHtml(mistake.reportedBy || 'Murugesh')}</p>
                    <p class="text-[10px] text-slate-400 truncate">\${escapeHtml(mistake.reportedByEmail || '')}</p>
                </div>
                <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Client & Date</p>
                    <p class="font-black text-slate-800">\${escapeHtml(mistake.client || 'N/A')}</p>
                    <p class="text-[10px] text-slate-400">\${mistake.timestamp ? new Date(mistake.timestamp).toLocaleString() : (mistake.date || '')}</p>
                </div>
            </div>

            <div class="bg-rose-50/60 border border-rose-100 rounded-2xl p-4 space-y-2">
                <div class="flex items-center gap-2">
                    <iconify-icon icon="solar:chat-round-dots-bold" class="text-rose-600" width="18"></iconify-icon>
                    <h5 class="text-xs font-black text-rose-900 uppercase tracking-wider">Client Feedback & Mistake Details</h5>
                </div>
                <p class="text-xs font-medium text-slate-800 whitespace-pre-wrap leading-relaxed pl-6">
                    \${escapeHtml(mistake.details || 'No details entered.')}
                </p>
            </div>

            <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-400">
                <span>Mistake Category: <strong class="text-slate-700 font-bold">\${escapeHtml(mistake.mistakeCategory || 'General')}</strong></span>
                <button onclick="document.getElementById('clientMistakeDetailModal').close()" class="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all">
                    Close
                </button>
            </div>
        \`;

        modal.showModal();
    }\n\n    `;
    const pEnd = scriptContent.indexOf('async function deleteClientQcMistake');
    if (pEnd !== -1) {
        scriptContent = scriptContent.substring(0, pEnd) + openDetailCode + scriptContent.substring(pEnd);
        fs.writeFileSync(scriptPath, scriptContent, 'utf8');
        console.log('Added openClientMistakeDetails to script.js');
    }
}
