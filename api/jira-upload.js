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
    let body;
    if (typeof req.body === 'string') {
      body = JSON.parse(req.body);
    } else if (req.body && typeof req.body === 'object') {
      body = req.body;
    } else {
      // Parse raw stream if req.body is not pre-parsed
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      const rawText = Buffer.concat(buffers).toString('utf-8');
      body = JSON.parse(rawText);
    }

    const { issueKey, fileName, fileData } = body || {};

    if (!issueKey || !fileName || !fileData) {
      return sendJson(res, 400, {
        success: false,
        status: 400,
        error: 'Missing required parameters: issueKey, fileName, or fileData'
      });
    }

    // Extract base64 content
    let base64Content = fileData;
    if (fileData.includes(';base64,')) {
      base64Content = fileData.split(';base64,')[1];
    }
    const fileBuffer = Buffer.from(base64Content, 'base64');

    // Build multipart/form-data body
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const postDataHeader = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`;
    const postDataFooter = `\r\n--${boundary}--\r\n`;

    const postData = Buffer.concat([
      Buffer.from(postDataHeader, 'utf-8'),
      fileBuffer,
      Buffer.from(postDataFooter, 'utf-8')
    ]);

    const targetUrl = `https://${JIRA_DOMAIN}/rest/api/2/issue/${encodeURIComponent(issueKey)}/attachments`;

    const jiraResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${authEmail}:${token}`).toString('base64'),
        'X-Atlassian-Token': 'no-check',
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': postData.length.toString()
      },
      body: postData
    });

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
