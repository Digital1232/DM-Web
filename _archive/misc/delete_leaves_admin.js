const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = {
    "type": "service_account",
    "project_id": "worksync-vilpower",
    "private_key": process.env.FIREBASE_PRIVATE_KEY || "YOUR_PRIVATE_KEY_HERE",
    "client_email": process.env.FIREBASE_CLIENT_EMAIL || "YOUR_SERVICE_ACCOUNT_EMAIL"
};

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://worksync-vilpower-default-rtdb.firebaseio.com"
    });
} catch (e) {
    console.log("Firebase already initialized");
}

const db = admin.database();

async function clearAllLeaves() {
    try {
        console.log('🔄 Fetching all requests...');
        
        const snapshot = await db.ref('worksync/requests').once('value');
        const requests = snapshot.val();

        if (!requests) {
            console.log('✅ No requests found');
            return;
        }

        const leaveIds = Object.keys(requests).filter(id => requests[id].type === 'leave');

        if (leaveIds.length === 0) {
            console.log('✅ No leave requests found to delete');
            process.exit(0);
            return;
        }

        console.log(`📋 Found ${leaveIds.length} leave request(s):`);
        leaveIds.forEach(id => console.log(`  - ${id}`));

        let deleted = 0;
        for (const id of leaveIds) {
            try {
                await db.ref(`worksync/requests/${id}`).remove();
                console.log(`✅ Deleted: ${id}`);
                deleted++;
            } catch (err) {
                console.log(`❌ Failed to delete ${id}:`, err.message);
            }
        }

        console.log(`\n✨ Successfully deleted ${deleted}/${leaveIds.length} leave request(s)`);
        process.exit(0);
        
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

clearAllLeaves();
