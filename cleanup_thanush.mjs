/**
 * cleanup_thanush.mjs
 * Node.js utility to purge Thanush and all associated documents, plans, and records
 * from Firebase Realtime Database.
 *
 * Usage:
 *   node cleanup_thanush.mjs
 * Or with env vars:
 *   FIREBASE_ADMIN_EMAIL=digitalmarketing@vilpower.com FIREBASE_ADMIN_PASS=... node cleanup_thanush.mjs
 */

import readline from 'readline';

const DB_URL = 'https://worksync-vilpower-default-rtdb.firebaseio.com';
const API_KEY = 'AIzaSyAL7Z1D_Lhbu-eW9qgiP4hs25ccv_hRu3w';
const AUTH_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;

const TARGET_EMAIL = 'thanushvilpower@gmail.com';
const TARGET_KEY = 'thanushvilpower_gmail_com';

function prompt(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

async function signIn(email, password) {
    const res = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Authentication failed');
    return data.idToken;
}

async function dbGet(token, path) {
    const res = await fetch(`${DB_URL}/${path}.json?auth=${token}`);
    if (!res.ok) return null;
    return await res.json();
}

async function dbDelete(token, path) {
    const res = await fetch(`${DB_URL}/${path}.json?auth=${token}`, { method: 'DELETE' });
    return res.ok;
}

async function main() {
    console.log('=====================================================');
    console.log(' OneDesk Database Cleanup: Purge Thanush & Documents ');
    console.log('=====================================================\n');

    const adminEmail = process.env.FIREBASE_ADMIN_EMAIL || await prompt('Enter Admin Email [digitalmarketing@vilpower.com]: ') || 'digitalmarketing@vilpower.com';
    const adminPass = process.env.FIREBASE_ADMIN_PASS || await prompt('Enter Admin Password: ');

    if (!adminPass) {
        console.error('Password is required.');
        process.exit(1);
    }

    console.log(`\n🔑 Authenticating as ${adminEmail}...`);
    let token;
    try {
        token = await signIn(adminEmail, adminPass);
        console.log('✅ Authenticated successfully.\n');
    } catch (e) {
        console.error(`❌ Authentication failed: ${e.message}`);
        process.exit(1);
    }

    let deleted = 0;

    // 1. Delete user profile
    console.log(`1. Deleting worksync/users/${TARGET_KEY}...`);
    const user = await dbGet(token, `worksync/users/${TARGET_KEY}`);
    if (user) {
        await dbDelete(token, `worksync/users/${TARGET_KEY}`);
        console.log(`   ✓ Removed user profile`);
        deleted++;
    } else {
        console.log(`   - Profile already absent`);
    }

    // 2. Delete daily plans
    console.log(`2. Deleting worksync/daily_plans/${TARGET_KEY}...`);
    const dp = await dbGet(token, `worksync/daily_plans/${TARGET_KEY}`);
    if (dp) {
        await dbDelete(token, `worksync/daily_plans/${TARGET_KEY}`);
        console.log(`   ✓ Removed daily plans`);
        deleted++;
    } else {
        console.log(`   - Daily plans already absent`);
    }

    // 3. Delete manual tasks
    console.log(`3. Deleting worksync/manual_tasks/${TARGET_KEY}...`);
    const mt = await dbGet(token, `worksync/manual_tasks/${TARGET_KEY}`);
    if (mt) {
        await dbDelete(token, `worksync/manual_tasks/${TARGET_KEY}`);
        console.log(`   ✓ Removed manual tasks`);
        deleted++;
    } else {
        console.log(`   - Manual tasks already absent`);
    }

    // 4. Scan and delete requests
    console.log(`4. Scanning worksync/requests...`);
    const reqs = await dbGet(token, 'worksync/requests') || {};
    let rDel = 0;
    for (const [id, r] of Object.entries(reqs)) {
        const u = (r?.userId || r?.userEmail || '').toLowerCase();
        const n = (r?.userName || '').toLowerCase();
        if (u.includes(TARGET_EMAIL) || n.includes('thanush')) {
            await dbDelete(token, `worksync/requests/${id}`);
            rDel++;
        }
    }
    if (rDel > 0) {
        console.log(`   ✓ Deleted ${rDel} request(s)`);
        deleted += rDel;
    } else {
        console.log(`   - No requests found`);
    }

    // 5. Scan and delete workplace ideas
    console.log(`5. Scanning worksync/workplace_ideas...`);
    const wp = await dbGet(token, 'worksync/workplace_ideas') || {};
    let wpDel = 0;
    for (const [id, idea] of Object.entries(wp)) {
        if ((idea?.userId || '').toLowerCase() === TARGET_EMAIL || (idea?.userName || '').toLowerCase().includes('thanush')) {
            await dbDelete(token, `worksync/workplace_ideas/${id}`);
            wpDel++;
        }
    }
    if (wpDel > 0) {
        console.log(`   ✓ Deleted ${wpDel} workplace idea(s)`);
        deleted += wpDel;
    } else {
        console.log(`   - No workplace ideas found`);
    }

    // 6. Monthly organisers
    console.log(`6. Checking worksync/monthly_organisers...`);
    const orgs = await dbGet(token, 'worksync/monthly_organisers') || {};
    for (const [k, v] of Object.entries(orgs)) {
        if (v && (v.email || '').toLowerCase() === TARGET_EMAIL) {
            await dbDelete(token, `worksync/monthly_organisers/${k}`);
            console.log(`   ✓ Removed from monthly_organisers/${k}`);
            deleted++;
        }
    }

    // 7. File systems & Drive uploads
    console.log(`7. Checking worksync/file_systems and worksync/drive_uploads...`);
    const fsData = await dbGet(token, 'worksync/file_systems') || {};
    for (const [id, sys] of Object.entries(fsData)) {
        if ((sys?.owner || '').toLowerCase().includes('thanush')) {
            await dbDelete(token, `worksync/file_systems/${id}`);
            console.log(`   ✓ Deleted file system ${id}`);
            deleted++;
        }
    }

    const duData = await dbGet(token, 'worksync/drive_uploads') || {};
    for (const [id, up] of Object.entries(duData)) {
        if ((up?.userEmail || up?.userId || '').toLowerCase() === TARGET_EMAIL) {
            await dbDelete(token, `worksync/drive_uploads/${id}`);
            console.log(`   ✓ Deleted drive upload ${id}`);
            deleted++;
        }
    }

    // 8. Conversations
    console.log(`8. Scanning conversations...`);
    const convs = await dbGet(token, 'worksync/conversations') || {};
    for (const id of Object.keys(convs)) {
        if (id.includes(TARGET_KEY) || id.includes('thanush')) {
            await dbDelete(token, `worksync/conversations/${id}`);
            await dbDelete(token, `worksync/messages/${id}`);
            console.log(`   ✓ Deleted conversation ${id}`);
            deleted++;
        }
    }

    console.log(`\n🎉 Cleanup complete! Successfully purged ${deleted} item(s) from Firebase RTDB.`);
}

main().catch(err => {
    console.error(`\n❌ Error: ${err.message}`);
    process.exit(1);
});
