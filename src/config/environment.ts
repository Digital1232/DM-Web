/**
 * Environment Configuration Module
 * Validates and exports all environment variables
 */

import { Logger } from '../utils/logger';

const logger = new Logger('EnvironmentConfig');

interface DatabaseConfig {
  url: string;
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
  poolMin: number;
  poolMax: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
}

interface RedisConfig {
  url: string;
  host: string;
  port: number;
  db: number;
  password?: string;
  leaderboardTtlMs: number;
  statsTtlMs: number;
  dashboardTtlMs: number;
}

interface JiraConfig {
  baseUrl: string;
  apiToken: string;
  username: string;
  pollIntervalMs: number;
  submissionDetectionLookbackMinutes: number;
  apiTimeoutMs: number;
  retryMaxAttempts: number;
  retryBackoffMs: number[];
}

interface AIVisionConfig {
  primaryProvider: string;
  secondaryProvider: string;
  googleCloud: {
    projectId: string;
    apiKey: string;
    apiTimeoutMs: number;
  };
  azure: {
    endpoint: string;
    apiKey: string;
    apiTimeoutMs: number;
  };
  evaluationMaxRetries: number;
  evaluationRetryDelayMs: number;
  evaluationQueueConcurrentLimit: number;
}

interface NotificationConfig {
  emailProvider: string;
  sendgridApiKey: string;
  emailFrom: string;
  emailReplyTo: string;
  inAppEnabled: boolean;
  slackEnabled: boolean;
  slackWebhookUrl?: string;
  sendDelayMs: number;
  dedupWindowMs: number;
}

interface AwardConfig {
  compositionWeight: number;
  colorTheoryWeight: number;
  balanceWeight: number;
  scoreRoundingTolerance: number;
}

interface EnvironmentConfig {
  nodeEnv: string;
  port: number;
  logLevel: string;
  database: DatabaseConfig;
  redis: RedisConfig;
  jira: JiraConfig;
  aiVision: AIVisionConfig;
  notification: NotificationConfig;
  award: AwardConfig;
  submissionDetection: {
    maxFileSizeVideoMb: number;
    maxFileSizePosterMb: number;
    supportedVideoFormats: string[];
    supportedPosterFormats: string[];
  };
  mediaStorage: {
    type: string;
    localPath: string;
    cacheTtlMs: number;
  };
  audit: {
    enabled: boolean;
    retentionDays: number;
  };
  security: {
    jwtSecret: string;
    jwtExpiryHours: number;
    corsOrigin: string;
    httpsEnforced: boolean;
  };
}

function parseNumber(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

function parseArray(value: string | undefined, delimiter = ','): string[] {
  if (!value) return [];
  return value.split(delimiter).map((item) => item.trim());
}

export function getEnvironmentConfig(): EnvironmentConfig {
  const config: EnvironmentConfig = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseNumber(process.env.PORT, 3000),
    logLevel: process.env.LOG_LEVEL || 'info',

    database: {
      url: process.env.DATABASE_URL || 'postgresql://localhost:5432/ai_awards_db',
      host: process.env.DB_HOST || 'localhost',
      port: parseNumber(process.env.DB_PORT, 5432),
      name: process.env.DB_NAME || 'ai_awards_db',
      user: process.env.DB_USER || 'ai_awards_user',
      password: process.env.DB_PASSWORD || 'password',
      poolMin: parseNumber(process.env.DB_POOL_MIN, 2),
      poolMax: parseNumber(process.env.DB_POOL_MAX, 10),
      idleTimeoutMs: parseNumber(process.env.DB_IDLE_TIMEOUT_MS, 30000),
      connectionTimeoutMs: parseNumber(process.env.DB_CONNECTION_TIMEOUT_MS, 2000),
    },

    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      host: process.env.REDIS_HOST || 'localhost',
      port: parseNumber(process.env.REDIS_PORT, 6379),
      db: parseNumber(process.env.REDIS_DB, 0),
      password: process.env.REDIS_PASSWORD,
      leaderboardTtlMs: parseNumber(process.env.REDIS_LEADERBOARD_TTL_MS, 3600000),
      statsTtlMs: parseNumber(process.env.REDIS_STATS_TTL_MS, 86400000),
      dashboardTtlMs: parseNumber(process.env.REDIS_DASHBOARD_TTL_MS, 7200000),
    },

    jira: {
      baseUrl: process.env.JIRA_BASE_URL || 'https://your-company.atlassian.net',
      apiToken: process.env.JIRA_API_TOKEN || '',
      username: process.env.JIRA_USERNAME || '',
      pollIntervalMs: parseNumber(process.env.JIRA_POLL_INTERVAL_MS, 3600000),
      submissionDetectionLookbackMinutes: parseNumber(
        process.env.JIRA_SUBMISSION_DETECTION_LOOKBACK_MINUTES,
        90
      ),
      apiTimeoutMs: parseNumber(process.env.JIRA_API_TIMEOUT_MS, 30000),
      retryMaxAttempts: parseNumber(process.env.JIRA_RETRY_MAX_ATTEMPTS, 3),
      retryBackoffMs: parseArray(process.env.JIRA_RETRY_BACKOFF_MS, ',').map((v) =>
        parseInt(v, 10)
      ) || [60000, 300000, 900000],
    },

    aiVision: {
      primaryProvider: process.env.AI_PROVIDER_PRIMARY || 'google_cloud_vision',
      secondaryProvider: process.env.AI_PROVIDER_SECONDARY || 'azure_computer_vision',
      googleCloud: {
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
        apiKey: process.env.GOOGLE_CLOUD_API_KEY || '',
        apiTimeoutMs: parseNumber(process.env.GOOGLE_VISION_API_TIMEOUT_MS, 120000),
      },
      azure: {
        endpoint: process.env.AZURE_VISION_ENDPOINT || '',
        apiKey: process.env.AZURE_VISION_API_KEY || '',
        apiTimeoutMs: parseNumber(process.env.AZURE_VISION_API_TIMEOUT_MS, 120000),
      },
      evaluationMaxRetries: parseNumber(process.env.AI_EVALUATION_MAX_RETRIES, 3),
      evaluationRetryDelayMs: parseNumber(process.env.AI_EVALUATION_RETRY_DELAY_MS, 21600000),
      evaluationQueueConcurrentLimit: parseNumber(
        process.env.AI_EVALUATION_QUEUE_CONCURRENT_LIMIT,
        5
      ),
    },

    notification: {
      emailProvider: process.env.NOTIFICATION_EMAIL_PROVIDER || 'sendgrid',
      sendgridApiKey: process.env.SENDGRID_API_KEY || '',
      emailFrom: process.env.NOTIFICATION_EMAIL_FROM || 'awards@company.com',
      emailReplyTo: process.env.NOTIFICATION_EMAIL_REPLY_TO || 'support@company.com',
      inAppEnabled: parseBoolean(process.env.NOTIFICATION_INAPP_ENABLED, true),
      slackEnabled: parseBoolean(process.env.NOTIFICATION_SLACK_ENABLED, false),
      slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
      sendDelayMs: parseNumber(process.env.NOTIFICATION_SEND_DELAY_MS, 300000),
      dedupWindowMs: parseNumber(process.env.NOTIFICATION_DEDUP_WINDOW_MS, 60000),
    },

    award: {
      compositionWeight: 0.35,
      colorTheoryWeight: 0.35,
      balanceWeight: 0.3,
      scoreRoundingTolerance: 1,
    },

    submissionDetection: {
      maxFileSizeVideoMb: parseNumber(process.env.SUBMISSION_MAX_FILE_SIZE_VIDEO_MB, 500),
      maxFileSizePosterMb: parseNumber(process.env.SUBMISSION_MAX_FILE_SIZE_POSTER_MB, 50),
      supportedVideoFormats: parseArray(process.env.SUBMISSION_SUPPORTED_VIDEO_FORMATS) || [
        'mp4',
        'mov',
        'webm',
      ],
      supportedPosterFormats: parseArray(process.env.SUBMISSION_SUPPORTED_POSTER_FORMATS) || [
        'png',
        'jpg',
        'jpeg',
        'svg',
      ],
    },

    mediaStorage: {
      type: process.env.MEDIA_STORAGE_TYPE || 'local',
      localPath: process.env.MEDIA_STORAGE_LOCAL_PATH || './media_cache',
      cacheTtlMs: parseNumber(process.env.MEDIA_STORAGE_CACHE_TTL_MS, 86400000),
    },

    audit: {
      enabled: parseBoolean(process.env.AUDIT_LOG_ENABLED, true),
      retentionDays: parseNumber(process.env.AUDIT_LOG_RETENTION_DAYS, 730),
    },

    security: {
      jwtSecret: process.env.JWT_SECRET || 'development-secret-key',
      jwtExpiryHours: parseNumber(process.env.JWT_EXPIRY_HOURS, 24),
      corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      httpsEnforced: parseBoolean(process.env.HTTPS_ENFORCED, false),
    },
  };

  // Validate critical configurations
  validateConfiguration(config);

  return config;
}

function validateConfiguration(config: EnvironmentConfig): void {
  if (config.nodeEnv === 'production') {
    if (!config.jira.apiToken) {
      logger.warn('JIRA_API_TOKEN is not set in production');
    }
    if (!config.aiVision.googleCloud.apiKey && !config.aiVision.azure.apiKey) {
      logger.warn('No AI vision API key is configured in production');
    }
    if (!config.notification.sendgridApiKey) {
      logger.warn('SENDGRID_API_KEY is not set in production');
    }
    if (config.security.jwtSecret === 'development-secret-key') {
      logger.error('JWT_SECRET is using development value in production');
    }
  }

  // Validate weight sum
  const totalWeight =
    config.award.compositionWeight +
    config.award.colorTheoryWeight +
    config.award.balanceWeight;
  if (Math.abs(totalWeight - 1.0) > 0.001) {
    logger.warn(`Award weights sum to ${totalWeight} instead of 1.0`);
  }

  logger.info('Environment configuration validated successfully');
}

export default getEnvironmentConfig();
