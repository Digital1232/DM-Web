/**
 * PostgreSQL Database Client
 * Provides pooled connection management and transaction support for the AI Awards system
 */

const pg = require('pg');
const { Pool } = pg;

class DatabaseClient {
  constructor(config = {}) {
    // Use environment variables if not provided
    this.config = {
      host: config.host || process.env.DB_HOST || 'localhost',
      port: config.port || process.env.DB_PORT || 5432,
      user: config.user || process.env.DB_USER || 'postgres',
      password: config.password || process.env.DB_PASSWORD,
      database: config.database || process.env.DB_NAME || 'ai_awards',
      ssl: config.ssl !== undefined ? config.ssl : (process.env.DB_SSL === 'true'),
      max: config.max || process.env.DB_POOL_SIZE || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 5000,
      statement_timeout: config.statement_timeout || 30000
    };

    // Create connection pool
    this.pool = new Pool(this.config);

    // Event listeners for debugging
    this.pool.on('error', (err, client) => {
      console.error('Unexpected error on idle client', err);
    });

    this.pool.on('connect', () => {
      // Set connection-level options
    });
  }

  /**
   * Execute a simple query
   * @param {string} sql - SQL query
   * @param {array} params - Query parameters
   * @returns {Promise<object>} Query result
   */
  async query(sql, params = []) {
    const client = await this.pool.connect();
    try {
      return await client.query(sql, params);
    } finally {
      client.release();
    }
  }

  /**
   * Execute multiple queries in a transaction
   * @param {Function} callback - Async function that receives client and executes queries
   * @returns {Promise<any>} Result from callback
   */
  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute batch of prepared statements
   * @param {array} batch - Array of {sql, params} objects
   * @returns {Promise<array>} Results array
   */
  async batch(batch) {
    const results = [];
    
    for (const { sql, params } of batch) {
      const result = await this.query(sql, params);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Execute batch in transaction
   * @param {array} batch - Array of {sql, params} objects
   * @returns {Promise<array>} Results array
   */
  async batchTransaction(batch) {
    return this.transaction(async (client) => {
      const results = [];
      
      for (const { sql, params } of batch) {
        const result = await client.query(sql, params);
        results.push(result);
      }
      
      return results;
    });
  }

  /**
   * Stream query results
   * @param {string} sql - SQL query
   * @param {array} params - Query parameters
   * @param {Function} onRow - Callback for each row
   * @returns {Promise<number>} Number of rows processed
   */
  async stream(sql, params, onRow) {
    const client = await this.pool.connect();
    let rowCount = 0;
    
    try {
      const query = client.query(new pg.Query({
        text: sql,
        values: params
      }));

      return new Promise((resolve, reject) => {
        query.on('row', (row) => {
          rowCount++;
          onRow(row);
        });

        query.on('end', () => {
          resolve(rowCount);
        });

        query.on('error', (err) => {
          reject(err);
        });
      });
    } finally {
      client.release();
    }
  }

  /**
   * Get pool statistics
   * @returns {object} Pool stats
   */
  getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }

  /**
   * Close the connection pool
   * @returns {Promise<void>}
   */
  async close() {
    await this.pool.end();
  }
}

// Singleton instance
let instance = null;

/**
 * Get or create database client instance
 * @param {object} config - Configuration object
 * @returns {DatabaseClient}
 */
function getClient(config = {}) {
  if (!instance) {
    instance = new DatabaseClient(config);
  }
  return instance;
}

module.exports = {
  DatabaseClient,
  getClient
};
