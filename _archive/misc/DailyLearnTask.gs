// DailyLearnTask.gs – Server‑side scheduled creation of internal LEARN tasks
// ------------------------------------------------------------
// This script runs as a Google Apps Script project with access to the
// Firebase Realtime Database used by the VilPower WorkSync app.
//
// It creates, each day, a "Learning" internal task for every active user
// stored under `worksync/users`. Tasks are written to the correct path:
//   worksync/manual_tasks/<eKey(email)>/LEARN-<sanitized_email>
//
// Key behaviours:
//   • Skips users whose email is missing or is a demo/test entry (e.g. "123").
//   • Does NOT overwrite an existing task's status or createdAt – so user
//     progress is preserved. Only a missing task is freshly created.
//   • Task fields match exactly what the front-end expects:
//       id, desc, client, status, priority, assignee, assigneeEmail,
//       manual, taskType, userId, createdAt
//
// Setup:
//   1. Add a Script Property `FIREBASE_DB_URL` = your Realtime DB root URL
//      (e.g. https://worksync-vilpower-default-rtdb.firebaseio.com)
//   2. Run `setupDailyLearnTrigger()` once to install the daily trigger.
//   3. Optionally run `testConnectivity()` to verify the DB connection.

/**
 * Converts an email address to the same key format used by the front-end
 * `eKey()` helper: replaces "." and "@" with "_".
 */
function eKey(email) {
  return email.replace(/[.@]/g, '_');
}

/**
 * Creates a daily "Learning" internal task for each user in Firebase.
 * Existing tasks are left untouched (status/progress preserved).
 * New tasks are created with status "To do".
 */
function createLearnTasks() {
  const props = PropertiesService.getScriptProperties();
  const baseUrl = props.getProperty('FIREBASE_DB_URL');
  if (!baseUrl) {
    Logger.log('FIREBASE_DB_URL script property not set. Aborting.');
    return;
  }

  // ── 1. Fetch all registered users ───────────────────────────────────────
  const usersUrl = `${baseUrl}/worksync/users.json`;
  const usersResponse = UrlFetchApp.fetch(usersUrl, { muteHttpExceptions: true });
  if (usersResponse.getResponseCode() !== 200) {
    Logger.log('Failed to fetch users (%s): %s',
      usersResponse.getResponseCode(), usersResponse.getContentText());
    return;
  }

  const users = JSON.parse(usersResponse.getContentText() || '{}');
  if (!users || Object.keys(users).length === 0) {
    Logger.log('No users found in the database. Nothing to do.');
    return;
  }

  const today = new Date();
  // Date string for the task title, e.g. "09 Jun 2026"
  const dateLabel = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const now = Date.now();

  let created = 0;
  let skipped = 0;
  let errors  = 0;

  // ── 2. Process each user individually ───────────────────────────────────
  for (const key in users) {
    const user = users[key];

    // Skip entries without a valid email or that look like demo accounts
    if (!user || !user.email || user.email.trim() === '' || !/[@]/.test(user.email)) {
      Logger.log('Skipping invalid/demo user entry: %s', JSON.stringify(user));
      skipped++;
      continue;
    }

    const email      = user.email.trim();
    const name       = (user.name || '').trim() || email;
    const sanitized  = email.replace(/[@.]/g, '_');
    const taskId     = `LEARN-${sanitized}`;
    const userDbKey  = eKey(email);
    const taskUrl    = `${baseUrl}/worksync/manual_tasks/${userDbKey}/${taskId}.json`;

    // ── 3. Check if the task already exists for today ────────────────────
    const checkResp = UrlFetchApp.fetch(taskUrl, { muteHttpExceptions: true });

    if (checkResp.getResponseCode() === 200) {
      const existing = JSON.parse(checkResp.getContentText() || 'null');

      if (existing && existing.id === taskId) {
        // Task exists – check if it was created today; if so, skip entirely
        const taskDate = existing.createdAt
          ? new Date(existing.createdAt).toDateString()
          : null;
        const todayStr = today.toDateString();

        if (taskDate === todayStr) {
          Logger.log('Task %s already exists for today. Skipping.', taskId);
          skipped++;
          continue;
        }

        // Task exists from a previous day and may still be open.
        // Only reset it if it has been completed or is in a terminal state.
        const terminalStatuses = ['Completed', 'Done'];
        if (!terminalStatuses.includes(existing.status)) {
          Logger.log('Task %s still open (status: %s). Skipping to preserve progress.',
            taskId, existing.status);
          skipped++;
          continue;
        }
        // Falls through: task was completed, so create a fresh one for today.
      }
    }

    // ── 4. Write the new task ─────────────────────────────────────────────
    const newTask = {
      id:            taskId,
      desc:          `Learning – ${dateLabel}`,   // "desc" is what the UI renders
      client:        'Learning',                  // matches the CLIENTS list in config.js
      status:        'To do',                     // matches INTERNAL_TASK_STATUSES
      priority:      'Medium',
      assignee:      name,
      assigneeEmail: email,
      manual:        true,
      taskType:      'internal',
      userId:        email,
      createdAt:     now
    };

    const putOptions = {
      method:           'put',
      contentType:      'application/json',
      muteHttpExceptions: true,
      payload:          JSON.stringify(newTask)
    };

    const putResp = UrlFetchApp.fetch(taskUrl, putOptions);
    if (putResp.getResponseCode() >= 200 && putResp.getResponseCode() < 300) {
      Logger.log('Created LEARN task for %s (%s).', name, email);
      created++;
    } else {
      Logger.log('Error writing task for %s: [%s] %s',
        email, putResp.getResponseCode(), putResp.getContentText());
      errors++;
    }
  }

  Logger.log('Done. Created: %s | Skipped: %s | Errors: %s', created, skipped, errors);
}

/**
 * Installs a time‑based trigger that runs `createLearnTasks` once a day
 * at 08:00 server time (start of work day). Safe to run multiple times –
 * existing triggers for the same handler are removed first.
 */
function setupDailyLearnTrigger() {
  const all = ScriptApp.getProjectTriggers();
  all.forEach(t => {
    if (t.getHandlerFunction() === 'createLearnTasks') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('createLearnTasks')
    .timeBased()
    .everyDays(1)
    .atHour(8)   // 08:00 server time – tasks appear at start of work day
    .create();

  Logger.log('Daily LEARN task trigger installed (08:00 daily).');
}

/**
 * Verify connectivity and list users found in the database.
 * Run this once manually to confirm the FIREBASE_DB_URL is correct.
 */
function testConnectivity() {
  const props = PropertiesService.getScriptProperties();
  const baseUrl = props.getProperty('FIREBASE_DB_URL');
  if (!baseUrl) {
    Logger.log('FIREBASE_DB_URL is not set. Add it via Project Settings → Script Properties.');
    return;
  }

  const resp = UrlFetchApp.fetch(`${baseUrl}/worksync/users.json`, { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) {
    Logger.log('Failed to reach database (%s). Check the URL and Firebase rules.',
      resp.getResponseCode());
    return;
  }

  const users = JSON.parse(resp.getContentText() || '{}');
  const emails = Object.values(users)
    .filter(u => u && u.email && /[@]/.test(u.email))
    .map(u => u.email);

  Logger.log('Connection OK. Found %s valid user(s):', emails.length);
  emails.forEach(e => Logger.log('  • %s', e));
}

/**
 * One-time helper to remove stale LEARN tasks from the old (incorrect)
 * path worksync/tasks/ that may have been written by the previous version
 * of this script. Run once, then delete or disable this function.
 */
function cleanupOldLearnTasks() {
  const props = PropertiesService.getScriptProperties();
  const baseUrl = props.getProperty('FIREBASE_DB_URL');
  if (!baseUrl) { Logger.log('FIREBASE_DB_URL not set.'); return; }

  const oldTasksUrl = `${baseUrl}/worksync/tasks.json`;
  const resp = UrlFetchApp.fetch(oldTasksUrl, { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) {
    Logger.log('Could not fetch worksync/tasks: %s', resp.getContentText());
    return;
  }

  const allTasks = JSON.parse(resp.getContentText() || '{}');
  let removed = 0;

  for (const taskId in allTasks) {
    if (taskId.startsWith('LEARN-')) {
      const delUrl = `${baseUrl}/worksync/tasks/${taskId}.json`;
      UrlFetchApp.fetch(delUrl, { method: 'delete', muteHttpExceptions: true });
      Logger.log('Deleted stale task: %s', taskId);
      removed++;
    }
  }

  Logger.log('Cleanup complete. Removed %s stale LEARN task(s).', removed);
}
