// Test script for task selector Client Sent filter grouping
const sampleTasks = [
    { id: 'JIRA-101', desc: 'Social Banner A', status: 'Client Sent' },
    { id: 'JIRA-102', desc: 'Reel Video B', status: 'Client Approved' },
    { id: 'JIRA-103', desc: 'Poster C', status: 'Quality Check' },
    { id: 'JIRA-104', desc: 'Infographic D', status: 'Design Completed' },
    { id: 'JIRA-105', desc: 'Draft E', status: 'In Progress' }
];

const sampleQcReports = [
    { id: 'r1', taskId: 'JIRA-103', qcUser: 'Sneha S' },
    { id: 'r2', taskId: 'JIRA-104', qcUser: 'Sneha S' }
];

function getTaskGroups(tasks, qcReports) {
    const clientSentTasks = tasks.filter(t => {
        const s = String(t.status || '').trim().toLowerCase();
        return s === 'client sent' || s === 'client approved' || s === 'client content approval';
    });

    const qcReportedTaskIds = new Set((qcReports || []).map(r => r.taskId));
    const qcCompletedTasks = tasks.filter(t => qcReportedTaskIds.has(t.id) && !clientSentTasks.some(cs => cs.id === t.id));

    const otherCompletedTasks = tasks.filter(t => {
        const s = String(t.status || '').trim().toLowerCase();
        return (s === 'design completed' || s === 'completed' || s === 'done' || s === 'posted') && 
               !clientSentTasks.some(cs => cs.id === t.id) && 
               !qcCompletedTasks.some(qc => qc.id === t.id);
    });

    return {
        clientSentCount: clientSentTasks.length,
        qcCompletedCount: qcCompletedTasks.length,
        otherCompletedCount: otherCompletedTasks.length,
        clientSentIds: clientSentTasks.map(t => t.id)
    };
}

const res = getTaskGroups(sampleTasks, sampleQcReports);
console.log('Filter Grouping Result:', res);

if (res.clientSentCount === 2 && res.clientSentIds.includes('JIRA-101') && res.clientSentIds.includes('JIRA-102')) {
    console.log('CLIENT SENT FILTER TEST PASSED OK!');
} else {
    console.error('CLIENT SENT FILTER TEST FAILED!');
}
