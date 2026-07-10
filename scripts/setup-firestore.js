/**
 * Firestore Setup Script
 * Creates Meta OAuth collections with proper TTL settings
 * Run this script once to initialize the Firestore database
 * 
 * Usage: node scripts/setup-firestore.js
 */

const admin = require('firebase-admin');

// Service account credentials (hardcoded for setup - normally from env)
const serviceAccount = {
    type: "service_account",
    project_id: "worksync-vilpower",
    private_key_id: "e6cb1b057c89b7d3c0a02e2cdf855fe4a3750810",
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDoF62x+TQTj8/H\nl90b80sm8B8+BGGBiuXJ8LJTZHuzKyxDQJxA9v9/YmR9TSfArcYxlPKUIIO3knSZ\nFvcOuBFGbE2CDPJeHRoFYpA5cg3wOGHYdbua9h7DjCqGyxq6qTqERoBBlMeEDZbD\n/NNZ/P2n/L+nylM6RTqK3xJCqBO6GxjIc5ejJEtPPZDGG8rVbLIPeVHv6GDcKyKa\n/82IqgdkzM111PauGEeY4VHrbthcpv4vtBctCaZLkFjnslG7fnz6k9FdENRr9VPm\nfnu1d7tMDvPK+j6gr7XTSKnVnkM2VCYfXxbH7Q2P1f2vc+XqRib6jZD54EmEVRtj\njTbeTKxVAgMBAAECggEAGWRNyoTbH7DCKLICrMYnWLE4mc5c5JFPppJA0ELUDbwR\ncaIl9i2Psl4PZG4GhVv9rPsAtxf/kRviycTrbp7QtQWwTSQheA5zBFfOM5q4z6k7\nezUWO1Pl9brmBC1AVV+iWUplScd/NIFQF00XymaVUcWjKjZGeL+OMhdJpiVBU0Di\nUYa4GiRmuWy7ZUwZ8cxhYgLqk1z0Q1mhrg7hEQ1GRdg/MKg8zyudzDO/WbqG8kUx\nXduhnSOfpjhyBipfMrnBW982U7RKDKKXkThvv4qa4flRHzp2SSG9S4m7mKuuj4x8\n4WN6SK1Mex9taznZdObZqTbQ+qF0N1MTTLK55LWrWQKBgQD5gUDQtO3bV7MtBeXo\nEWkx8IB/uINMxPEOP3WJfWWOCTaXyRZFr+2LIk9PwBMjVBoTrYKuDEvpwbdRGOP1\nHGMY/UAC1ojAAymozDV1xe11jzDzyzD4qHfqYNgWk3HLaD8Z88T1KmBLBypHUw7K\nUTroDyot3x0YtTiohUFXeiDiawKBgQDuImLG5lb4AbM0w0yMpoKjGOQ8CLXa4ayV\nDArVJhrd7r3N9Qfnf6/g9Z9gu63yIXeT7HwfemLgZCQAN3ofUE8oqYttTj1S2+In\npWOfwC7/PJwxiYxhDEhq7aeE9l0Npdd6W7f959Rpr7wLq8GOwM6+GJKnGvYTJYp3\nluMGCyPcPwKBgQCDFt74COejw8s3D49Aw80SWPsan9YUgrDoPH1DtKej3cFaNGPI\nT2uuG2OyUgd8G1bsGdC8I2fLNGVdbYdvo++JFJ4KH6+Putmrf0djTo+5oXcl0A81\nxkXi1ekSy3sRVP86YnKMISygnu4etUvjDpS1kiomGcCO18AiAolXLaqTawKBgCcv\nQVG5VVY58WMdP9tlCtoLnoLCbCo4OE3OTXoFayZZwqHBUCuntyktQayJNXZCS4rr\nvwDvApYp5EKk3lOIw33NaEP0O+MGi5A6hsoitZkKQClmmNLfUotFz+rxHx6/y1U3\nAm+lVi6N3EOPX6o9z8c4A+m7ZgKAiuhiy7iS3LPBAoGAUc0G+4DWEQyMJfBbh7kY\nIpsuu9rvhc1BhPx8kxF2g5qF2Sqa6+/KhlCClVLuOenGccPxnsV3ovpWJh9fMb38\nLnGTpyj78bOJLM2NAVpMc6mpgzHtoZgkF7T8E86N4V9mvftiASdrHbvnNOQatudo\neG+cMDBazDScsFYBLC1yX1U=\n-----END PRIVATE KEY-----\n",
    client_email: "firebase-adminsdk-fbsvc@worksync-vilpower.iam.gserviceaccount.com",
    client_id: "103562695390106586283",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    universe_domain: "googleapis.com"
};

// Initialize Firebase
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

async function setupCollections() {
    console.log('Setting up Firestore collections for Meta OAuth...\n');

    try {
        // 1. Ensure meta_connections collection exists
        console.log('1. Creating meta_connections collection...');
        const connectionsRef = db.collection('meta_connections');
        
        // Add a placeholder document to ensure collection exists
        const placeholderDoc = await connectionsRef.add({
            _placeholder: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            description: 'This is a placeholder document to initialize the collection. Can be safely deleted.',
        });
        
        console.log('   ✓ meta_connections collection created');
        console.log(`   Document ID: ${placeholderDoc.id}\n`);

        // 2. Create meta_oauth_state collection with TTL
        console.log('2. Creating meta_oauth_state collection...');
        const stateRef = db.collection('meta_oauth_state');
        
        const stateDoc = await stateRef.add({
            _placeholder: true,
            state: 'placeholder_state_token',
            userId: 'placeholder_user',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromDate(new Date()),
            description: 'OAuth state tokens (auto-expires after 10 minutes)',
        });
        
        console.log('   ✓ meta_oauth_state collection created');
        console.log(`   Document ID: ${stateDoc.id}`);
        console.log('   Note: TTL must be enabled via Firebase Console:\n');
        console.log('   Steps to enable TTL:');
        console.log('   1. Go to Firebase Console > Firestore Database');
        console.log('   2. Click "Indexes" tab > "TTL" subtab');
        console.log('   3. Click "Create Index"');
        console.log('   4. Select collection: meta_oauth_state');
        console.log('   5. Select field: expiresAt');
        console.log('   6. Leave TTL checkbox CHECKED');
        console.log('   7. Create Index');
        console.log('   Documents will auto-delete 10 minutes after creation.\n');

        // 3. Create meta_audit_log collection
        console.log('3. Creating meta_audit_log collection...');
        const auditRef = db.collection('meta_audit_log');
        
        const auditDoc = await auditRef.add({
            userId: 'placeholder_user',
            action: 'setup_completed',
            details: 'Firestore collections initialized',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        console.log('   ✓ meta_audit_log collection created');
        console.log(`   Document ID: ${auditDoc.id}\n`);

        // 4. Create meta_sync_log collection
        console.log('4. Creating meta_sync_log collection...');
        const syncRef = db.collection('meta_sync_log');
        
        const syncDoc = await syncRef.add({
            userId: 'placeholder_user',
            syncedAt: admin.firestore.FieldValue.serverTimestamp(),
            followers: 0,
            description: 'Log of all Meta data syncs',
        });
        
        console.log('   ✓ meta_sync_log collection created');
        console.log(`   Document ID: ${syncDoc.id}\n`);

        // Summary
        console.log('════════════════════════════════════════════');
        console.log('✓ Firestore Setup Complete');
        console.log('════════════════════════════════════════════\n');
        console.log('Collections created:');
        console.log('  • meta_connections     - Stores active Meta account connections');
        console.log('  • meta_oauth_state     - Temporary OAuth state tokens (TTL: 10 min)');
        console.log('  • meta_audit_log       - Audit trail of all Meta operations');
        console.log('  • meta_sync_log        - Log of data sync operations\n');

        console.log('IMPORTANT: Enable TTL on meta_oauth_state:');
        console.log('  1. Go to Firebase Console > Firestore > Indexes > TTL');
        console.log('  2. Create index on meta_oauth_state.expiresAt\n');

        console.log('Next steps:');
        console.log('  1. Enable TTL on meta_oauth_state (see above)');
        console.log('  2. Delete placeholder documents from each collection');
        console.log('  3. Test OAuth flow: npm run dev\n');

        process.exit(0);
    } catch (error) {
        console.error('Error setting up collections:', error);
        process.exit(1);
    }
}

setupCollections();
