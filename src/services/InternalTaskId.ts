export const INTERNAL_TASK_MONTH_CODES = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
];

/**
 * Checks if a given task ID or key belongs to an internal task.
 * Supports:
 * - Monthly keys: [MMM]-[YY]-[000] (e.g. NOV-26-001, DEC-26-002)
 * - Legacy manual task prefixes: M-, A-, LEARN-, MP-, DISC-, P-, INT-, STRAT-
 */
export function isInternalTaskId(id: string | null | undefined): boolean {
    if (!id) return false;
    const str = String(id).toUpperCase().trim();
    if (
        str.startsWith('M-') ||
        str.startsWith('A-') ||
        str.startsWith('LEARN-') ||
        str.startsWith('MP-') ||
        str.startsWith('DISC-') ||
        str.startsWith('P-') ||
        str.startsWith('INT-') ||
        str.startsWith('STRAT-')
    ) {
        return true;
    }
    // Monthly internal task key format: e.g. NOV-26-001
    return /^[A-Z]{3,4}-\d{2}-\d+$/i.test(str);
}

/**
 * Calculates the next internal task ID for a given creation date based on existing tasks and/or highest sequence number.
 * Format: [MMM]-[YY]-[000] (e.g. NOV-26-001)
 */
export function getNextInternalTaskIdFromList(
    createdDate: Date | number | string = new Date(),
    existingTaskIds: Array<string | { id?: string; taskId?: string }> = [],
    externalCounter: number = 0
): string {
    const d = createdDate instanceof Date ? createdDate : new Date(createdDate || Date.now());
    const m = INTERNAL_TASK_MONTH_CODES[d.getMonth()] || 'NOV';
    const yy = String(d.getFullYear()).slice(-2);
    const prefix = `${m}-${yy}-`;
    const regex = new RegExp(`^${m}-${yy}-(\\d+)$`, 'i');

    let maxSeq = Math.max(0, externalCounter || 0);

    const seen = new Set<string>();
    for (const item of existingTaskIds) {
        if (!item) continue;
        const id = typeof item === 'string' ? item : (item.id || item.taskId || '');
        const cleanId = String(id).trim();
        if (!cleanId || seen.has(cleanId)) continue;
        seen.add(cleanId);

        const match = cleanId.match(regex);
        if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxSeq) {
                maxSeq = num;
            }
        }
    }

    const nextSeq = maxSeq + 1;
    return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}
