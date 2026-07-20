/**
 * Database Access Module
 * Exports database initialization and collection accessors
 */

import { getFirestore, initializeCollections, FIRESTORE_COLLECTIONS } from '../config/firebase';
import { Logger } from '../utils/logger';

const logger = new Logger('DatabaseModule');

/**
 * Initialize database and all collections
 * Call this once during application startup
 */
export async function initializeDatabase(): Promise<void> {
  try {
    logger.info('Initializing database...');
    await initializeCollections();
    logger.info('✓ Database initialized successfully');
  } catch (error) {
    logger.error(`Database initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Get reference to submissions collection
 */
export function getSubmissionsCollection(): FirebaseFirestore.CollectionReference {
  return getFirestore().collection(FIRESTORE_COLLECTIONS.SUBMISSIONS);
}

/**
 * Get reference to awards collection
 */
export function getAwardsCollection(): FirebaseFirestore.CollectionReference {
  return getFirestore().collection(FIRESTORE_COLLECTIONS.AWARDS);
}

/**
 * Get reference to audit logs collection
 */
export function getAuditLogsCollection(): FirebaseFirestore.CollectionReference {
  return getFirestore().collection(FIRESTORE_COLLECTIONS.AUDIT_LOGS);
}

/**
 * Get reference to team members collection
 */
export function getTeamMembersCollection(): FirebaseFirestore.CollectionReference {
  return getFirestore().collection(FIRESTORE_COLLECTIONS.TEAM_MEMBERS);
}

/**
 * Get reference to award categories collection
 */
export function getAwardCategoriesCollection(): FirebaseFirestore.CollectionReference {
  return getFirestore().collection(FIRESTORE_COLLECTIONS.AWARD_CATEGORIES);
}

/**
 * Get reference to notifications collection for a user
 */
export function getUserNotificationsCollection(userId: string): FirebaseFirestore.CollectionReference {
  return getFirestore().collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS).doc(userId).collection('notifications');
}

/**
 * Get the Firestore instance directly for advanced queries
 */
export function getDatabase(): FirebaseFirestore.Firestore {
  return getFirestore();
}

/**
 * Database health check
 */
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; message: string }> {
  try {
    const db = getFirestore();

    // Try to read from submissions collection
    const snapshot = await db.collection(FIRESTORE_COLLECTIONS.SUBMISSIONS).limit(1).get();

    return {
      healthy: true,
      message: 'Database is healthy and accessible',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Database health check failed: ${message}`);
    return {
      healthy: false,
      message: `Database health check failed: ${message}`,
    };
  }
}

export { FIRESTORE_COLLECTIONS };
