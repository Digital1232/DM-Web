/**
 * Jira API Client
 * Handles authentication and querying of Jira API with exponential backoff retry logic
 * 
 * Implements:
 * - Jira REST API v2 integration for task querying
 * - Authentication using API tokens
 * - Exponential backoff retry logic (1m, 5m, 15m, max 3 retries)
 * - Pagination handling for large task lists
 * - Fetching completed/posted tasks from last 90 minutes
 * - Attachment extraction and metadata retrieval
 */

import fetch, { Response } from 'node-fetch';
import { Logger } from '../utils/logger';
import { getEnvironmentConfig } from '../config/environment';

/**
 * Jira task attachment metadata
 */
export interface JiraAttachment {
  id: string;
  fileName: string;
  created: string;
  size: number;
  mimeType: string;
  content: string; // URL to download the attachment
}

/**
 * Jira task summary from API
 */
export interface JiraTask {
  key: string;
  id: string;
  fields: {
    summary: string;
    description?: string;
    assignee?: {
      name: string;
      emailAddress: string;
      displayName: string;
    };
    created: string;
    updated: string;
    attachment?: JiraAttachment[];
    status: {
      name: string;
    };
  };
}

/**
 * Query response from Jira API with pagination
 */
export interface JiraQueryResponse {
  expand: string;
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraTask[];
}

/**
 * Retry configuration
 */
interface RetryConfig {
  maxRetries: number;
  backoffMs: number[];
}

/**
 * Result of a detection operation
 */
export interface DetectionResult {
  processed: number;
  created: number;
  failed: number;
  errors: string[];
}

/**
 * Jira API Client for querying tasks
 * 
 * Responsibilities:
 * - Authenticate with Jira using API tokens
 * - Query tasks with specific statuses (Completed, Posted)
 * - Handle pagination for large result sets
 * - Extract and validate attachments
 * - Implement exponential backoff retry on failures
 */
export class JiraClient {
  private baseUrl: string;
  private apiToken: string;
  private username: string;
  private apiTimeoutMs: number;
  private retryConfig: RetryConfig;
  private logger: Logger;
  private lookbackMinutes: number;

  constructor() {
    const config = getEnvironmentConfig();
    this.baseUrl = config.jira.baseUrl;
    this.apiToken = config.jira.apiToken;
    this.username = config.jira.username;
    this.apiTimeoutMs = config.jira.apiTimeoutMs;
    this.lookbackMinutes = config.jira.submissionDetectionLookbackMinutes;
    this.retryConfig = {
      maxRetries: config.jira.retryMaxAttempts,
      backoffMs: config.jira.retryBackoffMs,
    };
    this.logger = new Logger('JiraClient');
  }

  /**
   * Creates authorization header for Jira API
   * Uses Basic Auth with API token
   */
  private getAuthHeader(): string {
    const credentials = `${this.username}:${this.apiToken}`;
    const base64Credentials = Buffer.from(credentials).toString('base64');
    return `Basic ${base64Credentials}`;
  }

  /**
   * Calculate JQL query for recently completed/posted tasks
   * Filters for tasks transitioned to Completed or Posted within the lookback period
   */
  private buildTaskQuery(): string {
    // Calculate timestamp for lookback period
    const now = new Date();
    const lookbackTime = new Date(now.getTime() - this.lookbackMinutes * 60000);
    const lookbackIso = lookbackTime.toISOString().split('.')[0]; // Remove milliseconds

    // JQL query: find tasks with "Completed" or "Posted" status updated in the last N minutes
    // This captures tasks that were transitioned to these statuses within the lookback period
    const jql = `(status = "Completed" OR status = "Posted") AND updated >= "${lookbackIso}"`;

    this.logger.debug('Built JQL query for task detection', {
      lookbackMinutes: this.lookbackMinutes,
      lookbackTime: lookbackIso,
      jql,
    });

    return jql;
  }

  /**
   * Fetch tasks from Jira with pagination
   * 
   * @param jql - JQL query string
   * @param startAt - Pagination start index
   * @param maxResults - Number of results per page
   * @returns Query response with issues and pagination info
   * @throws Error if API call fails after retries
   */
  private async queryTasksWithRetry(
    jql: string,
    startAt: number = 0,
    maxResults: number = 50
  ): Promise<JiraQueryResponse> {
    const url = `${this.baseUrl}/rest/api/2/search`;
    const params = new URLSearchParams({
      jql,
      startAt: startAt.toString(),
      maxResults: maxResults.toString(),
      fields: 'summary,description,assignee,created,updated,attachment,status',
      expand: 'changelog',
    });

    const fullUrl = `${url}?${params.toString()}`;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        this.logger.debug('Querying Jira API', {
          attempt: attempt + 1,
          maxRetries: this.retryConfig.maxRetries,
          url: fullUrl,
        });

        const response = await this.makeRequest(fullUrl);
        const data = (await response.json()) as JiraQueryResponse;

        this.logger.info('Jira API query successful', {
          issuesCount: data.issues.length,
          total: data.total,
          startAt: data.startAt,
          attempt: attempt + 1,
        });

        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.retryConfig.maxRetries) {
          const backoffMs = this.retryConfig.backoffMs[attempt];
          this.logger.warn('Jira API query failed, retrying with exponential backoff', {
            attempt: attempt + 1,
            maxRetries: this.retryConfig.maxRetries,
            backoffMs,
            error: lastError.message,
          });

          // Wait before retrying
          await this.delay(backoffMs);
        }
      }
    }

    // All retries exhausted
    this.logger.error('Jira API query failed after all retries', {
      maxRetries: this.retryConfig.maxRetries,
      error: lastError?.message,
    });

    throw new Error(`Failed to query Jira API after ${this.retryConfig.maxRetries} retries: ${lastError?.message}`);
  }

  /**
   * Make HTTP request with timeout
   */
  private async makeRequest(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.apiTimeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: controller.signal as any, // node-fetch compatibility
      });

      if (!response.ok) {
        throw new Error(
          `Jira API returned status ${response.status}: ${response.statusText}`
        );
      }

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Utility function to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validate media format is supported
   * 
   * @param fileName - Name of the attachment file
   * @returns true if format is supported, false otherwise
   */
  private isValidMediaFormat(fileName: string): boolean {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (!extension) return false;

    const config = getEnvironmentConfig();
    const validVideoFormats = config.submissionDetection.supportedVideoFormats;
    const validPosterFormats = config.submissionDetection.supportedPosterFormats;

    const isValid = validVideoFormats.includes(extension) || validPosterFormats.includes(extension);

    if (!isValid) {
      this.logger.debug('Unsupported media format detected', {
        fileName,
        extension,
        validVideoFormats,
        validPosterFormats,
      });
    }

    return isValid;
  }

  /**
   * Extract and validate attachments from a task
   * 
   * @param task - Jira task to extract attachments from
   * @returns Array of valid attachment objects
   */
  public extractAttachments(task: JiraTask): JiraAttachment[] {
    if (!task.fields.attachment || task.fields.attachment.length === 0) {
      return [];
    }

    const validAttachments: JiraAttachment[] = [];

    for (const attachment of task.fields.attachment) {
      // Validate format
      if (!this.isValidMediaFormat(attachment.fileName)) {
        this.logger.debug('Skipping attachment with unsupported format', {
          taskKey: task.key,
          fileName: attachment.fileName,
        });
        continue;
      }

      validAttachments.push(attachment);
    }

    this.logger.debug('Extracted valid attachments from task', {
      taskKey: task.key,
      totalAttachments: task.fields.attachment.length,
      validAttachments: validAttachments.length,
    });

    return validAttachments;
  }

  /**
   * Fetch all completed/posted tasks from the last 90 minutes
   * Handles pagination automatically to retrieve all matching tasks
   * 
   * @returns Array of Jira tasks with attachments
   * @throws Error if API calls fail after retries
   */
  public async fetchCompletedTasksLastNMinutes(): Promise<JiraTask[]> {
    const jql = this.buildTaskQuery();
    const allTasks: JiraTask[] = [];

    let startAt = 0;
    const maxResults = 50; // Page size

    this.logger.info('Starting to fetch completed/posted tasks', {
      lookbackMinutes: this.lookbackMinutes,
    });

    try {
      // Paginate through all results
      while (true) {
        const response = await this.queryTasksWithRetry(jql, startAt, maxResults);

        allTasks.push(...response.issues);

        this.logger.debug('Fetched page of tasks', {
          currentPage: Math.floor(startAt / maxResults) + 1,
          tasksInPage: response.issues.length,
          totalFetched: allTasks.length,
          totalAvailable: response.total,
        });

        // Check if there are more results
        if (startAt + maxResults >= response.total) {
          break;
        }

        startAt += maxResults;
      }

      this.logger.info('Completed fetching all tasks', {
        totalTasks: allTasks.length,
        lookbackMinutes: this.lookbackMinutes,
      });

      return allTasks;
    } catch (error) {
      this.logger.error('Failed to fetch completed tasks', {
        error: error instanceof Error ? error.message : String(error),
        lookbackMinutes: this.lookbackMinutes,
      });
      throw error;
    }
  }

  /**
   * Fetch a single task by key with full details
   * Useful for retrieving a specific task after detection
   * 
   * @param taskKey - Jira task key (e.g., "PROJ-123")
   * @returns Complete task details
   * @throws Error if task not found or API fails
   */
  public async fetchTaskByKey(taskKey: string): Promise<JiraTask> {
    const url = `${this.baseUrl}/rest/api/2/issue/${taskKey}`;
    const params = new URLSearchParams({
      fields: 'summary,description,assignee,created,updated,attachment,status',
      expand: 'changelog',
    });

    const fullUrl = `${url}?${params.toString()}`;

    try {
      this.logger.debug('Fetching task by key', { taskKey });

      const response = await this.makeRequest(fullUrl);
      const task = (await response.json()) as JiraTask;

      this.logger.info('Successfully fetched task', {
        taskKey,
        summary: task.fields.summary,
      });

      return task;
    } catch (error) {
      this.logger.error('Failed to fetch task by key', {
        taskKey,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Test Jira connection and authentication
   * Useful for health checks and configuration validation
   * 
   * @returns true if connection is successful
   */
  public async testConnection(): Promise<boolean> {
    try {
      this.logger.info('Testing Jira connection');

      const url = `${this.baseUrl}/rest/api/2/myself`;
      const response = await this.makeRequest(url);
      const user = (await response.json()) as { name: string; displayName: string };

      this.logger.info('Jira connection successful', {
        authenticatedAs: user.displayName,
      });

      return true;
    } catch (error) {
      this.logger.error('Jira connection test failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}

export default JiraClient;
