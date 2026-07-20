/**
 * Firebase Configuration Module
 * Initializes Firebase Admin SDK and provides collection schemas
 */

import admin from 'firebase-admin';
import { Logger } from '../utils/logger';

const logger = new Logger('FirebaseConfig');

// Initialize Firebase Admin SDK
function initializeFirebase(): void {
  if (admin.apps.length === 0) {
    // Use service account from environment or default credentials
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';

    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });

      logger.info('Firebase Admin SDK initialized successfully');
    } catch (error) {
      logger.error(`Failed to initialize Firebase: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

/**
 * Get Firestore database instance
 */
export function getFirestore(): FirebaseFirestore.Firestore {
  if (admin.apps.length === 0) {
    initializeFirebase();
  }
  return admin.firestore();
}

/**
 * Collection schemas and indexes documentation
 * These collections are used by the AI Awards system
 */
export const FIRESTORE_COLLECTIONS = {
  /**
   * Submissions Collection
   * Path: /submissions/{submissionId}
   * Stores all media submissions for evaluation
   */
  SUBMISSIONS: 'submissions',

  /**
   * Awards Collection
   * Path: /awards/{awardId}
   * Stores all awarded recognitions
   */
  AWARDS: 'awards',

  /**
   * Audit Logs Collection
   * Path: /audit_logs/{auditId}
   * Immutable append-only log of all system events
   */
  AUDIT_LOGS: 'audit_logs',

  /**
   * Team Members Collection
   * Path: /team_members/{userId}
   * Stores team member information
   */
  TEAM_MEMBERS: 'team_members',

  /**
   * Award Categories Collection
   * Path: /award_categories/{categoryId}
   * Stores predefined award categories
   */
  AWARD_CATEGORIES: 'award_categories',

  /**
   * Notifications Collection
   * Path: /notifications/{userId}/{notificationId}
   * Stores in-app notifications for users
   */
  NOTIFICATIONS: 'notifications',
} as const;

/**
 * Initialize Firestore collections with security rules
 * This function ensures all required collections exist and have appropriate indexes
 */
export async function initializeCollections(): Promise<void> {
  const db = getFirestore();

  try {
    logger.info('Initializing Firestore collections...');

    // Create empty documents to ensure collections exist
    // (Firestore doesn't create empty collections automatically)
    const collectionInitPromises = Object.values(FIRESTORE_COLLECTIONS).map(async (collection) => {
      try {
        const docRef = db.collection(collection).doc('_schema');
        const docSnapshot = await docRef.get();

        if (!docSnapshot.exists) {
          await docRef.set(
            {
              _type: 'schema_marker',
              _createdAt: admin.firestore.Timestamp.now(),
              _purpose: `Marker document ensuring ${collection} collection exists`,
            },
            { merge: true }
          );
          logger.info(`✓ Collection initialized: ${collection}`);
        }
      } catch (error) {
        logger.error(
          `Failed to initialize collection ${collection}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });

    await Promise.all(collectionInitPromises);

    logger.info('✓ All Firestore collections initialized successfully');
  } catch (error) {
    logger.error(`Failed to initialize collections: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Firestore Security Rules (to be deployed separately)
 * These rules should be applied via Firebase Console or firebase-tools
 */
export const FIRESTORE_SECURITY_RULES = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isAdmin() {
      return isAuthenticated() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }

    function isTeamMember() {
      return isAuthenticated();
    }

    // Submissions collection
    // Everyone can read their own submissions and all submissions (for leaderboard)
    // Only system/admin can write
    match /submissions/{document=**} {
      allow read: if isTeamMember();
      allow create: if isAdmin() || request.auth.uid == resource.data.teamMemberId;
      allow update: if isAdmin();
      allow delete: if false; // Never delete, only archive
    }

    // Awards collection
    // Everyone can read
    // Only system/admin can write
    match /awards/{document=**} {
      allow read: if isTeamMember();
      allow write: if isAdmin();
      allow delete: if false;
    }

    // Audit logs collection
    // Only admins can read
    // Only system/admin can write
    match /audit_logs/{document=**} {
      allow read: if isAdmin();
      allow write: if isAdmin();
      allow delete: if false;
    }

    // Team members collection
    // Everyone can read
    // Only admins can write
    match /team_members/{document=**} {
      allow read: if isTeamMember();
      allow write: if isAdmin();
      allow delete: if false;
    }

    // Award categories collection
    // Everyone can read
    // Only admins can write
    match /award_categories/{document=**} {
      allow read: if isTeamMember();
      allow write: if isAdmin();
      allow delete: if false;
    }

    // Notifications collection
    // Users can only read/write their own notifications
    match /notifications/{userId}/{document=**} {
      allow read: if isAuthenticated() && request.auth.uid == userId;
      allow create: if isAdmin();
      allow update: if isAuthenticated() && request.auth.uid == userId;
      allow delete: if isAuthenticated() && request.auth.uid == userId;
    }
  }
}
`;

/**
 * Recommended Firestore Indexes
 * These should be created via Firebase Console or deployed with firestore.indexes.json
 */
export const FIRESTORE_INDEXES = [
  // Submissions indexes
  {
    collectionGroup: 'submissions',
    fields: [
      { fieldPath: 'submissionTimestamp', order: 'DESCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
    ],
  },
  {
    collectionGroup: 'submissions',
    fields: [
      { fieldPath: 'teamMemberId', order: 'ASCENDING' },
      { fieldPath: 'submissionTimestamp', order: 'DESCENDING' },
    ],
  },
  {
    collectionGroup: 'submissions',
    fields: [
      { fieldPath: 'evaluationStatus', order: 'ASCENDING' },
      { fieldPath: 'submissionTimestamp', order: 'DESCENDING' },
    ],
  },
  {
    collectionGroup: 'submissions',
    fields: [
      { fieldPath: 'jiraTaskId', order: 'ASCENDING' },
      { fieldPath: 'submissionTimestamp', order: 'DESCENDING' },
    ],
  },
  {
    collectionGroup: 'submissions',
    fields: [
      { fieldPath: 'mediaType', order: 'ASCENDING' },
      { fieldPath: 'creativityScore', order: 'DESCENDING' },
    ],
  },

  // Awards indexes
  {
    collectionGroup: 'awards',
    fields: [
      { fieldPath: 'periodStart', order: 'DESCENDING' },
      { fieldPath: 'awardCategory', order: 'ASCENDING' },
    ],
  },
  {
    collectionGroup: 'awards',
    fields: [
      { fieldPath: 'winnerId', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' },
    ],
  },
  {
    collectionGroup: 'awards',
    fields: [
      { fieldPath: 'awardCategory', order: 'ASCENDING' },
      { fieldPath: 'awardType', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' },
    ],
  },

  // Audit logs indexes
  {
    collectionGroup: 'audit_logs',
    fields: [
      { fieldPath: 'timestamp', order: 'DESCENDING' },
      { fieldPath: 'eventType', order: 'ASCENDING' },
    ],
  },
  {
    collectionGroup: 'audit_logs',
    fields: [
      { fieldPath: 'entityType', order: 'ASCENDING' },
      { fieldPath: 'entityId', order: 'ASCENDING' },
      { fieldPath: 'timestamp', order: 'DESCENDING' },
    ],
  },
];

// Initialize on import
try {
  initializeFirebase();
} catch (error) {
  logger.error(`Firebase initialization failed: ${error instanceof Error ? error.message : String(error)}`);
}

export default admin;
