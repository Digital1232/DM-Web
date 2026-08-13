const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

const modalStart = htmlContent.indexOf('id="clientQcMistakeModal"');
if (modalStart === -1) {
    console.error('clientQcMistakeModal not found');
    process.exit(1);
}

const modalEnd = htmlContent.indexOf('</dialog>', modalStart) + '</dialog>'.length;

const cleanModalHtml = `id="clientQcMistakeModal" class="rounded-3xl shadow-2xl p-0 w-full max-w-2xl border-none overflow-hidden backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm">
        <div style="background: linear-gradient(135deg, #e11d48 0%, #b45309 100%); color: #ffffff;" class="p-6 text-white flex justify-between items-center border-b border-rose-700/20">
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

htmlContent = htmlContent.substring(0, modalStart) + cleanModalHtml + htmlContent.substring(modalEnd);

fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('Successfully cleaned clientQcMistakeModal HTML');
