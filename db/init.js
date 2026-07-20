/**
 * Database Initialization Script
 * Initializes PostgreSQL database with AI Awards for Creativity Recognition schema
 * 
 * Usage:
 *   node db/init.js               # Initialize database
 *   node db/init.js --drop        # Drop and recreate database (DANGEROUS)
 */

const fs = require('fs');
const path = require('path');
const pg = require('pg');

const { Pool } = pg;

// Configuration from environment variables
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'ai_awards',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

const ADMIN_CONFIG = {
  host: DB_CONFIG.host,
  port: DB_CONFIG.port,
  user: DB_CONFIG.user,
  password: DB_CONFIG.password,
  database: 'postgres',
  ssl: DB_CONFIG.ssl
};

async function createDatabase() {
  const adminPool = new Pool(ADMIN_CONFIG);
  
  try {
    console.log(`Creating database '${DB_CONFIG.database}'...`);
    
    // Check if database exists
    const result = await adminPool.query(
      `SELECT datname FROM pg_database WHERE datname = $1`,
      [DB_CONFIG.database]
    );
    
    if (result.rows.length === 0) {
      await adminPool.query(`CREATE DATABASE "${DB_CONFIG.database}"`);
      console.log(`✓ Database '${DB_CONFIG.database}' created`);
    } else {
      console.log(`✓ Database '${DB_CONFIG.database}' already exists`);
    }
  } catch (error) {
    console.error(`✗ Error creating database: ${error.message}`);
    throw error;
  } finally {
    await adminPool.end();
  }
}

async function dropDatabase() {
  const adminPool = new Pool(ADMIN_CONFIG);
  
  try {
    console.log(`Dropping database '${DB_CONFIG.database}'...`);
    
    // Terminate any active connections
    await adminPool.query(
      `SELECT pg_terminate_backend(pg_stat_activity.pid)
       FROM pg_stat_activity
       WHERE pg_stat_activity.datname = $1
       AND pid <> pg_backend_pid()`,
      [DB_CONFIG.database]
    );
    
    await adminPool.query(`DROP DATABASE IF EXISTS "${DB_CONFIG.database}"`);
    console.log(`✓ Database '${DB_CONFIG.database}' dropped`);
  } catch (error) {
    console.error(`✗ Error dropping database: ${error.message}`);
    throw error;
  } finally {
    await adminPool.end();
  }
}

async function initializeSchema() {
  const pool = new Pool(DB_CONFIG);
  
  try {
    console.log('Initializing database schema...');
    
    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema
    await pool.query(schema);
    console.log('✓ Schema initialized successfully');
    
    return true;
  } catch (error) {
    console.error(`✗ Error initializing schema: ${error.message}`);
    throw error;
  } finally {
    await pool.end();
  }
}

async function verifySchema() {
  const pool = new Pool(DB_CONFIG);
  
  try {
    console.log('Verifying schema...');
    
    // Check all required tables exist
    const requiredTables = [
      'team_members',
      'award_categories',
      'submissions',
      'awards',
      'audit_logs',
      'evaluation_queue',
      'notification_queue',
      'leaderboard_cache',
      'submission_stats_cache'
    ];
    
    for (const tableName of requiredTables) {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )`,
        [tableName]
      );
      
      if (result.rows[0].exists) {
        console.log(`  ✓ Table '${tableName}' exists`);
      } else {
        throw new Error(`Required table '${tableName}' not found`);
      }
    }
    
    // Check indexes exist
    const indexResult = await pool.query(`
      SELECT indexname FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY indexname
    `);
    
    console.log(`✓ Schema verified: ${indexResult.rows.length} indexes created`);
    
    return true;
  } catch (error) {
    console.error(`✗ Error verifying schema: ${error.message}`);
    throw error;
  } finally {
    await pool.end();
  }
}

async function seedDefaultData() {
  const pool = new Pool(DB_CONFIG);
  
  try {
    console.log('Seeding default data...');
    
    // Award categories are already inserted in schema.sql
    const result = await pool.query('SELECT COUNT(*) FROM award_categories');
    console.log(`✓ Award categories seeded: ${result.rows[0].count} categories`);
    
  } catch (error) {
    console.error(`✗ Error seeding data: ${error.message}`);
    throw error;
  } finally {
    await pool.end();
  }
}

async function testConnection() {
  const pool = new Pool(DB_CONFIG);
  
  try {
    console.log('Testing database connection...');
    const result = await pool.query('SELECT NOW()');
    console.log(`✓ Connected to database: ${result.rows[0].now}`);
    return true;
  } catch (error) {
    console.error(`✗ Connection failed: ${error.message}`);
    throw error;
  } finally {
    await pool.end();
  }
}

async function main() {
  try {
    console.log('='.repeat(60));
    console.log('AI Awards for Creativity Recognition - Database Initialization');
    console.log('='.repeat(60));
    console.log();
    
    // Check for --drop flag
    const shouldDrop = process.argv.includes('--drop');
    
    if (shouldDrop) {
      console.warn('WARNING: --drop flag detected. Database will be dropped and recreated.');
      console.warn('This action cannot be undone!');
      console.warn('Press Ctrl+C now to cancel.');
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      await dropDatabase();
    }
    
    // Test initial connection to default postgres database
    console.log('Step 1: Testing connection to PostgreSQL server...');
    await testConnection();
    console.log();
    
    // Create database if it doesn't exist
    console.log('Step 2: Creating database...');
    await createDatabase();
    console.log();
    
    // Initialize schema
    console.log('Step 3: Initializing schema...');
    await initializeSchema();
    console.log();
    
    // Seed default data
    console.log('Step 4: Seeding default data...');
    await seedDefaultData();
    console.log();
    
    // Verify schema
    console.log('Step 5: Verifying schema...');
    await verifySchema();
    console.log();
    
    console.log('='.repeat(60));
    console.log('✓ Database initialization completed successfully!');
    console.log('='.repeat(60));
    console.log();
    console.log('Database Configuration:');
    console.log(`  Host: ${DB_CONFIG.host}`);
    console.log(`  Port: ${DB_CONFIG.port}`);
    console.log(`  Database: ${DB_CONFIG.database}`);
    console.log(`  User: ${DB_CONFIG.user}`);
    console.log();
    console.log('Next steps:');
    console.log('  1. Update .env file with database connection details');
    console.log('  2. Install Node dependencies: npm install');
    console.log('  3. Start the application');
    console.log();
    
    process.exit(0);
  } catch (error) {
    console.error();
    console.error('='.repeat(60));
    console.error('✗ Database initialization failed!');
    console.error('='.repeat(60));
    console.error();
    console.error(error.message);
    console.error();
    process.exit(1);
  }
}

main();
