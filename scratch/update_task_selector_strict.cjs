const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, '..', 'script.js');
const htmlPath = path.join(__dirname, '..', 'index.html');

let scriptContent = fs.readFileSync(scriptPath, 'utf8');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

const updatedOpenModalFunc = `function openClientQcMistakeModal(taskId = '') {
        const modal = document.getElementById('clientQcMistakeModal');
        if (!modal) return;

        // Reset inputs
        const clientInput = document.getElementById('client-qc-client-name');
        if (clientInput) clientInput.value = '';
        const detailsInput = document.getElementById('client-qc-details');
        if (detailsInput) detailsInput.value = '';

        // Populate tasks dropdown specifically filtered for 'Client Sent' status tasks
        const taskSelect = document.getElementById('client-qc-task-select');
        if (taskSelect) {
            // Filter tasks under status 'Client Sent', 'Client Approved', 'Client Content Approval'
            const clientSentTasks = (tasks || []).filter(t => {
                const s = String(t.status || '').trim().toLowerCase();
                return s === 'client sent' || s === 'client approved' || s === 'client content approval';
            });

            // Tasks evaluated in QC (QC Approved)
            const qcReportedTaskIds = new Set((allQcReports || []).map(r => r.taskId));
            const qcCompletedTasks = (tasks || []).filter(t => qcReportedTaskIds.has(t.id) && !clientSentTasks.some(cs => cs.id === t.id));

            // Other completed / delivered tasks
            const otherCompletedTasks = (tasks || []).filter(t => {
                const s = String(t.status || '').trim().toLowerCase();
                return (s === 'design completed' || s === 'completed' || s === 'done' || s === 'posted') && 
                       !clientSentTasks.some(cs => cs.id === t.id) && 
                       !qcCompletedTasks.some(qc => qc.id === t.id);
            });

            let optionsHtml = '';

            if (clientSentTasks.length > 0) {
                optionsHtml += \`<option value="">Select a Task under 'Client Sent' status (\${clientSentTasks.length} available)...</option>\`;
                optionsHtml += \`<optgroup label="📤 Client Sent Status Tasks (\${clientSentTasks.length})">\` +
                    clientSentTasks.map(t => \`<option value="\${t.id}" \${t.id === taskId ? 'selected' : ''}>[\${escapeHtml(t.id)}] \${escapeHtml(t.desc || t.title || '').substring(0, 65)} (Status: \${t.status || 'Client Sent'})\x3c/option>\`).join('') +
                    \`\x3c/optgroup>\`;
            } else {
                optionsHtml += \`<option value="">Select a Task (No tasks currently marked 'Client Sent')...</option>\`;
            }

            if (qcCompletedTasks.length > 0) {
                optionsHtml += \`<optgroup label="✓ QC Approved / Evaluated Tasks (\${qcCompletedTasks.length})">\` +
                    qcCompletedTasks.map(t => \`<option value="\${t.id}" \${t.id === taskId ? 'selected' : ''}>[\${escapeHtml(t.id)}] \${escapeHtml(t.desc || t.title || '').substring(0, 65)} (QC Audited - Status: \${t.status || 'Done'})\x3c/option>\`).join('') +
                    \`\x3c/optgroup>\`;
            }

            if (otherCompletedTasks.length > 0) {
                optionsHtml += \`<optgroup label="📋 All Delivered & Completed Tasks (\${otherCompletedTasks.length})">\` +
                    otherCompletedTasks.slice(0, 50).map(t => \`<option value="\${t.id}" \${t.id === taskId ? 'selected' : ''}>[\${escapeHtml(t.id)}] \${escapeHtml(t.desc || t.title || '').substring(0, 65)} (Status: \${t.status || 'Done'})\x3c/option>\`).join('') +
                    \`\x3c/optgroup>\`;
            }

            // Fallback if no filtered tasks exist
            if (clientSentTasks.length === 0 && qcCompletedTasks.length === 0 && otherCompletedTasks.length === 0) {
                const recentTasks = (tasks || []).slice(0, 50);
                optionsHtml += \`<optgroup label="All Recent Tasks">\` +
                    recentTasks.map(t => \`<option value="\${t.id}" \${t.id === taskId ? 'selected' : ''}>[\${escapeHtml(t.id)}] \${escapeHtml(t.desc || t.title || '').substring(0, 65)} (Status: \${t.status || 'Pending'})\x3c/option>\`).join('') +
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
    }`;

// 1. Replace openClientQcMistakeModal in script.js
const scriptStart = scriptContent.indexOf('function openClientQcMistakeModal');
if (scriptStart !== -1) {
    const scriptEnd = scriptContent.indexOf('function onClientQcTaskChange', scriptStart);
    scriptContent = scriptContent.substring(0, scriptStart) + updatedOpenModalFunc + '\n\n    ' + scriptContent.substring(scriptEnd);
    fs.writeFileSync(scriptPath, scriptContent, 'utf8');
    console.log('Updated script.js with strict Client Sent task list selector!');
}

// 2. Replace openClientQcMistakeModal in index.html inline script
const htmlStart = htmlContent.indexOf('function openClientQcMistakeModal');
if (htmlStart !== -1) {
    const htmlEnd = htmlContent.indexOf('function onClientQcTaskChange', htmlStart);
    htmlContent = htmlContent.substring(0, htmlStart) + updatedOpenModalFunc + '\n\n    ' + htmlContent.substring(htmlEnd);
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    console.log('Updated index.html inline script with strict Client Sent task list selector!');
}
