const fs = require('fs');
const path = require('path');

// Load .env file manually
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const authEmail = env.JIRA_AUTH_EMAIL || 'digitalmarketing@vilpower.com';
const token = env.JIRA_TOKEN;
const domain = env.JIRA_DOMAIN || 'vilpowerdigitalmarketing.atlassian.net';

if (!token) {
  console.error('Error: JIRA_TOKEN is missing in .env file');
  process.exit(1);
}

const authHeader = 'Basic ' + Buffer.from(`${authEmail}:${token}`).toString('base64');

async function apiRequest(endpoint) {
  const url = `https://${domain}${endpoint}`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`Error querying ${endpoint}:`, err.message);
    return null;
  }
}

async function main() {
  console.log('=== JIRA API DIAGNOSTIC (SMA & SOURCE) ===');
  
  // Query recent issues in SMA
  console.log(`\nQuerying recent issues in project "SMA"...`);
  const smaRes = await apiRequest(`/rest/api/3/search/jql?jql=${encodeURIComponent('project = "SMA" ORDER BY updated DESC')}&maxResults=5&fields=summary,status,assignee,updated`);
  if (smaRes && smaRes.issues) {
    console.log(`Found ${smaRes.total} issue(s) in SMA. Top 5:`);
    smaRes.issues.forEach(issue => {
      const assignee = issue.fields.assignee ? issue.fields.assignee.displayName : 'Unassigned';
      console.log(`- [${issue.key}] ${issue.fields.summary} | Status: ${issue.fields.status.name} | Assignee: ${assignee} (Updated: ${issue.fields.updated})`);
    });
  } else {
    console.log('Failed to fetch issues in project "SMA".');
  }

  // Query recent issues in SOURCE
  console.log(`\nQuerying recent issues in project "SOURCE"...`);
  const sourceRes = await apiRequest(`/rest/api/3/search/jql?jql=${encodeURIComponent('project = "SOURCE" ORDER BY updated DESC')}&maxResults=5&fields=summary,status,assignee,updated`);
  if (sourceRes && sourceRes.issues) {
    console.log(`Found ${sourceRes.total} issue(s) in SOURCE. Top 5:`);
    sourceRes.issues.forEach(issue => {
      const assignee = issue.fields.assignee ? issue.fields.assignee.displayName : 'Unassigned';
      console.log(`- [${issue.key}] ${issue.fields.summary} | Status: ${issue.fields.status.name} | Assignee: ${assignee} (Updated: ${issue.fields.updated})`);
    });
  } else {
    console.log('Failed to fetch issues in project "SOURCE".');
  }
}

main();
