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

        // Helper to check if status is Client Sent / Client Approved
        const isClientSentStatus = (s) => {
            if (!s) return false;
            const lower = String(s).toLowerCase().trim();
            return lower === 'client sent' || 
                   lower === 'client-sent' || 
                   lower === 'client approved' || 
                   lower === 'client-approved' || 
                   lower === 'client content approval' || 
                   lower.includes('client sent') || 
                   lower.includes('sent to client');
        };

        // Populate tasks dropdown STRICTLY filtered for Jira/Client Sent status tasks
        const taskSelect = document.getElementById('client-qc-task-select');
        if (taskSelect) {
            // Strictly filter non-internal Jira/Client tasks matching 'Client Sent' status
            const clientSentTasks = (tasks || []).filter(t => !isInternal(t) && isClientSentStatus(t.status));

            // Also check allQcReports for tasks evaluated by QC (excluding internal tasks)
            const qcReportedTaskIds = new Set((allQcReports || []).map(r => r.taskId));
            const qcCompletedTasks = (tasks || []).filter(t => !isInternal(t) && qcReportedTaskIds.has(t.id) && !clientSentTasks.some(cs => cs.id === t.id));

            // Other non-internal completed deliverables
            const otherCompletedTasks = (tasks || []).filter(t => {
                if (isInternal(t)) return false;
                const s = String(t.status || '').trim().toLowerCase();
                return (s === 'design completed' || s === 'completed' || s === 'done' || s === 'posted') && 
                       !clientSentTasks.some(cs => cs.id === t.id) && 
                       !qcCompletedTasks.some(qc => qc.id === t.id);
            });

            let optionsHtml = '';

            if (clientSentTasks.length > 0) {
                optionsHtml += \`<option value="">Select a Task under 'Client Sent' status (\${clientSentTasks.length} available)...</option>\`;
                optionsHtml += \`<optgroup label="📤 Client Sent Status Tasks (\${clientSentTasks.length})">\` +
                    clientSentTasks.map(t => \`<option value="\${t.id}" \${t.id === taskId ? 'selected' : ''}>[\${escapeHtml(t.id)}] \${escapeHtml(t.desc || t.title || '').substring(0, 65)} \${t.client ? '· ' + escapeHtml(t.client) : ''} (Status: \${t.status || 'Client Sent'})\x3c/option>\`).join('') +
                    \`\x3c/optgroup>\`;
            } else {
                optionsHtml += \`<option value="">No Jira/Client tasks currently found under 'Client Sent' status</option>\`;
            }

            if (qcCompletedTasks.length > 0) {
                optionsHtml += \`<optgroup label="✓ Other QC Evaluated Tasks (\${qcCompletedTasks.length})">\` +
                    qcCompletedTasks.map(t => \`<option value="\${t.id}" \${t.id === taskId ? 'selected' : ''}>[\${escapeHtml(t.id)}] \${escapeHtml(t.desc || t.title || '').substring(0, 65)} \${t.client ? '· ' + escapeHtml(t.client) : ''} (Status: \${t.status || 'QC Checked'})\x3c/option>\`).join('') +
                    \`\x3c/optgroup>\`;
            }

            if (otherCompletedTasks.length > 0) {
                optionsHtml += \`<optgroup label="📋 All Other Completed Deliverables (\${otherCompletedTasks.length})">\` +
                    otherCompletedTasks.slice(0, 50).map(t => \`<option value="\${t.id}" \${t.id === taskId ? 'selected' : ''}>[\${escapeHtml(t.id)}] \${escapeHtml(t.desc || t.title || '').substring(0, 65)} \${t.client ? '· ' + escapeHtml(t.client) : ''} (Status: \${t.status || 'Done'})\x3c/option>\`).join('') +
                    \`\x3c/optgroup>\`;
            }

            // Fallback if list is empty
            if (clientSentTasks.length === 0 && qcCompletedTasks.length === 0 && otherCompletedTasks.length === 0) {
                const nonInternalRecent = (tasks || []).filter(t => !isInternal(t)).slice(0, 50);
                optionsHtml += \`<optgroup label="All Recent Deliverables">\` +
                    nonInternalRecent.map(t => \`<option value="\${t.id}" \${t.id === taskId ? 'selected' : ''}>[\${escapeHtml(t.id)}] \${escapeHtml(t.desc || t.title || '').substring(0, 65)} (Status: \${t.status || 'Pending'})\x3c/option>\`).join('') +
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

// Replace in script.js
let sStart = scriptContent.indexOf('function openClientQcMistakeModal');
let sEnd = scriptContent.indexOf('function onClientQcTaskChange', sStart);
if (sStart !== -1 && sEnd !== -1) {
    scriptContent = scriptContent.substring(0, sStart) + updatedOpenModalFunc + '\n\n    ' + scriptContent.substring(sEnd);
    fs.writeFileSync(scriptPath, scriptContent, 'utf8');
    console.log('Updated script.js with non-internal Jira Client Sent task selector!');
}

// Replace in index.html inline script
let hStart = htmlContent.indexOf('function openClientQcMistakeModal');
let hEnd = htmlContent.indexOf('function onClientQcTaskChange', hStart);
if (hStart !== -1 && hEnd !== -1) {
    htmlContent = htmlContent.substring(0, hStart) + updatedOpenModalFunc + '\n\n    ' + htmlContent.substring(hEnd);
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    console.log('Updated index.html inline script with non-internal Jira Client Sent task selector!');
}
