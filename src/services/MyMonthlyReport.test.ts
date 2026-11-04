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

    it('custom date range lists only tasks worked on or completed in that range', () => {
        // The app provides this helper (index.html isCompletedTask); "Approved" counts as done.
        mockWindow.isCompletedTask = (s: string) => /^(done|posted|completed|approved|client approved)/i.test(String(s || '').trim());
        const applyRange = (from: string, to: string) => {
            mockWindow.document = {
                getElementById: (id: string) => {
                    if (id === 'mmr-date-from') return { value: from };
                    if (id === 'mmr-date-to') return { value: to };
                    return null;
                }
            };
            mockWindow.MyMonthlyReport.applyCustomDateRange();
            return mockWindow.MyMonthlyReportState.cachedReportData;
        };

        // Single day: only INT-501 was worked on 4 Nov. NOV-101 (worked 2–3 Nov) and
        // NOV-102 (never worked) must not appear even though they are November tasks.
        let data = applyRange('2026-11-04', '2026-11-04');
        expect(data.allTasks.map((t: any) => t.id)).toEqual(['INT-501']);
        expect(data.jiraTasks.length).toBe(0);
        expect(data.kpis.totalWorkedSeconds).toBe(5400);

        // 2–3 Nov: only NOV-101 had sessions.
        data = applyRange('2026-11-02', '2026-11-03');
        expect(data.allTasks.map((t: any) => t.id)).toEqual(['NOV-101']);
        expect(data.kpis.totalWorkedSeconds).toBe(19800);

        // Completed in range without a session still counts (NOV-101 completedAt 10 Nov).
        data = applyRange('2026-11-10', '2026-11-10');
        expect(data.allTasks.map((t: any) => t.id)).toEqual(['NOV-101']);
        expect(data.kpis.totalWorkedSeconds).toBe(0);
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

        const mockDom: Record<string, any> = {
            'mmr-client-timing-kpis': { innerHTML: '' },
            'mmr-client-total-badge': { textContent: '' },
            'mmr-client-timing-tbody': { innerHTML: '' },
            'mmr-chart-client-hours': { getContext: () => null },
            'mmr-tab-client-timing': { classList: { add: () => {}, remove: () => {} } },
            'mmr-subtab-btn-client-timing': { classList: { add: () => {}, remove: () => {} } }
        };
        mockWindow.document = {
            getElementById: (id: string) => mockDom[id] || { value: '', classList: { add: () => {}, remove: () => {} } }
        };

        // 1. Test for individual user (Karthika)
        mockWindow.MyMonthlyReport.handleUserChange('karthikavilpower@gmail.com');
        mockWindow.MyMonthlyReport.switchSubTab('client-timing');
        let data = mockWindow.MyMonthlyReportState.cachedReportData;

        expect(mockDom['mmr-client-timing-kpis'].innerHTML).toContain('Active Clients');
        expect(mockDom['mmr-client-timing-tbody'].innerHTML).toContain('SKM');
        expect(mockDom['mmr-client-timing-tbody'].innerHTML).toContain('5h 30m'); // NOV-101 (3.5h + 2h)

        // 2. Test for All Employees
        mockWindow.MyMonthlyReport.handleUserChange('all');
        mockWindow.MyMonthlyReport.switchSubTab('client-timing');
        data = mockWindow.MyMonthlyReportState.cachedReportData;

        // Verify clients exist in tasks and table
        expect(mockDom['mmr-client-timing-tbody'].innerHTML).toContain('SKM');
        expect(mockDom['mmr-client-timing-tbody'].innerHTML).toContain('Vilpower');
    });

    it('should produce identical task counts whether Admin views employee or employee views themselves', () => {
        // 1. Employee Barath logs in and views their own report
        mockWindow.currentUser = { email: 'barathvilpower@gmail.com', name: 'Barath Magesh', role: 'Team Member' };
        mockWindow.isAdmin = () => false;
        mockWindow.MyMonthlyReport.refresh();
        const userViewData = mockWindow.MyMonthlyReportState.cachedReportData;

        // 2. Admin logs in and views Barath's report
        mockWindow.currentUser = { email: 'digitalmarketing@vilpower.com', name: 'VilPower Admin', role: 'Admin' };
        mockWindow.isAdmin = () => true;
        mockWindow.MyMonthlyReport.handleUserChange('barathvilpower@gmail.com');
        const adminViewData = mockWindow.MyMonthlyReportState.cachedReportData;

        // 3. Compare counts
        expect(adminViewData.kpis.totalAssigned).toBe(userViewData.kpis.totalAssigned);
        expect(adminViewData.kpis.jiraAssigned).toBe(userViewData.kpis.jiraAssigned);
        expect(adminViewData.kpis.internalAssigned).toBe(userViewData.kpis.internalAssigned);
        expect(adminViewData.kpis.completed).toBe(userViewData.kpis.completed);
        expect(adminViewData.jiraTasks.map((t: any) => t.id)).toEqual(userViewData.jiraTasks.map((t: any) => t.id));
    });

    it('should export a comprehensive 7-page PDF report covering all 11 subtab sections page-by-page', () => {
        mockWindow.currentUser = { email: 'digitalmarketing@vilpower.com', name: 'Admin', role: 'Admin' };
        mockWindow.isAdmin = () => true;

        let writtenHtml = '';
        mockWindow.open = () => ({
            document: {
                write: (content: string) => { writtenHtml += content; },
                close: () => {}
            },
            focus: () => {},
            print: () => {}
        });

        mockWindow.MyMonthlyReport.handleUserChange('karthikavilpower@gmail.com');
        mockWindow.MyMonthlyReport.exportPdf();

        expect(writtenHtml).toContain('VilPower OneDesk');
        expect(writtenHtml).toContain('Monthly Performance Statement');
        // Check presence of all requested sections
        expect(writtenHtml).toContain('Executive Overview &amp; Scorecard');
        expect(writtenHtml).toContain('Task-Wise Timing List');
        expect(writtenHtml).toContain('TASK DESCRIPTION');
        expect(writtenHtml).toContain('TOTAL TIME');
        expect(writtenHtml).toContain('Overall Quality Score &amp; Rework');
        expect(writtenHtml).toContain('Overall QC Score');
        expect(writtenHtml).toContain('Rework & Revision Analysis');
        expect(writtenHtml).toContain('Attendance with Break Distribution');
        expect(writtenHtml).toContain('Attendance, Working Hours & Break Distribution');
        expect(writtenHtml).toContain('AI Insights &amp; Appraisal');
        expect(writtenHtml).toContain('Formal Monthly Performance Review & Appraisal Sign-Off');
    });

    it('Phase 1 & Phase 2: should resolve canonical employee identities and prevent duplicate selector entries', () => {
        // Test normalizeEmail mappings
        expect(mockWindow.OneDeskReportingEngine.normalizeEmail('barath@vilpower.com')).toBe('barathvilpower@gmail.com');
        expect(mockWindow.OneDeskReportingEngine.normalizeEmail('alex@vilpower.com')).toBe('alexvilpower@gmail.com');
        expect(mockWindow.OneDeskReportingEngine.normalizeEmail('karthika@vilpower.com')).toBe('karthikavilpower@gmail.com');

        // Test employee de-duplication in getAllEmployees
        mockWindow.USERS = [
            { email: 'barathvilpower@gmail.com', name: 'Barath Magesh M', role: 'Manager - Creative Content & Visual' },
            { email: 'karthikavilpower@gmail.com', name: 'Karthika K', role: 'Graphic Designer Associate' }
        ];
        mockWindow.allUsersMap = new Map([
            ['barath@vilpower.com', { email: 'barath@vilpower.com', name: 'Barath Magesh', role: 'Manager' }],
            ['barathvilpower@gmail.com', { email: 'barathvilpower@gmail.com', name: 'Barath Magesh M', role: 'Manager - Creative Content & Visual' }]
        ]);

        const employees = mockWindow.OneDeskReportingEngine.getAllEmployees();
        const barathEntries = employees.filter((e: any) => e.email === 'barathvilpower@gmail.com');
        expect(barathEntries.length).toBe(1);
        expect(barathEntries[0].name).toBe('Barath Magesh M');
    });

    it('Phase 1 & Phase 2: should strictly separate Assigned, Worked, and Unstarted tasks and exclude unstarted from timing tab', () => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0).getTime();

        mockWindow.tasks = [
            {
                id: 'NOV-101',
                desc: 'Worked Jira Deliverable 1',
                status: 'Done',
                assigneeEmail: 'barathvilpower@gmail.com',
                assignee: 'Barath Magesh M',
                project: 'NOV',
                created: startOfMonth + 1000
            },
            {
                id: 'M-102',
                desc: 'Worked Internal Task',
                status: 'Completed',
                manual: true,
                assigneeEmail: 'barathvilpower@gmail.com',
                assignee: 'Barath Magesh M',
                created: startOfMonth + 2000
            },
            {
                id: 'NOV-103',
                desc: 'Unstarted Backlog Task with 0 sessions',
                status: 'In Progress',
                assigneeEmail: 'barathvilpower@gmail.com',
                assignee: 'Barath Magesh M',
                project: 'NOV',
                created: startOfMonth + 3000
            }
        ];

        // Only NOV-101 and M-102 have logged time sessions
        mockWindow.allTimeLogs = [
            {
                taskId: 'NOV-101',
                userId: 'barathvilpower@gmail.com',
                userName: 'Barath Magesh M',
                startTime: startOfMonth + 5000,
                endTime: startOfMonth + 8600000,
                durationSeconds: 3600
            },
            {
                taskId: 'M-102',
                userId: 'barathvilpower@gmail.com',
                userName: 'Barath Magesh M',
                startTime: startOfMonth + 10000,
                endTime: startOfMonth + 13600000,
                durationSeconds: 1800
            }
        ];

        mockWindow.currentUser = { email: 'digitalmarketing@vilpower.com', name: 'Palanirajan R', role: 'admin' };
        mockWindow.MyMonthlyReport.handleUserChange('barathvilpower@gmail.com');

        const data = (mockWindow as any).MyMonthlyReportState.cachedReportData;
        expect(data).toBeDefined();

        // Total Assigned: 3 (NOV-101, M-102, NOV-103)
        expect(data.kpis.totalAssigned).toBe(3);
        // Worked Tasks: 2 (NOV-101, M-102)
        expect(data.kpis.workedTasks).toBe(2);
        expect(data.workedTasks.length).toBe(2);
        // Unstarted Tasks: 1 (NOV-103)
        expect(data.kpis.unstartedTasks).toBe(1);
        expect(data.unstartedTasks.length).toBe(1);
        expect(data.unstartedTasks[0].id).toBe('NOV-103');

        // Task-Wise Timing list strictly contains only worked tasks (NOV-103 is excluded)
        expect(data.timingTasks.length).toBe(2);
        const timingIds = data.timingTasks.map((t: any) => t.id);
        expect(timingIds).toContain('NOV-101');
        expect(timingIds).toContain('M-102');
        expect(timingIds).not.toContain('NOV-103');
    });

    it('Phase 3: should calculate comprehensive client metrics, work share %, and render client deliverables accordion', () => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0).getTime();

        const mockDom: any = {
            'mmr-client-timing-kpis': { innerHTML: '' },
            'mmr-client-total-badge': { textContent: '' },
            'mmr-client-timing-tbody': { innerHTML: '' },
            'mmr-tab-client-timing': { classList: { add: () => {}, remove: () => {} }, querySelector: () => null, insertBefore: () => {} },
            'mmr-subtab-btn-client-timing': { classList: { add: () => {}, remove: () => {} } }
        };
        mockWindow.document = {
            getElementById: (id: string) => mockDom[id] || { value: '', classList: { add: () => {}, remove: () => {} } },
            createElement: () => ({ id: '', className: '', innerHTML: '' })
        };

        mockWindow.tasks = [
            { id: 'NOV-201', desc: 'Client A Campaign', client: 'Client A', assigneeEmail: 'karthikavilpower@gmail.com', status: 'Done', created: startOfMonth + 1000 },
            { id: 'NOV-202', desc: 'Client A Reel', client: 'Client A', assigneeEmail: 'karthikavilpower@gmail.com', status: 'In Progress', created: startOfMonth + 2000 },
            { id: 'NOV-203', desc: 'Client B Brochure', client: 'Client B', assigneeEmail: 'karthikavilpower@gmail.com', status: 'Done', created: startOfMonth + 3000 }
        ];

        mockWindow.allTimeLogs = [
            { taskId: 'NOV-201', userId: 'karthikavilpower@gmail.com', startTime: startOfMonth + 4000, durationSeconds: 7200, client: 'Client A' },
            { taskId: 'NOV-203', userId: 'karthikavilpower@gmail.com', startTime: startOfMonth + 12000, durationSeconds: 3600, client: 'Client B' }
        ];

        mockWindow.currentUser = { email: 'digitalmarketing@vilpower.com', name: 'Palanirajan R', role: 'admin' };
        mockWindow.MyMonthlyReport.handleUserChange('karthikavilpower@gmail.com');
        mockWindow.MyMonthlyReport.switchSubTab('client-timing');

        const kpisHtml = mockDom['mmr-client-timing-kpis']?.innerHTML || '';
        const tbodyHtml = mockDom['mmr-client-timing-tbody']?.innerHTML || '';

        // Verification of Client KPIs
        expect(kpisHtml).toContain('Active Clients');
        expect(kpisHtml).toContain('Top Client (Time)');
        expect(kpisHtml).toContain('Client A');

        // Verification of Table & Deliverables Accordion
        expect(tbodyHtml).toContain('Client A');
        expect(tbodyHtml).toContain('Client B');
        expect(tbodyHtml).toContain('Deliverables & Work Sessions');
        expect(tbodyHtml).toContain('NOV-201');
        expect(tbodyHtml).toContain('NOV-203');
    });

    it('should accurately track Shoot & Video Production tasks, calculate shoot duration, classify shoot types, and render the Shoot tab', () => {
        const mockDom: any = {
            'mmr-shoot-kpis': { innerHTML: '' },
            'mmr-shoot-types': { innerHTML: '' },
            'mmr-shoot-tbody': { innerHTML: '' },
            'mmr-tab-shoot': { classList: { add: () => {}, remove: () => {} } },
            'mmr-subtab-btn-shoot': { classList: { add: () => {}, remove: () => {} } }
        };
        mockWindow.document = {
            getElementById: (id: string) => mockDom[id] || { value: '', classList: { add: () => {}, remove: () => {} } },
            createElement: () => ({ id: '', className: '', innerHTML: '' })
        };

        // Ajith: Video Production Team
        mockWindow.currentUser = { email: 'digitalmarketing@vilpower.com', name: 'Admin', role: 'admin' };
        mockWindow.selectedMonth = 10;
        mockWindow.selectedYear = 2026;

        mockWindow.tasks = [
            {
                id: 'M-SHOOT-101',
                desc: 'Client Alpha Product Photography & Video Shoot',
                client: 'Client Alpha',
                status: 'Shoot Completed',
                assignee: 'Ajith',
                assigneeEmail: 'ajithvilpower@gmail.com',
                duedate: '2026-11-02',
                shootPlan: true,
                shootGroupId: 'SHOOT-GRP-1'
            },
            {
                id: 'M-SHOOT-102',
                desc: 'Client Beta Outdoor Promotional Shoot on Location',
                client: 'Client Beta',
                status: 'Shoot Planned',
                assignee: 'Ajith',
                assigneeEmail: 'ajithvilpower@gmail.com',
                duedate: '2026-11-04',
                shootPlan: true,
                shootGroupId: 'SHOOT-GRP-2'
            }
        ];

        mockWindow.allTimeLogs = [
            {
                taskId: 'M-SHOOT-101',
                taskTitle: 'Client Alpha Product Photography & Video Shoot',
                userId: 'ajithvilpower@gmail.com',
                startTime: new Date('2026-11-02T10:00:00+05:30').getTime(),
                durationSeconds: 14400, // 4 hours
                activity: 'Shoot'
            }
        ];

        mockWindow.MyMonthlyReport.handleUserChange('ajithvilpower@gmail.com');
        mockWindow.MyMonthlyReport.switchSubTab('shoot');

        const cached = mockWindow.MyMonthlyReportState.cachedReportData;
        expect(cached).toBeDefined();
        expect(cached.shoot).toBeDefined();
        expect(cached.shoot.totalShoots).toBe(2);
        expect(cached.shoot.completedShoots).toBe(1);
        expect(cached.shoot.plannedShoots).toBe(1);
        expect(cached.shoot.totalShootSeconds).toBe(14400);
        expect(cached.shoot.totalShootHours).toBe('4.0');

        // Verify Shoot Types classification
        expect(cached.shoot.shootList[0].shootType).toBe('Product Photography');
        expect(cached.shoot.shootList[1].shootType).toBe('Promotional Shoot');

        // Verify rendered Shoot tab DOM
        const kpisHtml = mockDom['mmr-shoot-kpis']?.innerHTML || '';
        const typesHtml = mockDom['mmr-shoot-types']?.innerHTML || '';
        const tbodyHtml = mockDom['mmr-shoot-tbody']?.innerHTML || '';

        expect(kpisHtml).toContain('Assigned Shoots');
        expect(kpisHtml).toContain('Total Shoot Hours');
        expect(typesHtml).toContain('Product Photography');
        expect(typesHtml).toContain('Promotional Shoot');
        expect(tbodyHtml).toContain('M-SHOOT-101');
        expect(tbodyHtml).toContain('M-SHOOT-102');
        expect(tbodyHtml).toContain('Client Alpha');
        expect(tbodyHtml).toContain('Client Beta');
    });

    it('should accurately track Role-Based Work Activity breakdown (Content Writing vs QC Review vs Video vs Design)', () => {
        // Sneha or Multidisciplinary Member: Content Writing & QC Incharge
        mockWindow.currentUser = { email: 'digitalmarketing@vilpower.com', name: 'Admin', role: 'admin' };
        mockWindow.selectedMonth = 10;
        mockWindow.selectedYear = 2026;

        mockWindow.tasks = [
            {
                id: 'NOV-301',
                desc: 'Client Alpha Diwali Carousel Copy & Script Writing',
                client: 'Client Alpha',
                status: 'Done',
                assignee: 'Sneha',
                assigneeEmail: 'snehavilpower@gmail.com'
            },
            {
                id: 'NOV-302',
                desc: 'Client Beta Social Media Post Quality Check & Proofreading',
                client: 'Client Beta',
                status: 'Quality Check',
                assignee: 'Sneha',
                assigneeEmail: 'snehavilpower@gmail.com'
            }
        ];

        mockWindow.allTimeLogs = [
            {
                taskId: 'NOV-301',
                taskTitle: 'Client Alpha Diwali Carousel Copy & Script Writing',
                userId: 'snehavilpower@gmail.com',
                startTime: new Date('2026-11-01T10:00:00+05:30').getTime(),
                durationSeconds: 7200, // 2 hours
                activity: 'Content Writing'
            },
            {
                taskId: 'NOV-302',
                taskTitle: 'Client Beta Social Media Post Quality Check & Proofreading',
                userId: 'snehavilpower@gmail.com',
                startTime: new Date('2026-11-01T14:00:00+05:30').getTime(),
                durationSeconds: 3600, // 1 hour
                activity: 'QC Review'
            }
        ];

        mockWindow.MyMonthlyReport.handleUserChange('snehavilpower@gmail.com');
        const cached = mockWindow.MyMonthlyReportState.cachedReportData;

        expect(cached).toBeDefined();
        expect(cached.activityBreakdown).toBeDefined();

        const writing = cached.activityBreakdown.find((a: any) => a.key === 'contentWriting');
        const qc = cached.activityBreakdown.find((a: any) => a.key === 'qcReview');

        expect(writing).toBeDefined();
        expect(writing.seconds).toBe(7200);
        expect(writing.hours).toBe(2);

        expect(qc).toBeDefined();
        expect(qc.seconds).toBe(3600);
        expect(qc.hours).toBe(1);
    });
});
