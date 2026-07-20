# AI Awards for Creativity Recognition - Database Schema Guide

## Overview

This document describes the PostgreSQL database schema for the AI Awards for Creativity Recognition system. The schema is designed to support:

- Automated submission detection from Jira
- AI-powered visual design evaluation
- Fair award calculation with deterministic tiebreaker rules
- Complete audit trail for compliance and troubleshooting
- High-performance leaderboard and dashboard queries

## Database Structure

### Table Hierarchy

```
team_members (reference table)
  ├── submissions (fact table)
  │   ├── awards (derived table)
  │   ├── evaluation_queue
  │   └── audit_logs (append-only)
  │
  └── awards (contains winner references)
      ├── award_categories (lookup)
      ├── notification_queue
      └── audit_logs (append-only)

Cache Tables (performance optimization)
  ├── leaderboard_cache
  └── submission_stats_cache
```

## Table Definitions

### 1. team_members

Stores team member profiles and department information.

**Columns:**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | SERIAL | PRIMARY KEY | Unique identifier |
| user_id | VARCHAR(255) | UNIQUE, NOT NULL | External user identifier (email format) |
| name | VARCHAR(255) | NOT NULL | Display name |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Contact email |
| department_id | VARCHAR(100) | | Department classification |
| created_at | TIMESTAMP | DEFAULT NOW | Record creation time |
| updated_at | TIMESTAMP | DEFAULT NOW | Last update time |
| status | VARCHAR(50) | DEFAULT 'active' | active, inactive, archived |

**Indexes:**
- `idx_team_members_user_id`: Lookups by user ID (primary query pattern)
- `idx_team_members_email`: Email-based lookups
- `idx_team_members_department`: Department filtering
- `idx_team_members_status`: Status-based filtering

**Use Cases:**
- Award winner information
- Submission creator tracking
- Leaderboard display

---

### 2. award_categories

Predefined award categories that determine which submissions compete together.

**Columns:**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | SERIAL | PRIMARY KEY | Unique identifier |
| category_key | VARCHAR(100) | UNIQUE, NOT NULL | System identifier (Best_Video, Best_Poster, etc.) |
| category_name | VARCHAR(255) | NOT NULL | Display name |
| description | TEXT | | Category description |
| media_types | VARCHAR(50)[] | | Array of eligible media types |
| enabled | BOOLEAN | DEFAULT TRUE | Enable/disable category |
| created_at | TIMESTAMP | DEFAULT NOW | Record creation time |
| updated_at | TIMESTAMP | DEFAULT NOW | Last update time |

**Predefined Values:**
```
1. Best_Video (videos only)
2. Best_Poster (posters only)
3. Best_Video_Poster_Content (videos and posters combined)
```

**Indexes:**
- `idx_award_categories_enabled`: Query enabled categories

**Use Cases:**
- Award calculation filtering
- Category-specific rankings
- Dashboard category breakdown

---

### 3. submissions

Core fact table storing media submissions with evaluation results.

**Columns:**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | SERIAL | PRIMARY KEY | Unique identifier |
| submission_id | VARCHAR(255) | UNIQUE, NOT NULL | External submission ID (SUB-2026-07-001) |
| jira_task_id | VARCHAR(100) | NOT NULL | Source Jira task identifier |
| jira_task_key | VARCHAR(100) | | Full Jira task key (PROJ-456) |
| submission_timestamp | BIGINT | NOT NULL | Unix timestamp when media submitted |
| team_member_id | INT | FK: team_members | Creator of submission |
| media_type | VARCHAR(50) | CHECK IN ('video', 'poster') | Type of media |
| media_format | VARCHAR(50) | | File format (mp4, png, etc.) |
| media_file_name | VARCHAR(500) | | Original filename |
| media_file_size | BIGINT | | File size in bytes |
| media_storage_url | TEXT | | URL to stored media file |
| media_thumbnail_url | TEXT | | URL to thumbnail image |
| media_file_hash | VARCHAR(64) | | SHA-256 hash for duplicate detection |
| evaluation_status | VARCHAR(50) | CHECK IN (...) | pending, processing, completed, failed, evaluation_failed |
| ai_model_version | VARCHAR(100) | | AI model that performed evaluation |
| evaluation_timestamp | BIGINT | | Unix timestamp when evaluation completed |
| composition_score | NUMERIC(5, 2) | CHECK [0-100] | Composition analysis score |
| color_theory_score | NUMERIC(5, 2) | CHECK [0-100] | Color theory analysis score |
| balance_score | NUMERIC(5, 2) | CHECK [0-100] | Visual balance analysis score |
| creativity_score | NUMERIC(5, 2) | CHECK [0-100] | Final weighted average score |
| status | VARCHAR(50) | DEFAULT 'active' | active, archived, deleted_jira |
| version | INT | DEFAULT 1 | Version number for re-evaluations |
| created_at | TIMESTAMP | DEFAULT NOW | Record creation time |
| updated_at | TIMESTAMP | DEFAULT NOW | Last update time |
| evaluation_errors | TEXT | | Error messages if evaluation failed |
| retry_count | INT | DEFAULT 0 | Number of retry attempts |
| next_retry_at | BIGINT | | Unix timestamp for next retry attempt |

**Indexes (Performance Critical):**
- `idx_submissions_timestamp`: Sort submissions by date (leaderboard queries)
- `idx_submissions_status`: Filter by submission status
- `idx_submissions_evaluation_status`: Find pending/failed evaluations
- `idx_submissions_status_eval`: Combined filter for active evaluated submissions
- `idx_submissions_team_member`: Lookups by team member (leaderboard stats)
- `idx_submissions_jira_task`: Lookups by Jira task (integration)
- `idx_submissions_media_type`: Filter by media type (category filtering)
- `idx_submissions_creation`: Sort by creation date
- `idx_submissions_retry`: Find submissions pending retry
- `idx_submissions_media_hash`: Detect duplicate submissions
- `idx_submissions_duplicate_detection`: UNIQUE constraint preventing duplicates

**Score Calculation:**
```
creativityScore = (compositionScore × 0.35) + (colorTheoryScore × 0.35) + (balanceScore × 0.30)
```

**Use Cases:**
- Leaderboard ranking (via creativity_score)
- Award calculation (filtered by timestamp period)
- Dashboard metrics (aggregation)
- Re-evaluation tracking (via version)

---

### 4. awards

Immutable records of calculated weekly and monthly awards.

**Columns:**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | SERIAL | PRIMARY KEY | Unique identifier |
| award_id | VARCHAR(255) | UNIQUE, NOT NULL | External award ID (AWARD-2026-W29-VIDEO) |
| award_type | VARCHAR(50) | CHECK IN ('weekly', 'monthly') | Award period type |
| award_category_id | INT | FK: award_categories | Category for this award |
| period_type | VARCHAR(50) | CHECK IN ('week', 'month') | Period type |
| period_year | INT | NOT NULL | Calendar year |
| period_month | INT | | Calendar month (1-12) |
| period_week | INT | | ISO week number |
| period_start | DATE | NOT NULL | First date of award period |
| period_end | DATE | NOT NULL | Last date of award period |
| winner_id | INT | FK: team_members | Award winner |
| submission_id | INT | FK: submissions | Winning submission |
| creativity_score | NUMERIC(5, 2) | NOT NULL | Final creativity score |
| composition_score | NUMERIC(5, 2) | | Composition score at time of award |
| color_theory_score | NUMERIC(5, 2) | | Color theory score at time of award |
| balance_score | NUMERIC(5, 2) | | Balance score at time of award |
| rank_in_period | INT | CHECK > 0 | Position (always 1 for single winner) |
| total_contestants | INT | | Number of submissions in category/period |
| calculation_timestamp | BIGINT | NOT NULL | Unix timestamp when award calculated |
| tiebreaker | VARCHAR(50) | | Tiebreaker applied (no_tie or earlier_submission) |
| status | VARCHAR(50) | DEFAULT 'active' | active, archived, revoked |
| notification_sent | BOOLEAN | DEFAULT FALSE | Whether winner was notified |
| notification_timestamp | BIGINT | | Unix timestamp of notification |
| created_at | TIMESTAMP | DEFAULT NOW | Record creation time |
| updated_at | TIMESTAMP | DEFAULT NOW | Last update time |

**Indexes (Performance Critical):**
- `idx_awards_period`: Period-based queries for dashboard
- `idx_awards_period_week`: Weekly award queries
- `idx_awards_winner`: Lookups by winner (leaderboard)
- `idx_awards_category`: Category-based filtering
- `idx_awards_submission`: Reverse lookup by submission
- `idx_awards_status`: Filter by status
- `idx_awards_notification`: Find unsent notifications
- `idx_awards_calculation`: Sort by calculation time
- `idx_awards_creation`: Sort by creation date
- `idx_awards_unique_per_period`: UNIQUE constraint ensuring one winner per category per period

**Referential Integrity:**
- Foreign key to `award_categories`: Ensures valid category
- Foreign key to `team_members` (winner_id): Ensures valid winner
- Foreign key to `submissions`: Ensures submission exists
- Constraint: `period_end >= period_start`

**Use Cases:**
- Leaderboard display
- Dashboard metrics
- Historical award queries
- Winner notification workflow

---

### 5. audit_logs

Immutable append-only audit trail recording all system events.

**Columns:**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | BIGSERIAL | PRIMARY KEY | Unique identifier |
| audit_id | VARCHAR(255) | UNIQUE, NOT NULL | External audit event ID |
| event_type | VARCHAR(100) | NOT NULL | submission_created, submission_evaluated, award_calculated, etc. |
| entity_type | VARCHAR(100) | NOT NULL | submission, award, calculation |
| entity_id | VARCHAR(255) | | ID of entity involved in event |
| before_state | JSONB | | Previous state of entity (NULL for creations) |
| after_state | JSONB | | New state of entity |
| change_details | JSONB | | Additional change metadata |
| actor_id | VARCHAR(255) | DEFAULT 'system' | User or system that caused change |
| actor_type | VARCHAR(50) | DEFAULT 'system' | system, user, or api |
| event_timestamp | BIGINT | NOT NULL | Unix timestamp of event |
| correlation_id | VARCHAR(255) | | Trace ID for related events |
| source_system | VARCHAR(100) | | System that initiated event (ai_evaluator, award_calculator, etc.) |
| context | JSONB | | Additional contextual data |
| created_at | TIMESTAMP | DEFAULT NOW | Record creation time (immutable) |

**Immutability Enforcement:**
- No UPDATE or DELETE allowed (enforced via application logic and RLS if configured)
- Single `created_at` timestamp per row ensures append-only semantics
- Bigserial ensures chronological ordering

**Indexes:**
- `idx_audit_entity`: Find all events for an entity
- `idx_audit_timestamp`: Chronological queries
- `idx_audit_event_type`: Filter by event type
- `idx_audit_correlation`: Trace related events
- `idx_audit_actor`: Query by actor (user or system)
- `idx_audit_creation`: Sort by creation order
- `idx_audit_entity_time`: Combined filter for entity history

**Event Types:**
```
- submission_created: New submission detected
- submission_evaluated: AI evaluation completed
- submission_re_evaluated: Submission re-evaluated
- submission_archived: Submission marked as archived
- award_calculated: Award determined for period/category
- award_notified: Winner notification sent
- award_revoked: Award status changed
- system_maintenance: Routine maintenance event
```

**Use Cases:**
- Compliance audit trails
- Fairness verification (confirm tiebreaker applied correctly)
- Troubleshooting (trace event sequence)
- System monitoring (track operation history)

---

### 6. evaluation_queue

Async queue for pending AI evaluations with retry management.

**Columns:**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | SERIAL | PRIMARY KEY | Unique identifier |
| submission_id | INT | FK: submissions | Submission to evaluate |
| status | VARCHAR(50) | DEFAULT 'pending' | pending, processing, completed, failed |
| attempt_count | INT | DEFAULT 0 | Number of evaluation attempts |
| max_attempts | INT | DEFAULT 3 | Maximum retry attempts |
| next_attempt_at | BIGINT | | Unix timestamp for next retry |
| last_error | TEXT | | Error message from last attempt |
| created_at | TIMESTAMP | DEFAULT NOW | Record creation time |
| started_at | TIMESTAMP | | When evaluation began |
| completed_at | TIMESTAMP | | When evaluation finished |
| updated_at | TIMESTAMP | DEFAULT NOW | Last update time |

**Indexes:**
- `idx_eval_queue_status`: Filter by queue status
- `idx_eval_queue_pending`: Find evaluations due for retry
- `idx_eval_queue_submission`: Lookup by submission
- `idx_eval_queue_unique_submission`: UNIQUE on active submissions

**Use Cases:**
- Async evaluation scheduling
- Retry management with exponential backoff
- Queue monitoring
- Error tracking

---

### 7. notification_queue

Queue for award notifications with deduplication.

**Columns:**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | SERIAL | PRIMARY KEY | Unique identifier |
| award_id | INT | FK: awards | Award being notified |
| recipient_id | INT | FK: team_members | Notification recipient |
| status | VARCHAR(50) | DEFAULT 'pending' | pending, sent, failed, deduped |
| email_sent | BOOLEAN | DEFAULT FALSE | Email notification sent |
| in_app_sent | BOOLEAN | DEFAULT FALSE | In-app notification sent |
| created_at | TIMESTAMP | DEFAULT NOW | Record creation time |
| sent_at | TIMESTAMP | | When notification was sent |
| updated_at | TIMESTAMP | DEFAULT NOW | Last update time |

**Indexes:**
- `idx_notification_status`: Filter by status
- `idx_notification_recipient`: Lookups by recipient
- `idx_notification_award`: Lookups by award
- `idx_notification_pending`: Find unsent notifications
- `idx_notification_dedup`: UNIQUE constraint preventing duplicate notifications

**Use Cases:**
- Award notification delivery
- Deduplication (within 1-minute window)
- Delivery status tracking

---

### 8. leaderboard_cache

Cache table for materialized leaderboard data to support 100 concurrent users with <3 second response.

**Columns:**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | SERIAL | PRIMARY KEY | Unique identifier |
| cache_key | VARCHAR(255) | UNIQUE, NOT NULL | Composite key for cache entry |
| period_type | VARCHAR(50) | | week, month, or all-time |
| period_year | INT | | Year for filtering |
| period_month | INT | | Month for filtering |
| period_week | INT | | ISO week for filtering |
| leaderboard_data | JSONB | NOT NULL | Cached rankings and stats |
| created_at | TIMESTAMP | DEFAULT NOW | Cache creation time |
| expires_at | TIMESTAMP | NOT NULL | When cache expires (TTL: 1 hour) |
| hit_count | INT | DEFAULT 0 | Cache hit tracking |

**Cache Structure (JSON):**
```json
{
  "rankings": [
    {
      "rank": 1,
      "userId": "user@email.com",
      "name": "John Doe",
      "awards": 3,
      "highestScore": 95,
      "submissionCount": 12,
      "avgScore": 87.5
    }
  ],
  "totalCount": 145,
  "generatedAt": 1720641600000,
  "periodLabel": "Week of July 21-27, 2026"
}
```

**TTL Strategy:**
- Leaderboard: 1 hour TTL
- Invalidated when new award calculated
- Regenerated on query if expired

**Use Cases:**
- Leaderboard API performance optimization
- Support 100 concurrent users

---

### 9. submission_stats_cache

Cache table for dashboard metrics aggregations.

**Columns:**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | SERIAL | PRIMARY KEY | Unique identifier |
| cache_key | VARCHAR(255) | UNIQUE, NOT NULL | Composite cache key |
| period_type | VARCHAR(50) | | Time period |
| period_start | BIGINT | | Start timestamp |
| period_end | BIGINT | | End timestamp |
| media_type | VARCHAR(50) | | Filter: video or poster |
| category_id | INT | | Filter: award category |
| stats_data | JSONB | NOT NULL | Cached metrics |
| created_at | TIMESTAMP | DEFAULT NOW | Cache creation time |
| expires_at | TIMESTAMP | NOT NULL | When cache expires (TTL: 2 hours) |

**Cache Structure (JSON):**
```json
{
  "totalSubmissions": 125,
  "avgScore": 82.3,
  "maxScore": 98,
  "minScore": 45,
  "scoreDistribution": [
    {"range": "0-20", "count": 2},
    {"range": "20-40", "count": 5}
  ],
  "topCreators": [
    {"name": "Jane Smith", "count": 8}
  ]
}
```

**TTL Strategy:**
- Dashboard stats: 2 hours TTL
- Invalidated when new award calculated

**Use Cases:**
- Dashboard API performance
- Metric aggregation caching

---

## Index Strategy

### Query Performance Priorities

**High Priority (critical paths):**
1. Leaderboard queries: `submissions(team_member_id, creativity_score, submission_timestamp)`
2. Award calculation: `submissions(submission_timestamp, media_type, creativity_score)`
3. Dashboard metrics: `submissions(created_at, media_type, creativity_score)`

**Medium Priority (frequent queries):**
4. Audit trail lookups: `audit_logs(entity_type, entity_id, event_timestamp DESC)`
5. Evaluation queue: `evaluation_queue(status, next_attempt_at)`

**Low Priority (less frequent):**
6. Archive/historical: `submissions(status, created_at DESC)`

### Index Coverage

| Table | Primary Query | Index Used | Expected Rows Scanned |
|-------|---------------|------------|----------------------|
| submissions | Leaderboard ranking | idx_submissions_timestamp + composite filter | <500 |
| submissions | Award calculation | idx_submissions_timestamp + media_type | <500 |
| awards | Dashboard | idx_awards_period | <200 |
| awards | Winner lookup | idx_awards_winner | <100 |
| audit_logs | Entity history | idx_audit_entity_time | <1000 |

### Query Plan Examples

**Leaderboard Query:**
```sql
-- Get top creators for current week
SELECT s.team_member_id, tm.name, COUNT(*) as submission_count, 
       AVG(s.creativity_score) as avg_score, MAX(s.creativity_score) as max_score
FROM submissions s
JOIN team_members tm ON s.team_member_id = tm.id
WHERE s.submission_timestamp >= ? 
  AND s.submission_timestamp <= ?
  AND s.status = 'active'
  AND s.evaluation_status = 'completed'
GROUP BY s.team_member_id, tm.name
ORDER BY MAX(s.creativity_score) DESC, COUNT(*) DESC
LIMIT 10;
```
**Index Used:** `idx_submissions_status_eval`, `idx_submissions_timestamp`

## Constraints and Validation

### Domain Constraints

**Scores:**
- All creativity subscores (composition, color theory, balance): [0, 100]
- Final creativity score: [0, 100]
- Enforced via CHECK constraints

**Timestamps:**
- `submission_timestamp`: Must be valid Unix timestamp
- `period_end >= period_start`: Enforced on awards table

**References:**
- All foreign keys enforced via FK constraints
- Prevents orphaned records
- Cascade delete on queue tables, RESTRICT on fact tables

### Immutability Constraints

**Audit Logs:**
- No UPDATE or DELETE operations allowed
- Enforced via: application layer + PostgreSQL RLS (if configured)
- Single timestamp ensures append-only semantics

## Views

### complete_submissions

```sql
CREATE VIEW complete_submissions AS
SELECT s.*, tm.user_id, tm.name, tm.email, tm.department_id
FROM submissions s
LEFT JOIN team_members tm ON s.team_member_id = tm.id
WHERE s.status = 'active';
```

Joins submissions with team member details for easier query writing.

### complete_awards

```sql
CREATE VIEW complete_awards AS
SELECT a.*, ac.category_key, ac.category_name, tm.user_id, tm.name, tm.email
FROM awards a
LEFT JOIN team_members tm ON a.winner_id = tm.id
LEFT JOIN award_categories ac ON a.award_category_id = ac.id
WHERE a.status = 'active';
```

Joins awards with category and winner details.

## Performance Targets and Tuning

### Target Performance

| Operation | Target | Actual | Tuning Strategy |
|-----------|--------|--------|-----------------|
| Submission detection (1000 tasks) | <5 min | Batch indexes | Parallel workers |
| Award calculation (500 submissions) | <2 min | Sorted indexes | In-memory sorting |
| Leaderboard query (100 concurrent) | <3 sec | Materialized cache | Redis cache layer |
| Dashboard refresh (5000 submissions) | <2 sec | Aggregation cache | Pre-computed stats |

### Monitoring Queries

**Find slow queries:**
```sql
SELECT query, mean_time, calls 
FROM pg_stat_statements 
WHERE mean_time > 1000 
ORDER BY mean_time DESC;
```

**Check index usage:**
```sql
SELECT schemaname, tablename, indexname, idx_scan 
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;
```

**Monitor cache hit ratio:**
```sql
SELECT 
  100 * sum(heap_blks_read) / (sum(heap_blks_hit) + sum(heap_blks_read)) as cache_miss_ratio
FROM pg_statio_user_tables;
```

## Maintenance

### Maintenance Tasks

**Weekly:**
- Analyze tables for query optimization: `ANALYZE submissions, awards;`
- Check cache hit ratios

**Monthly:**
- Reindex heavily fragmented tables: `REINDEX TABLE submissions;`
- Archive old audit logs (>730 days)
- Update statistics: `VACUUM ANALYZE;`

**Quarterly:**
- Review and optimize slow queries
- Check for bloat: `SELECT * FROM pgstattuple('submissions')`
- Performance baseline comparison

### Backup Strategy

**Frequency:** Daily incremental, weekly full
**Retention:** 30 days daily, 1 year monthly
**Format:** WAL archives + pg_dump SQL
**Verification:** Weekly restore test to separate instance

### Disaster Recovery

**RPO (Recovery Point Objective):** 1 hour
**RTO (Recovery Time Objective):** 4 hours
**Procedure:**
1. Restore from latest daily backup
2. Replay WAL archives to point-in-time
3. Validate data consistency
4. Switchover to restored instance

## Security Considerations

### Row-Level Security (Optional)

```sql
-- Enable RLS on sensitive tables
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Prevent audit log deletion
CREATE POLICY audit_logs_immutable ON audit_logs
  FOR ALL USING (FALSE);

-- Allow only inserts for audit logs
CREATE POLICY audit_logs_insert ON audit_logs
  FOR INSERT WITH CHECK (TRUE);
```

### Column Encryption (Optional)

For PII columns (email, names):
```sql
-- Install pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt email on insert
ALTER TABLE team_members 
ADD COLUMN email_encrypted bytea;

UPDATE team_members 
SET email_encrypted = pgp_sym_encrypt(email, 'encryption_key');
```

### Audit Log Immutability

Prevents tampering:
```sql
-- Revoke DELETE and UPDATE permissions
REVOKE DELETE, UPDATE ON audit_logs FROM app_user;
REVOKE DELETE, UPDATE ON audit_logs FROM application;

-- Allow only INSERT
GRANT INSERT ON audit_logs TO app_user;
GRANT SELECT ON audit_logs TO app_user;
```

## Initialization and Deployment

### Development Environment

```bash
# Initialize database
npm run db:init

# Load sample data
npm run db:seed:dev

# Verify schema
npm run db:verify
```

### Production Environment

```bash
# Create database backup
pg_dump ai_awards > backup_20260701.sql

# Run migrations with validation
npm run db:migrate

# Verify integrity
npm run db:verify:production

# Run performance tests
npm run db:benchmark
```

## Troubleshooting

### Common Issues

**Issue: Award calculation too slow**
- Solution: Check `idx_submissions_timestamp` is being used
- Verify: `EXPLAIN ANALYZE SELECT * FROM submissions WHERE submission_timestamp >= ? ORDER BY creativity_score DESC`

**Issue: Duplicate submissions appearing**
- Solution: Ensure unique index on `(jira_task_id, media_file_hash)`
- Fix: Run duplicate detection query and archive duplicates

**Issue: Audit logs growing too large**
- Solution: Archive logs >730 days old to separate table
- Query: `SELECT COUNT(*) FROM audit_logs WHERE created_at < NOW() - INTERVAL '730 days'`

---

## Reference

**PostgreSQL Version:** 12+  
**Estimated Storage:** 1 GB per 10,000 submissions (with audit trail)  
**Connection Pool:** 20 connections  
**Query Timeout:** 30 seconds  
**Last Updated:** 2026-07-01
