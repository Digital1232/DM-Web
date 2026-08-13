const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, '..', 'script.js');
let scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Find function openClientQcMistakeModal in script.js
const funcStart = scriptContent.indexOf('function openClientQcMistakeModal');
if (funcStart === -1) {
    console.error('openClientQcMistakeModal not found in script.js');
    process.exit(1);
}

const funcEnd = scriptContent.indexOf('function onClientQcTaskChange', funcStart);
if (funcEnd === -1) {
    console.error('onClientQcTaskChange not found after openClientQcMistakeModal');
    process.exit(1);
}

const newOpenModalFunc = `function openClientQcMistakeModal(taskId = '') {
        const modal = document.getElementById('clientQcMistakeModal');
        if (!modal) return;

        // Reset inputs
        const clientInput = document.getElementById('client-qc-client-name');
        if (clientInput) clientInput.value = '';
        const detailsInput = document.getElementById('client-qc-details');
        if (detailsInput) detailsInput.value = '';

        // Populate tasks dropdown filtered for Client Sent / Delivered / QC'd tasks
        const taskSelect = document.getElementById('client-qc-task-select');
        if (taskSelect) {
            // 1. Find tasks in 'Client Sent' or Client Approval status
            const clientSentTasks = (tasks || []).filter(t => {
                const s = String(t.status || '').trim().toLowerCase();
                return s === 'client sent' || s === 'client approved' || s === 'client content approval';
            });

            // 2. Find tasks that have QC reports submitted (QC Approved/Reworked)
            const qcReportedTaskIds = new Set((allQcReports || []).map(r => r.taskId));
            const qcCompletedTasks = (tasks || []).filter(t => qcReportedTaskIds.has(t.id) && !clientSentTasks.some(cs => cs.id === t.id));

            // 3. Other completed / design completed tasks
            const otherCompletedTasks = (tasks || []).filter(t => {
                const s = String(t.status || '').trim().toLowerCase();
                return (s === 'design completed' || s === 'completed' || s === 'done' || s === 'posted') && 
                       !clientSentTasks.some(cs => cs.id === t.id) && 
                       !qcCompletedTasks.some(qc => qc.id === t.id);
            });

            let optionsHtml = \`<option value="">Select a Task from Client Sent list...</option>\`;

            if (clientSentTasks.length > 0) {
                optionsHtml += \`<optgroup label="📤 Client Sent Tasks (\${clientSentTasks.length})">\` +
                    clientSentTasks.map(t => \`<option value="\${t.id}" \${t.id === taskId ? 'selected' : ''}>[\${escapeHtml(t.id)}] \${escapeHtml(t.desc || t.title || '').substring(0, 60)} (\${t.status || 'Client Sent'})\x3c/option>\`).join('') +
                    \`\x3c/optgroup>\`;
            }

            if (qcCompletedTasks.length > 0) {
                optionsHtml += \`<optgroup label="✓ QC Approved / Evaluated Tasks (\${qcCompletedTasks.length})">\` +
                    qcCompletedTasks.map(t => \`<option value="\${t.id}" \${t.id === taskId ? 'selected' : ''}>[\${escapeHtml(t.id)}] \${escapeHtml(t.desc || t.title || '').substring(0, 60)} (\${t.status || 'QC Checked'})\x3c/option>\`).join('') +
                    \`\x3c/optgroup>\`;
            }

            if (otherCompletedTasks.length > 0) {
                optionsHtml += \`<optgroup label="📋 Completed / Delivered Tasks (\${otherCompletedTasks.length})">\` +
                    otherCompletedTasks.slice(0, 50).map(t => \`<option value="\${t.id}" \${t.id === taskId ? 'selected' : ''}>[\${escapeHtml(t.id)}] \${escapeHtml(t.desc || t.title || '').substring(0, 60)} (\${t.status || 'Done'})\x3c/option>\`).join('') +
                    \`\x3c/optgroup>\`;
            }

            // Fallback if list is empty
            if (clientSentTasks.length === 0 && qcCompletedTasks.length === 0 && otherCompletedTasks.length === 0) {
                const recentTasks = (tasks || []).slice(0, 50);
                optionsHtml += \`<optgroup label="All Recent Tasks">\` +
                    recentTasks.map(t => \`<option value="\${t.id}" \${t.id === taskId ? 'selected' : ''}>[\${escapeHtml(t.id)}] \${escapeHtml(t.desc || t.title || '').substring(0, 60)} (\${t.status || 'Pending'})\x3c/option>\`).join('') +
                    \`\x3c/optgroup>\`;
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
    }\n\n    `;

scriptContent = scriptContent.substring(0, funcStart) + newOpenModalFunc + scriptContent.substring(funcEnd);

fs.writeFileSync(scriptPath, scriptContent, 'utf8');
console.log('Successfully updated openClientQcMistakeModal with Client Sent task list filtering!');
