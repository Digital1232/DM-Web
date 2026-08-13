const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, '..', 'script.js');
const htmlPath = path.join(__dirname, '..', 'index.html');

let scriptContent = fs.readFileSync(scriptPath, 'utf8');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

const addJiraCommentFunc = `async function addJiraComment(issueKey, commentText) {
        if (!issueKey || !commentText) return false;
        try {
            // Post comment if issue is a Jira task key (e.g. JIRA-123 or AUG-1007)
            if (issueKey.includes('-') && !issueKey.startsWith('M-')) {
                const jiraUrl = \`\${JIRA.host}/rest/api/2/issue/\${encodeURIComponent(issueKey)}/comment\`;
                const res = await jiraRequest(jiraUrl, 'post', { body: commentText });
                if (res && res.success !== false) {
                    console.log(\`Jira comment posted successfully to \${issueKey}\`);
                    return true;
                }
            }
            return false;
        } catch (err) {
            console.warn(\`Failed to post Jira comment for \${issueKey}:\`, err);
            return false;
        }
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
            // 1. Save mistake record to Firebase
            await push(ref(db, 'worksync/client_qc_mistakes'), entry);

            // 2. Automatically move task status from Client Sent -> Quality Check
            const targetStatus = 'Quality Check';
            if (typeof updateTaskStatus === 'function') {
                await updateTaskStatus(taskId, targetStatus);
            } else if (task) {
                task.status = targetStatus;
            }

            // 3. Format automated comment text with full feedback & mistake details
            const commentHeader = \`⚠️ CLIENT QC MISTAKE REPORTED BY CLIENT COMMUNICATION (\${currentUser ? currentUser.name : 'Murugesh'})\`;
            const commentBody = 
\`\${commentHeader}
--------------------------------------------------
QC Inspector: \${qcUser || 'Sneha S'}
Mistake Category: \${category}
Severity: \${severity} (-\${penaltyPoints}% Audit Deduction)
Client Name: \${clientName || (task ? task.client : '') || 'N/A'}

CLIENT FEEDBACK & MISTAKE DETAILS:
"\${details}"
--------------------------------------------------
Task Status Automatically Moved: From Client Sent to Quality Check for re-evaluation.\`;

            // 4. Post comment to Jira automatically
            if (typeof addJiraComment === 'function') {
                await addJiraComment(taskId, commentBody);
            }

            // 5. Also log comment to Firebase task discussion
            try {
                await push(ref(db, \`worksync/discussions/\${taskId}/comments\`), {
                    text: commentBody,
                    author: currentUser ? currentUser.name : 'Murugesh Kumar A',
                    authorEmail: currentUser ? currentUser.email : 'murugeshvilpower@gmail.com',
                    timestamp: Date.now()
                });
            } catch (discErr) {
                console.warn('Could not post to Firebase discussions:', discErr);
            }

            toast(\`Client QC mistake logged! Task \${taskId} moved from Client Sent to Quality Check & Jira comment added.\`, 'success');
            const modal = document.getElementById('clientQcMistakeModal');
            if (modal) modal.close();
        } catch (err) {
            console.error('Failed to log client QC mistake:', err);
            toast('Failed to save client QC mistake', 'error');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    }`;

// Inject in script.js
let sStart = scriptContent.indexOf('async function submitClientQcMistake()');
let sEnd = scriptContent.indexOf('async function deleteClientQcMistake', sStart);
if (sStart !== -1 && sEnd !== -1) {
    scriptContent = scriptContent.substring(0, sStart) + addJiraCommentFunc + '\n\n    ' + updatedSubmitFunc + '\n\n    ' + scriptContent.substring(sEnd);
}

if (!scriptContent.includes('window.addJiraComment = addJiraComment;')) {
    const bindPos = scriptContent.indexOf('window.openClientQcMistakeModal = openClientQcMistakeModal;');
    if (bindPos !== -1) {
        scriptContent = scriptContent.substring(0, bindPos) + 'window.addJiraComment = addJiraComment;\n    ' + scriptContent.substring(bindPos);
    }
}

// Inject in index.html inline script
let hStart = htmlContent.indexOf('async function submitClientQcMistake()');
let hEnd = htmlContent.indexOf('async function deleteClientQcMistake', hStart);
if (hStart !== -1 && hEnd !== -1) {
    htmlContent = htmlContent.substring(0, hStart) + addJiraCommentFunc + '\n\n    ' + updatedSubmitFunc + '\n\n    ' + htmlContent.substring(hEnd);
}

if (!htmlContent.includes('window.addJiraComment = addJiraComment;')) {
    const bindPos = htmlContent.indexOf('window.openClientQcMistakeModal = openClientQcMistakeModal;');
    if (bindPos !== -1) {
        htmlContent = htmlContent.substring(0, bindPos) + 'window.addJiraComment = addJiraComment;\n    ' + htmlContent.substring(bindPos);
    }
}

fs.writeFileSync(scriptPath, scriptContent, 'utf8');
fs.writeFileSync(htmlPath, htmlContent, 'utf8');

console.log('Successfully updated script.js and index.html with automatic Jira comment & status transition to Quality Check!');
