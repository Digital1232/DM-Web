const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// 1. Remove openWeeklyTaskAssigneeModal redirect inside openAddStrategyEventModal
const addRedirectCode = `        if (typeof openWeeklyTaskAssigneeModal === 'function') {
            openWeeklyTaskAssigneeModal(dateStr, clientStr);
            return;
        }`;

if (htmlContent.includes(addRedirectCode)) {
    htmlContent = htmlContent.replace(addRedirectCode, '');
    console.log('Removed openWeeklyTaskAssigneeModal redirect from openAddStrategyEventModal');
} else {
    console.log('addRedirectCode not found');
}

// 2. Remove openWeeklyTaskAssigneeModal redirect inside openEditStrategyEventModal
const editRedirectCode = `        if (typeof openWeeklyTaskAssigneeModal === 'function') {
            const ev = typeof strategyEvents !== 'undefined' ? strategyEvents[eventId] : null;
            openWeeklyTaskAssigneeModal(ev?.date || '', ev?.client || '');
            return;
        }`;

if (htmlContent.includes(editRedirectCode)) {
    htmlContent = htmlContent.replace(editRedirectCode, '');
    console.log('Removed openWeeklyTaskAssigneeModal redirect from openEditStrategyEventModal');
} else {
    console.log('editRedirectCode not found');
}

// 3. Fix modal opening calls in openAddStrategyEventModal and openEditStrategyEventModal to directly show strategyEventModal
const oldShowModal1 = `(document.getElementById('weeklyTaskAssigneeModal') || document.getElementById('strategyEventModal')).showModal();`;
const newShowModal1 = `document.getElementById('strategyEventModal').showModal();`;

while (htmlContent.includes(oldShowModal1)) {
    htmlContent = htmlContent.replace(oldShowModal1, newShowModal1);
    console.log('Replaced weeklyTaskAssigneeModal fallback with strategyEventModal.showModal()');
}

// 4. Update line 45054 fallback assignments
const oldLine45054 = `window.openAddStrategyEventModal = typeof openAddStrategyEventModal !== "undefined" ? openAddStrategyEventModal : (window.openAddStrategyEventModal || function(d, c){ if (window.openWeeklyTaskAssigneeModal) window.openWeeklyTaskAssigneeModal(d, c); }); window.openEditStrategyEventModal = typeof openEditStrategyEventModal !== "undefined" ? openEditStrategyEventModal : (window.openEditStrategyEventModal || function(id){ if (window.openWeeklyTaskAssigneeModal) window.openWeeklyTaskAssigneeModal(); });`;
const newLine45054 = `window.openAddStrategyEventModal = openAddStrategyEventModal; window.openEditStrategyEventModal = openEditStrategyEventModal;`;

if (htmlContent.includes(oldLine45054)) {
    htmlContent = htmlContent.replace(oldLine45054, newLine45054);
    console.log('Updated window assignments for openAddStrategyEventModal & openEditStrategyEventModal');
} else {
    console.log('oldLine45054 not found');
}

fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('index.html fix completed successfully');
