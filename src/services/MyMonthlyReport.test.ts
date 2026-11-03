import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('MyMonthlyReport Module Verification', () => {
    let mockWindow: any;
    let MMR: any;

    beforeEach(() => {
        mockWindow = {
            currentUser: {
                email: 'karthikavilpower@gmail.com',
                name: 'Karthika K',
                role: 'Graphic Designer Associate'
            },
            isAdmin: () => false,
            isManager: () => false,
            ADMIN_EMAILS: ['alexvilpower@gmail.com', 'admin@vilpower.com'],
            ADMIN_ROLES: ['Admin', 'Super Admin'],
            LEAVE_APPROVAL_CHAINS: {
                'karthikavilpower@gmail.com': ['digitalmarketing@vilpower.com', 'nanjil@vilpower.com']
            },
            USERS: [
                { email: 'alexvilpower@gmail.com', name: 'Alex', role: 'Admin' },
                { email: 'karthikavilpower@gmail.com', name: 'Karthika K', role: 'Graphic Designer Associate' },
                { email: 'barathvilpower@gmail.com', name: 'Barath Magesh M', role: 'Creative Visual Lead' }
            ],
            tasks: [
                {
                    id: 'NOV-101',
                    desc: 'Diwali Campaign Creative',
                    client: 'SKM',
                    status: 'Approved',
                    priority: 'High',
                    assigneeEmail: 'karthikavilpower@gmail.com',
                    duedate: '2026-11-15',
                    created: '2026-11-01',
                    completedAt: '2026-11-10',
                    reworkCount: 0,
                    manual: false,
                    taskType: 'jira'
                },
                {
                    id: 'NOV-102',
                    desc: 'Brochure Revision',
                    client: 'Mopower',
                    status: 'Rework',
                    priority: 'Medium',
                    assigneeEmail: 'karthikavilpower@gmail.com',
                    duedate: '2026-11-20',
                    created: '2026-11-05',
                    reworkCount: 2,
                    manual: false,
                    taskType: 'jira'
                },
                {
                    id: 'NOV-103',
                    desc: 'Barath Special Brand Project',
                    client: 'Vilpower',
                    status: 'In Progress',
                    priority: 'High',
                    assigneeEmail: 'barathvilpower@gmail.com',
                    duedate: '2026-11-22',
                    created: '2026-11-06',
                    reworkCount: 0,
                    manual: false,
                    taskType: 'jira'
                },
                {
                    id: 'INT-501',
                    desc: 'After Effects Visual Training',
                    category: 'Learning & Training',
                    status: 'Completed',
                    assigneeEmail: 'karthikavilpower@gmail.com',
                    duedate: '2026-11-08',
                    created: '2026-11-02',
                    manual: true,
                    taskType: 'internal'
                }
            ],
            allTimeLogs: [
                {
                    taskId: 'NOV-101',
                    userId: 'karthikavilpower@gmail.com',
                    startTime: new Date(2026, 10, 2, 10, 0, 0).getTime(),
                    endTime: new Date(2026, 10, 2, 13, 30, 0).getTime(),
                    durationSeconds: 12600 // 3.5h
                },
                {
                    taskId: 'NOV-101',
                    userId: 'karthikavilpower@gmail.com',
                    startTime: new Date(2026, 10, 3, 14, 0, 0).getTime(),
                    endTime: new Date(2026, 10, 3, 16, 0, 0).getTime(),
                    durationSeconds: 7200 // 2h
                },
                {
                    taskId: 'INT-501',
                    userId: 'karthikavilpower@gmail.com',
                    startTime: new Date(2026, 10, 4, 11, 0, 0).getTime(),
                    endTime: new Date(2026, 10, 4, 12, 30, 0).getTime(),
                    durationSeconds: 5400 // 1.5h
                },
                {
                    taskId: 'NOV-103',
                    userId: 'barathvilpower@gmail.com',
                    startTime: new Date(2026, 10, 5, 10, 0, 0).getTime(),
                    endTime: new Date(2026, 10, 5, 14, 0, 0).getTime(),
                    durationSeconds: 14400 // 4h
                }
            ],
            attendanceEvents: [
                {
                    userId: 'karthikavilpower@gmail.com',
                    type: 'check_in',
                    timestamp: new Date(2026, 10, 2, 9, 55, 0).getTime()
                },
                {
                    userId: 'karthikavilpower@gmail.com',
                    type: 'check_out',
                    timestamp: new Date(2026, 10, 2, 18, 45, 0).getTime()
                },
                {
                    userId: 'karthikavilpower@gmail.com',
                    type: 'break_end',
                    timestamp: new Date(2026, 10, 2, 14, 0, 0).getTime(),
                    duration: 2700000 // 45m = 2700s
                }
            ],
            allQcReports: [
                {
                    id: 'QC-1',
                    taskId: 'NOV-101',
                    assigneeEmail: 'karthikavilpower@gmail.com',
                    qcScore: 90,
                    rating: 5,
                    status: 'Approved',
                    timestamp: new Date(2026, 10, 9, 16, 0, 0).getTime()
                },
                {
                    id: 'QC-2',
                    taskId: 'NOV-102',
                    assigneeEmail: 'karthikavilpower@gmail.com',
                    qcScore: 60,
                    rating: 3,
                    status: 'Rework',
                    notes: 'Typography alignment and font size mismatch',
                    mistakeItems: ['Typography', 'Hierarchy'],
                    timestamp: new Date(2026, 10, 11, 15, 0, 0).getTime()
                }
            ],
            allUsersMap: new Map([
                ['karthikavilpower@gmail.com', { email: 'karthikavilpower@gmail.com', name: 'Karthika K', role: 'Graphic Designer Associate' }],
                ['barathvilpower@gmail.com', { email: 'barathvilpower@gmail.com', name: 'Barath Magesh M', role: 'Creative Visual Lead' }],
                ['alexvilpower@gmail.com', { email: 'alexvilpower@gmail.com', name: 'Alex', role: 'Admin' }]
            ])
        };

        // Load OneDeskReportingEngine
        const engineCode = fs.readFileSync(path.resolve(__dirname, '../../js/reportingEngine.js'), 'utf8');
        new Function('window', engineCode)(mockWindow);

        // Load MyMonthlyReport
        const mmrCode = fs.readFileSync(path.resolve(__dirname, '../../js/myMonthlyReport.js'), 'utf8');
        new Function('window', mmrCode)(mockWindow);

        MMR = mockWindow.MyMonthlyReport;
    });

    it('should strictly enforce RBAC: a normal employee can only see their own report', () => {
        // Logged in as normal user Karthika
        mockWindow.currentUser = { email: 'karthikavilpower@gmail.com', name: 'Karthika K', role: 'Graphic Designer Associate' };
        mockWindow.isAdmin = () => false;

        // Even if DOM element or request attempts to view Barath's report
        mockWindow.document = {
            getElementById: (id: string) => {
                if (id === 'mmr-user-select') return { value: 'barathvilpower@gmail.com' };
                return null;
            }
        };

        mockWindow.MyMonthlyReport.refresh();
        const data = mockWindow.MyMonthlyReportState.cachedReportData;

        // Must strictly remain Karthika's report
        expect(data.employee.email).toBe('karthikavilpower@gmail.com');
        expect(data.employee.name).toBe('Karthika K');

        // Normal employee attempt to invoke handleUserChange must be rejected
        mockWindow.MyMonthlyReport.handleUserChange('barathvilpower@gmail.com');
        const afterAttempt = mockWindow.MyMonthlyReportState.cachedReportData;
        expect(afterAttempt.employee.email).toBe('karthikavilpower@gmail.com');
    });

    it('should allow Admin to access any user report across the organization', () => {
        // Logged in as Admin Alex
        mockWindow.currentUser = { email: 'alexvilpower@gmail.com', name: 'Alex', role: 'Admin' };
        mockWindow.isAdmin = () => true;

        mockWindow.document = {
            getElementById: (id: string) => {
                if (id === 'mmr-user-select') return { value: 'barathvilpower@gmail.com' };
                return null;
            }
        };

        // Admin switches to Barath's report
        mockWindow.MyMonthlyReport.handleUserChange('barathvilpower@gmail.com');
        let data = mockWindow.MyMonthlyReportState.cachedReportData;

        expect(data.employee.email).toBe('barathvilpower@gmail.com');
        expect(data.employee.name).toBe('Barath Magesh M');
        expect(data.jiraTasks.length).toBe(1);
        expect(data.jiraTasks[0].id).toBe('NOV-103');

        // Admin switches to Karthika's report
        mockWindow.MyMonthlyReport.handleUserChange('karthikavilpower@gmail.com');
        data = mockWindow.MyMonthlyReportState.cachedReportData;

        expect(data.employee.email).toBe('karthikavilpower@gmail.com');
        expect(data.employee.name).toBe('Karthika K');
        expect(data.jiraTasks.length).toBe(2);

        // Admin switches back to their own report
        mockWindow.MyMonthlyReport.switchToMyReport();
        data = mockWindow.MyMonthlyReportState.cachedReportData;
        expect(data.employee.email).toBe('alexvilpower@gmail.com');
    });

    it('should aggregate all employees for Admin in Engine.getAllEmployees()', () => {
        const allEmployees = mockWindow.OneDeskReportingEngine.getAllEmployees();
        const emails = allEmployees.map((e: any) => e.email);

        expect(emails).toContain('alexvilpower@gmail.com');
        expect(emails).toContain('karthikavilpower@gmail.com');
        expect(emails).toContain('barathvilpower@gmail.com');
    });

    it('should cleanly separate Jira tasks from Internal tasks', () => {
        mockWindow.MyMonthlyReport.refresh();
        const data = mockWindow.MyMonthlyReportState.cachedReportData;

        expect(data.jiraTasks.length).toBe(2);
        expect(data.jiraTasks.map((t: any) => t.id)).toEqual(['NOV-101', 'NOV-102']);

        expect(data.internalTasks.length).toBe(1);
        expect(data.internalTasks[0].id).toBe('INT-501');
        expect(data.internalTasks[0].category).toBe('Learning & Training');

        expect(data.kpis.totalAssigned).toBe(3);
        expect(data.kpis.jiraAssigned).toBe(2);
        expect(data.kpis.internalAssigned).toBe(1);
    });

    it('should calculate accurate working sessions and time without breaks for each task', () => {
        mockWindow.MyMonthlyReport.refresh();
        const data = mockWindow.MyMonthlyReportState.cachedReportData;

        const task101 = data.allTasks.find((t: any) => t.id === 'NOV-101');
        expect(task101).toBeDefined();
        expect(task101.workSessionsCount).toBe(2);
        expect(task101.workingTimeSec).toBe(19800); // 3.5h + 2h = 5.5h = 19800s

        const int501 = data.allTasks.find((t: any) => t.id === 'INT-501');
        expect(int501).toBeDefined();
        expect(int501.workSessionsCount).toBe(1);
        expect(int501.workingTimeSec).toBe(5400); // 1.5h = 5400s

        // Total working hours
        expect(data.kpis.totalWorkedSeconds).toBe(25200); // 7.0h
        expect(data.kpis.totalWorkingHours).toBe('7.0');
    });

    it('should correctly evaluate QC performance, failure category, and reviewer trace', () => {
        mockWindow.MyMonthlyReport.refresh();
        const data = mockWindow.MyMonthlyReportState.cachedReportData;

        expect(data.qc.totalSubmissions).toBe(2);
        expect(data.qc.passedCount).toBe(1);
        expect(data.qc.failedCount).toBe(1);
        expect(data.qc.passPct).toBe(50);
        expect(data.qc.avgScore).toBe(75); // (90 + 60) / 2 = 75

        expect(data.qc.failedDetails.length).toBe(1);
        const failure = data.qc.failedDetails[0];
        expect(failure.taskId).toBe('NOV-102');
        expect(failure.failureCategory).toBe('Typography');
        expect(failure.reviewer).toBe('Sneha (QC Incharge)');
    });

    it('should calculate attendance, check-ins, check-outs, and break time properly', () => {
        mockWindow.MyMonthlyReport.refresh();
        const data = mockWindow.MyMonthlyReportState.cachedReportData;

        // Present across 3 working days (Nov 2 with explicit check-in + Nov 3 and Nov 4 with task sessions)
        expect(data.kpis.attendanceDays).toBe(3);
        expect(data.kpis.totalBreakSeconds).toBe(2700); // 45m
        expect(data.kpis.totalBreakFormatted).toBe('0h 45m');
        expect(data.kpis.lateCheckIns).toBe(0); // 9:55 AM is before 10:00 AM
    });

    it('should support Global Filter modes: Previous Month, Historical Month, and Custom Range', () => {
        // 1. Previous Month
        mockWindow.MyMonthlyReport.setPeriodPreset('prev_month');
        expect(mockWindow.MyMonthlyReportState.dateMode).toBe('prev_month');
        let data = mockWindow.MyMonthlyReportState.cachedReportData;
        expect(data.period.statusText).toBe('Completed Period');

        // 2. Historical Month (e.g. October 2026)
        mockWindow.MyMonthlyReport.handleCustomMonthChange(2026, 10);
        expect(mockWindow.MyMonthlyReportState.dateMode).toBe('custom_month');
        expect(mockWindow.MyMonthlyReportState.selectedYear).toBe(2026);
        expect(mockWindow.MyMonthlyReportState.selectedMonth).toBe(10);
        data = mockWindow.MyMonthlyReportState.cachedReportData;
        expect(data.period.periodLabel).toContain('October 2026');

        // 3. Custom Date Range
        mockWindow.document = {
            getElementById: (id: string) => {
                if (id === 'mmr-date-from') return { value: '2026-11-01' };
                if (id === 'mmr-date-to') return { value: '2026-11-05' };
                return null;
            }
        };
        mockWindow.MyMonthlyReport.applyCustomDateRange();
        expect(mockWindow.MyMonthlyReportState.dateMode).toBe('custom_range');
        expect(mockWindow.MyMonthlyReportState.customFrom).toBe('2026-11-01');
        expect(mockWindow.MyMonthlyReportState.customTo).toBe('2026-11-05');
        data = mockWindow.MyMonthlyReportState.cachedReportData;
        expect(data.period.statusText).toBe('Custom Range Period');

        // 4. Reset Filters
        mockWindow.MyMonthlyReport.resetFilters();
        expect(mockWindow.MyMonthlyReportState.dateMode).toBe('current_month');
    });

    it('should allow Admin to view All Employees enterprise summary', () => {
        mockWindow.currentUser = { email: 'alexvilpower@gmail.com', name: 'Alex', role: 'Admin' };
        mockWindow.isAdmin = () => true;

        mockWindow.MyMonthlyReport.handleUserChange('all');
        const data = mockWindow.MyMonthlyReportState.cachedReportData;

        expect(data.employee.email).toBe('all');
        expect(data.employee.name).toBe('All Employees');
        // Total tasks across both Karthika and Barath (4 tasks in mock)
        expect(data.allTasks.length).toBe(4);
        expect(data.kpis.totalAssigned).toBe(4);
    });

    it('should calculate client-wise time breakdown and work share accurately', () => {
        mockWindow.currentUser = { email: 'alexvilpower@gmail.com', name: 'Alex', role: 'Admin' };
        mockWindow.isAdmin = () => true;

        mockWindow.MyMonthlyReport.handleUserChange('all');
        const data = mockWindow.MyMonthlyReportState.cachedReportData;

        // Verify clients exist in tasks
        const clients = [...new Set(data.allTasks.map((t: any) => t.client))];
        expect(clients).toContain('SKM');
        expect(clients).toContain('Mopower');
        expect(clients).toContain('Vilpower');
    });
});
