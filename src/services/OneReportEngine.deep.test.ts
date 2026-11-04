/**
 * Deep correctness tests for One Report.
 *
 * Random datasets are generated and every figure is checked against a small,
 * independently written reference calculation ("oracle"), plus invariants that
 * must hold for any data (sections reconcile, filters partition the total,
 * permissions never leak).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fc from 'fast-check';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
let E: any;
beforeAll(() => {
    const win: any = {};
    new Function('window', fs.readFileSync(path.join(ROOT, 'js/reportingEngine.js'), 'utf8'))(win);
    new Function('window', fs.readFileSync(path.join(ROOT, 'js/oneReportEngine.js'), 'utf8'))(win);
    E = win.OneReportEngine;
});

const RUNS = Number(process.env.DEEP_RUNS || 300);
const NOW = new Date(2026, 10, 4, 12, 0).getTime();
const FROM = new Date(2026, 9, 1).getTime();
const TO = new Date(2026, 9, 31, 23, 59, 59, 999).getTime();

const STAFF = ['amy@x.com', 'bob@x.com', 'cat@x.com', 'dan@x.com'];
const USERS = [
    { email: 'boss@x.com', name: 'Boss', role: 'Administrator' },
    { email: 'lead@x.com', name: 'Lead', role: 'Team Lead' },
    ...STAFF.map((e, i) => ({ email: e, name: ['Amy', 'Bob', 'Cat', 'Dan'][i], role: 'Staff' }))
];
const CHAINS = { 'amy@x.com': ['lead@x.com'], 'bob@x.com': ['lead@x.com', 'boss@x.com'], 'cat@x.com': ['boss@x.com'], 'dan@x.com': ['boss@x.com'] };
const CLIENTS = ['Acme', 'Beta Motors', 'Gamma', '', 'General', 'Others'];
const TASKS = [
    ['J2-1', 'Diwali poster design'], ['J2-2', 'Reel edit for launch'], ['NOV-7', 'Content calendar captions'],
    ['M-1', 'Sales proposal for new lead'], ['M-2', 'Team meeting'], ['LEARN-amy', 'Morning learning'],
    ['M-3', 'Misc admin'], ['BREAK', 'Lunch break']
];

const day = (ts: number) => { const d = new Date(ts); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
const localStr = (ts: number) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// ── Generators ───────────────────────────────────────────────
// Sessions start between 25 Sep and 6 Nov so period boundaries are exercised.
const RANGE_START = new Date(2026, 8, 25).getTime();
const RANGE_MIN = Math.round((new Date(2026, 10, 6).getTime() - RANGE_START) / 60000);

const sessionArb = fc.record({
    kind: fc.constant('session'),
    user: fc.constantFrom(...STAFF),
    client: fc.constantFrom(...CLIENTS),
    task: fc.constantFrom(...TASKS),
    startMin: fc.integer({ min: 0, max: RANGE_MIN }),
    durMin: fc.integer({ min: 1, max: 600 })
});
const aggregateArb = fc.record({
    kind: fc.constant('aggregate'),
    user: fc.constantFrom(...STAFF),
    client: fc.constantFrom(...CLIENTS),
    dayOffset: fc.integer({ min: -5, max: 35 }),
    hours: fc.integer({ min: 1, max: 80 })
});
const logsArb = fc.array(fc.oneof({ weight: 6, arbitrary: sessionArb }, { weight: 1, arbitrary: aggregateArb }), { maxLength: 120 })
    .chain(list => fc.tuple(fc.constant(list), fc.array(fc.nat(), { maxLength: 8 }))) // indexes to duplicate
    .map(([list, dups]) => {
        const raw = list.map((g: any, i: number) => {
            if (g.kind === 'aggregate') {
                return { userId: g.user, client: g.client, taskDesc: `Imported monthly total #${i}`, durationSeconds: g.hours * 3600, date: localStr(new Date(2026, 9, 1 + g.dayOffset).getTime()) };
            }
            const start = RANGE_START + g.startMin * 60000;
            return { taskId: g.task[0], taskDesc: g.task[1], client: g.client, userId: g.user, startTime: start, endTime: start + g.durMin * 60000, durationSeconds: g.durMin * 60 };
        });
        dups.forEach(d => { if (raw.length) raw.push({ ...raw[d % raw.length] }); });
        return raw;
    });

const build = (ctx: any, viewer = 'boss@x.com', filters: any = {}, period: any = { mode: 'month', month: '2026-10' }) =>
    E.build({ users: USERS, adminEmails: ['boss@x.com'], managerEmails: [], approvalChains: CHAINS, tasks: [], attendanceEvents: [], qcReports: [], requests: [], ...ctx },
        { viewer: { email: viewer }, period, filters, now: NOW });

// ── Oracle: seconds per user that fall in the period ─────────
// Sessions: time is credited to the session that first covers it, in start order.
// Equivalent to |union of intervals starting <= TO| − |union of intervals starting < FROM|.
function unionSeconds(intervals: number[][]) {
    const l = intervals.slice().sort((a, b) => a[0] - b[0]);
    let tot = 0, s = -1, e = -1;
    for (const [a, b] of l) {
        if (s < 0) { s = a; e = b; continue; }
        if (a <= e) e = Math.max(e, b); else { tot += e - s; s = a; e = b; }
    }
    if (s >= 0) tot += e - s;
    return tot / 1000;
}
function oracle(raw: any[]) {
    const per: Record<string, number> = {};
    const seen = new Set<string>();
    const sessions: Record<string, number[][]> = {};
    for (const r of raw) {
        if (r.taskId === 'BREAK') continue;
        const key = r.startTime ? `${r.taskId || r.taskDesc}_${r.startTime}_${r.userId}` : `${r.taskDesc}_${new Date(r.date + 'T00:00').getTime()}_${r.userId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (!r.startTime) {
            const ts = new Date(r.date + 'T00:00').getTime();
            if (ts >= FROM && ts <= TO) per[r.userId] = (per[r.userId] || 0) + r.durationSeconds;
            continue;
        }
        (sessions[r.userId] = sessions[r.userId] || []).push([r.startTime, r.endTime]);
    }
    for (const [u, iv] of Object.entries(sessions)) {
        const upto = unionSeconds(iv.filter(i => day(i[0]) <= TO));
        const before = unionSeconds(iv.filter(i => day(i[0]) < FROM));
        per[u] = (per[u] || 0) + Math.round(upto - before);
    }
    return per;
}

const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);
const close = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThanOrEqual(1e-6);

describe('One Report – deep property tests', () => {
    it('total and per-employee hours match the independent oracle', () => {
        fc.assert(fc.property(logsArb, raw => {
            const m = build({ timeLogs: raw });
            const o = oracle(raw);
            expect(m.kpis.totalSec).toBe(sum(Object.values(o)));
            STAFF.forEach(email => {
                const row = m.team.find((r: any) => r.email === email);
                expect(row ? row.loggedSec : 0).toBe(o[email] || 0);
            });
        }), { numRuns: RUNS });
    });

    it('every section reconciles to the same total and work types partition it', () => {
        fc.assert(fc.property(logsArb, raw => {
            const m = build({ timeLogs: raw });
            const t = m.kpis.totalSec;
            expect(sum(m.team.map((r: any) => r.loggedSec))).toBe(t);
            expect(sum(m.clients.map((r: any) => r.seconds))).toBe(t);
            expect(sum(m.taskBreakdown.map((r: any) => r.seconds))).toBe(t);
            expect(sum(m.entries.map((r: any) => r.seconds))).toBe(t);
            expect(sum(Object.values(m.categoryTotals) as number[])).toBe(t);
            expect(sum(m.matrix.rows.map((r: any) => sum(Object.values(r.cells) as number[])))).toBe(t);
            m.matrix.rows.forEach((r: any) => expect(sum(Object.values(r.cells) as number[])).toBe(r.total));
            expect(m.kpis.clientSec + m.kpis.internalSec + m.kpis.bdSec).toBe(t);
            m.team.forEach((r: any) => expect(r.clientSec + r.internalSec + r.bdSec).toBe(r.loggedSec));
            if (t > 0) {
                close(sum(m.clients.map((c: any) => c.share)), 1);
                close(sum(m.taskBreakdown.map((c: any) => c.share)), 1);
            }
            expect(m.kpis.timeEntries + m.kpis.aggregateEntries).toBe(m.entries.length);
            m.entries.forEach((l: any) => {
                expect(l.seconds).toBeGreaterThanOrEqual(0);
                expect(l.seconds).toBeLessThanOrEqual(l.rawSeconds);
                expect(l.dateTs).toBeGreaterThanOrEqual(FROM);
                expect(l.dateTs).toBeLessThanOrEqual(TO);
                expect(l.taskId).not.toBe('BREAK');
            });
        }), { numRuns: RUNS });
    });

    it('each filter splits the total exactly (no gaps, no double counting)', () => {
        fc.assert(fc.property(logsArb, raw => {
            const all = build({ timeLogs: raw });
            const t = all.kpis.totalSec;
            const by = (key: string, values: string[]) => sum(values.map(v => build({ timeLogs: raw }, 'boss@x.com', { [key]: v }).kpis.totalSec));
            expect(by('source', ['Jira', 'Internal'])).toBe(t);
            expect(by('client', all.options.clients)).toBe(t);
            expect(by('category', all.options.categories)).toBe(t);
            expect(by('employee', all.options.employees.map((e: any) => e.email))).toBe(t);
            // Jira entries are exactly the Jira-key task IDs
            build({ timeLogs: raw }, 'boss@x.com', { source: 'Jira' }).entries.forEach((l: any) => expect(l.taskId).toMatch(/^(J2|NOV)-\d+$/));
        }), { numRuns: Math.max(50, Math.floor(RUNS / 3)) });
    });

    it('permissions: employees see only themselves, leads only their reports, and figures match the admin view', () => {
        fc.assert(fc.property(logsArb, fc.constantFrom(...STAFF), fc.constantFrom(...STAFF), (raw, me, other) => {
            const admin = build({ timeLogs: raw });
            const mine = build({ timeLogs: raw }, me, { employee: other });
            expect(mine.scope.level).toBe('employee');
            expect(new Set(mine.entries.map((l: any) => l.email))).toEqual(new Set(mine.entries.length ? [me] : []));
            expect(mine.options.employees.map((e: any) => e.email)).toEqual([me]);
            const adminRow = admin.team.find((r: any) => r.email === me);
            expect(mine.kpis.totalSec).toBe(adminRow ? adminRow.loggedSec : 0);

            const lead = build({ timeLogs: raw }, 'lead@x.com');
            expect(lead.scope.level).toBe('lead');
            lead.entries.forEach((l: any) => expect(['amy@x.com', 'bob@x.com', 'lead@x.com']).toContain(l.email));
            const expected = sum(admin.team.filter((r: any) => ['amy@x.com', 'bob@x.com'].includes(r.email)).map((r: any) => r.loggedSec));
            expect(lead.kpis.totalSec).toBe(expected);
        }), { numRuns: RUNS });
    });

    it('capacity and leave match the oracle for random leave / Saturday-off requests', () => {
        const reqArb = fc.array(fc.record({
            type: fc.constantFrom('leave', 'saturday'),
            user: fc.constantFrom(...STAFF),
            status: fc.constantFrom('approved', 'Approved', 'pending', 'rejected'),
            d: fc.integer({ min: -3, max: 33 }),
            len: fc.integer({ min: 0, max: 4 }),
            half: fc.boolean()
        }), { maxLength: 15 });
        fc.assert(fc.property(reqArb, reqs => {
            const requests = reqs.map(r => {
                const from = new Date(2026, 9, 1 + r.d);
                if (r.type === 'saturday') return { type: 'saturday', userId: r.user, status: r.status, date: localStr(from.getTime()) };
                const to = new Date(2026, 9, 1 + r.d + (r.half ? 0 : r.len));
                return { type: 'leave', userId: r.user, status: r.status, fromDate: localStr(from.getTime()), toDate: localStr(to.getTime()), leaveDuration: r.half ? 'first_half' : 'full', leaveDays: r.half ? 0.5 : null };
            });
            // Everyone logs a little so they appear in the team.
            const timeLogs = STAFF.map(u => ({ taskId: 'J2-1', taskDesc: 'x', client: 'Acme', userId: u, startTime: new Date(2026, 9, 2, 10).getTime(), endTime: new Date(2026, 9, 2, 11).getTime(), durationSeconds: 3600 }));
            const m = build({ timeLogs, requests });
            STAFF.forEach(u => {
                // Oracle: walk every October day independently.
                const approved = requests.filter(r => r.userId === u && String(r.status).toLowerCase() === 'approved');
                let working = 0, leave = 0;
                for (let d = 1; d <= 31; d++) {
                    const date = new Date(2026, 9, d);
                    const ds = localStr(date.getTime());
                    if (date.getDay() === 0) continue;
                    if (approved.some(r => r.type === 'saturday' && r.date === ds)) continue;
                    working++;
                    const hits = approved.filter(r => r.type === 'leave' && r.fromDate! <= ds && ds <= r.toDate!);
                    if (hits.length) leave += Math.max(...hits.map(r => (r.leaveDays === 0.5 ? 0.5 : 1)));
                }
                const row = m.team.find((r: any) => r.email === u);
                expect(row.workingDays).toBe(working);
                expect(row.leaveDays).toBe(leave);
                expect(row.availableSec).toBe((working - leave) * 8 * 3600);
                expect(row.utilization).toBe(row.availableSec > 0 ? 3600 / row.availableSec : null);
            });
        }), { numRuns: RUNS });
    });

    it('attendance matches the oracle for random check-in / break / check-out days', () => {
        const dayArb = fc.record({
            user: fc.constantFrom(...STAFF),
            d: fc.integer({ min: 1, max: 31 }),
            inMin: fc.integer({ min: 8 * 60, max: 11 * 60 }),
            workMin: fc.integer({ min: 60, max: 600 }),
            breakMin: fc.integer({ min: 0, max: 90 }),
            checkout: fc.boolean()
        });
        fc.assert(fc.property(fc.uniqueArray(dayArb, { selector: x => `${x.user}_${x.d}`, maxLength: 40 }), days => {
            const events: any[] = [];
            days.forEach(x => {
                const base = new Date(2026, 9, x.d).getTime();
                const ds = localStr(base);
                const tin = base + x.inMin * 60000;
                events.push({ userId: x.user, type: 'check_in', timestamp: tin, date: ds });
                if (x.breakMin) events.push({ userId: x.user, type: 'break_end', duration: x.breakMin * 60000, timestamp: tin + 120 * 60000, date: ds });
                if (x.checkout) events.push({ userId: x.user, type: 'check_out', timestamp: tin + (x.workMin + x.breakMin) * 60000, date: ds });
            });
            const timeLogs = STAFF.map(u => ({ taskId: 'J2-1', taskDesc: 'x', client: 'Acme', userId: u, startTime: new Date(2026, 9, 2, 10).getTime(), endTime: new Date(2026, 9, 2, 11).getTime(), durationSeconds: 3600 }));
            const m = build({ timeLogs, attendanceEvents: events });
            STAFF.forEach(u => {
                const mine = days.filter(x => x.user === u);
                const row = m.attendance.rows.find((r: any) => r.email === u);
                expect(row.presentDays).toBe(mine.length);
                expect(row.lateArrivals).toBe(mine.filter(x => x.inMin > 9 * 60 + 45).length);
                expect(row.breakSec).toBe(sum(mine.map(x => x.breakMin * 60)));
                expect(row.workSec).toBe(sum(mine.filter(x => x.checkout).map(x => x.workMin * 60)));
                expect(row.missingCheckout).toBe(mine.filter(x => !x.checkout).length);
            });
        }), { numRuns: RUNS });
    });

    it('QC counts, pass rate and rework rounds match the oracle', () => {
        const qcArb = fc.array(fc.record({
            task: fc.constantFrom('J2-1', 'J2-2', 'M-1'),
            creator: fc.constantFrom(...STAFF),
            pass: fc.boolean(),
            d: fc.integer({ min: -10, max: 40 }),
            sec: fc.integer({ min: 0, max: 3600 })
        }), { maxLength: 30 });
        fc.assert(fc.property(qcArb, list => {
            const qcReports = list.map((q, i) => ({ taskId: q.task, assigneeEmail: q.creator, qcEmail: 'lead@x.com', status: q.pass ? 'Approved' : 'Rework', mistakeItems: q.pass ? [] : ['Font'], durationSeconds: q.sec, timestamp: new Date(2026, 9, 1 + q.d, 10, i).getTime() }));
            const m = build({ qcReports });
            const inP = qcReports.filter(r => r.timestamp >= FROM && r.timestamp <= TO);
            expect(m.qc.reviews).toBe(inP.length);
            expect(m.qc.passed).toBe(inP.filter(r => r.status === 'Approved').length);
            expect(m.qc.failed).toBe(inP.filter(r => r.status === 'Rework').length);
            expect(m.qc.qcSeconds).toBe(sum(inP.map(r => r.durationSeconds)));
            expect(m.kpis.qcPassed).toBe(inP.length ? m.qc.passed : null);
            m.qc.rows.forEach((row: any) => {
                const rounds = qcReports.filter(r => r.taskId === row.submissionId && r.status === 'Rework' && r.timestamp <= row.dateTs).length;
                expect(row.reworkRounds).toBe(rounds);
            });
        }), { numRuns: RUNS });
    });
});

describe('One Report – edge cases', () => {
    const log = (o: any) => ({ taskId: 'J2-1', taskDesc: 'Poster design', client: 'Acme', userId: 'amy@x.com', ...o });

    it('month boundaries: 23:59 on the last day is in, 00:00 on the next day is out', () => {
        const m = build({
            timeLogs: [
                log({ startTime: new Date(2026, 9, 31, 23, 59).getTime(), endTime: new Date(2026, 10, 1, 0, 9).getTime(), durationSeconds: 600 }),
                log({ startTime: new Date(2026, 10, 1, 0, 0).getTime() + 3600000, endTime: new Date(2026, 10, 1, 2, 0).getTime(), durationSeconds: 3600 }),
                log({ startTime: new Date(2026, 8, 30, 23, 0).getTime(), endTime: new Date(2026, 8, 30, 23, 30).getTime(), durationSeconds: 1800 }),
                log({ startTime: new Date(2026, 9, 1, 0, 0).getTime(), endTime: new Date(2026, 9, 1, 0, 30).getTime(), durationSeconds: 1800 })
            ]
        });
        expect(m.kpis.totalSec).toBe(600 + 1800);
    });

    it('a session that crosses midnight is credited to its start date', () => {
        const m = build({ timeLogs: [log({ startTime: new Date(2026, 8, 30, 23, 0).getTime(), endTime: new Date(2026, 9, 1, 1, 0).getTime(), durationSeconds: 7200 })] });
        expect(m.kpis.totalSec).toBe(0);
    });

    it('accepts string timestamps and string durations', () => {
        const s = new Date(2026, 9, 5, 10).getTime();
        const m = build({ timeLogs: [log({ startTime: String(s), endTime: String(s + 3600000), durationSeconds: '3600' })] });
        expect(m.kpis.totalSec).toBe(3600);
    });

    it('drops zero-length and undated logs and exact duplicates', () => {
        const s = new Date(2026, 9, 5, 10).getTime();
        const a = log({ startTime: s, endTime: s + 3600000, durationSeconds: 3600 });
        const m = build({ timeLogs: [a, { ...a }, log({ startTime: s + 7200000, endTime: s + 7200000, durationSeconds: 0 }), { userId: 'amy@x.com', durationSeconds: 999 }] });
        expect(m.kpis.totalSec).toBe(3600);
        expect(m.entries.length).toBe(1);
    });

    it('when a timer excluded hold time (duration < end − start), overlap trimming never removes more than the recorded duration', () => {
        const s = new Date(2026, 9, 5, 10).getTime();
        const m = build({
            timeLogs: [
                log({ startTime: s, endTime: s + 4 * 3600000, durationSeconds: 3600 }), // 1h worked across 4h wall time
                log({ taskId: 'J2-2', startTime: s + 3600000, endTime: s + 2 * 3600000, durationSeconds: 3600 })
            ]
        });
        m.entries.forEach((l: any) => expect(l.seconds).toBeGreaterThanOrEqual(0));
        expect(m.kpis.totalSec).toBeLessThanOrEqual(7200);
    });

    it('February in a leap year has the right number of working days', () => {
        const m = E.build({ users: USERS, timeLogs: [log({ startTime: new Date(2028, 1, 3, 10).getTime(), endTime: new Date(2028, 1, 3, 11).getTime(), durationSeconds: 3600 })], requests: [] },
            { viewer: { email: 'amy@x.com' }, period: { mode: 'month', month: '2028-02' }, now: new Date(2028, 3, 1).getTime() });
        // Feb 2028: 29 days, Sundays on 6, 13, 20, 27 → 25 working days
        expect(m.team[0].workingDays).toBe(25);
    });

    it('current month counts capacity only up to today', () => {
        const now = new Date(2026, 10, 4, 12).getTime(); // Wed 4 Nov
        const m = E.build({ users: USERS, timeLogs: [log({ startTime: new Date(2026, 10, 2, 10).getTime(), endTime: new Date(2026, 10, 2, 11).getTime(), durationSeconds: 3600 })], requests: [] },
            { viewer: { email: 'amy@x.com' }, period: { mode: 'current_month' }, now });
        expect(m.period.inProgress).toBe(true);
        expect(m.team[0].workingDays).toBe(3); // Mon 2, Tue 3, Wed 4 (Sun 1 excluded)
    });

    it('custom range given backwards is normalised', () => {
        const p = E.resolvePeriod({ mode: 'custom', from: '2026-10-20', to: '2026-10-10' }, NOW);
        expect(p.fromStr).toBe('2026-10-10');
        expect(p.toStr).toBe('2026-10-20');
    });

    it('employees cannot widen scope with crafted filters or roles', () => {
        const s = new Date(2026, 9, 5, 10).getTime();
        const timeLogs = STAFF.map(u => log({ userId: u, startTime: s, endTime: s + 3600000, durationSeconds: 3600 }));
        for (const role of ['Staff', 'admin ', 'Senior Manager', '']) {
            const m = E.build({ users: USERS, adminEmails: ['boss@x.com'], managerEmails: [], approvalChains: CHAINS, timeLogs },
                { viewer: { email: 'cat@x.com', role }, period: { mode: 'month', month: '2026-10' }, filters: { employee: 'amy@x.com' }, now: NOW });
            expect(m.entries.every((l: any) => l.email === 'cat@x.com')).toBe(true);
        }
    });

    it('email aliases resolve to one employee (no split rows)', () => {
        const s = new Date(2026, 9, 5, 10).getTime();
        const m = E.build({ users: [{ email: 'barathvilpower@gmail.com', name: 'Barath', role: 'x' }],
            timeLogs: [
                { taskId: 'J2-1', taskDesc: 'x', client: 'Acme', userId: 'barath@vilpower.com', startTime: s, endTime: s + 3600000, durationSeconds: 3600 },
                { taskId: 'J2-2', taskDesc: 'y', client: 'Acme', userId: 'BarathVilpower@gmail.com', startTime: s + 7200000, endTime: s + 10800000, durationSeconds: 3600 }
            ] }, { viewer: { email: 'barathvilpower@gmail.com' }, period: { mode: 'month', month: '2026-10' }, now: NOW });
        expect(m.team.length).toBe(1);
        expect(m.kpis.totalSec).toBe(7200);
    });

    it('client spellings that differ only by case/spacing are merged, and filters accept any spelling', () => {
        const s = new Date(2026, 9, 5, 10).getTime();
        const timeLogs = ['Acme Foods', 'ACME  FOODS', 'acme foods ', 'Acme Foods', 'Acme*'].map((c, i) =>
            log({ client: c, taskId: `J2-${i}`, startTime: s + i * 7200000, endTime: s + i * 7200000 + 3600000, durationSeconds: 3600 }));
        const m = build({ timeLogs });
        expect(m.clients.map((c: any) => [c.client, c.seconds])).toEqual([['Acme Foods', 4 * 3600], ['Acme*', 3600]]);
        expect(build({ timeLogs }, 'boss@x.com', { client: 'acme foods' }).kpis.totalSec).toBe(4 * 3600);
        expect(build({ timeLogs }, 'boss@x.com', { client: 'Acme*' }).kpis.totalSec).toBe(3600);
    });

    it('category and client classification follow the documented rules', () => {
        const cases: [string, string][] = [
            ['[QC] Diwali poster', 'QC Review'], ['Morning learning', 'Learning'], ['Sales proposal for lead', 'Business Development'],
            ['Reel edit', 'Video Editing'], ['Poster design', 'Design'], ['Caption writing', 'Content Writing'],
            ['Meta ads campaign', 'Ads & Campaigns'], ['Website SEO audit', 'SEO & Web'], ['Instagram posting', 'Social Media Management'],
            ['Content strategy', 'Content Writing'], ['Weekly team meeting', 'Meetings & Reporting'], ['Misc', 'Other']
        ];
        cases.forEach(([desc, cat]) => expect([desc, E.deriveCategory(desc, null)]).toEqual([desc, cat]));
        ['', 'General', 'others', 'VilPower', 'Learnings', ' n/a '].forEach(c => expect(E.cleanClient(c)).toBe(E.INTERNAL_CLIENT));
        expect(E.cleanClient('Acme')).toBe('Acme');
    });
});
