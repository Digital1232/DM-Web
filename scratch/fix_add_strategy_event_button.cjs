const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// 1. Fix line 4509 in Strategy View header action button
const oldHeaderBtn = `<div id="strategy-action-buttons" class="hidden">
                            <button onclick="openWeeklyTaskAssigneeModal()"`;

const newHeaderBtn = `<div id="strategy-action-buttons" class="hidden">
                            <button onclick="openAddStrategyEventModal()"`;

if (htmlContent.includes(oldHeaderBtn)) {
    htmlContent = htmlContent.replace(oldHeaderBtn, newHeaderBtn);
    console.log('Fixed Strategy View header button to call openAddStrategyEventModal()');
} else {
    console.log('oldHeaderBtn pattern not found');
}

// 2. Fix line 18110 in renderStrategyCalendar day cell click
const oldCellClick = `<div onclick="openWeeklyTaskAssigneeModal('\${dateStr}')" \n                         class="relative p-3 border-r border-b border-slate-100 min-h-[90px] flex flex-col group \${isToday ? 'bg-indigo-50/40' : ''} hover:bg-slate-50/50 transition-colors cursor-pointer">`;

const oldCellClickAlt = `onclick="openWeeklyTaskAssigneeModal('\${dateStr}')"`;
const newCellClickAlt = `onclick="openAddStrategyEventModal('\${dateStr}')"`;

// Find renderStrategyCalendar and replace inside it
const renderCalStart = htmlContent.indexOf('function renderStrategyCalendar() {');
if (renderCalStart !== -1) {
    const renderCalEnd = htmlContent.indexOf('function renderStrategySidebar() {', renderCalStart);
    if (renderCalEnd !== -1) {
        let renderCalSection = htmlContent.substring(renderCalStart, renderCalEnd);
        if (renderCalSection.includes(oldCellClickAlt)) {
            renderCalSection = renderCalSection.replace(oldCellClickAlt, newCellClickAlt);
            htmlContent = htmlContent.substring(0, renderCalStart) + renderCalSection + htmlContent.substring(renderCalEnd);
            console.log('Fixed renderStrategyCalendar day cell click to call openAddStrategyEventModal(dateStr)');
        }
    }
}

// 3. Ensure openAddStrategyEventModal safely checks all DOM elements
const oldAddFuncStart = htmlContent.indexOf('function openAddStrategyEventModal(dateStr, clientStr) {');
if (oldAddFuncStart !== -1) {
    const oldAddFuncEnd = htmlContent.indexOf('function openEditStrategyEventModal(eventId) {', oldAddFuncStart);
    if (oldAddFuncEnd !== -1) {
        const safeAddFunc = `function openAddStrategyEventModal(dateStr, clientStr) {
        try {
            if (typeof canViewStrategyCalendar === 'function' && !canViewStrategyCalendar()) {
                return typeof toast === 'function' ? toast('You do not have permission to schedule strategy events.', 'error') : alert('Permission denied');
            }

            const titleEl = document.getElementById('strategy-modal-title');
            if (titleEl) titleEl.textContent = 'Add Strategy Event';

            const idEl = document.getElementById('strategy-event-id');
            if (idEl) idEl.value = '';

            const taskTitleEl = document.getElementById('strategy-title');
            if (taskTitleEl) taskTitleEl.value = '';

            const dateEl = document.getElementById('strategy-date');
            if (dateEl) dateEl.value = dateStr || '';

            if (typeof updateStrategyFolderUI === 'function') updateStrategyFolderUI('');

            const ownerEl = document.getElementById('strategy-owner');
            if (ownerEl) ownerEl.value = '';

            const defaultClient = clientStr || ((typeof activeStrategyClientFilter !== 'undefined' && activeStrategyClientFilter && activeStrategyClientFilter !== 'All') ? activeStrategyClientFilter : '');
            if (typeof populateStrategyClientDropdown === 'function') populateStrategyClientDropdown(defaultClient);

            const statusEl = document.getElementById('strategy-status');
            if (statusEl) statusEl.value = 'To Do';

            const descEl = document.getElementById('strategy-desc');
            if (descEl) descEl.value = '';

            const vcEl = document.getElementById('strategy-videos-count');
            if (vcEl) vcEl.value = '';

            const pcEl = document.getElementById('strategy-posters-count');
            if (pcEl) pcEl.value = '';

            const sjId3 = document.getElementById('strategy-jira-id'); if (sjId3) sjId3.value = '';
            const sjSearch3 = document.getElementById('strategy-jira-search'); if (sjSearch3) sjSearch3.value = '';
            const sjSel3 = document.getElementById('strategy-jira-selected'); if (sjSel3) sjSel3.innerHTML = 'No task selected';

            const clearBtn = document.getElementById('strategy-jira-clear-btn');
            if (clearBtn) clearBtn.classList.add('hidden');

            const dropdown = document.getElementById('strategy-jira-dropdown');
            if (dropdown) dropdown.classList.add('hidden');

            if (typeof selectStrategyFormat === 'function') selectStrategyFormat('Video');

            const deleteBtn = document.getElementById('strategy-delete-btn');
            if (deleteBtn) deleteBtn.classList.add('hidden');

            const saveBtn = document.getElementById('strategy-save-btn');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.style.opacity = '1';
                saveBtn.innerHTML = 'Save Event';
            }

            const modal = document.getElementById('strategyEventModal');
            if (modal) {
                modal.showModal();
                console.log('[openAddStrategyEventModal] Modal opened successfully');
            } else {
                console.error('[openAddStrategyEventModal] strategyEventModal element not found');
            }
        } catch (err) {
            console.error('[openAddStrategyEventModal] Error:', err, err.stack);
            if (typeof toast === 'function') toast('Error opening add strategy event modal: ' + err.message, 'error');
        }
    }

    `;

        htmlContent = htmlContent.substring(0, oldAddFuncStart) + safeAddFunc + htmlContent.substring(oldAddFuncEnd);
        console.log('Updated openAddStrategyEventModal with safe try-catch & null checks');
    }
}

// 4. Update head script tag if present
if (htmlContent.includes('Early Weekly Task Assignment Modal Script')) {
    // Add openAddStrategyEventModal alias to window in head script if needed
    const headScriptEnd = 'window.saveWeeklyTaskAssignment = saveWeeklyTaskAssignment;';
    if (htmlContent.includes(headScriptEnd) && !htmlContent.includes('window.openAddStrategyEventModal = openAddStrategyEventModal;')) {
        htmlContent = htmlContent.replace(headScriptEnd, headScriptEnd + '\n            window.openAddStrategyEventModal = function(d, c) { if (window._realOpenAddStrategyEventModal) window._realOpenAddStrategyEventModal(d, c); else if (typeof openAddStrategyEventModal === "function") openAddStrategyEventModal(d, c); };');
    }
}

fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('index.html update complete!');
