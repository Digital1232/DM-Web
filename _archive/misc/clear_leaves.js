// Script to clear all leave requests from Firebase
const https = require('https');

const DATABASE_URL = 'https://worksync-vilpower-default-rtdb.firebaseio.com';

async function fetchRequest(url, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const result = body ? JSON.parse(body) : null;
                    resolve({ status: res.statusCode, data: result });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function clearAllLeaves() {
    try {
        console.log('🔄 Fetching all requests...');
        
        // Get all requests
        const requestsUrl = `${DATABASE_URL}/worksync/requests.json`;
        const response = await fetchRequest(requestsUrl);
        
        console.log(`Response status: ${response.status}`);
        console.log(`Response data:`, response.data);
        
        if (response.status !== 200 || !response.data) {
            console.log('❌ Failed to fetch requests or no requests found');
            return;
        }
        
        const requests = response.data;
        const leaveIds = Object.entries(requests)
            .filter(([id, data]) => data.type === 'leave')
            .map(([id]) => id);
        
        if (leaveIds.length === 0) {
            console.log('✅ No leave requests found to delete');
            return;
        }
        
        console.log(`📋 Found ${leaveIds.length} leave request(s) to delete`);
        
        // Delete each leave request
        let deleted = 0;
        for (const id of leaveIds) {
            try {
                const deleteUrl = `${DATABASE_URL}/worksync/requests/${id}.json`;
                const deleteResponse = await fetchRequest(deleteUrl, 'DELETE');
                
                if (deleteResponse.status === 200) {
                    console.log(`✅ Deleted: ${id}`);
                    deleted++;
                } else {
                    console.log(`❌ Failed to delete ${id}: ${deleteResponse.status}`);
                }
            } catch (err) {
                console.log(`❌ Error deleting ${id}:`, err.message);
            }
        }
        
        console.log(`\n✅ Successfully deleted ${deleted}/${leaveIds.length} leave request(s)`);
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

clearAllLeaves();
