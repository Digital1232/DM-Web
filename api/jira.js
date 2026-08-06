const JIRA_DOMAIN = process.env.JIRA_DOMAIN || 'vilpowerdigitalmarketing.atlassian.net';

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  setCorsHeaders(res);
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    setCorsHeaders(res);
    return res.end();
  }

  if (req.method === 'GET') {
    return sendJson(res, 200, {
      success: true,
      status: 200,
      message: 'Jira proxy is live. Send POST requests to proxy Jira API calls.'
    });
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { success: false, status: 405, error: 'Method not allowed' });
  }

  const authEmail = process.env.JIRA_AUTH_EMAIL || 'digitalmarketing@vilpower.com';
  const token = process.env.JIRA_TOKEN;

  if (!token) {
    return sendJson(res, 500, {
      success: false,
      status: 500,
      error: 'Missing JIRA_TOKEN environment variable'
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const jiraUrl = body && body.jiraUrl;
    const method = (body && body.method ? body.method : 'get').toUpperCase();

    if (!jiraUrl) {
      return sendJson(res, 400, { success: false, status: 400, error: 'Missing jiraUrl' });
    }

    const target = new URL(jiraUrl);
    if (target.hostname !== JIRA_DOMAIN) {
      return sendJson(res, 400, { success: false, status: 400, error: 'Invalid Jira domain' });
    }

    const fetchOptions = {
      method,
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${authEmail}:${token}`).toString('base64'),
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    };

    if (body.payload !== undefined && body.payload !== null) {
      fetchOptions.body = typeof body.payload === 'string' ? body.payload : JSON.stringify(body.payload);
    }

    const jiraResponse = await fetch(target.toString(), fetchOptions);
    const responseText = await jiraResponse.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    return sendJson(res, 200, {
      success: jiraResponse.ok,
      status: jiraResponse.status,
      data
    });
  } catch (error) {
    return sendJson(res, 500, {
      success: false,
      status: 500,
      error: error.message
    });
  }
};
