/**
 * SubmissionDetector Tests
 * Tests for the Jira submission detection and Firebase storage workflow
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SubmissionDetector } from './SubmissionDetector';
import { SubmissionService } from './SubmissionService';
import { JiraClient } from '../clients/jira';

// Mock modules
vi.mock('../clients/jira');
vi.mock('./SubmissionService');
vi.mock('node-schedule');

describe('SubmissionDetector', () => {
  let detector: SubmissionDetector;
  let mockJiraClient: any;
  let mockSubmissionService: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create instances with mocked dependencies
    detector = new SubmissionDetector();
    mockJiraClient = vi.mocked(JiraClient).mock.instances[0];
    mockSubmissionService = vi.mocked(SubmissionService).mock.instances[0];
  });

  afterEach(() => {
    detector.stop();
  });

  describe('detectAndProcessSubmissions', () => {
    it('should process completed tasks from Jira and create submissions', async () => {
      // Mock Jira response
      const mockTasks = [
        {
          key: 'TASK-001',
          id: 'task-001',
          fields: {
            summary: 'Test Video Submission',
            assignee: {
              emailAddress: 'user@example.com',
              displayName: 'Test User',
            },
            attachment: [
              {
                id: 'att-001',
                fileName: 'campaign_video.mp4',
                created: '2026-07-21T10:30:00Z',
                size: 104857600, // 100MB
                mimeType: 'video/mp4',
                content: 'https://jira.example.com/attachment/video.mp4',
              },
            ],
            status: { name: 'Completed' },
            created: '2026-07-21T09:00:00Z',
            updated: '2026-07-21T10:35:00Z',
          },
        },
      ];

      mockJiraClient.fetchCompletedTasksLastNMinutes.mockResolvedValue(mockTasks);
      mockJiraClient.extractAttachments.mockReturnValue(mockTasks[0].fields.attachment);
      mockSubmissionService.checkDuplicateSubmission.mockResolvedValue(null);
      mockSubmissionService.createSubmission.mockResolvedValue('SUB-001');
      mockSubmissionService.updateStatusToPendingEvaluation.mockResolvedValue({});

      const result = await detector.detectAndProcessSubmissions();

      expect(result.processed).toBe(1);
      expect(result.created).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.duplicates).toBe(0);
      expect(mockSubmissionService.createSubmission).toHaveBeenCalledOnce();
      expect(mockSubmissionService.updateStatusToPendingEvaluation).toHaveBeenCalledWith('SUB-001');
    });

    it('should skip duplicate submissions', async () => {
      const mockTasks = [
        {
          key: 'TASK-002',
          id: 'task-002',
          fields: {
            summary: 'Poster Submission',
            assignee: {
              emailAddress: 'designer@example.com',
              displayName: 'Designer Name',
            },
            attachment: [
              {
                id: 'att-002',
                fileName: 'design_poster.png',
                created: '2026-07-20T15:00:00Z',
                size: 5242880, // 5MB
                mimeType: 'image/png',
                content: 'https://jira.example.com/attachment/poster.png',
              },
            ],
            status: { name: 'Posted' },
            created: '2026-07-20T14:00:00Z',
            updated: '2026-07-20T15:05:00Z',
          },
        },
      ];

      mockJiraClient.fetchCompletedTasksLastNMinutes.mockResolvedValue(mockTasks);
      mockJiraClient.extractAttachments.mockReturnValue(mockTasks[0].fields.attachment);
      mockSubmissionService.checkDuplicateSubmission.mockResolvedValue('SUB-EXISTING-001');

      const result = await detector.detectAndProcessSubmissions();

      expect(result.processed).toBe(1);
      expect(result.created).toBe(0);
      expect(result.duplicates).toBe(1);
      expect(mockSubmissionService.createSubmission).not.toHaveBeenCalled();
    });

    it('should handle Jira API errors gracefully', async () => {
      const jiraError = new Error('Jira API connection failed');
      mockJiraClient.fetchCompletedTasksLastNMinutes.mockRejectedValue(jiraError);

      const result = await detector.detectAndProcessSubmissions();

      expect(result.processed).toBe(0);
      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].taskId).toBe('JIRA_QUERY');
      expect(result.errors[0].error).toContain('Jira API connection failed');
    });

    it('should determine media type correctly', async () => {
      const mockTasks = [
        {
          key: 'TASK-003',
          id: 'task-003',
          fields: {
            summary: 'Mixed Media',
            assignee: {
              emailAddress: 'creator@example.com',
              displayName: 'Content Creator',
            },
            attachment: [
              {
                id: 'att-video',
                fileName: 'production.webm',
                created: '2026-07-19T12:00:00Z',
                size: 314572800, // 300MB
                mimeType: 'video/webm',
                content: 'https://jira.example.com/attachment/video.webm',
              },
              {
                id: 'att-poster',
                fileName: 'thumbnail.svg',
                created: '2026-07-19T12:01:00Z',
                size: 102400, // 100KB
                mimeType: 'image/svg+xml',
                content: 'https://jira.example.com/attachment/poster.svg',
              },
            ],
            status: { name: 'Completed' },
            created: '2026-07-19T11:00:00Z',
            updated: '2026-07-19T12:05:00Z',
          },
        },
      ];

      mockJiraClient.fetchCompletedTasksLastNMinutes.mockResolvedValue(mockTasks);
      mockJiraClient.extractAttachments.mockReturnValue(mockTasks[0].fields.attachment);
      mockSubmissionService.checkDuplicateSubmission.mockResolvedValue(null);
      mockSubmissionService.createSubmission.mockResolvedValue('SUB-002');
      mockSubmissionService.updateStatusToPendingEvaluation.mockResolvedValue({});

      const result = await detector.detectAndProcessSubmissions();

      expect(result.processed).toBe(1);
      expect(result.created).toBe(2);

      const calls = mockSubmissionService.createSubmission.mock.calls;
      expect(calls[0][0].mediaType).toBe('video');
      expect(calls[1][0].mediaType).toBe('poster');
    });

    it('should track detection cycle timing', async () => {
      mockJiraClient.fetchCompletedTasksLastNMinutes.mockResolvedValue([]);

      const result = await detector.detectAndProcessSubmissions();

      expect(result.startTime).toBeGreaterThan(0);
      expect(result.endTime).toBeGreaterThan(result.startTime);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.durationMs).toBe(result.endTime - result.startTime);
    });
  });

  describe('scheduler', () => {
    it('should report scheduler status', () => {
      const status = detector.getStatus();

      expect(status).toHaveProperty('running');
      expect(status).toHaveProperty('scheduled');
      expect(status).toHaveProperty('intervalMinutes');
      expect(status.intervalMinutes).toBe(120); // 2 hours for MVP
    });

    it('should prevent concurrent detection cycles', async () => {
      mockJiraClient.fetchCompletedTasksLastNMinutes.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      );

      // Start first detection
      const promise1 = detector.detectAndProcessSubmissions();

      // Try to start second detection while first is running
      const promise2 = detector.detectAndProcessSubmissions();

      const result2 = await promise2;
      expect(result2.processed).toBe(0);
      expect(result2.created).toBe(0);

      // Wait for first to complete
      await promise1;
    });
  });
});
