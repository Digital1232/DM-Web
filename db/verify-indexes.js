/**
 * Index Verification Script
 * Verifies all required indexes are created and provides performance statistics
 */

const { getClient } = require('./client');

const REQUIRED_INDEXES = {
  team_members: [
    'idx_team_members_user_id',
    'idx_team_members_email',
    'idx_team_members_department',
    'idx_team_members_status'
  ],
  award_categories: [
    'idx_award_categories_enabled'
  ],
  submissions: [
    'idx_submissions_timestamp',
    'idx_submissions_status',
    'idx_submissions_evaluation_status',
    'idx_submissions_status_eval',
    'idx_submissions_team_member',
    'idx_submissions_jira_task',
    'idx_submissions_media_type',
    'idx_submissions_creation',
    'idx_submissions_retry',
    'idx_submissions_media_hash',
    'idx_submissions_duplicate_detection'
  ],
  awards: [
    'idx_awards_period',
    'idx_awards_period_week',
    'idx_awards_winner',
    'idx_awards_category',
    'idx_awards_submission',
    'idx_awards_status',
    'idx_awards_notification',
    'idx_awards_calculation',
    'idx_awards_creation',
    'idx_awards_unique_per_period'
  ],
  audit_logs: [
    'idx_audit_entity',
    'idx_audit_timestamp',
    'idx_audit_event_type',
    'idx_audit_correlation',
    'idx_audit_actor',
    'idx_audit_creation',
    'idx_audit_entity_time'
  ],
  evaluation_queue: [
    'idx_eval_queue_status',
    'idx_eval_queue_pending',
    'idx_eval_queue_submission',
    'idx_eval_queue_unique_submission'
  ],
  notification_queue: [
    'idx_notification_status',
    'idx_notification_recipient',
    'idx_notification_award',
    'idx_notification_pending',
    'idx_notification_dedup'
  ],
  leaderboard_cache: [
    'idx_leaderboard_cache_expiry',
    'idx_leaderboard_cache_period'
  ],
  submission_stats_cache: [
    'idx_stats_cache_expiry'
  ]
};

async function verifyIndexes(db) {
  console.log('\n' + '='.repeat(70));
  console.log('DATABASE INDEX VERIFICATION');
  console.log('='.repeat(70) + '\n');

  let totalRequired = 0;
  let totalFound = 0;
  let missing = [];

  for (const [tableName, indexNames] of Object.entries(REQUIRED_INDEXES)) {
    console.log(`\nTable: ${tableName}`);
    console.log('-'.repeat(70));

    for (const indexName of indexNames) {
      totalRequired++;

      const result = await db.query(
        `SELECT indexname, idx_scan, idx_tup_read, idx_tup_fetch
         FROM pg_stat_user_indexes
         WHERE tablename = $1 AND indexname = $2`,
        [tableName, indexName]
      );

      if (result.rows.length > 0) {
        totalFound++;
        const index = result.rows[0];
        const status = index.idx_scan > 0 ? '✓ ACTIVE' : '⊘ UNUSED';
        console.log(`  ${status} | ${indexName}`);
        console.log(`        Scans: ${index.idx_scan}, Tuples read: ${index.idx_tup_read}, Tuples fetched: ${index.idx_tup_fetch}`);
      } else {
        missing.push({ table: tableName, index: indexName });
        console.log(`  ✗ MISSING | ${indexName}`);
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total Required: ${totalRequired}`);
  console.log(`Total Found:    ${totalFound}`);
  console.log(`Missing:        ${missing.length}`);

  if (missing.length > 0) {
    console.log('\n⚠ Missing Indexes:');
    for (const { table, index } of missing) {
      console.log(`  - ${table}.${index}`);
    }
  }

  console.log('\n');
  return missing.length === 0;
}

async function analyzePerformance(db) {
  console.log('='.repeat(70));
  console.log('PERFORMANCE STATISTICS');
  console.log('='.repeat(70) + '\n');

  // Slow queries
  console.log('Slow Queries (if slow_query_log enabled):');
  const slowQueries = await db.query(`
    SELECT query, mean_time, calls 
    FROM pg_stat_statements 
    WHERE mean_time > 1000 
    ORDER BY mean_time DESC
    LIMIT 10
  `);

  if (slowQueries.rows.length > 0) {
    console.log('Query | Mean Time (ms) | Call Count');
    console.log('-'.repeat(70));
    for (const row of slowQueries.rows) {
      console.log(`${row.query.substring(0, 40)} | ${row.mean_time.toFixed(2)} | ${row.calls}`);
    }
  } else {
    console.log('(pg_stat_statements extension not enabled)');
  }

  // Table sizes
  console.log('\n\nTable Sizes:');
  const tableSizes = await db.query(`
    SELECT 
      schemaname,
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
  `);

  console.log('Table | Size');
  console.log('-'.repeat(70));
  for (const row of tableSizes.rows) {
    console.log(`${row.tablename.padEnd(25)} | ${row.size}`);
  }

  // Cache hit ratio
  console.log('\n\nCache Hit Ratio:');
  const cacheRatio = await db.query(`
    SELECT 
      sum(heap_blks_read) as heap_read,
      sum(heap_blks_hit) as heap_hit,
      sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
    FROM pg_statio_user_tables
  `);

  if (cacheRatio.rows[0].heap_read > 0) {
    const ratio = (cacheRatio.rows[0].ratio * 100).toFixed(2);
    console.log(`Cache Hit Ratio: ${ratio}%`);
  } else {
    console.log('No cache statistics available yet');
  }

  console.log('\n');
}

async function verifyConstraints(db) {
  console.log('='.repeat(70));
  console.log('CONSTRAINT VERIFICATION');
  console.log('='.repeat(70) + '\n');

  const constraints = await db.query(`
    SELECT constraint_name, table_name, constraint_type
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
    ORDER BY table_name, constraint_name
  `);

  const groupedByTable = {};
  for (const constraint of constraints.rows) {
    if (!groupedByTable[constraint.table_name]) {
      groupedByTable[constraint.table_name] = [];
    }
    groupedByTable[constraint.table_name].push(constraint);
  }

  for (const [tableName, tableConstraints] of Object.entries(groupedByTable)) {
    console.log(`\nTable: ${tableName}`);
    for (const constraint of tableConstraints) {
      const icon = constraint.constraint_type === 'PRIMARY KEY' ? '🔑' 
                 : constraint.constraint_type === 'FOREIGN KEY' ? '→'
                 : constraint.constraint_type === 'UNIQUE' ? '✓'
                 : constraint.constraint_type === 'CHECK' ? '✓'
                 : '○';
      console.log(`  ${icon} ${constraint.constraint_name} (${constraint.constraint_type})`);
    }
  }

  console.log('\n');
}

async function main() {
  const db = require('./client').getClient();

  try {
    // Verify indexes
    const indexesValid = await verifyIndexes(db);

    // Analyze performance
    try {
      await analyzePerformance(db);
    } catch (err) {
      console.log('Note: Some performance queries require additional PostgreSQL extensions');
    }

    // Verify constraints
    await verifyConstraints(db);

    if (indexesValid) {
      console.log('✓ All indexes verified successfully!');
    } else {
      console.log('✗ Some indexes are missing. Run db/init.js to create them.');
      process.exit(1);
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await db.close();
  }
}

main();
