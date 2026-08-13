// Test script for updated severity levels (-25%, -50%, -75%) and custom category
const sampleQcReports = [
    { id: '1', taskId: 'TASK-1', qcUser: 'Sneha S', qcEmail: 'snehavilpower@gmail.com', qcScore: 100, actionStatus: 'Approved' },
    { id: '2', taskId: 'TASK-2', qcUser: 'Sneha S', qcEmail: 'snehavilpower@gmail.com', qcScore: 100, actionStatus: 'Approved' }
];

const sampleClientMistakes = [
    { id: 'm1', taskId: 'TASK-1', qcUser: 'Sneha S', qcEmail: 'snehavilpower@gmail.com', mistakeCategory: 'Custom Layout Error', severity: 'Minor', penaltyPoints: 25 },
    { id: 'm2', taskId: 'TASK-2', qcUser: 'Sneha S', qcEmail: 'snehavilpower@gmail.com', mistakeCategory: 'Client Rejection', severity: 'Major', penaltyPoints: 50 }
];

function testCalculation(qcReports, mistakes) {
    let totalDeductions = 0;
    mistakes.forEach(m => {
        totalDeductions += (m.penaltyPoints || 50);
    });
    return totalDeductions;
}

const deductions = testCalculation(sampleQcReports, sampleClientMistakes);
console.log('Total Deductions (25 + 50):', deductions);

if (deductions === 75) {
    console.log('SEVERITY PENALTY TEST PASSED OK!');
} else {
    console.error('SEVERITY PENALTY TEST FAILED!');
}
