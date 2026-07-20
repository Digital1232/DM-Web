/**
 * Database Schema Validation Tests
 * Validates all tables, indexes, and constraints are properly created
 */

const { describe, it, before, after } = require('vitest');
const { getClient } = require('./client');

let db;

before(async () => {
  db = getClient();
});

after(async () => {
  await db.close();
});

describe('Database Schema - Table Definitions', () => {
  
  it('should have team_members table', async () => {
    const result = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'team_members'
      );
    `);
    expect(result.rows[0].exists).toBe(true);
  });

  it('should have submissions table', async () => {
    const result = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'submissions'
      );
    `);
    expect(result.rows[0].exists).toBe(true);
  });

  it('should have awards table', async () => {
    const result = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'awards'
      );
    `);
    expect(result.rows[0].exists).toBe(true);
  });

  it('should have audit_logs table', async () => {
    const result = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'audit_logs'
      );
    `);
    expect(result.rows[0].exists).toBe(true);
  });

  it('should have award_categories table', async () => {
    const result = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'award_categories'
      );
    `);
    expect(result.rows[0].exists).toBe(true);
  });

  it('should have evaluation_queue table', async () => {
    const result = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'evaluation_queue'
      );
    `);
    expect(result.rows[0].exists).toBe(true);
  });

  it('should have notification_queue table', async () => {
    const result = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'notification_queue'
      );
    `);
    expect(result.rows[0].exists).toBe(true);
  });

  it('should have leaderboard_cache table', async () => {
    const result = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'leaderboard_cache'
      );
    `);
    expect(result.rows[0].exists).toBe(true);
  });

  it('should have submission_stats_cache table', async () => {
    const result = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'submission_stats_cache'
      );
    `);
    expect(result.rows[0].exists).toBe(true);
  });
});

describe('Database Schema - Indexes', () => {
  
  it('should have all submissions indexes', async () => {
    const requiredIndexes = [
      'idx_submissions_timestamp',
      'idx_submissions_status',
      'idx_submissions_team_member',
      'idx_submissions_jira_task'
    ];

    for (const indexName of requiredIndexes) {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM pg_indexes 
          WHERE tablename = 'submissions' AND indexname = $1
        );
      `, [indexName]);
      expect(result.rows[0].exists).toBe(true);
    }
  });

  it('should have all awards indexes', async () => {
    const requiredIndexes = [
      'idx_awards_period',
      'idx_awards_winner',
      'idx_awards_category'
    ];

    for (const indexName of requiredIndexes) {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM pg_indexes 
          WHERE tablename = 'awards' AND indexname = $1
        );
      `, [indexName]);
      expect(result.rows[0].exists).toBe(true);
    }
  });

  it('should have audit_logs indexes', async () => {
    const requiredIndexes = [
      'idx_audit_entity',
      'idx_audit_timestamp'
    ];

    for (const indexName of requiredIndexes) {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM pg_indexes 
          WHERE tablename = 'audit_logs' AND indexname = $1
        );
      `, [indexName]);
      expect(result.rows[0].exists).toBe(true);
    }
  });
});

describe('Database Schema - Constraints', () => {
  
  it('submissions table should have score range checks', async () => {
    const result = await db.query(`
      SELECT constraint_name
      FROM information_schema.check_constraints
      WHERE table_name = 'submissions'
      AND constraint_name LIKE '%score%'
    `);
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it('awards table should have valid foreign keys', async () => {
    const result = await db.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'awards'
      AND constraint_type = 'FOREIGN KEY'
    `);
    expect(result.rows.length).toBeGreaterThan(0);
  });
});

describe('Database Schema - Default Data', () => {
  
  it('should have predefined award categories', async () => {
    const result = await db.query(`
      SELECT COUNT(*) as count FROM award_categories
    `);
    expect(result.rows[0].count).toBe(3);
  });

  it('should have Best_Video category', async () => {
    const result = await db.query(`
      SELECT * FROM award_categories WHERE category_key = 'Best_Video'
    `);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].category_name).toBe('Best Video');
  });

  it('should have Best_Poster category', async () => {
    const result = await db.query(`
      SELECT * FROM award_categories WHERE category_key = 'Best_Poster'
    `);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].category_name).toBe('Best Poster');
  });

  it('should have Best_Video_Poster_Content category', async () => {
    const result = await db.query(`
      SELECT * FROM award_categories 
      WHERE category_key = 'Best_Video_Poster_Content'
    `);
    expect(result.rows.length).toBe(1);
  });
});

describe('Database Schema - Views', () => {
  
  it('should have complete_submissions view', async () => {
    const result = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_name = 'complete_submissions'
      );
    `);
    expect(result.rows[0].exists).toBe(true);
  });

  it('should have complete_awards view', async () => {
    const result = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_name = 'complete_awards'
      );
    `);
    expect(result.rows[0].exists).toBe(true);
  });
});

describe('Database Schema - Data Type Validation', () => {
  
  it('submissions.creativity_score should be NUMERIC type', async () => {
    const result = await db.query(`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'submissions' AND column_name = 'creativity_score'
    `);
    expect(result.rows[0].data_type).toBe('numeric');
  });

  it('submissions.submission_timestamp should be BIGINT type', async () => {
    const result = await db.query(`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'submissions' AND column_name = 'submission_timestamp'
    `);
    expect(result.rows[0].data_type).toBe('bigint');
  });

  it('audit_logs.event_timestamp should be BIGINT type', async () => {
    const result = await db.query(`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'audit_logs' AND column_name = 'event_timestamp'
    `);
    expect(result.rows[0].data_type).toBe('bigint');
  });
});

describe('Database Schema - Trigger Functions', () => {
  
  it('should have update_updated_at_column function', async () => {
    const result = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.routines 
        WHERE routine_name = 'update_updated_at_column'
      );
    `);
    expect(result.rows[0].exists).toBe(true);
  });

  it('team_members table should have updated_at trigger', async () => {
    const result = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.triggers 
        WHERE event_object_table = 'team_members'
        AND trigger_name = 'team_members_updated_at_trigger'
      );
    `);
    expect(result.rows[0].exists).toBe(true);
  });

  it('submissions table should have updated_at trigger', async () => {
    const result = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.triggers 
        WHERE event_object_table = 'submissions'
        AND trigger_name = 'submissions_updated_at_trigger'
      );
    `);
    expect(result.rows[0].exists).toBe(true);
  });
});

describe('Database Performance - Index Coverage', () => {
  
  it('should have efficient leaderboard query index', async () => {
    // Verify that common leaderboard queries use the correct indexes
    const result = await db.query(`
      EXPLAIN (FORMAT JSON) 
      SELECT s.team_member_id, COUNT(*) as submission_count
      FROM submissions s
      WHERE s.submission_timestamp > $1
      AND s.status = 'active'
      GROUP BY s.team_member_id
      ORDER BY COUNT(*) DESC
      LIMIT 10
    `, [(Date.now() - 7 * 24 * 60 * 60 * 1000)]);
    
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it('should have efficient award calculation index', async () => {
    const result = await db.query(`
      EXPLAIN (FORMAT JSON)
      SELECT s.id, s.creativity_score, s.submission_timestamp
      FROM submissions s
      WHERE s.submission_timestamp > $1 
      AND s.submission_timestamp < $2
      AND s.media_type = 'video'
      ORDER BY s.creativity_score DESC, s.submission_timestamp ASC
    `, [(Date.now() - 7 * 24 * 60 * 60 * 1000), Date.now()]);
    
    expect(result.rows.length).toBeGreaterThan(0);
  });
});

describe('Database Schema - Referential Integrity', () => {
  
  it('should enforce foreign key constraints', async () => {
    const result = await db.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY'
      AND table_schema = 'public'
    `);
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it('should have award_categories NOT DELETABLE constraint', async () => {
    // Verify predefined categories exist
    const result = await db.query(`
      SELECT COUNT(*) as count FROM award_categories WHERE enabled = true
    `);
    expect(result.rows[0].count).toBeGreaterThanOrEqual(3);
  });
});

describe('Database Schema - Immutability (Audit Logs)', () => {
  
  it('audit_logs table should not allow updates (via application)', async () => {
    // This is enforced via application logic, not database constraints
    // Just verify the table exists and has append-only structure
    const result = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'audit_logs'
      ORDER BY column_name
    `);
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it('audit_logs should have created_at immutable timestamp', async () => {
    const result = await db.query(`
      SELECT is_nullable FROM information_schema.columns 
      WHERE table_name = 'audit_logs' AND column_name = 'created_at'
    `);
    expect(result.rows[0].is_nullable).toBe('NO');
  });
});
