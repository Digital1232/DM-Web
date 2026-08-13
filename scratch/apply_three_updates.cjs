const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const scriptPath = path.join(__dirname, '..', 'script.js');

let htmlContent = fs.readFileSync(htmlPath, 'utf8');
let scriptContent = fs.readFileSync(scriptPath, 'utf8');

// 1. Update HTML category & severity fields in clientQcMistakeModal inside index.html
const modalCategoryStart = htmlContent.indexOf('<!-- Mistake Category -->');
const modalNotesStart = htmlContent.indexOf('<!-- Client Feedback / Notes -->');

if (modalCategoryStart !== -1 && modalNotesStart !== -1) {
    const newCategoryAndSeverityHtml = `<!-- Mistake Category -->
                <div>
                    <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Mistake Category *</label>
                    <select id="client-qc-category" onchange="toggleCustomCategoryInput(this.value)" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-4 focus:ring-rose-500/10 transition-all">
                        <option value="Spelling / Grammar Error">Spelling / Grammar Error</option>
                        <option value="Visual / Design Flaw">Visual / Design Flaw</option>
                        <option value="Incorrect Dimensions / Format">Incorrect Dimensions / Format</option>
                        <option value="Missing Element / Content">Missing Element / Content</option>
                        <option value="Wrong Client Details / Link">Wrong Client Details / Link</option>
                        <option value="Full Client Rejection">Full Client Rejection</option>
                        <option value="Other Issue">Other Issue</option>
                        <option value="__NEW__">+ Add Custom Category...</option>
                    </select>
                    <input type="text" id="client-qc-custom-category" placeholder="Enter custom mistake category..." class="hidden mt-2 w-full bg-slate-50 border border-rose-200 rounded-xl px-4 py-2 text-xs font-medium outline-none focus:ring-4 focus:ring-rose-500/10 transition-all">
                </div>
                <!-- Severity Level -->
                <div>
                    <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Severity Level *</label>
                    <select id="client-qc-severity" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-4 focus:ring-rose-500/10 transition-all">
                        <option value="Minor">Minor (-25% Audit Score)</option>
                        <option value="Major" selected>Major (-50% Audit Score)</option>
                        <option value="Critical">Critical (-75% Audit Score)</option>
                    </select>
                </div>
            </div>

            `;
    htmlContent = htmlContent.substring(0, modalCategoryStart) + newCategoryAndSeverityHtml + htmlContent.substring(modalNotesStart);
    console.log('Updated HTML Category & Severity fields');
}

// 2. Update JavaScript openClientQcMistakeModal & submitClientQcMistake & toggleCustomCategoryInput in script.js and index.html

const updatedOpenModalFunc = `function toggleCustomCategoryInput(val) {
        const input = document.getElementById('client-qc-custom-category');
        if (!input) return;
        if (val === '__NEW__') {
            input.classList.remove('hidden');
            input.focus();
        } else {
            input.classList.add('hidden');
            input.value = '';
        }
    }

    function openClientQcMistakeModal(taskId = '') {
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

        // Populate tasks dropdown STRICTLY filtered for 'Client Sent' status tasks
        const taskSelect = document.getElementById('client-qc-task-select');
        if (taskSelect) {
            // Filter tasks strictly under status 'Client Sent', 'Client Approved', 'Client Content Approval'
            const clientSentTasks = (tasks || []).filter(t => {
                const s = String(t.status || '').trim().toLowerCase();
                return s === 'client sent' || s === 'client approved' || s === 'client content approval';
            });

            let optionsHtml = '';

            if (clientSentTasks.length > 0) {
                optionsHtml += \`<option value="">Select a Task under 'Client Sent' status (\${clientSentTasks.length} available)...</option>\`;
                optionsHtml += clientSentTasks.map(t => \`<option value="\${t.id}" \${t.id === taskId ? 'selected' : ''}>[\${escapeHtml(t.id)}] \${escapeHtml(t.desc || t.title || '').substring(0, 65)} (Status: \${t.status || 'Client Sent'})\x3c/option>\`).join('');
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

const updatedSubmitFunc = `async function submitClientQcMistake() {
        const taskId = document.getElementById('client-qc-task-select').value;
        if (!taskId) return toast('Please select a task under Client Sent status', 'error');

        const inspectorVal = document.getElementById('client-qc-inspector-select').value;
        const [qcEmail, qcUser] = inspectorVal.split('|');
        
        const clientName = document.getElementById('client-qc-client-name').value.trim();
        let category = document.getElementById('client-qc-category').value;
        if (category === '__NEW__') {
            const customCatInput = document.getElementById('client-qc-custom-category');
            category = customCatInput ? customCatInput.value.trim() : '';
            if (!category) return toast('Please enter a custom mistake category', 'error');
        }

        const severity = document.getElementById('client-qc-severity').value;
        const details = document.getElementById('client-qc-details').value.trim();

        if (!details) return toast('Please describe the client mistake feedback', 'error');

        let penaltyPoints = 50;
        if (severity === 'Minor') penaltyPoints = 25;
        else if (severity === 'Major') penaltyPoints = 50;
        else if (severity === 'Critical') penaltyPoints = 75;

        const task = (tasks || []).find(t => t.id === taskId);

        const entry = {
            taskId,
            taskDesc: task ? (task.desc || task.title || '') : '',
            qcEmail: qcEmail || 'snehavilpower@gmail.com',
            qcUser: qcUser || 'Sneha S',
            reportedBy: currentUser ? currentUser.name : 'Murugesh Kumar A',
            reportedByEmail: currentUser ? (currentUser.email || 'murugeshvilpower@gmail.com') : 'murugeshvilpower@gmail.com',
            client: clientName || (task ? task.client : '') || 'N/A',
            mistakeCategory: category,
            severity,
            penaltyPoints,
            details,
            timestamp: Date.now(),
            date: todayIso()
        };

        const submitBtn = document.getElementById('client-qc-submit-btn');
        if (submitBtn) submitBtn.disabled = true;

        try {
            await push(ref(db, 'worksync/client_qc_mistakes'), entry);
            toast(\`Client QC mistake logged for \${qcUser || 'Sneha'}!\`, 'success');
            const modal = document.getElementById('clientQcMistakeModal');
            if (modal) modal.close();
        } catch (err) {
            console.error('Failed to log client QC mistake:', err);
            toast('Failed to save client QC mistake', 'error');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    }`;

// Replace in script.js
let sStart = scriptContent.indexOf('function openClientQcMistakeModal');
let sEnd = scriptContent.indexOf('function onClientQcTaskChange', sStart);
if (sStart !== -1 && sEnd !== -1) {
    scriptContent = scriptContent.substring(0, sStart) + updatedOpenModalFunc + '\n\n    ' + scriptContent.substring(sEnd);
}

sStart = scriptContent.indexOf('async function submitClientQcMistake()');
sEnd = scriptContent.indexOf('async function deleteClientQcMistake', sStart);
if (sStart !== -1 && sEnd !== -1) {
    scriptContent = scriptContent.substring(0, sStart) + updatedSubmitFunc + '\n\n    ' + scriptContent.substring(sEnd);
}

if (!scriptContent.includes('window.toggleCustomCategoryInput = toggleCustomCategoryInput;')) {
    const bindPos = scriptContent.indexOf('window.openClientQcMistakeModal = openClientQcMistakeModal;');
    if (bindPos !== -1) {
        scriptContent = scriptContent.substring(0, bindPos) + 'window.toggleCustomCategoryInput = toggleCustomCategoryInput;\n    ' + scriptContent.substring(bindPos);
    }
}

// Replace in index.html inline script
let hStart = htmlContent.indexOf('function openClientQcMistakeModal');
let hEnd = htmlContent.indexOf('function onClientQcTaskChange', hStart);
if (hStart !== -1 && hEnd !== -1) {
    htmlContent = htmlContent.substring(0, hStart) + updatedOpenModalFunc + '\n\n    ' + htmlContent.substring(hEnd);
}

hStart = htmlContent.indexOf('async function submitClientQcMistake()');
hEnd = htmlContent.indexOf('async function deleteClientQcMistake', hStart);
if (hStart !== -1 && hEnd !== -1) {
    htmlContent = htmlContent.substring(0, hStart) + updatedSubmitFunc + '\n\n    ' + htmlContent.substring(hEnd);
}

if (!htmlContent.includes('window.toggleCustomCategoryInput = toggleCustomCategoryInput;')) {
    const bindPos = htmlContent.indexOf('window.openClientQcMistakeModal = openClientQcMistakeModal;');
    if (bindPos !== -1) {
        htmlContent = htmlContent.substring(0, bindPos) + 'window.toggleCustomCategoryInput = toggleCustomCategoryInput;\n    ' + htmlContent.substring(bindPos);
    }
}

fs.writeFileSync(scriptPath, scriptContent, 'utf8');
fs.writeFileSync(htmlPath, htmlContent, 'utf8');

console.log('Successfully updated script.js and index.html!');
