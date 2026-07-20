/**
 * WorkSync Daily Summary Email Generator
 * Generates premium executive dashboard emails from task tracking data
 */

class DailySummaryEmailGenerator {
    constructor(data = {}) {
        this.data = {
            date: new Date(),
            employees: [],
            tasks: [],
            clients: [],
            ...data
        };
    }

    /**
     * Format duration in seconds to HH:MM:SS
     */
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    /**
     * Calculate KPI metrics
     */
    calculateKPIs() {
        const totalSeconds = this.data.employees.reduce((sum, emp) => sum + (emp.workedSeconds || 0), 0);
        const totalTasks = this.data.tasks.length;
        const activeEmployees = this.data.employees.filter(emp => emp.status !== 'Offline').length;
        const uniqueClients = new Set(this.data.tasks.map(t => t.client)).size;
        const avgTimePerTask = totalTasks > 0 ? totalSeconds / totalTasks : 0;
        
        // Calculate productivity score (0-100)
        const completionRate = totalTasks / (this.data.employees.length * 12) * 100; // Assume 12 tasks/day benchmark
        const averageEfficiency = this.data.employees.reduce((sum, emp) => sum + (emp.productivity || 0), 0) / Math.max(this.data.employees.length, 1);
        const productivityScore = Math.min(100, Math.round((completionRate + averageEfficiency) / 2));

        return {
            totalHours: this.formatDuration(totalSeconds),
            totalTasks,
            activeEmployees,
            clientsWorked: uniqueClients,
            avgTimePerTask: this.formatDuration(Math.round(avgTimePerTask)),
            productivityScore
        };
    }

    /**
     * Get top performers
     */
    getTopPerformers() {
        const sorted = [...this.data.employees].sort((a, b) => (b.completedTasks || 0) - (a.completedTasks || 0));
        return {
            taskComplete: sorted[0],
            longestHours: [...this.data.employees].sort((a, b) => (b.workedSeconds || 0) - (a.workedSeconds || 0))[0],
            highestProductivity: [...this.data.employees].sort((a, b) => (b.productivity || 0) - (a.productivity || 0))[0]
        };
    }

    /**
     * Get employees needing attention
     */
    getAttentionNeeded() {
        return this.data.employees.filter(emp => (emp.completedTasks === 0 && emp.workedSeconds === 0) || emp.status === 'Offline');
    }

    /**
     * Get client summary
     */
    getClientSummary() {
        const summary = {};
        this.data.tasks.forEach(task => {
            summary[task.client] = (summary[task.client] || 0) + 1;
        });
        return Object.entries(summary)
            .sort((a, b) => b[1] - a[1])
            .map(([client, count]) => ({ client, count }));
    }

    /**
     * Get currently active employees
     */
    getActiveEmployees() {
        return this.data.employees
            .filter(emp => emp.status === 'Working' && emp.currentTask)
            .sort((a, b) => (b.currentDuration || 0) - (a.currentDuration || 0));
    }

    /**
     * Generate AI insights
     */
    generateInsights() {
        const kpis = this.calculateKPIs();
        const insights = [];

        insights.push(`Team completed ${kpis.totalTasks} tasks today.`);
        insights.push(`Total working time was ${kpis.totalHours}.`);
        
        const topPerformers = this.getTopPerformers();
        if (topPerformers.taskComplete) {
            insights.push(`${topPerformers.taskComplete.name} completed the highest number of tasks.`);
        }
        if (topPerformers.longestHours) {
            insights.push(`${topPerformers.longestHours.name} logged the highest working hours.`);
        }

        const attentionNeeded = this.getAttentionNeeded();
        if (attentionNeeded.length > 0) {
            insights.push(`${attentionNeeded.length} employees recorded no activity today.`);
        }

        insights.push(`Overall productivity score: ${kpis.productivityScore}%`);

        return insights;
    }

    /**
     * Generate recommendations
     */
    generateRecommendations() {
        const recommendations = [
            'Follow up with inactive employees to ensure no blockers.',
            'Balance workload across teams to maintain even distribution.',
            'Review pending client approvals to ensure timely delivery.',
            'Allocate complex tasks to top performers for better outcomes.',
            'Monitor weekend schedule and confirm team availability.'
        ];
        return recommendations;
    }

    /**
     * Format date for display
     */
    formatDate(date) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    /**
     * Get time for display
     */
    getFormattedTime(date) {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    /**
     * Generate employee rows for table
     */
    generateEmployeeRows() {
        return this.data.employees.map(emp => {
            const statusBadgeClass = `status-${emp.status.toLowerCase()}`;
            const statusEmoji = {
                'Working': '🟢',
                'Break': '🟡',
                'Hold': '🟠',
                'Offline': '⚪'
            }[emp.status] || '⚪';

            return `
                <tr${emp.isTopPerformer ? ' class="highlight-row"' : ''}>
                    <td><strong>${emp.name}</strong></td>
                    <td>${this.formatDuration(emp.workedSeconds || 0)}</td>
                    <td><strong>${emp.completedTasks || 0}</strong></td>
                    <td><span class="status-badge ${statusBadgeClass}">${statusEmoji} ${emp.status}</span></td>
                    <td>${emp.currentTask ? `<span class="task-id">${emp.currentTask}</span>` : '—'}</td>
                    <td><strong>${emp.productivity || 0}%</strong></td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Generate client list items
     */
    generateClientItems() {
        const clients = this.getClientSummary();
        return clients.map(({ client, count }) => `
            <li class="client-item">
                <span class="client-name">${client}</span>
                <span class="client-count">${count} Tasks</span>
            </li>
        `).join('');
    }

    /**
     * Generate active employees list
     */
    generateActiveEmployeesList() {
        const active = this.getActiveEmployees();
        return active.map(emp => `
            <li class="active-item">
                <div>
                    <div class="active-employee">${emp.name}</div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 4px;"><span class="task-id">${emp.currentTask}</span></div>
                </div>
                <div class="active-duration">${this.formatDuration(emp.currentDuration || 0)}</div>
            </li>
        `).join('');
    }

    /**
     * Generate top performers cards
     */
    generateTopPerformersCards() {
        const top = this.getTopPerformers();
        let html = '';

        if (top.taskComplete) {
            html += `
                <div class="performer-card">
                    <div class="performer-badge">🥇</div>
                    <div class="performer-name">${top.taskComplete.name}</div>
                    <div class="performer-metric">Highest Tasks Completed</div>
                    <div class="performer-metric"><strong>${top.taskComplete.completedTasks || 0} Tasks</strong></div>
                </div>
            `;
        }

        if (top.longestHours) {
            html += `
                <div class="performer-card">
                    <div class="performer-badge">🥈</div>
                    <div class="performer-name">${top.longestHours.name}</div>
                    <div class="performer-metric">Longest Working Hours</div>
                    <div class="performer-metric"><strong>${this.formatDuration(top.longestHours.workedSeconds || 0)}</strong></div>
                </div>
            `;
        }

        if (top.highestProductivity) {
            html += `
                <div class="performer-card">
                    <div class="performer-badge">🥉</div>
                    <div class="performer-name">${top.highestProductivity.name}</div>
                    <div class="performer-metric">Highest Productivity</div>
                    <div class="performer-metric"><strong>${top.highestProductivity.productivity || 0}%</strong></div>
                </div>
            `;
        }

        return html;
    }

    /**
     * Generate employees needing attention alert
     */
    generateAttentionAlert() {
        const attentionNeeded = this.getAttentionNeeded();
        if (attentionNeeded.length === 0) {
            return '<div class="alert-box" style="background-color: #d1fae5; border-left-color: #10b981;"><div class="alert-title" style="color: #065f46;">✓ All Employees Active</div><div class="alert-content" style="color: #047857;">All team members have recorded activity today. Great work!</div></div>';
        }

        const names = attentionNeeded.map(emp => `<li><strong>${emp.name}</strong> – ${emp.completedTasks || 0} tasks, ${this.formatDuration(emp.workedSeconds || 0)} hours worked</li>`).join('');

        return `
            <div class="alert-box">
                <div class="alert-title">⚠️ Employees Requiring Attention</div>
                <div class="alert-content">
                    <p style="margin: 0 0 8px 0;"><strong>No activity recorded today:</strong></p>
                    <ul class="alert-list">
                        ${names}
                    </ul>
                    <p style="margin: 8px 0 0 0; font-size: 12px; font-style: italic;">Recommended action: Follow up with inactive team members to ensure no blockers.</p>
                </div>
            </div>
        `;
    }

    /**
     * Generate insights list
     */
    generateInsightsList() {
        const insights = this.generateInsights();
        return insights.map(insight => `
            <li class="insights-item">
                <span class="insights-bullet">•</span>
                <span>${insight}</span>
            </li>
        `).join('');
    }

    /**
     * Generate recommendations list
     */
    generateRecommendationsList() {
        const recommendations = this.generateRecommendations();
        return recommendations.map(rec => `
            <li class="recommendations-item">
                <span class="recommendations-bullet">✓</span>
                <span>${rec}</span>
            </li>
        `).join('');
    }

    /**
     * Generate complete email HTML
     */
    generateHTML() {
        const kpis = this.calculateKPIs();
        const dateStr = this.formatDate(this.data.date);
        const timeStr = this.getFormattedTime(this.data.date);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>WorkSync Daily Summary</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
        }
        
        .email-container {
            max-width: 950px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 4px 6px rgba(15, 23, 42, 0.08);
        }

        .header {
            background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
            padding: 40px 32px;
            text-align: center;
            border-bottom: 4px solid #4f46e5;
        }

        .logo-container {
            margin-bottom: 20px;
        }

        .logo {
            display: inline-block;
            font-size: 24px;
            font-weight: 900;
            color: #ffffff;
            letter-spacing: -1px;
        }

        .header-title {
            font-size: 32px;
            font-weight: 900;
            color: #ffffff;
            margin: 16px 0 8px 0;
            letter-spacing: -0.5px;
        }

        .header-subtitle {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.85);
            margin: 0;
            font-weight: 500;
        }

        .content {
            padding: 40px 32px;
        }

        .section-title {
            font-size: 16px;
            font-weight: 900;
            color: #1e293b;
            margin: 32px 0 20px 0;
            padding-bottom: 12px;
            border-bottom: 2px solid #e2e8f0;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }

        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 32px;
        }

        .kpi-card {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
        }

        .kpi-icon {
            font-size: 28px;
            margin-bottom: 12px;
        }

        .kpi-label {
            font-size: 12px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }

        .kpi-value {
            font-size: 36px;
            font-weight: 900;
            color: #6366f1;
            margin: 0;
            line-height: 1;
        }

        .table-wrapper {
            overflow-x: auto;
            margin-bottom: 32px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
        }

        th {
            background-color: #f1f5f9;
            border: 1px solid #e2e8f0;
            padding: 12px 16px;
            text-align: left;
            font-weight: 700;
            color: #1e293b;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        td {
            border: 1px solid #e2e8f0;
            padding: 12px 16px;
            vertical-align: middle;
        }

        tr:nth-child(odd) td {
            background-color: #f8fafc;
        }

        tr:nth-child(even) td {
            background-color: #ffffff;
        }

        .status-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-align: center;
        }

        .status-working {
            background-color: #d1fae5;
            color: #065f46;
        }

        .status-break {
            background-color: #fef3c7;
            color: #92400e;
        }

        .status-hold {
            background-color: #fed7aa;
            color: #92400e;
        }

        .status-offline {
            background-color: #f3f4f6;
            color: #6b7280;
        }

        .task-id {
            font-family: 'Courier New', monospace;
            font-weight: 600;
            color: #6366f1;
        }

        .highlight-row {
            background-color: #fef9e7 !important;
        }

        .performers-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 32px;
        }

        .performer-card {
            background: linear-gradient(135deg, #fef9e7 0%, #fef3c7 100%);
            border: 2px solid #fcd34d;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
        }

        .performer-badge {
            font-size: 36px;
            margin-bottom: 12px;
        }

        .performer-name {
            font-size: 14px;
            font-weight: 700;
            color: #1e293b;
            margin: 12px 0 8px 0;
        }

        .performer-metric {
            font-size: 12px;
            color: #64748b;
            margin: 4px 0;
        }

        .alert-box {
            background-color: #fee2e2;
            border-left: 4px solid #ef4444;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 32px;
        }

        .alert-title {
            font-weight: 700;
            color: #991b1b;
            margin: 0 0 12px 0;
            font-size: 14px;
        }

        .alert-content {
            color: #7f1d1d;
            font-size: 13px;
            line-height: 1.6;
        }

        .alert-list {
            margin: 8px 0 0 20px;
            padding: 0;
        }

        .alert-list li {
            margin: 6px 0;
        }

        .client-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .client-item {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #e2e8f0;
            font-size: 14px;
        }

        .client-item:last-child {
            border-bottom: none;
        }

        .client-name {
            font-weight: 600;
            color: #1e293b;
        }

        .client-count {
            background-color: #6366f1;
            color: #ffffff;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 700;
        }

        .active-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .active-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 16px;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            margin-bottom: 8px;
            font-size: 13px;
        }

        .active-employee {
            font-weight: 600;
            color: #1e293b;
        }

        .active-duration {
            font-family: 'Courier New', monospace;
            color: #6366f1;
            font-weight: 600;
        }

        .insights-box {
            background: linear-gradient(135deg, #ede9fe 0%, #f3e8ff 100%);
            border: 2px solid #c4b5fd;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 32px;
        }

        .insights-box .section-title {
            margin-top: 0;
            color: #6d28d9;
            border-bottom-color: #c4b5fd;
        }

        .insights-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .insights-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 12px;
            font-size: 13px;
            line-height: 1.6;
            color: #5b21b6;
        }

        .insights-item:last-child {
            margin-bottom: 0;
        }

        .insights-bullet {
            margin-right: 10px;
            color: #a78bfa;
            font-weight: 700;
        }

        .recommendations-box {
            background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
            border: 2px solid #93c5fd;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 32px;
        }

        .recommendations-box .section-title {
            margin-top: 0;
            color: #1e40af;
            border-bottom-color: #93c5fd;
        }

        .recommendations-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .recommendations-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 12px;
            font-size: 13px;
            line-height: 1.6;
            color: #1e3a8a;
        }

        .recommendations-item:last-child {
            margin-bottom: 0;
        }

        .recommendations-bullet {
            margin-right: 10px;
            color: #60a5fa;
            font-weight: 700;
        }

        .footer {
            background-color: #f8fafc;
            border-top: 1px solid #e2e8f0;
            padding: 24px 32px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
        }

        .footer-text {
            margin: 8px 0;
        }

        .footer-brand {
            font-weight: 700;
            color: #1e293b;
        }

        @media (max-width: 768px) {
            .kpi-grid,
            .performers-grid {
                grid-template-columns: 1fr;
                gap: 12px;
            }

            .content {
                padding: 24px 16px;
            }

            .header {
                padding: 24px 16px;
            }

            .header-title {
                font-size: 24px;
            }

            table {
                font-size: 12px;
            }

            th, td {
                padding: 8px 12px;
            }

            .kpi-value {
                font-size: 28px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo-container">
                <div class="logo">🔷 ONEDESK</div>
            </div>
            <h1 class="header-title">WorkSync Daily Summary</h1>
            <p class="header-subtitle">${dateStr} • Generated at ${timeStr}</p>
        </div>

        <div class="content">
            <div class="section-title">📊 Executive KPI Dashboard</div>
            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-icon">⏱️</div>
                    <div class="kpi-label">Total Worked Hours</div>
                    <p class="kpi-value">${kpis.totalHours}</p>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">📋</div>
                    <div class="kpi-label">Tasks Logged</div>
                    <p class="kpi-value">${kpis.totalTasks}</p>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">👥</div>
                    <div class="kpi-label">Active Employees</div>
                    <p class="kpi-value">${kpis.activeEmployees}</p>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">🏢</div>
                    <div class="kpi-label">Clients Worked</div>
                    <p class="kpi-value">${kpis.clientsWorked}</p>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">⚡</div>
                    <div class="kpi-label">Avg Time per Task</div>
                    <p class="kpi-value">${kpis.avgTimePerTask}</p>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">📈</div>
                    <div class="kpi-label">Productivity Score</div>
                    <p class="kpi-value">${kpis.productivityScore}%</p>
                </div>
            </div>

            <div class="section-title">👥 Employee Performance</div>
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Worked Hours</th>
                            <th>Completed Tasks</th>
                            <th>Status</th>
                            <th>Current Task</th>
                            <th>Productivity %</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.generateEmployeeRows()}
                    </tbody>
                </table>
            </div>

            <div class="section-title">🏆 Today's Top Performers</div>
            <div class="performers-grid">
                ${this.generateTopPerformersCards()}
            </div>

            ${this.generateAttentionAlert()}

            <div class="section-title">🏢 Client-Wise Task Distribution</div>
            <ul class="client-list">
                ${this.generateClientItems()}
            </ul>

            <div class="section-title">⚡ Currently Active Employees</div>
            <ul class="active-list">
                ${this.generateActiveEmployeesList()}
            </ul>

            <div class="insights-box">
                <div class="section-title">💡 AI Daily Insights</div>
                <ul class="insights-list">
                    ${this.generateInsightsList()}
                </ul>
            </div>

            <div class="recommendations-box">
                <div class="section-title">🎯 Tomorrow's Recommendations</div>
                <ul class="recommendations-list">
                    ${this.generateRecommendationsList()}
                </ul>
            </div>
        </div>

        <div class="footer">
            <p class="footer-text">Generated automatically by <span class="footer-brand">OneDesk</span></p>
            <p class="footer-text"><span class="footer-brand">VilPower Solutions Pvt Ltd</span></p>
            <p class="footer-text" style="font-size: 11px; color: #94a3b8;">This is an automated email. Please do not reply directly.</p>
        </div>
    </div>
</body>
</html>`;
    }
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DailySummaryEmailGenerator;
}
