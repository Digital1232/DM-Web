/**
 * run_daily_learn_tasks.mjs
 * Runs the daily LEARN task creation directly against Firebase REST API.
 * Uses admin email/password sign-in to get an authenticated ID token.
 *
 * Usage: node run_daily_learn_tasks.mjs
 * Requires: FIREBASE_ADMIN_EMAIL and FIREBASE_ADMIN_PASS set below or as env vars.
 */

import { createInterface } from 'readline';
import { promisify } from 'util';

// ─── Config ────────────────────────────────────────────────────────────────
const DB_URL     = 'https://worksync-vilpower-default-rtdb.firebaseio.com';
const API_KEY    = 'AIzaSyAL7Z1D_Lhbu-eW9qgiP4hs25ccv_hRu3w';
const AUTH_URL   = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;

// Real users from config.js (skip demo entries without @)
const USERS = [
  { email: 'nanjil@vilpower.com',            name: 'Nanjil Manohar S' },
  { email: 'digitalmarketing@vilpower.com',  name: 'Palanirajan R' },
  { email: 'murugeshvilpower@gmail.com',     name: 'Murugesh Kumar A' },
  { email: 'barathvilpower@gmail.com',       name: 'Barath Magesh M' },
  { email: 'karthikavilpower@gmail.com',       name: 'Karthika K' },
  { email: 'immanuelvilpower@gmail.com',     name: 'Immanuel Raja S' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────
function eKey(email) {
  return email.replace(/[.@]/g, '_');
}

function todayLabel() {
  return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function signIn(email, password) {
  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Auth failed: ${data.error?.message || JSON.stringify(data)}`);
  return data.idToken;
}

async function getExistingTask(token, userDbKey, taskId) {
  const url = `${DB_URL}/worksync/manual_tasks/${userDbKey}/${taskId}.json?auth=${token}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data; // null if not exists
}

async function writeTask(token, userDbKey, taskId, payload) {
  const url = `${DB_URL}/worksync/manual_tasks/${userDbKey}/${taskId}.json?auth=${token}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PUT failed (${res.status}): ${err}`);
  }
  return await res.json();
}

async function deleteOldLearnTasks(token) {
  console.log('\n🧹 Checking for stale LEARN tasks at old path (worksync/tasks)...');
  const url = `${DB_URL}/worksync/tasks.json?auth=${token}&shallow=true`;
  const res = await fetch(url);
  if (!res.ok) {
    console.log('   Could not read worksync/tasks (may not exist). Skipping cleanup.');
    return;
  }
  const keys = await res.json();
  if (!keys) { console.log('   No stale tasks found.'); return; }

  const learnKeys = Object.keys(keys).filter(k => k.startsWith('LEARN-'));
  if (learnKeys.length === 0) { console.log('   No stale tasks found.'); return; }

  for (const key of learnKeys) {
    const delUrl = `${DB_URL}/worksync/tasks/${key}.json?auth=${token}`;
    await fetch(delUrl, { method: 'DELETE' });
    console.log(`   ✅ Deleted stale task: ${key}`);
  }
}

// ─── Prompt for password ───────────────────────────────────────────────────
function promptPassword(adminEmail) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    process.stdout.write(`Enter password for ${adminEmail}: `);
    // Hide input on supported terminals
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    let pwd = '';
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    const onData = (ch) => {
      ch = ch.toString();
      if (ch === '\n' || ch === '\r' || ch === '\u0004') {
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
        process.stdout.write('\n');
        process.stdin.removeListener('data', onData);
        rl.close();
        resolve(pwd);
      } else if (ch === '\u0003') {
        process.exit();
      } else if (ch === '\u007f') {
        pwd = pwd.slice(0, -1);
      } else {
        pwd += ch;
      }
    };
    process.stdin.on('data', onData);
  });
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const adminEmail = process.env.FIREBASE_ADMIN_EMAIL || 'nanjil@vilpower.com';
  const adminPass  = process.env.FIREBASE_ADMIN_PASS  || await promptPassword(adminEmail);

  console.log(`\n🔑 Signing in as ${adminEmail}...`);
  let token;
  try {
    token = await signIn(adminEmail, adminPass);
    console.log('   ✅ Authenticated successfully.');
  } catch (e) {
    console.error(`   ❌ ${e.message}`);
    process.exit(1);
  }

  // Clean up old stale tasks from the wrong path
  await deleteOldLearnTasks(token);

  // Now create today's learning tasks
  const dateLabel = todayLabel();
  const now       = Date.now();
  const today     = new Date().toDateString();

  console.log(`\n📚 Creating daily LEARN tasks for ${dateLabel}...\n`);

  let created = 0, skipped = 0, errors = 0;

  for (const user of USERS) {
    const { email, name } = user;
    const sanitized = email.replace(/[@.]/g, '_');
    const taskId    = `LEARN-${sanitized}`;
    const userDbKey = eKey(email);

    // Check if task already exists
    const existing = await getExistingTask(token, userDbKey, taskId);

    if (existing && existing.id === taskId) {
      const taskDate = existing.createdAt ? new Date(existing.createdAt).toDateString() : null;

      if (taskDate === today) {
        console.log(`   ⏭️  ${name}: task already exists for today. Skipping.`);
        skipped++;
        continue;
      }

      const terminalStatuses = ['Completed', 'Done'];
      if (!terminalStatuses.includes(existing.status)) {
        console.log(`   ⏭️  ${name}: open task from previous day (status: "${existing.status}"). Preserving.`);
        skipped++;
        continue;
      }
    }

    // Write fresh task
    const task = {
      id:            taskId,
      desc:          `Learning – ${dateLabel}`,
      client:        'Learning',
      status:        'To do',
      priority:      'Medium',
      assignee:      name,
      assigneeEmail: email,
      manual:        true,
      taskType:      'internal',
      userId:        email,
      createdAt:     now
    };

    try {
      await writeTask(token, userDbKey, taskId, task);
      console.log(`   ✅ ${name}: LEARN task created.`);
      created++;
    } catch (e) {
      console.error(`   ❌ ${name}: ${e.message}`);
      errors++;
    }
  }

  console.log(`\n📊 Done. Created: ${created} | Skipped: ${skipped} | Errors: ${errors}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
