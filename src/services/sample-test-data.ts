/**
 * Sample Test Data
 * Contains sample submissions created in Firebase for testing and demonstration
 * 
 * This file documents how to create sample submissions for MVP testing
 */

import { SubmissionCreateRequest } from '../types/submission';
import { MediaType } from '../types/media';

/**
 * Sample test submissions to create in Firebase
 * These represent real-world scenarios for MVP testing
 */
export const SAMPLE_TEST_SUBMISSIONS: SubmissionCreateRequest[] = [
  {
    // Sample 1: Video submission from marketing team
    jiraTaskId: 'MKTG-001',
    jiraTaskKey: 'MKTG-001',
    teamMemberId: 'sarah.chen@company.com',
    teamMemberName: 'Sarah Chen',
    departmentId: 'marketing',
    mediaType: MediaType.VIDEO,
    mediaFileName: 'summer_campaign_video.mp4',
    mediaFormat: 'mp4',
    mediaFileSize: 104857600, // 100MB
    mediaStorageUrl: 'gs://media-bucket/submissions/MKTG-001/summer_campaign.mp4',
    mediaThumbnailUrl: 'gs://media-bucket/thumbnails/MKTG-001_thumb.jpg',
    uploadTimestamp: new Date('2026-07-21T10:30:00Z').getTime(),
  },
  {
    // Sample 2: Poster submission from design team
    jiraTaskId: 'DESIGN-045',
    jiraTaskKey: 'DESIGN-045',
    teamMemberId: 'marco.rossi@company.com',
    teamMemberName: 'Marco Rossi',
    departmentId: 'design',
    mediaType: MediaType.POSTER,
    mediaFileName: 'Q3_brand_refresh_poster.png',
    mediaFormat: 'png',
    mediaFileSize: 8388608, // 8MB
    mediaStorageUrl: 'gs://media-bucket/submissions/DESIGN-045/poster.png',
    mediaThumbnailUrl: 'gs://media-bucket/thumbnails/DESIGN-045_thumb.jpg',
    uploadTimestamp: new Date('2026-07-20T14:45:00Z').getTime(),
  },
  {
    // Sample 3: WebM video submission
    jiraTaskId: 'VIDEO-089',
    jiraTaskKey: 'VIDEO-089',
    teamMemberId: 'alex.thompson@company.com',
    teamMemberName: 'Alex Thompson',
    departmentId: 'creative',
    mediaType: MediaType.VIDEO,
    mediaFileName: 'product_launch_animation.webm',
    mediaFormat: 'webm',
    mediaFileSize: 157286400, // 150MB
    mediaStorageUrl: 'gs://media-bucket/submissions/VIDEO-089/animation.webm',
    mediaThumbnailUrl: 'gs://media-bucket/thumbnails/VIDEO-089_thumb.jpg',
    uploadTimestamp: new Date('2026-07-19T09:15:00Z').getTime(),
  },
];

/**
 * Instructions for creating sample data in Firebase
 *
 * Step 1: Initialize Firebase Admin SDK
 * ```typescript
 * import * as admin from 'firebase-admin';
 * admin.initializeApp();
 * const db = admin.firestore();
 * ```
 *
 * Step 2: Run the seed function
 * ```typescript
 * import { seedSampleSubmissions } from './sample-test-data';
 * await seedSampleSubmissions();
 * ```
 *
 * Step 3: Verify data in Firebase Console
 * Go to Firestore → submissions collection and verify the 3 records
 */

/**
 * Seed sample submissions to Firebase Firestore
 * Call this function to populate test data for MVP demonstration
 * 
 * Usage:
 * - Run during development/testing
 * - Do NOT run in production
 * 
 * @returns Created submission IDs
 */
export async function seedSampleSubmissions(): Promise<string[]> {
  try {
    // Dynamic import to avoid circular dependencies
    const { SubmissionService } = await import('./SubmissionService');
    const service = new SubmissionService();

    const createdIds: string[] = [];

    for (const submission of SAMPLE_TEST_SUBMISSIONS) {
      try {
        const id = await service.createSubmission(submission);
        createdIds.push(id);
        console.log(`✓ Created submission: ${id} (${submission.mediaFileName})`);
      } catch (error) {
        console.error(
          `✗ Failed to create submission ${submission.jiraTaskId}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    console.log(`\nSuccessfully created ${createdIds.length} sample submissions`);
    return createdIds;
  } catch (error) {
    console.error('Failed to seed sample submissions:', error);
    throw error;
  }
}

/**
 * Clear all sample submissions from Firebase
 * Useful for resetting test data
 * 
 * @returns Number of submissions deleted
 */
export async function clearSampleSubmissions(): Promise<number> {
  try {
    const admin = await import('firebase-admin');
    if (!admin.default.apps.length) {
      admin.default.initializeApp();
    }

    const db = admin.default.firestore();
    const submissionsRef = db.collection('submissions');

    // Query for submissions with our test Jira task IDs
    const testTaskIds = SAMPLE_TEST_SUBMISSIONS.map((s) => s.jiraTaskId);
    const query = submissionsRef.where('jiraTaskId', 'in', testTaskIds);

    const snapshot = await query.get();
    let deleted = 0;

    for (const doc of snapshot.docs) {
      await doc.ref.delete();
      deleted++;
    }

    console.log(`Deleted ${deleted} sample submissions`);
    return deleted;
  } catch (error) {
    console.error('Failed to clear sample submissions:', error);
    throw error;
  }
}

/**
 * Verify sample submissions exist in Firebase
 * Useful for testing the detection pipeline
 *
 * @returns Array of verification results
 */
export async function verifySampleSubmissions(): Promise<
  Array<{ jiraTaskId: string; exists: boolean; submissionId?: string }>
> {
  try {
    const { SubmissionService } = await import('./SubmissionService');
    const service = new SubmissionService();

    const results: Array<{ jiraTaskId: string; exists: boolean; submissionId?: string }> = [];

    for (const submission of SAMPLE_TEST_SUBMISSIONS) {
      try {
        const submissions = await service.getSubmissionsByJiraTaskId(submission.jiraTaskId);
        const found = submissions.length > 0;

        results.push({
          jiraTaskId: submission.jiraTaskId,
          exists: found,
          submissionId: found ? submissions[0].id : undefined,
        });

        const status = found ? '✓' : '✗';
        console.log(`${status} ${submission.jiraTaskId}: ${submission.mediaFileName}`);
      } catch (error) {
        results.push({
          jiraTaskId: submission.jiraTaskId,
          exists: false,
        });

        console.error(
          `✗ Error checking ${submission.jiraTaskId}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    return results;
  } catch (error) {
    console.error('Failed to verify sample submissions:', error);
    throw error;
  }
}

/**
 * Print submission details for verification
 *
 * @param submissionId - Submission document ID
 */
export async function printSubmissionDetails(submissionId: string): Promise<void> {
  try {
    const { SubmissionService } = await import('./SubmissionService');
    const service = new SubmissionService();

    const submission = await service.getSubmission(submissionId);

    if (!submission) {
      console.error(`Submission ${submissionId} not found`);
      return;
    }

    console.log('\n=== Submission Details ===');
    console.log(`ID: ${submission.id}`);
    console.log(`Jira Task: ${submission.jiraTaskId}`);
    console.log(`Team Member: ${submission.teamMemberName} (${submission.teamMemberId})`);
    console.log(`Media Type: ${submission.mediaType}`);
    console.log(`File: ${submission.media.fileName}`);
    console.log(`Size: ${(submission.media.fileSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Status: ${submission.status}`);
    console.log(`Evaluation Status: ${submission.evaluationStatus}`);
    console.log(`Submitted: ${new Date(submission.submissionTimestamp).toISOString()}`);
    console.log(`Created: ${new Date(submission.createdAt).toISOString()}`);
  } catch (error) {
    console.error('Failed to print submission details:', error);
  }
}
