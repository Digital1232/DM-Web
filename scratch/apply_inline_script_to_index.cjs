const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

const functionsToInject = `

    // ══════════════════════════════════════════════════════════════════════════════
    // CLIENT-REPORTED QC MISTAKES & SNEHA QC ACCURACY REPORT FEATURE
    // ══════════════════════════════════════════════════════════════════════════════
    let allClientQcMistakes = [];
    let clientQcMistakesListenerStarted = false;

    function loadClientQcMistakes() {
        if (!db || clientQcMistakesListenerStarted) return;
        clientQcMistakesListenerStarted = true;
        onValue(ref(db, 'worksync/client_qc_mistakes'), snap => {
            const data = snap.val() || {};
            allClientQcMistakes = Object.entries(data).map(([id, m]) => ({ id, ...m }));
            renderClientQcMistakes();
            renderQcInspectorPerformance();
        });
    }

    function renderClientQcMistakes() {
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
                <div class="p-4 hover:bg-slate-50/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2 flex-wrap mb-1">
                            <span class="text-xs font-mono font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">\${escapeHtml(m.taskId || 'TASK')}</span>
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border \${badgeClass}">\${escapeHtml(m.severity || 'Major')} Severity (-\${m.penaltyPoints || 15}%)</span>
                            <span class="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">\${escapeHtml(m.mistakeCategory || 'General')}</span>
                        </div>
                        <p class="text-xs font-bold text-slate-900 break-words mt-1">\${escapeHtml(m.details || m.taskDesc || '')}</p>
                        <div class="flex items-center gap-3 text-[10px] text-slate-400 font-semibold mt-1.5 flex-wrap">
                            <span><strong class="text-slate-600">QC Inspector:</strong> \${escapeHtml(m.qcUser || 'Sneha S')}</span>
                            <span>•</span>
                            <span><strong class="text-slate-600">Reported By:</strong> \${escapeHtml(m.reportedBy || 'Murugesh')}</span>
                            \${m.client ? \`<span>•</span><span><strong class="text-slate-600">Client:</strong> \${escapeHtml(m.client)}</span>\` : ''}
                            <span>•</span>
                            <span>\${m.timestamp ? new Date(m.timestamp).toLocaleDateString() : (m.date || '')}</span>
                        </div>
                    </div>
                    \${canDelete ? \`
                        <button onclick="deleteClientQcMistake('\${m.id}')" title="Delete Mistake Log" class="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shrink-0">
                            <iconify-icon icon="solar:trash-bin-trash-bold" width="18"></iconify-icon>
                        </button>
                    \` : ''}
                </div>
            \`;
        }).join('');
    }

    function renderQcInspectorPerformance() {
        const perfList = document.getElementById('qc-inspector-performance-list');
        if (!perfList) return;

        // Group QC reports by inspector (qcEmail / qcUser)
        const inspectorStats = {};

        // Default Sneha S inspector entry to ensure Sneha is always present
        const defaultSnehaEmail = 'snehavilpower@gmail.com';
        inspectorStats[defaultSnehaEmail] = {
            name: 'Sneha S',
            email: defaultSnehaEmail,
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha',
            auditsCount: 0,
            approvedCount: 0,
            reworkCount: 0,
            totalQcScoreSum: 0,
            escapesCount: 0,
            totalDeductions: 0,
            mistakeLogs: []
        };

        // Process all QC Reports
        (allQcReports || []).forEach(r => {
            const email = (r.qcEmail || defaultSnehaEmail).toLowerCase();
            if (!inspectorStats[email]) {
                const found = (currentWorkUsers || []).find(u => (u.email || '').toLowerCase() === email) || knownUserByEmail(email);
                inspectorStats[email] = {
                    name: found?.name || r.qcUser || 'Sneha S',
                    email: email,
                    avatar: found?.profilePicture || \`https://api.dicebear.com/7.x/avataaars/svg?seed=\${r.qcUser || 'Sneha'}\`,
                    auditsCount: 0,
                    approvedCount: 0,
                    reworkCount: 0,
                    totalQcScoreSum: 0,
                    escapesCount: 0,
                    totalDeductions: 0,
                    mistakeLogs: []
                };
            }
            inspectorStats[email].auditsCount++;
            if (r.actionStatus === 'Approved' || r.qcScore >= 70) {
                inspectorStats[email].approvedCount++;
            } else {
                inspectorStats[email].reworkCount++;
            }
            inspectorStats[email].totalQcScoreSum += (r.qcScore || 0);
        });

        // Process Client QC Mistakes (Escapes)
        (allClientQcMistakes || []).forEach(m => {
            const email = (m.qcEmail || defaultSnehaEmail).toLowerCase();
            if (!inspectorStats[email]) {
                const found = (currentWorkUsers || []).find(u => (u.email || '').toLowerCase() === email) || knownUserByEmail(email);
                inspectorStats[email] = {
                    name: found?.name || m.qcUser || 'Sneha S',
                    email: email,
                    avatar: found?.profilePicture || \`https://api.dicebear.com/7.x/avataaars/svg?seed=\${m.qcUser || 'Sneha'}\`,
                    auditsCount: 0,
                    approvedCount: 0,
                    reworkCount: 0,
                    totalQcScoreSum: 0,
                    escapesCount: 0,
                    totalDeductions: 0,
                    mistakeLogs: []
                };
            }
            inspectorStats[email].escapesCount++;
            inspectorStats[email].totalDeductions += (m.penaltyPoints || 15);
            inspectorStats[email].mistakeLogs.push(m);
        });

        const inspectors = Object.values(inspectorStats);

        perfList.innerHTML = inspectors.map(ins => {
            const totalAudits = ins.auditsCount;
            const approved = ins.approvedCount;
            const escapes = ins.escapesCount;

            // Calculate QC Accuracy %: ((Approved - Escapes) / Approved) * 100
            let accuracyPct = 100;
            if (approved > 0) {
                accuracyPct = Math.max(0, Math.round(((approved - escapes) / approved) * 100));
            } else if (escapes > 0) {
                accuracyPct = Math.max(0, 100 - (escapes * 20));
            }

            let badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
            let badgeText = 'High Precision QC';
            if (accuracyPct < 80) {
                badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
                badgeText = 'Needs Improvement';
            } else if (accuracyPct < 90) {
                badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                badgeText = 'Good Accuracy';
            }

            return \`
                <div class="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 backdrop-blur-md flex flex-col justify-between space-y-4 shadow-lg">
                    <div class="flex items-start justify-between gap-3">
                        <div class="flex items-center gap-3">
                            <img src="\${ins.avatar}" class="w-10 h-10 rounded-xl object-cover border border-slate-600 bg-slate-900 shadow-sm">
                            <div>
                                <h4 class="text-sm font-black text-white">\${escapeHtml(ins.name)}</h4>
                                <p class="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">QC Inspector</p>
                            </div>
                        </div>
                        <span class="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border \${badgeColor}">
                            \${badgeText}
                        </span>
                    </div>

                    <div class="grid grid-cols-3 gap-2 py-3 border-y border-slate-700/60 text-center">
                        <div class="bg-slate-900/60 p-2 rounded-xl border border-slate-700/40">
                            <p class="text-[9px] text-slate-400 font-bold uppercase">QC Audits</p>
                            <p class="text-base font-black text-indigo-400">\${totalAudits}</p>
                        </div>
                        <div class="bg-slate-900/60 p-2 rounded-xl border border-slate-700/40">
                            <p class="text-[9px] text-slate-400 font-bold uppercase">Client Escapes</p>
                            <p class="text-base font-black \${escapes > 0 ? 'text-rose-400 font-mono' : 'text-slate-300'}">\${escapes}</p>
                        </div>
                        <div class="bg-slate-900/60 p-2 rounded-xl border border-slate-700/40">
                            <p class="text-[9px] text-slate-400 font-bold uppercase">QC Accuracy</p>
                            <p class="text-base font-black \${accuracyPct >= 90 ? 'text-emerald-400' : accuracyPct >= 80 ? 'text-amber-400' : 'text-rose-400'}">\${accuracyPct}%</p>
                        </div>
                    </div>

                    <div class="flex items-center justify-between text-[11px] text-slate-300 font-medium pt-1">
                        <span class="text-slate-400">Total Deductions: <strong class="text-rose-300">-\${ins.totalDeductions}%</strong></span>
                        <button onclick="openClientQcMistakeModal()" class="text-indigo-300 hover:text-white font-bold text-xs flex items-center gap-1 transition-all">
                            + Log Mistake <iconify-icon icon="solar:alt-arrow-right-bold" width="12"></iconify-icon>
                        </button>
                    </div>
                </div>
            \`;
        }).join('');
    }

    function openClientQcMistakeModal(taskId = '') {
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
    }

    function onClientQcTaskChange(taskId) {
        if (!taskId) return;
        const task = (tasks || []).find(t => t.id === taskId);
        
        // Auto-detect client
        if (task && task.client) {
            const clientInput = document.getElementById('client-qc-client-name');
            if (clientInput) clientInput.value = task.client;
        }

        // Auto-detect QC inspector from qc_reports
        const report = (allQcReports || []).find(r => r.taskId === taskId);
        if (report && report.qcEmail) {
            const inspectorSelect = document.getElementById('client-qc-inspector-select');
            if (inspectorSelect) {
                let foundOption = false;
                for (let i = 0; i < inspectorSelect.options.length; i++) {
                    if (inspectorSelect.options[i].value.startsWith(report.qcEmail)) {
                        inspectorSelect.selectedIndex = i;
                        foundOption = true;
                        break;
                    }
                }
                if (!foundOption) {
                    const newOpt = document.createElement('option');
                    newOpt.value = \`\${report.qcEmail}|\${report.qcUser || 'Sneha S'}\`;
                    newOpt.textContent = \`\${report.qcUser || 'Sneha S'} (\${report.qcEmail})\`;
                    newOpt.selected = true;
                    inspectorSelect.appendChild(newOpt);
                }
            }
        }
    }

    async function submitClientQcMistake() {
        const taskId = document.getElementById('client-qc-task-select').value;
        if (!taskId) return toast('Please select a task', 'error');

        const inspectorVal = document.getElementById('client-qc-inspector-select').value;
        const [qcEmail, qcUser] = inspectorVal.split('|');
        
        const clientName = document.getElementById('client-qc-client-name').value.trim();
        const category = document.getElementById('client-qc-category').value;
        const severity = document.getElementById('client-qc-severity').value;
        const details = document.getElementById('client-qc-details').value.trim();

        if (!details) return toast('Please describe the client mistake feedback', 'error');

        let penaltyPoints = 15;
        if (severity === 'Minor') penaltyPoints = 5;
        else if (severity === 'Critical') penaltyPoints = 25;

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
    }

    async function deleteClientQcMistake(id) {
        if (!confirm('Are you sure you want to delete this client QC mistake entry?')) return;
        try {
            await remove(ref(db, 'worksync/client_qc_mistakes/' + id));
            toast('Mistake entry deleted', 'success');
        } catch (err) {
            console.error('Failed to delete client QC mistake:', err);
            toast('Failed to delete entry', 'error');
        }
    }

    window.openClientQcMistakeModal = openClientQcMistakeModal;
    window.onClientQcTaskChange = onClientQcTaskChange;
    window.submitClientQcMistake = submitClientQcMistake;
    window.deleteClientQcMistake = deleteClientQcMistake;
    window.loadClientQcMistakes = loadClientQcMistakes;
    window.renderQcInspectorPerformance = renderQcInspectorPerformance;
    window.renderClientQcMistakes = renderClientQcMistakes;
`;

// Check if openClientQcMistakeModal already exists in index.html
if (!htmlContent.includes('function openClientQcMistakeModal')) {
    // Inject right before function setQcPerformanceFilter in index.html inline script
    const targetIdx = htmlContent.indexOf('function setQcPerformanceFilter');
    if (targetIdx !== -1) {
        htmlContent = htmlContent.substring(0, targetIdx) + functionsToInject + '\n\n    ' + htmlContent.substring(targetIdx);
        console.log('Injected Client QC Mistakes functions into index.html inline script');
    } else {
        console.error('setQcPerformanceFilter not found in index.html');
        process.exit(1);
    }

    // Also add loadClientQcMistakes() trigger inside loadQcReports() in index.html inline script
    const loadQcPos = htmlContent.indexOf('function loadQcReports() {');
    if (loadQcPos !== -1) {
        const nextLinePos = htmlContent.indexOf('\n', loadQcPos) + 1;
        htmlContent = htmlContent.substring(0, nextLinePos) + '                loadClientQcMistakes();\n' + htmlContent.substring(nextLinePos);
        console.log('Added loadClientQcMistakes() trigger inside index.html loadQcReports()');
    }

    // Also call renderQcInspectorPerformance() inside loadQcReports() callback in index.html
    const reportsMapEnd = htmlContent.indexOf('list.innerHTML = reports.map(r => `', loadQcPos);
    if (reportsMapEnd !== -1) {
        const callbackEnd = htmlContent.indexOf('});', reportsMapEnd);
        if (callbackEnd !== -1) {
            htmlContent = htmlContent.substring(0, callbackEnd) + '    renderQcInspectorPerformance();\n            ' + htmlContent.substring(callbackEnd);
            console.log('Added renderQcInspectorPerformance() call inside loadQcReports() in index.html');
        }
    }
} else {
    console.log('openClientQcMistakeModal is already in index.html!');
}

fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('Successfully updated index.html inline script!');
