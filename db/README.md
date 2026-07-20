# AI Awards for Creativity Recognition - Database Setup

This directory contains the database schema, initialization scripts, and client configuration for the AI Awards system.

## Quick Start

### 1. Prerequisites

- PostgreSQL 12 or later
- Node.js 16+ with npm
- `pg` npm package (PostgreSQL client library)

### 2. Environment Setup

Copy the template environment file and configure your database connection:

```bash
cp db/.env.template .env
```

Edit `.env` and update these variables:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_secure_password_here
DB_NAME=ai_awards
DB_SSL=false
```

### 3. Initialize Database

Run the initialization script to create the database and schema:

```bash
node db/init.js
```

This script will:
1. Test PostgreSQL server connection
2. Create the `ai_awards` database (if it doesn't exist)
3. Create all tables, indexes, and constraints
4. Seed predefined award categories
5. Verify schema completeness

**To drop and recreate the database (CAUTION - DESTRUCTIVE):**

```bash
node db/init.js --drop
```

### 4. Verify Installation

Verify all indexes were created and check performance statistics:

```bash
node db/verify-indexes.js
```

Expected output shows all required indexes as "✓ ACTIVE" or "⊘ UNUSED".

## File Structure

```
db/
├── schema.sql                   # Complete database schema definition
├── init.js                      # Database initialization script
├── client.js                    # Node.js database client (singleton pattern)
├── verify-indexes.js            # Index verification and performance stats
├── .env.template                # Environment configuration template
├── DATABASE_SCHEMA_GUIDE.md     # Comprehensive schema documentation
└── README.md                    # This file
```

## Schema Overview

The schema consists of 9 core tables:

### Core Tables (Data Storage)

1. **team_members** - User profiles and department information
2. **submissions** - Media submissions with AI evaluation scores
3. **awards** - Calculated weekly/monthly awards
4. **award_categories** - Predefined award categories (video, poster, combined)
5. **audit_logs** - Immutable append-only audit trail (compliance)

### Queue/Processing Tables

6. **evaluation_queue** - Async queue for pending AI evaluations
7. **notification_queue** - Queue for award winner notifications

### Cache Tables (Performance)

8. **leaderboard_cache** - Cached leaderboard data (TTL: 1 hour)
9. **submission_stats_cache** - Cached dashboard metrics (TTL: 2 hours)

## Database Client Usage

### Basic Usage in Node.js

```javascript
const { getClient } = require('./db/client');

// Get singleton database client
const db = getClient();

// Execute a query
const result = await db.query(
  'SELECT * FROM team_members WHERE user_id = $1',
  ['user@example.com']
);

console.log(result.rows);
```

### Transaction Support

```javascript
const result = await db.transaction(async (client) => {
  // Execute multiple queries in transaction
  const submission = await client.query(
    'INSERT INTO submissions (...) VALUES (...) RETURNING *'
  );
  
  const audit = await client.query(
    'INSERT INTO audit_logs (...) VALUES (...) RETURNING *'
  );
  
  return { submission, audit };
});
```

### Batch Operations

```javascript
const results = await db.batchTransaction([
  {
    sql: 'INSERT INTO team_members (...) VALUES ($1, $2, $3)',
    params: ['user1', 'User One', 'dept1']
  },
  {
    sql: 'INSERT INTO team_members (...) VALUES ($1, $2, $3)',
    params: ['user2', 'User Two', 'dept2']
  }
]);
```

### Connection Pool Statistics

```javascript
const stats = db.getPoolStats();
console.log(`Total: ${stats.totalCount}, Idle: ${stats.idleCount}, Waiting: ${stats.waitingCount}`);
```

## Performance Targets

The schema is optimized to achieve these performance targets:

| Operation | Target | Method |
|-----------|--------|--------|
| Submission detection (1000 tasks) | <5 min | Batch processing with indexed queries |
| Award calculation (500 submissions) | <2 min | In-memory sorting + indexed updates |
| Leaderboard query (100 concurrent) | <3 sec | Materialized cache (1h TTL) |
| Dashboard refresh (5000 submissions) | <2 sec | Aggregation cache (2h TTL) |

## Key Indexes

### Critical Performance Indexes

```
submissions(submission_timestamp DESC)  -- Leaderboard queries
submissions(team_member_id)             -- Winner stats
submissions(status, evaluation_status)  -- Active submissions
awards(period_type, period_year, period_month)  -- Dashboard
audit_logs(entity_type, entity_id)      -- Audit trail
```

See [DATABASE_SCHEMA_GUIDE.md](./DATABASE_SCHEMA_GUIDE.md) for complete index documentation.

## Data Integrity

### Constraints Enforced

- Foreign key constraints prevent orphaned records
- CHECK constraints validate score ranges [0-100]
- UNIQUE constraints prevent duplicate submissions
- Immutable audit logs (append-only)

### Referential Integrity

```
awards.winner_id → team_members.id
awards.submission_id → submissions.id
submissions.team_member_id → team_members.id
award_categories (predefined, not deletable)
```

## Backup and Recovery

### Backup Strategies

**Daily Incremental:**
```bash
pg_dump ai_awards | gzip > backups/ai_awards_$(date +%Y%m%d_%H%M%S).sql.gz
```

**Restore from Backup:**
```bash
gunzip < backups/ai_awards_20260701_120000.sql.gz | psql ai_awards
```

**Backup All Databases:**
```bash
pg_dumpall | gzip > backups/all_databases_$(date +%Y%m%d).sql.gz
```

## Maintenance

### Weekly Maintenance

```bash
# Analyze query optimization
psql ai_awards -c "ANALYZE submissions, awards;"
```

### Monthly Maintenance

```bash
# Reindex heavily fragmented tables
psql ai_awards -c "REINDEX TABLE submissions;"

# Update table statistics
psql ai_awards -c "VACUUM ANALYZE;"
```

### Monitoring Query Performance

```bash
# Find slow queries (if pg_stat_statements enabled)
psql ai_awards -c "
  SELECT query, mean_time, calls
  FROM pg_stat_statements
  WHERE mean_time > 1000
  ORDER BY mean_time DESC
  LIMIT 10;"
```

## Views

The schema includes materialized views for easier queries:

### complete_submissions
Joins submissions with team member details:
```sql
SELECT * FROM complete_submissions 
WHERE media_type = 'video' AND creativity_score > 80;
```

### complete_awards
Joins awards with winner and category details:
```sql
SELECT * FROM complete_awards 
WHERE award_type = 'weekly' ORDER BY creativity_score DESC;
```

## Security

### Column-Level Security (Optional)

For production with sensitive data:

```sql
-- Enable row-level security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Prevent audit log modification
CREATE POLICY audit_logs_immutable ON audit_logs
  FOR ALL USING (FALSE);
```

### Recommended Database User Permissions

```sql
-- Create application user (read/write)
CREATE USER app_user WITH PASSWORD 'strong_password';
GRANT CONNECT ON DATABASE ai_awards TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;

-- Create read-only user (for reports)
CREATE USER report_user WITH PASSWORD 'strong_password';
GRANT CONNECT ON DATABASE ai_awards TO report_user;
GRANT USAGE ON SCHEMA public TO report_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO report_user;

-- Prevent audit log deletion
REVOKE DELETE, UPDATE ON audit_logs FROM app_user;
```

## Troubleshooting

### Issue: Connection Refused

**Symptom:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**
1. Verify PostgreSQL is running: `pg_isready -h localhost -p 5432`
2. Check connection details in `.env`
3. Verify PostgreSQL service: `sudo systemctl status postgresql`

### Issue: Permission Denied

**Symptom:** `FATAL: password authentication failed for user "postgres"`

**Solution:**
1. Check `.env` DB_USER and DB_PASSWORD match database credentials
2. Reset PostgreSQL password: `sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'newpass';"`

### Issue: Slow Queries

**Symptom:** Leaderboard queries taking >3 seconds

**Solution:**
1. Run `node db/verify-indexes.js` to check indexes exist
2. Analyze query: `EXPLAIN ANALYZE SELECT ...`
3. Check cache: `SELECT COUNT(*) FROM leaderboard_cache WHERE expires_at > NOW();`
4. Rebuild index: `REINDEX TABLE submissions;`

### Issue: Duplicate Submissions

**Symptom:** Same submission appearing multiple times

**Solution:**
1. Verify unique constraint: `SELECT * FROM pg_indexes WHERE tablename = 'submissions' AND indexname LIKE '%duplicate%';`
2. Find duplicates: `SELECT jira_task_id, media_file_hash, COUNT(*) FROM submissions GROUP BY jira_task_id, media_file_hash HAVING COUNT(*) > 1;`
3. Archive duplicates: `UPDATE submissions SET status = 'archived' WHERE id IN (SELECT later_ids);`

## Additional Resources

- [Complete Schema Documentation](./DATABASE_SCHEMA_GUIDE.md)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js PostgreSQL Client](https://node-postgres.com/)
- [Query Performance Tuning](https://www.postgresql.org/docs/current/performance.html)

## NPM Scripts

Add these to `package.json`:

```json
{
  "scripts": {
    "db:init": "node db/init.js",
    "db:init:drop": "node db/init.js --drop",
    "db:verify": "node db/verify-indexes.js",
    "db:backup": "pg_dump ai_awards | gzip > backups/ai_awards_$(date +%Y%m%d_%H%M%S).sql.gz",
    "db:restore": "gunzip < backups/ai_awards_latest.sql.gz | psql ai_awards",
    "db:psql": "psql ai_awards"
  }
}
```

Then run:
```bash
npm run db:init       # Initialize database
npm run db:verify     # Verify schema
npm run db:psql       # Open psql console
```

## Support

For schema questions or issues:
1. Check [DATABASE_SCHEMA_GUIDE.md](./DATABASE_SCHEMA_GUIDE.md) for detailed documentation
2. Review PostgreSQL error messages in the init script output
3. Check database connectivity with: `psql -h localhost -U postgres -d ai_awards -c "SELECT version();"`

---

**Last Updated:** 2026-07-01  
**PostgreSQL Version:** 12+  
**Schema Version:** 1.0
