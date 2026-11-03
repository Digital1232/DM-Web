import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Evaluate js/reportingEngine.js in a mock window environment
describe('OneDeskReportingEngine Unit & Accuracy Verification', () => {
    let Engine: any;

    beforeEach(() => {
        const mockWindow: any = {
            allTimeLogs: [],
            attendanceEvents: [],
            tasks: [],
            allQcReports: [],
            currentWorkUsers: [],
            allUsersMap: new Map()
        };

        const engineCode = fs.readFileSync(path.resolve(__dirname, '../../js/reportingEngine.js'), 'utf8');
        const runFn = new Function('window', engineCode);
        runFn(mockWindow);
        Engine = mockWindow.OneDeskReportingEngine;
    });

    it('should accurately parse local dates without UTC timezone shift', () => {
        const d = Engine.parseLocalDate('2026-11-03');
        expect(d.getFullYear()).toBe(2026);
        expect(d.getMonth()).toBe(10); // 0-indexed November
        expect(d.getDate()).toBe(3);
        expect(Engine.formatLocalDate(d)).toBe('2026-11-03');
    });

    it('should generate exact date presets', () => {
        const todayRange = Engine.getDateRange('today');
        expect(todayRange.fromDateStr).toBe(todayRange.toDateStr);

        const thisWeek = Engine.getDateRange('this_week');
        const mon = new Date(thisWeek.fromTs);
        const sun = new Date(thisWeek.toTs);
        expect(mon.getDay()).toBe(1); // Monday
        expect(sun.getDay()).toBe(0); // Sunday
    });

    it('should calculate true 0% productivity when no work is logged, without fake 50% clamp', () => {
        const fromTs = new Date(2026, 10, 1, 0, 0, 0, 0).getTime();
        const toTs = new Date(2026, 10, 1, 23, 59, 59, 999).getTime();

        const kpis = Engine.computeComprehensiveKPIs(fromTs, toTs, 'test@example.com');
        expect(kpis.timing.workedSeconds).toBe(0);
        expect(kpis.timing.utilizationPct).toBe(0);
        expect(kpis.timing.productivityPct).toBe(0); // True 0%, NOT clamped to 50%!
    });

    it('should accurately report QC score with sample size and handle zero reviews without fake scores', () => {
        const fromTs = new Date(2026, 10, 1, 0, 0, 0, 0).getTime();
        const toTs = new Date(2026, 10, 1, 23, 59, 59, 999).getTime();

        // 1. Zero QC reviews case
        const emptyQc = Engine.getQcMetrics(fromTs, toTs, 'test@example.com');
        expect(emptyQc.hasData).toBe(false);
        expect(emptyQc.averageScore).toBeNull();
        expect(emptyQc.sampleCount).toBe(0);
        expect(emptyQc.displayText).toContain('Not available');

        // 2. Verified QC reviews case
        const windowContext: any = {
            allQcReports: [
                { userId: 'test@example.com', qcScore: 90, timestamp: fromTs + 1000 },
                { userId: 'test@example.com', qcScore: 96, timestamp: fromTs + 2000 }
            ]
        };
        const engineCode = fs.readFileSync(path.resolve(__dirname, '../../js/reportingEngine.js'), 'utf8');
        new Function('window', engineCode)(windowContext);
        const validQc = windowContext.OneDeskReportingEngine.getQcMetrics(fromTs, toTs, 'test@example.com');
        expect(validQc.hasData).toBe(true);
        expect(validQc.averageScore).toBe(93);
        expect(validQc.sampleCount).toBe(2);
        expect(validQc.displayText).toContain('93% (Based on 2 reviewed deliverables)');
    });

    it('should return Not Available when task delivery timestamps are missing, avoiding fake 4.0 star ratings', () => {
        const fromTs = new Date(2026, 10, 1, 0, 0, 0, 0).getTime();
        const toTs = new Date(2026, 10, 1, 23, 59, 59, 999).getTime();

        const windowContext: any = {
            tasks: [
                {
                    id: 'TASK-101',
                    desc: 'Banner Graphic',
                    client: 'Acme Corp',
                    status: 'Design Completed',
                    userId: 'designer@example.com',
                    createdAt: fromTs + 1000
                    // No designCompletedAt or clientSentAt timestamps
                }
            ],
            taskNotifications: []
        };
        const engineCode = fs.readFileSync(path.resolve(__dirname, '../../js/reportingEngine.js'), 'utf8');
        new Function('window', engineCode)(windowContext);

        const delivery = windowContext.OneDeskReportingEngine.getDeliveryLifecycleMetrics(fromTs, toTs, 'designer@example.com');
        expect(delivery.trackedCount).toBe(1);
        expect(delivery.items[0].tat.clientDeliverySec).toBeNull();
        expect(delivery.avgClientDeliveryTAT).toBeNull();
    });

    it('should generate transparent, data-backed management insights without hallucinating', () => {
        const kpis = {
            timing: { workedSeconds: 28800, breakSeconds: 3600, activeSeconds: 32400, utilizationPct: 89, peakHour: '14:00', peakHourSeconds: 7200 },
            tasks: { assignedCount: 6, completedCount: 5, pendingCount: 1, overdueCount: 1, reworkRatePct: 0, reworkCount: 0, completionRatePct: 83 },
            qc: { hasData: true, averageScore: 92, sampleCount: 5, displayText: '92% (Based on 5 deliverables)' },
            delivery: { trackedCount: 5, onTimeDeliveryRate: 100 }
        };

        const insights = Engine.generateManagementInsights(kpis, null, 'daily');
        expect(insights.wins.length).toBeGreaterThan(0);
        expect(insights.bottlenecks).toContain('1 task is currently overdue past the target deadline.');
        expect(insights.recommendations.some((r: string) => r.includes('overdue'))).toBe(true);
    });
});
