const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const scriptPath = path.join(__dirname, '..', 'script.js');

let htmlContent = fs.readFileSync(htmlPath, 'utf8');
let scriptContent = fs.readFileSync(scriptPath, 'utf8');

// 1. Add #clientMistakeDetailModal right after #clientQcMistakeModal in index.html
const modalEnd = htmlContent.indexOf('</dialog>', htmlContent.indexOf('id="clientQcMistakeModal"')) + '</dialog>'.length;

const detailModalHtml = `

    <!-- Modal: Client QC Mistake Details -->
    <dialog id="clientMistakeDetailModal" class="rounded-3xl shadow-2xl p-0 w-full max-w-2xl border-none overflow-hidden backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm">
        <div style="background: linear-gradient(135deg, #e11d48 0%, #b45309 100%); color: #ffffff;" class="p-6 text-white flex justify-between items-center border-b border-rose-700/20">
            <div class="flex items-center gap-3">
                <div style="background: rgba(255, 255, 255, 0.25);" class="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm">
                    <iconify-icon icon="solar:document-text-bold" width="24" style="color: #ffffff;"></iconify-icon>
                </div>
                <div>
                    <h3 style="color: #ffffff;" class="text-base font-black tracking-tight drop-shadow-sm">Client QC Mistake Details</h3>
                    <p style="color: #fecdd3;" class="text-[11px] font-semibold opacity-95">Reported feedback & penalty breakdown</p>
                </div>
            </div>
            <button onclick="document.getElementById('clientMistakeDetailModal').close()" style="background: rgba(0, 0, 0, 0.2); color: #ffffff;" class="w-8 h-8 rounded-full hover:bg-black/40 flex items-center justify-center transition-all shrink-0" title="Close Modal">
                <iconify-icon icon="solar:close-circle-bold" width="20" style="color: #ffffff;"></iconify-icon>
            </button>
        </div>
        <div class="p-6 space-y-6 bg-white max-h-[75vh] overflow-y-auto" id="client-mistake-detail-content">
            <!-- Content populated dynamically -->
        </div>
    </dialog>`;

if (!htmlContent.includes('id="clientMistakeDetailModal"')) {
    htmlContent = htmlContent.substring(0, modalEnd) + detailModalHtml + htmlContent.substring(modalEnd);
    console.log('Added #clientMistakeDetailModal to index.html');
}

// 2. Update JavaScript openClientQcMistakeModal, renderClientQcMistakes, and openClientMistakeDetails

const updatedOpenModalFunc = `function openClientQcMistakeModal(taskId = '') {
        const modal = document.getElementById('clientQcMistakeModal');
        if (!modal) return;

        // Reset inputs
        const clientInput = document.getElementById('client-qc-client-name');
        if (clientInput) clientInput.value = '';
        const detailsInput = document.getElementById('client-qc-details');
        if (detailsInput) detailsInput.value = '';
        
        const catSelect = document.getElementById('client-qc-category');
        if (catSelect) catSelect.value = 'Spelling / Grammar Error';
        toggleCustomCategoryInput('');

        // Helper to check if task is an internal task (e.g., Learning tasks, Shoots, DPR, Discussions)
        const isInternal = (t) => {
            if (!t) return false;
            if (t.internal === true || t.taskType === 'internal') return true;
            if (typeof isInternalTask === 'function' && isInternalTask(t)) return true;
            const desc = String(t.desc || t.title || '').toLowerCase();
            const id = String(t.id || '').toLowerCase();
            return desc.includes('learning') || id.includes('learning') || desc.includes('dpr') || desc.includes('shoot');
        };

        // Populate tasks dropdown STRICTLY filtered ONLY for tasks under status 'Client Sent'
        const taskSelect = document.getElementById('client-qc-task-select');
        if (taskSelect) {
            // Strictly filter non-internal tasks matching status === 'Client Sent'
            const clientSentTasks = (tasks || []).filter(t => {
                if (isInternal(t)) return false;
                const s = String(t.status || '').trim().toLowerCase();
                return s === 'client sent' || s === 'client-sent';
            });

            let optionsHtml = '';

            if (clientSentTasks.length > 0) {
                optionsHtml += \`<option value="">Select a Task under 'Client Sent' status (\${clientSentTasks.length} available)...</option>\`;
                optionsHtml += clientSentTasks.map(t => \`<option value="\${t.id}" \${t.id === taskId ? 'selected' : ''}>[\${escapeHtml(t.id)}] \${escapeHtml(t.desc || t.title || '').substring(0, 65)} \${t.client ? '· ' + escapeHtml(t.client) : ''} (Status: Client Sent)\x3c/option>\`).join('');
            } else {
                optionsHtml += \`<option value="">No tasks currently found under 'Client Sent' status</option>\`;
            }

            taskSelect.innerHTML = optionsHtml;
        }

        // Populate QC Inspector dropdown
        const inspectorSelect = document.getElementById('client-qc-inspector-select');
        if (inspectorSelect) {
            inspectorSelect.innerHTML = \`
                <option value="snehavilpower@gmail.com|Sneha S">Sneha S (snehavilpower@gmail.com)</option>
                <option value="digitalmarketing@vilpower.com|Admin">Admin (digitalmarketing@vilpower.com)</option>
            \`;
        }

        if (taskId) {
            onClientQcTaskChange(taskId);
        }

        modal.showModal();
    }`;

const updatedRenderMistakesFunc = `function renderClientQcMistakes() {
        const list = document.getElementById('client-qc-mistakes-list');
        const countEl = document.getElementById('client-qc-mistakes-count');
        if (!list) return;

        const mistakes = [...allClientQcMistakes].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        if (countEl) {
            countEl.textContent = \`\${mistakes.length} Recorded\`;
        }

        if (!mistakes.length) {
            list.innerHTML = \`<p class="p-8 text-center text-xs text-slate-400 italic">No client-reported QC mistakes logged yet.</p>\`;
            return;
        }

        list.innerHTML = mistakes.map(m => {
            let badgeClass = 'bg-rose-50 text-rose-600 border-rose-100';
            if (m.severity === 'Minor') badgeClass = 'bg-amber-50 text-amber-600 border-amber-100';
            else if (m.severity === 'Critical') badgeClass = 'bg-red-100 text-red-700 border-red-200 font-black';

            const canDelete = currentUser && (isAdminUser(currentUser) || (currentUser.email || '').toLowerCase() === 'murugeshvilpower@gmail.com');

            return \`
                <div onclick="openClientMistakeDetails('\${m.id}')" class="p-4 hover:bg-slate-50/90 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer">
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2 flex-wrap mb-1">
                            <span class="text-xs font-mono font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">\${escapeHtml(m.taskId || 'TASK')}</span>
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border \${badgeClass}">\${escapeHtml(m.severity || 'Major')} Severity (-\${m.penaltyPoints || 50}%)</span>
                            <span class="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">\${escapeHtml(m.mistakeCategory || 'General')}</span>
                        </div>
                        <p class="text-xs font-black text-slate-900 break-words mt-1">\${escapeHtml(m.taskDesc || m.taskId || '')}</p>
                        <div class="mt-2 p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700 font-medium italic">
                            <strong class="not-italic text-slate-900 font-bold">Client Feedback & Details:</strong> "\${escapeHtml(m.details || 'No feedback details entered.')}"
                        </div>
                        <div class="flex items-center gap-3 text-[10px] text-slate-400 font-semibold mt-2 flex-wrap">
                            <span><strong class="text-slate-600">QC Inspector:</strong> \${escapeHtml(m.qcUser || 'Sneha S')}</span>
                            <span>•</span>
                            <span><strong class="text-slate-600">Reported By:</strong> \${escapeHtml(m.reportedBy || 'Murugesh')}</span>
                            \${m.client ? \`<span>•</span><span><strong class="text-slate-600">Client:</strong> \${escapeHtml(m.client)}</span>\` : ''}
                            <span>•</span>
                            <span>\${m.timestamp ? new Date(m.timestamp).toLocaleDateString() : (m.date || '')}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0 self-start sm:self-center">
                        <button onclick="event.stopPropagation(); openClientMistakeDetails('\${m.id}')" title="View Full Details" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1">
                            <iconify-icon icon="solar:eye-bold" width="14"></iconify-icon> Details
                        </button>
                        \${canDelete ? \`
                            <button onclick="event.stopPropagation(); deleteClientQcMistake('\${m.id}')" title="Delete Mistake Log" class="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shrink-0">
                                <iconify-icon icon="solar:trash-bin-trash-bold" width="18"></iconify-icon>
                            </button>
                        \` : ''}
                    </div>
                </div>
            \`;
        }).join('');
    }

    function openClientMistakeDetails(id) {
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
    }`;

// Replace in script.js
let sStart = scriptContent.indexOf('function openClientQcMistakeModal');
let sEnd = scriptContent.indexOf('function onClientQcTaskChange', sStart);
if (sStart !== -1 && sEnd !== -1) {
    scriptContent = scriptContent.substring(0, sStart) + updatedOpenModalFunc + '\n\n    ' + scriptContent.substring(sEnd);
}

sStart = scriptContent.indexOf('function renderClientQcMistakes()');
sEnd = scriptContent.indexOf('function renderQcInspectorPerformance()', sStart);
if (sStart !== -1 && sEnd !== -1) {
    scriptContent = scriptContent.substring(0, sStart) + updatedRenderMistakesFunc + '\n\n    ' + updatedOpenModalFunc.substring(0, 0) + scriptContent.substring(sEnd);
}

if (!scriptContent.includes('function openClientMistakeDetails')) {
    const pEnd = scriptContent.indexOf('async function deleteClientQcMistake');
    if (pEnd !== -1) {
        scriptContent = scriptContent.substring(0, pEnd) + updatedOpenModalFunc.substring(0, 0) + '\n\n    ' + updatedRenderMistakesFunc.substring(0, 0) + scriptContent.substring(pEnd);
    }
}

// Replace openClientMistakeDetails in script.js and index.html
if (!scriptContent.includes('window.openClientMistakeDetails = openClientMistakeDetails;')) {
    const bindPos = scriptContent.indexOf('window.openClientQcMistakeModal = openClientQcMistakeModal;');
    if (bindPos !== -1) {
        scriptContent = scriptContent.substring(0, bindPos) + 'window.openClientMistakeDetails = openClientMistakeDetails;\n    ' + scriptContent.substring(bindPos);
    }
}

// Write to script.js
fs.writeFileSync(scriptPath, scriptContent, 'utf8');

// Replace in index.html inline script
let hStart = htmlContent.indexOf('function openClientQcMistakeModal');
let hEnd = htmlContent.indexOf('function onClientQcTaskChange', hStart);
if (hStart !== -1 && hEnd !== -1) {
    htmlContent = htmlContent.substring(0, hStart) + updatedOpenModalFunc + '\n\n    ' + htmlContent.substring(hEnd);
}

hStart = htmlContent.indexOf('function renderClientQcMistakes()');
hEnd = htmlContent.indexOf('function renderQcInspectorPerformance()', hStart);
if (hStart !== -1 && hEnd !== -1) {
    htmlContent = htmlContent.substring(0, hStart) + updatedRenderMistakesFunc + '\n\n    ' + htmlContent.substring(hEnd);
}

if (!htmlContent.includes('function openClientMistakeDetails')) {
    const pEnd = htmlContent.indexOf('async function deleteClientQcMistake');
    if (pEnd !== -1) {
        const fullDetailsCode = updatedRenderMistakesFunc.substring(0, 0) + '\n\n    ';
        // Add function openClientMistakeDetails
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
        htmlContent = htmlContent.substring(0, pEnd) + openDetailCode + htmlContent.substring(pEnd);
    }
}

if (!htmlContent.includes('window.openClientMistakeDetails = openClientMistakeDetails;')) {
    const bindPos = htmlContent.indexOf('window.openClientQcMistakeModal = openClientQcMistakeModal;');
    if (bindPos !== -1) {
        htmlContent = htmlContent.substring(0, bindPos) + 'window.openClientMistakeDetails = openClientMistakeDetails;\n    ' + htmlContent.substring(bindPos);
    }
}

fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('Successfully updated script.js and index.html with strict Client Sent filtering & details modal!');
