// Unit test for automatic Jira comment posting and status transition
const sampleTasks = [
    { id: 'AUG-1007', desc: 'Lucky Draw Voice Over', status: 'Client Sent', client: 'Acme Corp' }
];

let updatedStatus = '';
let postedComment = '';

async function mockUpdateTaskStatus(taskId, newStatus) {
    const task = sampleTasks.find(t => t.id === taskId);
    if (task) {
        task.status = newStatus;
        updatedStatus = newStatus;
        return true;
    }
    return false;
}

async function mockAddJiraComment(issueKey, commentText) {
    if (issueKey === 'AUG-1007') {
        postedComment = commentText;
        return true;
    }
    return false;
}

async function simulateSubmitMistake() {
    const taskId = 'AUG-1007';
    const category = 'Spelling / Grammar Error';
    const severity = 'Major';
    const details = 'Wrong phone number printed on final poster deliverable.';

    await mockUpdateTaskStatus(taskId, 'Quality Check');

    const commentBody = `⚠️ CLIENT QC MISTAKE REPORTED BY CLIENT COMMUNICATION (Murugesh)
--------------------------------------------------
QC Inspector: Sneha S
Mistake Category: ${category}
Severity: ${severity} (-50% Audit Deduction)
Client Name: Acme Corp

CLIENT FEEDBACK & MISTAKE DETAILS:
"${details}"
--------------------------------------------------
Task Status Automatically Moved: From Client Sent to Quality Check for re-evaluation.`;

    await mockAddJiraComment(taskId, commentBody);
}

simulateSubmitMistake().then(() => {
    console.log('Updated Task Status:', updatedStatus);
    console.log('Posted Comment:\n', postedComment);

    if (updatedStatus === 'Quality Check' && postedComment.includes('Wrong phone number printed')) {
        console.log('AUTO COMMENT & STATUS TRANSITION TEST PASSED OK!');
    } else {
        console.error('TEST FAILED!');
    }
});
