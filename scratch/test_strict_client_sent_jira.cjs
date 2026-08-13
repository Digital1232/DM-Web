// Test filtering Jira tasks vs Internal Learning tasks
const sampleTasks = [
    { id: 'JIRA-401', desc: 'Social Banner Design A', status: 'Client Sent', client: 'Brand A', taskType: 'jira' },
    { id: 'JIRA-402', desc: 'Reel Video Post B', status: 'Client Sent', client: 'Brand B', taskType: 'jira' },
    { id: 'JIRA-403', desc: 'Campaign Creative C', status: 'Client Sent', client: 'Brand C', taskType: 'jira' },
    { id: 'JIRA-404', desc: 'Product Brochure D', status: 'Client Sent', client: 'Brand D', taskType: 'jira' },
    { id: 'LEARNING-1', desc: 'Daily Learnings Task', status: 'Client Sent', internal: true, taskType: 'internal' }, // Mock accidental internal task
    { id: 'JIRA-405', desc: 'Draft Post E', status: 'In Progress', client: 'Brand E', taskType: 'jira' }
];

function isInternalTask(t) {
    if (!t) return false;
    if (t.internal === true || t.taskType === 'internal') return true;
    const desc = String(t.desc || t.title || '').toLowerCase();
    const id = String(t.id || '').toLowerCase();
    if (desc.includes('learning') || id.includes('learning')) return true;
    return false;
}

function isClientSentTaskStatus(s) {
    if (!s) return false;
    const lower = String(s).toLowerCase().trim();
    return lower === 'client sent' || 
           lower === 'client-sent' || 
           lower === 'client approved' || 
           lower === 'client content approval' || 
           lower.includes('client sent') ||
           lower.includes('sent to client');
}

const clientSentJiraTasks = sampleTasks.filter(t => !isInternalTask(t) && isClientSentTaskStatus(t.status));

console.log('Filtered Client Sent Jira Tasks Count:', clientSentJiraTasks.length);
console.log('Filtered Task IDs:', clientSentJiraTasks.map(t => `${t.id}: ${t.desc} (${t.status})`));

if (clientSentJiraTasks.length === 4 && !clientSentJiraTasks.some(t => t.id.includes('LEARNING'))) {
    console.log('STRICT JIRA CLIENT SENT FILTER TEST PASSED OK!');
} else {
    console.error('STRICT JIRA CLIENT SENT FILTER TEST FAILED!');
}
