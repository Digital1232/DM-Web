/**
 * WorkSync Daily Summary Email - Integration Example
 * Shows how to integrate the email generator with Firebase data
 */

// Example 1: Basic Integration with Firebase Realtime Database
async function generateAndSendDailySummaryEmail(adminEmail) {
    try {
        // Import the generator
        const DailySummaryEmailGenerator = require('./generate-daily-summary.js');

        // Get today's data from Firebase
        const dailyData = await fetchTodayData();

        // Create generator instance
        const generator = new DailySummaryEmailGenerator(dailyData);

        // Generate HTML
        const htmlContent = generator.generateHTML();

        // Send email (using your email service)
        await sendEmailViaService(adminEmail, htmlContent);

        console.log('Daily summary email sent successfully');
        return true;
    } catch (error) {
        console.error('Failed to send daily summary:', error);
        return false;
    }
}

// Example 2: Fetch and format data from Firebase
async function fetchTodayData() {
    // This function fetches data from your Firebase database
    // Adjust paths according to your database structure

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch employees
    const employeesSnapshot = await fetch('/.json?orderBy="email"&print=pretty');
    const allEmployees = await employeesSnapshot.json();

    // Fetch tasks for today
    const tasksSnapshot = await fetch(`/tasks.json?orderBy="date"&startAt="${today.toISOString()}"&endAt="${tomorrow.toISOString()}"&print=pretty`);
    const tasksData = await tasksSnapshot.json();

    // Format employees with today's stats
    const employees = formatEmployeeStats(allEmployees, tasksData);

    // Format tasks
    const tasks = formatTaskData(tasksData);

    // Get unique clients
    const clients = getUniqueClients(tasks);

    return {
        date: new Date(),
        employees,
        tasks,
        clients
    };
}

// Example 3: Format employee statistics
function formatEmployeeStats(employeesList, tasksData) {
    const employeeMap = {};
    
    // Initialize employee data
    Object.entries(employeesList).forEach(([key, employee]) => {
        employeeMap[key] = {
            name: employee.name,
            email: employee.email,
            workedSeconds: 0,
            completedTasks: 0,
            status: 'Offline',
            currentTask: null,
            currentDuration: 0,
            productivity: 0,
            isTopPerformer: false
        };
    });

    // Calculate stats from tasks
    if (tasksData) {
        Object.entries(tasksData).forEach(([taskId, task]) => {
            const employeeKey = task.assignedTo?.replace(/[@.]/g, '_');
            
            if (employeeMap[employeeKey]) {
                // Add task duration to worked time
                employeeMap[employeeKey].workedSeconds += task.duration || 0;

                // Count completed tasks
                if (task.status === 'Completed') {
                    employeeMap[employeeKey].completedTasks++;
                }

                // Update current task if in progress
                if (task.status === 'In Progress') {
                    employeeMap[employeeKey].currentTask = task.id;
                    employeeMap[employeeKey].currentDuration = task.currentDuration || 0;
                    employeeMap[employeeKey].status = 'Working';
                }
            }
        });
    }

    // Calculate productivity scores
    const maxTasks = Math.max(...Object.values(employeeMap).map(e => e.completedTasks), 1);
    const maxHours = Math.max(...Object.values(employeeMap).map(e => e.workedSeconds), 1);

    Object.values(employeeMap).forEach(emp => {
        const taskScore = (emp.completedTasks / maxTasks) * 100;
        const timeScore = (emp.workedSeconds / maxHours) * 100;
        emp.productivity = Math.round((taskScore + timeScore) / 2);
    });

    return Object.values(employeeMap);
}

// Example 4: Format task data
function formatTaskData(tasksData) {
    if (!tasksData) return [];

    return Object.entries(tasksData).map(([id, task]) => ({
        id: task.id || id,
        client: task.client || 'Unassigned',
        employee: task.assignedTo || 'Unassigned',
        duration: task.duration || 0,
        completed: task.status === 'Completed'
    }));
}

// Example 5: Get unique clients
function getUniqueClients(tasks) {
    const clients = new Set();
    tasks.forEach(task => {
        if (task.client) {
            clients.add(task.client);
        }
    });
    return Array.from(clients);
}

// Example 6: Send email via email service (Nodemailer example)
async function sendEmailViaService(recipientEmail, htmlContent) {
    const nodemailer = require('nodemailer');

    // Configure transporter (adjust for your email service)
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });

    // Send email
    const info = await transporter.sendMail({
        from: {
            name: 'WorkSync',
            email: 'worksync@vilpower.com'
        },
        to: recipientEmail,
        subject: `WorkSync Daily Summary - ${new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}`,
        html: htmlContent,
        headers: {
            'X-Priority': '1',
            'X-MSMail-Priority': 'High'
        }
    });

    console.log('Email sent:', info.messageId);
    return info;
}

// Example 7: Schedule daily email (using node-cron)
function scheduleDefaultDailySummary(adminEmail) {
    const cron = require('node-cron');

    // Send at 6 PM every day
    cron.schedule('0 18 * * *', () => {
        console.log('Scheduled: Sending daily summary email...');
        generateAndSendDailySummaryEmail(adminEmail)
            .catch(error => console.error('Scheduled email failed:', error));
    });

    console.log('Daily summary email scheduler started (6 PM daily)');
}

// Example 8: Send on-demand email
async function sendOnDemandDailySummary(adminEmail) {
    console.log('Generating on-demand daily summary...');
    return await generateAndSendDailySummaryEmail(adminEmail);
}

// Example 9: Send to multiple recipients
async function sendToMultipleRecipients(adminEmails) {
    const results = [];
    
    for (const email of adminEmails) {
        try {
            await generateAndSendDailySummaryEmail(email);
            results.push({ email, status: 'sent' });
        } catch (error) {
            results.push({ email, status: 'failed', error: error.message });
        }
    }
    
    return results;
}

// Example 10: Save email to file for preview/testing
async function saveEmailToFile(filename = 'daily-summary.html') {
    const fs = require('fs').promises;
    const DailySummaryEmailGenerator = require('./generate-daily-summary.js');

    // Create sample data
    const sampleData = {
        date: new Date(),
        employees: [
            {
                name: 'Karthika K',
                email: 'karthika@vilpower.com',
                workedSeconds: 27922,
                completedTasks: 12,
                status: 'Working',
                currentTask: 'JULY-401',
                currentDuration: 7095,
                productivity: 98,
                isTopPerformer: true
            },
            {
                name: 'Palanirajan R',
                email: 'palanirajan@vilpower.com',
                workedSeconds: 29565,
                completedTasks: 10,
                status: 'Working',
                currentTask: 'JULY-402',
                currentDuration: 8640,
                productivity: 96,
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
            }
        ],
        tasks: [
            { id: 'JULY-401', client: 'VilPower', duration: 3600, completed: true },
            { id: 'JULY-402', client: 'NTT', duration: 3600, completed: true },
            { id: 'JULY-403', client: 'Einstein', duration: 3600, completed: true }
        ],
        clients: ['VilPower', 'NTT', 'Einstein']
    };

    const generator = new DailySummaryEmailGenerator(sampleData);
    const htmlContent = generator.generateHTML();

    await fs.writeFile(filename, htmlContent, 'utf-8');
    console.log(`Email saved to ${filename}`);
}

// Example 11: Validate data before sending
function validateEmailData(data) {
    const errors = [];

    if (!Array.isArray(data.employees) || data.employees.length === 0) {
        errors.push('Invalid or empty employees array');
    }

    if (!Array.isArray(data.tasks)) {
        errors.push('Invalid tasks array');
    }

    if (!(data.date instanceof Date)) {
        errors.push('Invalid date object');
    }

    data.employees.forEach((emp, index) => {
        if (!emp.name) errors.push(`Employee ${index} missing name`);
        if (typeof emp.workedSeconds !== 'number') errors.push(`Employee ${index} invalid workedSeconds`);
        if (typeof emp.completedTasks !== 'number') errors.push(`Employee ${index} invalid completedTasks`);
    });

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Example 12: Generate with error handling
async function generateAndSendWithValidation(adminEmail) {
    try {
        // Fetch data
        const data = await fetchTodayData();

        // Validate data
        const validation = validateEmailData(data);
        if (!validation.isValid) {
            console.error('Data validation failed:', validation.errors);
            return false;
        }

        // Generate and send
        const DailySummaryEmailGenerator = require('./generate-daily-summary.js');
        const generator = new DailySummaryEmailGenerator(data);
        const htmlContent = generator.generateHTML();

        await sendEmailViaService(adminEmail, htmlContent);
        
        console.log('Daily summary email generated and sent successfully');
        return true;
    } catch (error) {
        console.error('Error:', error.message);
        return false;
    }
}

// Export functions for external use
module.exports = {
    generateAndSendDailySummaryEmail,
    fetchTodayData,
    formatEmployeeStats,
    formatTaskData,
    getUniqueClients,
    sendEmailViaService,
    scheduleDefaultDailySummary,
    sendOnDemandDailySummary,
    sendToMultipleRecipients,
    saveEmailToFile,
    validateEmailData,
    generateAndSendWithValidation
};

// If running directly
if (require.main === module) {
    // Test: Save sample email to file
    saveEmailToFile('./test-email.html')
        .then(() => console.log('Test email saved'))
        .catch(error => console.error('Test failed:', error));
}
