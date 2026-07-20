/**
 * Test Sample Data for WorkSync Daily Summary Email
 * Use this file to generate test emails and verify the template
 */

// Sample employee data (typical workday)
const SAMPLE_EMPLOYEES = [
    {
        name: 'Karthika K',
        email: 'karthika@vilpower.com',
        workedSeconds: 27922,        // 7:45:22
        completedTasks: 12,
        status: 'Working',
        currentTask: 'JULY-401',
        currentDuration: 7095,        // 1:58:15
        productivity: 98,
        isTopPerformer: true
    },
    {
        name: 'Palanirajan R',
        email: 'palanirajan@vilpower.com',
        workedSeconds: 29565,        // 8:12:45
        completedTasks: 10,
        status: 'Working',
        currentTask: 'JULY-402',
        currentDuration: 8640,        // 2:24:00
        productivity: 96,
        isTopPerformer: false
    },
    {
        name: 'Murugesh Kumar A',
        email: 'murugesh@vilpower.com',
        workedSeconds: 23415,        // 6:30:15
        completedTasks: 9,
        status: 'Working',
        currentTask: 'JULY-403',
        currentDuration: 2730,        // 0:45:30
        productivity: 94,
        isTopPerformer: false
    },
    {
        name: 'Barath Magesh M',
        email: 'barath@vilpower.com',
        workedSeconds: 20730,        // 5:45:30
        completedTasks: 7,
        status: 'Break',
        currentTask: 'JULY-404',
        currentDuration: 0,
        productivity: 88,
        isTopPerformer: false
    },
    {
        name: 'Immanuel Raja S',
        email: 'immanuel@vilpower.com',
        workedSeconds: 22500,        // 6:15:00
        completedTasks: 8,
        status: 'Working',
        currentTask: 'JULY-405',
        currentDuration: 5560,        // 1:32:40
        productivity: 92,
        isTopPerformer: false
    },
    {
        name: 'Sneha S',
        email: 'sneha@vilpower.com',
        workedSeconds: 0,
        completedTasks: 0,
        status: 'Offline',
        currentTask: null,
        currentDuration: 0,
        productivity: 0,
        isTopPerformer: false
    },
    {
        name: 'Ajith',
        email: 'ajith@vilpower.com',
        workedSeconds: 0,
        completedTasks: 0,
        status: 'Offline',
        currentTask: null,
        currentDuration: 0,
        productivity: 0,
        isTopPerformer: false
    },
    {
        name: 'Alex',
        email: 'alex@vilpower.com',
        workedSeconds: 0,
        completedTasks: 1,
        status: 'Offline',
        currentTask: 'JULY-406',
        currentDuration: 0,
        productivity: 12,
        isTopPerformer: false
    }
];

// Sample task data
const SAMPLE_TASKS = [
    { id: 'JULY-401', client: 'VilPower', employee: 'Karthika K', duration: 3600, completed: true },
    { id: 'JULY-402', client: 'NTT', employee: 'Palanirajan R', duration: 3600, completed: true },
    { id: 'JULY-403', client: 'Einstein', employee: 'Murugesh Kumar A', duration: 3600, completed: true },
    { id: 'JULY-404', client: 'DreamDaa', employee: 'Barath Magesh M', duration: 3600, completed: true },
    { id: 'JULY-405', client: 'VilPower', employee: 'Immanuel Raja S', duration: 3600, completed: true },
    { id: 'JULY-406', client: 'IVN', employee: 'Alex', duration: 3600, completed: false },
    { id: 'JULY-407', client: 'VilPower', employee: 'Karthika K', duration: 2400, completed: true },
    { id: 'JULY-408', client: 'NTT', employee: 'Karthika K', duration: 2400, completed: true },
    { id: 'JULY-409', client: 'Einstein', employee: 'Palanirajan R', duration: 2400, completed: true },
    { id: 'JULY-410', client: 'Quade', employee: 'Murugesh Kumar A', duration: 2400, completed: true },
    { id: 'JULY-411', client: 'VilPower', employee: 'Barath Magesh M', duration: 2400, completed: true },
    { id: 'JULY-412', client: 'DreamDaa', employee: 'Immanuel Raja S', duration: 2400, completed: true },
    { id: 'JULY-413', client: 'Einstein', employee: 'Karthika K', duration: 1800, completed: true },
    { id: 'JULY-414', client: 'VilPower', employee: 'Palanirajan R', duration: 1800, completed: true },
    { id: 'JULY-415', client: 'NTT', employee: 'Murugesh Kumar A', duration: 1800, completed: true },
    { id: 'JULY-416', client: 'Quade', employee: 'Barath Magesh M', duration: 1800, completed: true },
    { id: 'JULY-417', client: 'IVN', employee: 'Immanuel Raja S', duration: 1800, completed: true },
    { id: 'JULY-418', client: 'VilPower', employee: 'Karthika K', duration: 1800, completed: true },
    { id: 'JULY-419', client: 'DreamDaa', employee: 'Palanirajan R', duration: 1800, completed: true },
    { id: 'JULY-420', client: 'Einstein', employee: 'Murugesh Kumar A', duration: 1800, completed: true },
    // Add more tasks as needed
];

const SAMPLE_CLIENTS = ['VilPower', 'NTT', 'Einstein', 'DreamDaa', 'IVN', 'Quade'];

/**
 * Get sample data for testing
 */
function getSampleData() {
    return {
        date: new Date(),
        employees: SAMPLE_EMPLOYEES,
        tasks: SAMPLE_TASKS,
        clients: SAMPLE_CLIENTS
    };
}

/**
 * Generate test email and save to file
 */
async function generateTestEmail(filename = 'test-email.html') {
    try {
        const fs = require('fs').promises;
        const DailySummaryEmailGenerator = require('./generate-daily-summary.js');

        const data = getSampleData();
        const generator = new DailySummaryEmailGenerator(data);
        const htmlContent = generator.generateHTML();

        await fs.writeFile(filename, htmlContent, 'utf-8');
        console.log(`✅ Test email generated: ${filename}`);
        console.log(`📊 Stats:`);
        console.log(`   - Employees: ${data.employees.length}`);
        console.log(`   - Tasks: ${data.tasks.length}`);
        console.log(`   - Clients: ${data.clients.length}`);
        
        return filename;
    } catch (error) {
        console.error('❌ Failed to generate test email:', error.message);
        throw error;
    }
}

/**
 * Validate sample data structure
 */
function validateSampleData() {
    const data = getSampleData();
    const issues = [];

    // Check employees
    if (!Array.isArray(data.employees)) {
        issues.push('Employees is not an array');
    } else {
        data.employees.forEach((emp, idx) => {
            if (!emp.name) issues.push(`Employee ${idx}: missing name`);
            if (typeof emp.workedSeconds !== 'number') issues.push(`Employee ${idx}: invalid workedSeconds`);
            if (typeof emp.completedTasks !== 'number') issues.push(`Employee ${idx}: invalid completedTasks`);
            if (!emp.status) issues.push(`Employee ${idx}: missing status`);
            if (typeof emp.productivity !== 'number') issues.push(`Employee ${idx}: invalid productivity`);
        });
    }

    // Check tasks
    if (!Array.isArray(data.tasks)) {
        issues.push('Tasks is not an array');
    } else {
        data.tasks.forEach((task, idx) => {
            if (!task.id) issues.push(`Task ${idx}: missing id`);
            if (!task.client) issues.push(`Task ${idx}: missing client`);
            if (typeof task.duration !== 'number') issues.push(`Task ${idx}: invalid duration`);
        });
    }

    // Check date
    if (!(data.date instanceof Date)) {
        issues.push('Date is not a Date object');
    }

    return {
        isValid: issues.length === 0,
        issues,
        stats: {
            totalEmployees: data.employees.length,
            totalTasks: data.tasks.length,
            totalClients: data.clients.length,
            issues: issues.length
        }
    };
}

/**
 * Print validation report
 */
function printValidationReport() {
    const validation = validateSampleData();
    
    console.log('\n📋 Sample Data Validation Report');
    console.log('================================\n');
    
    console.log(`Status: ${validation.isValid ? '✅ VALID' : '❌ INVALID'}`);
    console.log(`\nStatistics:`);
    console.log(`  Employees: ${validation.stats.totalEmployees}`);
    console.log(`  Tasks: ${validation.stats.totalTasks}`);
    console.log(`  Clients: ${validation.stats.totalClients}`);
    console.log(`  Issues: ${validation.stats.issues}`);
    
    if (validation.issues.length > 0) {
        console.log(`\nIssues found:`);
        validation.issues.forEach(issue => {
            console.log(`  ⚠️  ${issue}`);
        });
    }
    
    console.log('\n');
    return validation;
}

/**
 * Create minimal test data (for quick testing)
 */
function getMinimalTestData() {
    return {
        date: new Date(),
        employees: [
            {
                name: 'Test Employee 1',
                email: 'test1@example.com',
                workedSeconds: 28800,      // 8 hours
                completedTasks: 5,
                status: 'Working',
                currentTask: 'TEST-001',
                currentDuration: 3600,
                productivity: 85,
                isTopPerformer: true
            },
            {
                name: 'Test Employee 2',
                email: 'test2@example.com',
                workedSeconds: 18000,      // 5 hours
                completedTasks: 3,
                status: 'Break',
                currentTask: 'TEST-002',
                currentDuration: 0,
                productivity: 60,
                isTopPerformer: false
            }
        ],
        tasks: [
            { id: 'TEST-001', client: 'Test Client A', duration: 3600, completed: true },
            { id: 'TEST-002', client: 'Test Client B', duration: 3600, completed: true }
        ],
        clients: ['Test Client A', 'Test Client B']
    };
}

/**
 * Get stress test data (large dataset)
 */
function getStressTestData() {
    const employees = [];
    const tasks = [];
    
    // Generate 50 employees
    for (let i = 1; i <= 50; i++) {
        employees.push({
            name: `Employee ${i}`,
            email: `employee${i}@example.com`,
            workedSeconds: Math.random() * 86400,
            completedTasks: Math.floor(Math.random() * 20),
            status: ['Working', 'Break', 'Hold', 'Offline'][Math.floor(Math.random() * 4)],
            currentTask: `TASK-${String(i).padStart(4, '0')}`,
            currentDuration: Math.random() * 14400,
            productivity: Math.floor(Math.random() * 100),
            isTopPerformer: Math.random() > 0.9
        });
    }

    // Generate 200 tasks
    const clients = ['Client A', 'Client B', 'Client C', 'Client D', 'Client E'];
    for (let i = 1; i <= 200; i++) {
        tasks.push({
            id: `TASK-${String(i).padStart(4, '0')}`,
            client: clients[Math.floor(Math.random() * clients.length)],
            duration: Math.random() * 14400,
            completed: Math.random() > 0.3
        });
    }

    return {
        date: new Date(),
        employees,
        tasks,
        clients
    };
}

/**
 * Compare performance between data sizes
 */
async function performanceTest() {
    console.log('\n⚡ Performance Test');
    console.log('===================\n');

    try {
        const DailySummaryEmailGenerator = require('./generate-daily-summary.js');

        // Test 1: Minimal data
        console.log('Test 1: Minimal Data (2 employees, 2 tasks)');
        const minData = getMinimalTestData();
        const minGen = new DailySummaryEmailGenerator(minData);
        console.time('  Generation time');
        const minHtml = minGen.generateHTML();
        console.timeEnd('  Generation time');
        console.log(`  Output size: ${(minHtml.length / 1024).toFixed(2)} KB\n`);

        // Test 2: Sample data
        console.log('Test 2: Sample Data (8 employees, 20 tasks)');
        const sampleData = getSampleData();
        const sampleGen = new DailySummaryEmailGenerator(sampleData);
        console.time('  Generation time');
        const sampleHtml = sampleGen.generateHTML();
        console.timeEnd('  Generation time');
        console.log(`  Output size: ${(sampleHtml.length / 1024).toFixed(2)} KB\n`);

        // Test 3: Stress test
        console.log('Test 3: Stress Test (50 employees, 200 tasks)');
        const stressData = getStressTestData();
        const stressGen = new DailySummaryEmailGenerator(stressData);
        console.time('  Generation time');
        const stressHtml = stressGen.generateHTML();
        console.timeEnd('  Generation time');
        console.log(`  Output size: ${(stressHtml.length / 1024).toFixed(2)} KB\n`);

    } catch (error) {
        console.error('❌ Performance test failed:', error.message);
    }
}

// Export functions
module.exports = {
    getSampleData,
    getMinimalTestData,
    getStressTestData,
    generateTestEmail,
    validateSampleData,
    printValidationReport,
    performanceTest,
    SAMPLE_EMPLOYEES,
    SAMPLE_TASKS,
    SAMPLE_CLIENTS
};

// Run if executed directly
if (require.main === module) {
    console.log('\n🧪 WorkSync Daily Summary Email - Test Suite');
    console.log('==============================================\n');

    // Validate sample data
    printValidationReport();

    // Generate test email
    generateTestEmail('./test-email-sample.html')
        .then(() => {
            console.log('✅ Test email ready: test-email-sample.html');
            console.log('📂 Open this file in your browser to preview the email design\n');
        })
        .catch(error => {
            console.error('Error:', error);
            process.exit(1);
        });

    // Performance test
    performanceTest().then(() => {
        console.log('✅ All tests completed!\n');
    });
}
