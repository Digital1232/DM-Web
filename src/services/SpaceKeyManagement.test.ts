import { describe, it, expect, beforeEach } from 'vitest';

describe('Space Key Management & Automatic Task Purging', () => {
    let mockWindow: any;

    beforeEach(() => {
        mockWindow = {
            tasks: [
                { id: 'NOV-1', desc: 'Nov Creative Task 1', project: 'NOV', manual: false, taskType: 'jira' },
                { id: 'NOV-2', desc: 'Nov Creative Task 2', project: 'NOV', manual: false, taskType: 'jira' },
                { id: 'OCT-101', desc: 'Oct Campaign Task', project: 'OCT', manual: false, taskType: 'jira' },
                { id: 'OCT-102', desc: 'Oct Brochure Task', project: 'OCT', manual: false, taskType: 'jira' },
                { id: 'SEP-50', desc: 'Sep Old Task', project: 'SEP', manual: false, taskType: 'jira' },
                { id: 'M-123', desc: 'Internal Daily Learning', manual: true, taskType: 'internal' },
                { id: 'INT-99', desc: 'Creative Design Sync', manual: false, taskType: 'internal' }
            ],
            jiraProjectMappings: [
                { id: 'map-nov', projectKey: 'NOV', month: 11, monthName: 'November', year: '2026', isActive: true },
                { id: 'map-oct', projectKey: 'OCT', month: 10, monthName: 'October', year: 'all', isActive: false }
            ],
            JIRA: {
                projectKey: 'NOV',
                projectKeys: ['NOV']
            },
            storage: {} as Record<string, string>,
            safeSetLocalStorage: (k: string, v: string) => { mockWindow.storage[k] = v; },
            renderTasks: () => {},
            updateStats: () => {},
            toast: () => {}
        };

        mockWindow.getRegisteredProjectKeys = function() {
            const keys = new Set();
            if (Array.isArray(mockWindow.jiraProjectMappings) && mockWindow.jiraProjectMappings.length > 0) {
                mockWindow.jiraProjectMappings.forEach((m: any) => {
                    if (m && m.projectKey) keys.add(String(m.projectKey).trim().toUpperCase());
                });
            }
            if (keys.size === 0 && mockWindow.JIRA && mockWindow.JIRA.projectKey) {
                keys.add(String(mockWindow.JIRA.projectKey).trim().toUpperCase());
            }
            return Array.from(keys);
        };

        mockWindow.pruneTasksByProjectKeys = function() {
            const registeredKeys = new Set(mockWindow.getRegisteredProjectKeys().map((k: any) => k.toUpperCase()));
            if (registeredKeys.size === 0) return;

            const prevCount = (mockWindow.tasks || []).length;
            mockWindow.tasks = (mockWindow.tasks || []).filter((t: any) => {
                if (t.manual || t.taskType === 'internal') return true;
                const tId = String(t.id || '').toUpperCase().trim();
                const dashIdx = tId.indexOf('-');
                const pKey = (t.project ? String(t.project).toUpperCase().trim() : (dashIdx !== -1 ? tId.substring(0, dashIdx) : ''));
                return registeredKeys.has(pKey);
            });

            if (mockWindow.tasks.length !== prevCount) {
                mockWindow.safeSetLocalStorage('worksync_tasks', JSON.stringify(mockWindow.tasks));
                mockWindow.renderTasks();
                mockWindow.updateStats();
            }
        };

        mockWindow.deleteJiraProjectMapping = async function(idOrKey: string) {
            if (!idOrKey) return;
            const targetKey = String(idOrKey).trim().toUpperCase();

            const removedMapping = (mockWindow.jiraProjectMappings || []).find((m: any) =>
                String(m.id || '').toUpperCase() === targetKey || String(m.projectKey || '').toUpperCase() === targetKey
            );
            const removedProjectKey = removedMapping ? String(removedMapping.projectKey).toUpperCase() : targetKey;

            mockWindow.jiraProjectMappings = (mockWindow.jiraProjectMappings || []).filter((m: any) =>
                m.id !== idOrKey && String(m.projectKey || '').toUpperCase() !== removedProjectKey
            );

            mockWindow.pruneTasksByProjectKeys();
        };
    });

    it('should keep only active space key (NOV) and internal tasks when OCT and SEP are removed', () => {
        // Initially mappings have NOV and OCT, but tasks also contain SEP
        mockWindow.pruneTasksByProjectKeys();

        // SEP tasks should be pruned immediately
        const taskIdsAfterInitialPrune = mockWindow.tasks.map((t: any) => t.id);
        expect(taskIdsAfterInitialPrune).not.toContain('SEP-50');
        expect(taskIdsAfterInitialPrune).toContain('NOV-1');
        expect(taskIdsAfterInitialPrune).toContain('NOV-2');
        expect(taskIdsAfterInitialPrune).toContain('OCT-101');
        expect(taskIdsAfterInitialPrune).toContain('OCT-102');
        expect(taskIdsAfterInitialPrune).toContain('M-123');
        expect(taskIdsAfterInitialPrune).toContain('INT-99');

        // Now remove OCT space key
        mockWindow.deleteJiraProjectMapping('OCT');

        // Verify OCT tasks are completely removed, while NOV and internal tasks are preserved
        const remainingTaskIds = mockWindow.tasks.map((t: any) => t.id);
        expect(remainingTaskIds).toEqual(['NOV-1', 'NOV-2', 'M-123', 'INT-99']);
        expect(remainingTaskIds).not.toContain('OCT-101');
        expect(remainingTaskIds).not.toContain('OCT-102');

        // Verify storage was updated with only the allowed tasks
        const stored = JSON.parse(mockWindow.storage['worksync_tasks']);
        expect(stored.map((t: any) => t.id)).toEqual(['NOV-1', 'NOV-2', 'M-123', 'INT-99']);
    });

    it('should keep only NOV when initialized with NOV mapping only', () => {
        mockWindow.jiraProjectMappings = [
            { id: 'map-nov', projectKey: 'NOV', month: 11, monthName: 'November', year: '2026', isActive: true }
        ];

        mockWindow.pruneTasksByProjectKeys();

        const remainingTaskIds = mockWindow.tasks.map((t: any) => t.id);
        expect(remainingTaskIds).toEqual(['NOV-1', 'NOV-2', 'M-123', 'INT-99']);
        expect(mockWindow.getRegisteredProjectKeys()).toEqual(['NOV']);
    });
});

