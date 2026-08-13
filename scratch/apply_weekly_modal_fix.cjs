const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

const weeklyModalFunctions = `
    // ══════════════════════════════════════════════════════════════════════════════
    // WEEKLY TEAM TASK ASSIGNMENT MODAL & HELPERS
    // ══════════════════════════════════════════════════════════════════════════════
    function populateWeeklyTaskDropdownForClient(clientName) {
        const selectEl = document.getElementById('weekly-assign-task-select');
        if (!selectEl) return;

        const safeEsc = function(s) {
            return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        };

        const EXCLUDED_STATUSES = new Set([
            'done',
            'completed',
            'published',
            'closed',
            'archived',
            'client sent',
            'quality check'
        ]);

        const isAllowedStatus = function(statusStr) {
            if (!statusStr) return true;
            const norm = String(statusStr).trim().toLowerCase();
            return !EXCLUDED_STATUSES.has(norm);
        };

        const clientTasks = [];
        const otherTasks = [];
        const seenTitles = new Set();

        const targetClientNorm = String(clientName || '').trim().toLowerCase();

        const sEvents = (typeof strategyEvents !== 'undefined' && strategyEvents) ? strategyEvents : (window.strategyEvents || {});
        Object.entries(sEvents).forEach(([id, ev]) => {
            if (!ev || !ev.title) return;
            const status = ev.status || 'To Do';
            if (!isAllowedStatus(status)) return;

            const titleTrim = String(ev.title).trim();
            if (seenTitles.has(titleTrim.toLowerCase())) return;
            seenTitles.add(titleTrim.toLowerCase());

            const evClientNorm = String(ev.client || '').trim().toLowerCase();
            const taskObj = {
                id,
                title: titleTrim,
                format: ev.format || 'Poster',
                owner: ev.owner || ev.assignee || '',
                client: ev.client || '',
                status: status
            };

            if (targetClientNorm && evClientNorm && (evClientNorm.includes(targetClientNorm) || targetClientNorm.includes(evClientNorm))) {
                clientTasks.push(taskObj);
            } else {
                otherTasks.push(taskObj);
            }
        });

        const allTasks = (typeof tasks !== 'undefined' && Array.isArray(tasks)) ? tasks : (window.tasks || []);
        allTasks.forEach(t => {
            if (!t) return;
            const status = t.status || 'To Do';
            if (!isAllowedStatus(status)) return;

            const titleTrim = String(t.desc || t.summary || t.id || '').trim();
            if (!titleTrim || seenTitles.has(titleTrim.toLowerCase())) return;
            seenTitles.add(titleTrim.toLowerCase());

            const tClientNorm = String(t.client || '').trim().toLowerCase();
            const taskObj = {
                id: t.id,
                title: titleTrim,
                format: (t.issueType || t.type || '').toLowerCase().includes('video') ? 'Video' : 'Poster',
                owner: t.assignee || '',
                client: t.client || '',
                status: status
            };

            if (targetClientNorm && tClientNorm && (tClientNorm.includes(targetClientNorm) || targetClientNorm.includes(tClientNorm))) {
                clientTasks.push(taskObj);
            } else {
                otherTasks.push(taskObj);
            }
        });

        let optionsHtml = '<option value="">📋 Select Pre-Created Task from Strategy Calendar...</option>';

        if (clientTasks.length > 0) {
            optionsHtml += \`<optgroup label="Tasks for \${safeEsc(clientName || 'Selected Client')}">\`;
            clientTasks.forEach(t => {
                const icon = t.format === 'Video' ? '🎥' : '📷';
                const ownerTxt = t.owner ? (' (' + t.owner + ')') : ' (Unassigned)';
                const statusTxt = t.status ? (' [' + t.status + ']') : '';
                optionsHtml += \`<option value="\${t.id}" data-title="\${safeEsc(t.title)}" data-format="\${t.format}" data-owner="\${t.owner}">\${icon} \${safeEsc(t.title)}\${statusTxt}\${ownerTxt}</option>\`;
            });
            optionsHtml += '</optgroup>';
        }

        if (otherTasks.length > 0) {
            optionsHtml += \`<optgroup label="Other Available Strategy & Project Tasks">\`;
            otherTasks.forEach(t => {
                const icon = t.format === 'Video' ? '🎥' : '📷';
                const clientTxt = t.client ? (' [' + t.client + ']') : '';
                const ownerTxt = t.owner ? (' (' + t.owner + ')') : ' (Unassigned)';
                const statusTxt = t.status ? (' - ' + t.status) : '';
                optionsHtml += \`<option value="\${t.id}" data-title="\${safeEsc(t.title)}" data-format="\${t.format}" data-owner="\${t.owner}">\${icon} \${safeEsc(t.title)}\${clientTxt}\${statusTxt}\${ownerTxt}</option>\`;
            });
            optionsHtml += '</optgroup>';
        }

        optionsHtml += '<option value="__NEW_CUSTOM__">✍️ + Create New Custom Task...</option>';
        selectEl.innerHTML = optionsHtml;
    }

    function handleWeeklyTaskModalClientChange() {
        const clientEl = document.getElementById('weekly-assign-client');
        if (!clientEl) return;
        const selectedClient = clientEl.value;
        populateWeeklyTaskDropdownForClient(selectedClient);
    }

    function openWeeklyTaskAssigneeModal(arg1, arg2) {
        const modal = document.getElementById('weeklyTaskAssigneeModal');
        if (!modal) return;

        let dateStr = '';
        let clientName = '';

        const isDatePattern = function(str) {
            return typeof str === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(str.trim());
        };

        if (isDatePattern(arg1)) {
            dateStr = arg1;
            clientName = arg2 || '';
        } else if (isDatePattern(arg2)) {
            dateStr = arg2;
            clientName = arg1 || '';
        } else {
            clientName = arg1 || arg2 || '';
            dateStr = new Date().toISOString().split('T')[0];
        }

        const titleEl = document.getElementById('weekly-assign-title');
        const clientEl = document.getElementById('weekly-assign-client');
        const dateEl = document.getElementById('weekly-assign-date');
        const ownerEl = document.getElementById('weekly-assign-owner');
        const formatEl = document.getElementById('weekly-assign-format');
        const selectedIdEl = document.getElementById('weekly-assign-selected-id');

        if (selectedIdEl) selectedIdEl.value = '';
        if (titleEl) titleEl.value = '';

        const targetClient = (clientName || 'Einstein').trim();

        if (clientEl) {
            let exists = Array.from(clientEl.options).some(opt => opt.value.toLowerCase() === targetClient.toLowerCase());
            if (!exists && targetClient) {
                const newOpt = document.createElement('option');
                newOpt.value = targetClient;
                newOpt.textContent = targetClient;
                clientEl.appendChild(newOpt);
            }
            clientEl.value = targetClient;
        }

        if (dateEl) dateEl.value = dateStr || new Date().toISOString().split('T')[0];
        if (ownerEl) ownerEl.value = '';
        if (formatEl) formatEl.value = 'Poster';

        populateWeeklyTaskDropdownForClient(targetClient);
        modal.showModal();
    }

    function handleWeeklyTaskModalSelectChange() {
        const selectEl = document.getElementById('weekly-assign-task-select');
        const titleEl = document.getElementById('weekly-assign-title');
        const ownerEl = document.getElementById('weekly-assign-owner');
        const formatEl = document.getElementById('weekly-assign-format');
        const selectedIdEl = document.getElementById('weekly-assign-selected-id');

        if (!selectEl || !titleEl || !selectedIdEl) return;

        const val = selectEl.value;
        if (val === '__NEW_CUSTOM__' || !val) {
            selectedIdEl.value = '';
            if (val === '__NEW_CUSTOM__') {
                titleEl.value = '';
                titleEl.focus();
            }
            return;
        }

        const selectedOption = selectEl.options[selectEl.selectedIndex];
        if (!selectedOption) return;

        const taskTitle = selectedOption.getAttribute('data-title') || '';
        const taskFormat = selectedOption.getAttribute('data-format') || 'Poster';
        const taskOwner = selectedOption.getAttribute('data-owner') || '';

        selectedIdEl.value = val;
        titleEl.value = taskTitle;

        if (formatEl && taskFormat) formatEl.value = taskFormat;
        if (ownerEl && taskOwner) ownerEl.value = taskOwner;
    }

    function saveWeeklyTaskAssignment() {
        const selectedIdEl = document.getElementById('weekly-assign-selected-id');
        const titleEl = document.getElementById('weekly-assign-title');
        const clientEl = document.getElementById('weekly-assign-client');
        const dateEl = document.getElementById('weekly-assign-date');
        const ownerEl = document.getElementById('weekly-assign-owner');
        const formatEl = document.getElementById('weekly-assign-format');

        const selectedTaskId = selectedIdEl ? selectedIdEl.value : '';
        const title = titleEl ? titleEl.value.trim() : '';
        const client = clientEl ? clientEl.value : 'Einstein';
        const dateStr = dateEl ? dateEl.value : new Date().toISOString().split('T')[0];
        const owner = ownerEl ? ownerEl.value : '';
        const format = formatEl ? formatEl.value : 'Poster';

        if (!title && !selectedTaskId) return typeof toast === 'function' ? toast('Please select or enter a task title', 'error') : alert('Please select or enter a task title');

        if (selectedTaskId && typeof strategyEvents !== 'undefined' && strategyEvents && strategyEvents[selectedTaskId]) {
            const updates = {};
            updates[\`worksync/strategy_events/\${selectedTaskId}/client\`] = client;
            updates[\`worksync/strategy_events/\${selectedTaskId}/date\`] = dateStr;
            updates[\`worksync/strategy_events/\${selectedTaskId}/owner\`] = owner;
            updates[\`worksync/strategy_events/\${selectedTaskId}/format\`] = format;

            if (typeof db !== 'undefined' && db && typeof ref === 'function' && typeof update === 'function') {
                update(ref(db), updates)
                    .then(() => {
                        if (typeof toast === 'function') toast(\`Assigned "\${title}" to \${owner || 'team'} for \${dateStr}\`, 'success');
                        document.getElementById('weeklyTaskAssigneeModal')?.close();
                        if (typeof renderStrategyCalendar === 'function') renderStrategyCalendar();
                    })
                    .catch(err => {
                        if (typeof toast === 'function') toast('Failed to assign task: ' + err.message, 'error');
                    });
            }
            return;
        }

        const newId = \`strat_\${Date.now()}\`;
        const newEvent = {
            title,
            client,
            date: dateStr,
            owner,
            format,
            platform: 'General Brand',
            status: 'To Do',
            createdAt: new Date().toISOString()
        };

        if (typeof db !== 'undefined' && db && typeof ref === 'function' && typeof set === 'function') {
            set(ref(db, 'worksync/strategy_events/' + newId), newEvent)
                .then(() => {
                    if (typeof toast === 'function') toast(\`Task created & assigned to \${owner || 'team'}\`, 'success');
                    document.getElementById('weeklyTaskAssigneeModal')?.close();
                    if (typeof renderStrategyCalendar === 'function') renderStrategyCalendar();
                })
                .catch(err => {
                    if (typeof toast === 'function') toast('Failed to create task: ' + err.message, 'error');
                });
        }
    }

    window.openWeeklyTaskAssigneeModal = openWeeklyTaskAssigneeModal;
    window.handleWeeklyTaskModalSelectChange = handleWeeklyTaskModalSelectChange;
    window.saveWeeklyTaskAssignment = saveWeeklyTaskAssignment;
    window.populateWeeklyTaskDropdownForClient = populateWeeklyTaskDropdownForClient;
    window.handleWeeklyTaskModalClientChange = handleWeeklyTaskModalClientChange;

`;

const safeExposeExports = `
            safeExpose('openWeeklyTaskAssigneeModal', () => openWeeklyTaskAssigneeModal);
            safeExpose('handleWeeklyTaskModalSelectChange', () => handleWeeklyTaskModalSelectChange);
            safeExpose('saveWeeklyTaskAssignment', () => saveWeeklyTaskAssignment);
            safeExpose('populateWeeklyTaskDropdownForClient', () => populateWeeklyTaskDropdownForClient);
            safeExpose('handleWeeklyTaskModalClientChange', () => handleWeeklyTaskModalClientChange);
`;

const targetInsertPoint = 'function openAddStrategyEventModal(dateStr, clientStr) {';
if (htmlContent.includes(targetInsertPoint)) {
    htmlContent = htmlContent.replace(targetInsertPoint, weeklyModalFunctions + '\n    ' + targetInsertPoint);
    console.log('Injected weekly modal functions before openAddStrategyEventModal');
} else {
    console.error('Target insert point not found!');
}

const safeExposeTarget = "safeExpose('openEditStrategyEventModal', () => openEditStrategyEventModal);";
if (htmlContent.includes(safeExposeTarget)) {
    htmlContent = htmlContent.replace(safeExposeTarget, safeExposeTarget + '\n' + safeExposeExports);
    console.log('Injected safeExpose exports for weekly modal functions');
} else {
    console.error('safeExpose target not found!');
}

fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('index.html updated successfully');
