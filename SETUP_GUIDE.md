# AI Awards for Creativity Recognition - Setup Guide

## Overview

This guide provides step-by-step instructions for setting up the AI Awards for Creativity Recognition system for development and deployment.

## Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher (or yarn/pnpm)
- PostgreSQL 12.x or higher
- Redis 6.x or higher
- Git

## Project Structure

```
project-root/
├── src/
│   ├── index.ts                 # Main application entry point
│   ├── types/                   # TypeScript type definitions
│   ├── models/                  # Data models and interfaces
│   ├── services/                # Core business logic services
│   ├── repositories/            # Data access layer
│   ├── api/                     # Express route handlers
│   ├── middleware/              # Express middleware
│   └── utils/                   # Utility functions (logger, validators, etc.)
├── tests/                       # Test files
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   └── properties/              # Property-based tests
├── db/                          # Database scripts
│   ├── migrations/              # Schema migration files
│   └── seeds/                   # Initial data seeds
├── config/                      # Configuration files
├── .eslintrc.json               # ESLint configuration
├── .prettierrc.json             # Prettier configuration
├── .env.template                # Environment variables template
├── tsconfig.json                # TypeScript configuration
├── vitest.config.ts             # Vitest configuration
└── package.json                 # Project dependencies
```

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

This installs all required dependencies including:
- **Express**: Web framework
- **pg/pg-promise**: PostgreSQL client
- **redis**: Redis client for caching
- **@google-cloud/vision**: AI vision API client
- **axios**: HTTP client
- **winston**: Advanced logging
- **joi**: Schema validation
- **fast-check**: Property-based testing framework
- **vitest**: Test runner
- **eslint + @typescript-eslint**: Code linting
- **prettier**: Code formatting
- **typescript**: TypeScript compiler

### 2. Configure Environment Variables

```bash
# Copy the template file
cp .env.template .env

# Edit with your configuration
# Required values:
# - DATABASE_URL: PostgreSQL connection string
# - REDIS_URL: Redis connection string
# - JIRA_BASE_URL: Your Jira instance URL
# - JIRA_API_TOKEN: Jira API token
# - GOOGLE_CLOUD_PROJECT_ID: Google Cloud project ID
# - GOOGLE_CLOUD_API_KEY: Google Cloud Vision API key
```

### 3. Database Setup

#### PostgreSQL

```bash
# Create database
createdb ai_awards_db

# Run migrations (when migration system is set up)
npm run db:migrate
```

#### Initial Schema

The following tables will be created:
- `submissions` - Media submission records
- `awards` - Award records
- `audit_logs` - Immutable audit trail
- `team_members` - Team member information
- `award_categories` - Award category definitions

### 4. Redis Setup

Ensure Redis is running:

```bash
# macOS with Homebrew
brew services start redis

# Linux with systemctl
sudo systemctl start redis-server

# Or run Docker
docker run -d -p 6379:6379 redis:7-alpine
```

## Development Workflow

### Code Quality

```bash
# Run ESLint to check code style
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format code with Prettier
npm run format

# Check if code is formatted correctly
npm run format:check
```

### Testing

```bash
# Run all tests once
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run property-based tests with verbose output
npm run test:pbt
```

### Development Server

```bash
# Start development server
npm run dev

# Server will run on http://localhost:3000
# Health check: http://localhost:3000/health
```

## Configuration Details

### Environment Variables

The `.env.template` file contains all configurable options organized by category:

1. **Node Environment**: Runtime settings (port, log level)
2. **Database**: PostgreSQL connection parameters
3. **Redis**: Cache configuration
4. **Jira Integration**: API credentials and polling intervals
5. **AI Vision Models**: Primary and secondary provider settings
6. **Notifications**: Email and in-app notification settings
7. **Performance**: Rate limiting, timeouts, cache TTLs
8. **Security**: JWT and CORS settings

### Key Scheduling Configurations

```
# Submission Detection
JIRA_POLL_INTERVAL_MS=3600000              # Every 1 hour

# Weekly Award Calculation
AWARD_WEEKLY_CALCULATION_SCHEDULE=59 23 * * 0    # Sunday 23:59:59 UTC

# Monthly Award Calculation
AWARD_MONTHLY_CALCULATION_SCHEDULE=59 23 L * *   # Month-end 23:59:59 UTC
```

## Dependencies Explained

### Production Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| express | Web server framework | ^4.18.2 |
| pg | PostgreSQL client | ^8.11.3 |
| pg-promise | PostgreSQL promise wrapper | ^11.5.4 |
| redis | Redis client for caching | ^4.6.13 |
| @google-cloud/vision | Google Cloud Vision API | ^4.6.0 |
| axios | HTTP client | ^1.6.7 |
| winston | Logging library | ^3.11.0 |
| joi | Schema validation | ^17.11.0 |
| dotenv | Environment variable loader | ^16.3.1 |
| uuid | UUID generation | ^9.0.1 |

### Development Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| typescript | TypeScript compiler | ^5.3.3 |
| @typescript-eslint/* | TypeScript linting | ^6.17.0 |
| eslint | JavaScript linter | ^8.56.0 |
| prettier | Code formatter | ^3.1.1 |
| vitest | Test runner | ^4.1.10 |
| fast-check | Property testing | ^4.9.0 |
| @types/* | Type definitions | Latest |

## Code Style Guidelines

### ESLint Rules

- **Strict Mode**: TypeScript strict type checking enabled
- **Naming**: camelCase for variables/functions, PascalCase for types
- **Quotes**: Single quotes (except to avoid escape)
- **Line Length**: Max 120 characters
- **Semicolons**: Required
- **Indentation**: 2 spaces

### Prettier Settings

- Print Width: 120 characters
- Tab Width: 2 spaces
- Single Quotes: Enabled
- Trailing Commas: ES5 style
- Arrow Parens: Always

## Troubleshooting

### PostgreSQL Connection Issues

```bash
# Test connection string
psql "postgresql://user:password@localhost:5432/ai_awards_db"

# Check if PostgreSQL is running
pg_isready -h localhost -p 5432
```

### Redis Connection Issues

```bash
# Test Redis connection
redis-cli ping
# Should return PONG

# Check if Redis is running
redis-cli info server
```

### npm Installation Issues

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

1. Complete Task 1.2: Create database schemas
2. Complete Task 1.3: Define TypeScript type definitions
3. Implement core services and APIs
4. Write comprehensive tests
5. Deploy to production

## Additional Resources

- [Express Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [Google Cloud Vision API](https://cloud.google.com/vision)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [ESLint Documentation](https://eslint.org/)
- [Prettier Documentation](https://prettier.io/)

## Support

For issues or questions during setup, refer to:
- Environment variables documentation in `.env.template`
- Package-specific documentation in `node_modules`
- Task implementation guides in the implementation plan
