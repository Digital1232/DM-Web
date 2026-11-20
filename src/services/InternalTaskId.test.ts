import { describe, it, expect } from 'vitest';
import { isInternalTaskId, getNextInternalTaskIdFromList } from './InternalTaskId';

describe('Internal Task Project Key System', () => {
    describe('isInternalTaskId', () => {
        it('identifies monthly internal task keys correctly', () => {
            expect(isInternalTaskId('NOV-26-001')).toBe(true);
            expect(isInternalTaskId('DEC-26-002')).toBe(true);
            expect(isInternalTaskId('JAN-27-045')).toBe(true);
            expect(isInternalTaskId('nov-26-001')).toBe(true); // case-insensitive
        });

        it('identifies legacy internal and manual task prefixes', () => {
            expect(isInternalTaskId('M-1732098492019')).toBe(true);
            expect(isInternalTaskId('M-100')).toBe(true);
            expect(isInternalTaskId('LEARN-sneha')).toBe(true);
            expect(isInternalTaskId('DISC-999')).toBe(true);
            expect(isInternalTaskId('INT-501')).toBe(true);
            expect(isInternalTaskId('STRAT-123')).toBe(true);
        });

        it('does NOT treat Jira issue keys as internal tasks', () => {
            expect(isInternalTaskId('NOV-1')).toBe(false);
            expect(isInternalTaskId('NOV-123')).toBe(false);
            expect(isInternalTaskId('DEC-45')).toBe(false);
            expect(isInternalTaskId('OCT-101')).toBe(false);
            expect(isInternalTaskId('PROJ-999')).toBe(false);
        });

        it('handles null, empty or undefined gracefully', () => {
            expect(isInternalTaskId('')).toBe(false);
            expect(isInternalTaskId(null)).toBe(false);
            expect(isInternalTaskId(undefined)).toBe(false);
        });
    });

    describe('getNextInternalTaskIdFromList', () => {
        it('generates NOV-26-001 as first task of November 2026', () => {
            const date = new Date(2026, 10, 20); // Nov 20, 2026
            const nextKey = getNextInternalTaskIdFromList(date, []);
            expect(nextKey).toBe('NOV-26-001');
        });

        it('increments sequence accurately within the same month', () => {
            const date = new Date(2026, 10, 20);
            const existing = ['NOV-26-001', 'NOV-26-002', 'M-123', 'NOV-15']; // NOV-15 is Jira
            const nextKey = getNextInternalTaskIdFromList(date, existing);
            expect(nextKey).toBe('NOV-26-003');
        });

        it('handles task objects with id or taskId', () => {
            const date = new Date(2026, 10, 20);
            const existing = [
                { id: 'NOV-26-001' },
                { taskId: 'NOV-26-002' },
                { id: 'NOV-26-005' }
            ];
            const nextKey = getNextInternalTaskIdFromList(date, existing);
            expect(nextKey).toBe('NOV-26-006');
        });

        it('automatically renews sequence from 001 for a new month (e.g. December)', () => {
            const dateDec = new Date(2026, 11, 1); // Dec 1, 2026
            const existing = [
                'NOV-26-001',
                'NOV-26-002',
                'NOV-26-050'
            ];
            const nextKey = getNextInternalTaskIdFromList(dateDec, existing);
            expect(nextKey).toBe('DEC-26-001');
        });

        it('advances year code correctly (e.g. 2027 -> JAN-27-001)', () => {
            const dateJan27 = new Date(2027, 0, 5); // Jan 5, 2027
            const nextKey = getNextInternalTaskIdFromList(dateJan27, ['DEC-26-010']);
            expect(nextKey).toBe('JAN-27-001');
        });

        it('respects external counter from Firebase RTDB if higher', () => {
            const date = new Date(2026, 10, 20);
            const existing = ['NOV-26-001'];
            // Firebase counter is already at 4 (e.g. created by another client session)
            const nextKey = getNextInternalTaskIdFromList(date, existing, 4);
            expect(nextKey).toBe('NOV-26-005');
        });
    });
});
