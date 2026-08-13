// Test script to verify calculation logic for Sneha's QC Accuracy Report
const sampleQcReports = [
    { id: '1', taskId: 'TASK-1', qcUser: 'Sneha S', qcEmail: 'snehavilpower@gmail.com', qcScore: 100, actionStatus: 'Approved' },
    { id: '2', taskId: 'TASK-2', qcUser: 'Sneha S', qcEmail: 'snehavilpower@gmail.com', qcScore: 90, actionStatus: 'Approved' },
    { id: '3', taskId: 'TASK-3', qcUser: 'Sneha S', qcEmail: 'snehavilpower@gmail.com', qcScore: 100, actionStatus: 'Approved' },
    { id: '4', taskId: 'TASK-4', qcUser: 'Sneha S', qcEmail: 'snehavilpower@gmail.com', qcScore: 40, actionStatus: 'Rework' }
];

const sampleClientMistakes = [
    { id: 'm1', taskId: 'TASK-1', qcUser: 'Sneha S', qcEmail: 'snehavilpower@gmail.com', reportedBy: 'Murugesh', severity: 'Major', penaltyPoints: 15, details: 'Wrong phone number in image' }
];

function calculateSnehaAccuracy(qcReports, clientMistakes) {
    const defaultSnehaEmail = 'snehavilpower@gmail.com';
    const ins = {
        name: 'Sneha S',
        email: defaultSnehaEmail,
        auditsCount: 0,
        approvedCount: 0,
        reworkCount: 0,
        escapesCount: 0,
        totalDeductions: 0
    };

    qcReports.forEach(r => {
        ins.auditsCount++;
        if (r.actionStatus === 'Approved' || r.qcScore >= 70) ins.approvedCount++;
        else ins.reworkCount++;
    });

    clientMistakes.forEach(m => {
        ins.escapesCount++;
        ins.totalDeductions += (m.penaltyPoints || 15);
    });

    let accuracyPct = 100;
    if (ins.approvedCount > 0) {
        accuracyPct = Math.max(0, Math.round(((ins.approvedCount - ins.escapesCount) / ins.approvedCount) * 100));
    }

    return {
        ...ins,
        accuracyPct
    };
}

const result = calculateSnehaAccuracy(sampleQcReports, sampleClientMistakes);
console.log('Sneha QC Accuracy Calculation Test Result:');
console.log(JSON.stringify(result, null, 2));

if (result.auditsCount === 4 && result.approvedCount === 3 && result.escapesCount === 1 && result.accuracyPct === 67) {
    console.log('TEST PASSED OK!');
} else {
    console.error('TEST FAILED!');
}
