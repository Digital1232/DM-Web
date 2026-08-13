const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// 1. Add #clientQcMistakeModal right after #qcReportDetailModal dialog
const qcReportModalEnd = '</dialog>';
const targetPos = htmlContent.indexOf('id="qcReportDetailModal"');

if (targetPos === -1) {
    console.error('qcReportDetailModal not found');
    process.exit(1);
}

const dialogEndPos = htmlContent.indexOf('</dialog>', targetPos) + '</dialog>'.length;

const newModalHtml = `

    <!-- Modal: Log Client-Reported QC Mistake -->
    <dialog id="clientQcMistakeModal" class="rounded-3xl shadow-2xl p-0 w-full max-w-2xl border-none overflow-hidden backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm">
        <div class="bg-gradient-to-r from-rose-600 to-amber-600 p-6 text-white flex justify-between items-center">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                    <iconify-icon icon="solar:shield-warning-bold" width="22"></iconify-icon>
                </div>
                <div>
                    <h3 class="text-base font-black tracking-tight">Log Client-Reported QC Mistake</h3>
                    <p class="text-[11px] text-rose-100 font-medium">Record client feedback on QC missed errors for task audit reports</p>
                </div>
            </div>
            <button onclick="document.getElementById('clientQcMistakeModal').close()" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
                <iconify-icon icon="solar:close-circle-bold" width="20"></iconify-icon>
            </button>
        </div>
        <div class="p-6 space-y-5 bg-white">
            <!-- Select Task -->
            <div>
                <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Select Task *</label>
                <select id="client-qc-task-select" onchange="onClientQcTaskChange(this.value)" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all">
                    <option value="">Select a Task delivered or checked in QC...</option>
                </select>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <!-- QC Inspector (Sneha) -->
                <div>
                    <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">QC Inspector (Audited By) *</label>
                    <select id="client-qc-inspector-select" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-4 focus:ring-rose-500/10 transition-all">
                        <option value="snehavilpower@gmail.com|Sneha S">Sneha S (snehavilpower@gmail.com)</option>
                    </select>
                </div>
                <!-- Client Name -->
                <div>
                    <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Client Name</label>
                    <input type="text" id="client-qc-client-name" placeholder="e.g. Acme Corp / Client Name" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-4 focus:ring-rose-500/10 transition-all">
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <!-- Mistake Category -->
                <div>
                    <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Mistake Category *</label>
                    <select id="client-qc-category" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-4 focus:ring-rose-500/10 transition-all">
                        <option value="Spelling / Grammar Error">Spelling / Grammar Error</option>
                        <option value="Visual / Design Flaw">Visual / Design Flaw</option>
                        <option value="Incorrect Dimensions / Format">Incorrect Dimensions / Format</option>
                        <option value="Missing Element / Content">Missing Element / Content</option>
                        <option value="Wrong Client Details / Link">Wrong Client Details / Link</option>
                        <option value="Full Client Rejection">Full Client Rejection</option>
                        <option value="Other Issue">Other Issue</option>
                    </select>
                </div>
                <!-- Severity Level -->
                <div>
                    <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Severity Level *</label>
                    <select id="client-qc-severity" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-4 focus:ring-rose-500/10 transition-all">
                        <option value="Minor">Minor (-5% Audit Score)</option>
                        <option value="Major" selected>Major (-15% Audit Score)</option>
                        <option value="Critical">Critical (-25% Audit Score)</option>
                    </select>
                </div>
            </div>

            <!-- Client Feedback / Notes -->
            <div>
                <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Client Feedback & Mistake Details *</label>
                <textarea id="client-qc-details" rows="3" placeholder="Describe the specific error reported by client that was missed during QC check..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium outline-none focus:ring-4 focus:ring-rose-500/10 resize-none transition-all"></textarea>
            </div>

            <!-- Modal Footer Buttons -->
            <div class="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button type="button" onclick="document.getElementById('clientQcMistakeModal').close()" class="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all">
                    Cancel
                </button>
                <button type="button" id="client-qc-submit-btn" onclick="submitClientQcMistake()" class="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all flex items-center gap-2">
                    <iconify-icon icon="solar:diskette-bold" width="16"></iconify-icon>
                    Save & Record Mistake
                </button>
            </div>
        </div>
    </dialog>`;

htmlContent = htmlContent.substring(0, dialogEndPos) + newModalHtml + htmlContent.substring(dialogEndPos);

// 2. Update view-qc-panel header to include "Report Client QC Mistake" button
const qcHeaderSelectTag = `<select id="qc-task-select" onchange="loadQcTaskDetails(this.value)"
                                class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 w-full max-w-sm">
                                <option value="">Select Task for QC...</option>
                            </select>`;

const newQcHeaderSelectTag = `<select id="qc-task-select" onchange="loadQcTaskDetails(this.value)"
                                class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 w-full max-w-sm">
                                <option value="">Select Task for QC...</option>
                            </select>
                            <button onclick="openClientQcMistakeModal()" class="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-4 py-2.5 text-xs font-bold shadow-md shadow-rose-100 transition-all flex items-center gap-2 shrink-0">
                                <iconify-icon icon="solar:shield-warning-bold" width="16"></iconify-icon>
                                Report Client QC Mistake
                            </button>`;

if (htmlContent.includes(qcHeaderSelectTag)) {
    htmlContent = htmlContent.replace(qcHeaderSelectTag, newQcHeaderSelectTag);
    console.log('Added Report Client QC Mistake button to QC header');
} else {
    console.warn('qcHeaderSelectTag not found exactly, searching alternative...');
}

// 3. Add QC Inspector Scoreboard and Client QC Mistakes list inside view-qc-panel
const qcReportsContainerTag = `<div id="qc-reports-container"`;
const qcReportsContainerPos = htmlContent.indexOf(qcReportsContainerTag);

if (qcReportsContainerPos !== -1) {
    const inspectorScoreboardHtml = `
                <!-- QC Inspector Accuracy & Escapes Scoreboard (Sneha's QC Audit Report) -->
                <div id="qc-inspector-performance-container" class="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 shadow-xl text-white mt-8 border border-indigo-900/50">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <span class="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-black uppercase tracking-wider">QC Audit Report</span>
                                <span class="text-xs text-indigo-300 font-bold">Sneha's QC Audit Accuracy</span>
                            </div>
                            <h3 class="text-xl font-black text-white tracking-tight">QC Inspector Audit & Client Escapes</h3>
                            <p class="text-xs text-slate-300 mt-0.5">Tracks mistakes missed during QC check & reported by Client (Logged by Murugesh / Client Comm)</p>
                        </div>
                        <button onclick="openClientQcMistakeModal()" class="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-900/40 transition-all flex items-center gap-2 self-start sm:self-auto shrink-0">
                            <iconify-icon icon="solar:add-circle-bold" width="16"></iconify-icon>
                            + Log Client Mistake
                        </button>
                    </div>

                    <div id="qc-inspector-performance-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <!-- QC Inspector cards injected here -->
                    </div>
                </div>

                <!-- Client-Reported QC Mistakes Log Section -->
                <div id="client-qc-mistakes-container" class="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/40 border border-slate-100 mt-8">
                    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h3 class="text-lg font-black text-slate-900 tracking-tight">Client-Reported QC Mistakes</h3>
                            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Mistakes found by Client after QC Approval</p>
                        </div>
                        <span id="client-qc-mistakes-count" class="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-xl uppercase tracking-widest">0 Recorded</span>
                    </div>
                    <div id="client-qc-mistakes-list" class="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                        <p class="p-8 text-center text-xs text-slate-400 italic">No client-reported QC mistakes logged yet.</p>
                    </div>
                </div>

`;
    htmlContent = htmlContent.substring(0, qcReportsContainerPos) + inspectorScoreboardHtml + htmlContent.substring(qcReportsContainerPos);
    console.log('Added QC Inspector Scoreboard and Client QC Mistakes container to view-qc-panel');
} else {
    console.warn('qc-reports-container not found');
}

fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('Successfully updated index.html!');
