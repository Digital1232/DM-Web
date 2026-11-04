import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');

function loadEngines() {
    const win: any = {};
    new Function('window', fs.readFileSync(path.join(ROOT, 'js/reportingEngine.js'), 'utf8'))(win);
    new Function('window', fs.readFileSync(path.join(ROOT, 'js/oneReportEngine.js'), 'utf8'))(win);
    return win.OneReportEngine;
}

// Wed 15 Oct 2026, 10:00 local
const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m).getTime();
const NOW = new Date(2026, 10, 4, 12, 0).getTime(); // 4 Nov 2026 → October is a completed month

const USERS = [
    { email: 'boss@x.com', name: 'Boss', role: 'Administrator' },
    { email: 'lead@x.com', name: 'Lead', role: 'Senior Manager' },
    { email: 'mgr@x.com', name: 'Mgr', role: 'Manager' },
    { email: 'amy@x.com', name: 'Amy', role: 'Designer' },
    { email: 'bob@x.com', name: 'Bob', role: 'Editor' },
    { email: 'cat@x.com', name: 'Cat', role: 'Writer' }
];

function baseCtx(extra: any = {}) {
    return {
        users: USERS,
        adminEmails: ['boss@x.com'],
        managerEmails: ['mgr@x.com'],
        approvalChains: { 'amy@x.com': ['lead@x.com', 'boss@x.com'], 'bob@x.com': ['lead@x.com'], 'cat@x.com': ['boss@x.com'] },
        tasks: [
            { id: 'J2-1', desc: 'Diwali poster design', client: 'Acme', assigneeEmail: 'amy@x.com', status: 'Done', updatedAt: at(10, 12), taskType: 'jira' },
            { id: 'M-100', desc: 'Team learning', client: 'General', assigneeEmail: 'amy@x.com', status: 'In Progress', manual: true, createdAt: at(1, 9) },
            { id: 'J2-2', desc: 'Reel edit', client: 'Beta', assigneeEmail: 'bob@x.com', status: 'In Progress', duedate: '2026-10-05', createdAt: at(1, 9), taskType: 'jira' }
        ],
        timeLogs: [
            { taskId: 'J2-1', taskDesc: 'Diwali poster design', client: 'Acme', userId: 'amy@x.com', startTime: at(10, 10), endTime: at(10, 12), durationSeconds: 7200 },
            { taskId: 'M-100', taskDesc: 'Team learning', client: 'General', userId: 'amy@x.com', startTime: at(11, 10), endTime: at(11, 11), durationSeconds: 3600 },
            { taskId: 'J2-2', taskDesc: 'Reel edit', client: 'Beta', userId: 'bob@x.com', startTime: at(12, 10), endTime: at(12, 13), durationSeconds: 10800 },
            { taskId: 'M-200', taskDesc: 'Sales proposal for new lead', client: '', userId: 'cat@x.com', startTime: at(13, 10), endTime: at(13, 11), durationSeconds: 3600 }
        ],
        attendanceEvents: [],
        qcReports: [],
        requests: [],
        ...extra
    };
}

describe('OneReportEngine', () => {
    let E: any;
    beforeEach(() => { E = loadEngines(); });

    const run = (ctx: any, viewer = 'boss@x.com', filters: any = {}, role = '') =>
        E.build(ctx, { viewer: { email: viewer, role }, period: { mode: 'month', month: '2026-10' }, filters, now: NOW });

    it('splits client, internal and business-development hours and reconciles totals', () => {
        const m = run(baseCtx());
        expect(m.kpis.totalSec).toBe(7200 + 3600 + 10800 + 3600);
        expect(m.kpis.clientSec).toBe(7200 + 10800);
        expect(m.kpis.internalSec).toBe(3600);
        expect(m.kpis.bdSec).toBe(3600);
        expect(m.kpis.clientSec + m.kpis.internalSec + m.kpis.bdSec).toBe(m.kpis.totalSec);
        // Every section adds up to the same total
        const teamSum = m.team.reduce((s: number, r: any) => s + r.loggedSec, 0);
        const clientSum = m.clients.reduce((s: number, r: any) => s + r.seconds, 0);
        const breakdownSum = m.taskBreakdown.reduce((s: number, r: any) => s + r.seconds, 0);
        const matrixSum = m.matrix.rows.reduce((s: number, r: any) => s + Object.values(r.cells).reduce((a: any, b: any) => a + b, 0), 0);
        const logSum = m.entries.reduce((s: number, r: any) => s + r.seconds, 0);
        expect([teamSum, clientSum, breakdownSum, matrixSum, logSum]).toEqual(Array(5).fill(m.kpis.totalSec));
    });

    it('separates Jira and internal sources', () => {
        const jira = run(baseCtx(), 'boss@x.com', { source: 'Jira' });
        expect(jira.entries.every((e: any) => e.source === 'Jira')).toBe(true);
        expect(jira.kpis.totalSec).toBe(7200 + 10800);
        const internal = run(baseCtx(), 'boss@x.com', { source: 'Internal' });
        expect(internal.kpis.totalSec).toBe(3600 + 3600);
    });

    it('limits employees to their own data, even if another employee is requested', () => {
        const m = run(baseCtx(), 'amy@x.com', { employee: 'bob@x.com' });
        expect(m.scope.level).toBe('employee');
        expect(m.entries.every((e: any) => e.email === 'amy@x.com')).toBe(true);
        expect(m.team.map((r: any) => r.email)).toEqual(['amy@x.com']);
        expect(m.options.employees.map((e: any) => e.email)).toEqual(['amy@x.com']);
    });

    it('gives team leads their direct reports only', () => {
        const m = run(baseCtx(), 'lead@x.com');
        expect(m.scope.level).toBe('lead');
        const emails = new Set(m.entries.map((e: any) => e.email));
        expect(emails.has('amy@x.com') && emails.has('bob@x.com')).toBe(true);
        expect(emails.has('cat@x.com')).toBe(false);
    });

    it('gives managers and admins everyone', () => {
        expect(run(baseCtx(), 'mgr@x.com').scope.all).toBe(true);
        expect(run(baseCtx(), 'boss@x.com').scope.all).toBe(true);
    });

    it('keeps historical monthly aggregates as hours but not as sessions', () => {
        const ctx = baseCtx({ timeLogs: [{ userId: 'amy@x.com', client: 'Acme', taskDesc: 'October total', durationSeconds: 36000, date: '2026-10-31' }] });
        const m = run(ctx);
        expect(m.kpis.totalSec).toBe(36000);
        expect(m.kpis.timeEntries).toBe(0);
        expect(m.kpis.aggregateEntries).toBe(1);
        expect(m.entries[0].entryType).toBe(E.AGGREGATE_LABEL);
        expect(m.entries[0].start).toBe(0);
    });

    it('excludes breaks and does not double-count overlapping sessions', () => {
        const ctx = baseCtx({
            timeLogs: [
                { taskId: 'J2-1', taskDesc: 'Poster', client: 'Acme', userId: 'amy@x.com', startTime: at(10, 10), endTime: at(10, 12), durationSeconds: 7200 },
                { taskId: 'J2-9', taskDesc: 'Poster 2', client: 'Acme', userId: 'amy@x.com', startTime: at(10, 11), endTime: at(10, 13), durationSeconds: 7200 },
                { taskId: 'BREAK', taskDesc: 'Lunch break', userId: 'amy@x.com', startTime: at(10, 13), endTime: at(10, 14), durationSeconds: 3600 }
            ]
        });
        const m = run(ctx);
        expect(m.kpis.totalSec).toBe(7200 + 3600); // 1h overlap removed, break excluded
        expect(m.entries.find((e: any) => e.taskId === 'J2-9').remarks).toMatch(/Overlaps/);
    });

    it('shows utilization as N/A when capacity is zero', () => {
        // Whole range is a single Sunday → no working days
        const m = E.build(baseCtx(), { viewer: { email: 'boss@x.com' }, period: { mode: 'custom', from: '2026-10-04', to: '2026-10-04' }, now: NOW });
        expect(m.kpis.capacitySec).toBe(0);
        expect(m.kpis.utilization).toBeNull();
        m.team.forEach((r: any) => expect(r.utilization).toBeNull());
    });

    it('deducts approved leave (incl. half days) from capacity', () => {
        const ctx = baseCtx({
            requests: [
                { type: 'leave', userId: 'amy@x.com', status: 'approved', fromDate: '2026-10-06', toDate: '2026-10-07', leaveDuration: 'full' },
                { type: 'leave', userId: 'amy@x.com', status: 'approved', fromDate: '2026-10-08', toDate: '2026-10-08', leaveDuration: 'first_half', leaveDays: 0.5 },
                { type: 'leave', userId: 'amy@x.com', status: 'rejected', fromDate: '2026-10-09', toDate: '2026-10-09' }
            ]
        });
        const amy = run(ctx).team.find((r: any) => r.email === 'amy@x.com');
        expect(amy.workingDays).toBe(27); // Oct 2026 Mon–Sat
        expect(amy.leaveDays).toBe(2.5);
        expect(amy.availableSec).toBe((27 - 2.5) * 8 * 3600);
    });

    it('never invents hours for a missing check-out', () => {
        const ctx = baseCtx({
            attendanceEvents: [
                { userId: 'amy@x.com', type: 'check_in', timestamp: at(6, 10, 0), date: '2026-10-06' },
                { userId: 'amy@x.com', type: 'check_in', timestamp: at(7, 9, 30), date: '2026-10-07' },
                { userId: 'amy@x.com', type: 'break_end', duration: 1800000, timestamp: at(7, 13), date: '2026-10-07' },
                { userId: 'amy@x.com', type: 'check_out', timestamp: at(7, 18, 30), date: '2026-10-07' }
            ]
        });
        const row = run(ctx).attendance.rows.find((r: any) => r.email === 'amy@x.com');
        expect(row.presentDays).toBe(2);
        expect(row.lateArrivals).toBe(1);
        expect(row.missingCheckout).toBe(1);
        expect(row.workSec).toBe(9 * 3600 - 1800);
        expect(row.breakSec).toBe(1800);
    });

    it('counts QC pass/fail and rework rounds from real reviews only', () => {
        const ctx = baseCtx({
            qcReports: [
                { taskId: 'J2-1', assigneeEmail: 'amy@x.com', qcEmail: 'cat@x.com', status: 'Rework', mistakeItems: ['Font Consistency'], durationSeconds: 300, timestamp: at(9, 10) },
                { taskId: 'J2-1', assigneeEmail: 'amy@x.com', qcEmail: 'cat@x.com', status: 'Approved', durationSeconds: 200, timestamp: at(10, 10) }
            ]
        });
        const m = run(ctx);
        expect(m.qc.passed).toBe(1);
        expect(m.qc.failed).toBe(1);
        expect(m.qc.rows[0].failureReason).toBe('Font Consistency');
        expect(m.qc.rows[1].reworkRounds).toBe(1);
        expect(m.kpis.reworkCount).toBe(1);
        const empty = run(baseCtx());
        expect(empty.kpis.qcPassed).toBeNull();
    });

    it('measures group shoot duration once, not per person', () => {
        const ctx = baseCtx({
            tasks: [
                { id: 'M-SHOOT-1-0', desc: 'Product shoot', client: 'Acme', assigneeEmail: 'amy@x.com', status: 'Shoot Completed', duedate: '2026-10-20', shootPlan: true, shootGroupId: 'SHOOT-1', manual: true },
                { id: 'M-SHOOT-1-1', desc: 'Product shoot', client: 'Acme', assigneeEmail: 'bob@x.com', status: 'Shoot Completed', duedate: '2026-10-20', shootPlan: true, shootGroupId: 'SHOOT-1', manual: true }
            ],
            timeLogs: [
                { taskId: 'M-SHOOT-1-0', taskDesc: 'Product shoot', client: 'Acme', userId: 'amy@x.com', startTime: at(20, 10), endTime: at(20, 13), durationSeconds: 10800 },
                { taskId: 'M-SHOOT-1-1', taskDesc: 'Product shoot', client: 'Acme', userId: 'bob@x.com', startTime: at(20, 10), endTime: at(20, 13), durationSeconds: 10800 }
            ]
        });
        const row = run(ctx).shoots.rows[0];
        expect(row.shootSeconds).toBe(10800);
        expect(row.productionSeconds).toBe(21600);
        expect(row.editingSeconds).toBeNull();
    });
});
