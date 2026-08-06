/**
 * WorkSync - Jira Proxy
 *
 * Deploy this as a Google Apps Script web app when the HTML is hosted as a
 * static site and /api/jira is not available.
 *
 * Script Properties to set:
 * - JIRA_AUTH_EMAIL
 * - JIRA_TOKEN
 * - JIRA_DOMAIN, optional. Defaults to vilpowerdigitalmarketing.atlassian.net.
 *
 * Deployment:
 * 1. Go to https://script.google.com and create a new project.
 * 2. Paste this file into the editor.
 * 3. Project Settings -> Script Properties -> add the values above.
 * 4. Deploy -> New deployment -> Web app.
 * 5. Execute as: Me.
 * 6. Who has access: Anyone.
 * 7. Copy the /exec URL into index.html -> JIRA.gsUrl.
 */

function doPost(e) {
  try {
    var requestText = e && e.postData ? e.postData.contents : '';
    var body = parseJsonObject(requestText, 'request body');
    var type = body.type;

    if (type === 'PING') {
      return respond({ success: true, message: 'WorkSync Google Script is running' });
    }

    if (type === 'JIRA_PROXY') {
      return proxyJira(body);
    }

    if (type === 'LEARN_TASK_DAILY') {
      return createLearnTasks();
    }
    return respond({ success: false, error: 'Unknown request type: ' + type });
  } catch (err) {
    return respond({ success: false, error: err.toString() });
  }
}

function doGet(e) {
  return respond({ success: true, message: 'WorkSync proxy is live. Use POST requests.' });
}

function proxyJira(body) {
  var props = PropertiesService.getScriptProperties();
  var jiraUrl = body.jiraUrl;
  var method = (body.method || 'get').toLowerCase();
  var payload = body.payload;
  var auth = body.auth || getStoredBasicAuth(props);
  var allowedDomain = props.getProperty('JIRA_DOMAIN') || 'vilpowerdigitalmarketing.atlassian.net';

  if (!jiraUrl) {
    return respond({ success: false, status: 400, error: 'Missing jiraUrl in request body' });
  }

  if (!auth) {
    return respond({
      success: false,
      status: 500,
      error: 'Missing Jira credentials. Add JIRA_AUTH_EMAIL and JIRA_TOKEN in Apps Script Project Settings -> Script Properties.'
    });
  }

  var targetHost = getHostname(jiraUrl);
  if (targetHost !== allowedDomain) {
    return respond({ success: false, status: 400, error: 'Invalid Jira domain: ' + targetHost });
  }

  var options = {
    method: method,
    headers: {
      Authorization: 'Basic ' + auth,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };

  if (payload !== undefined && payload !== null) {
    options.payload = typeof payload === 'string' ? payload : JSON.stringify(payload);
  }

  var response = UrlFetchApp.fetch(jiraUrl, options);
  var statusCode = response.getResponseCode();
  var responseText = response.getContentText();
  var data;

  try {
    data = parseJsonObject(responseText, 'Jira response');
  } catch (parseErr) {
    data = { raw: responseText };
  }

  return respond({
    success: statusCode >= 200 && statusCode < 300,
    status: statusCode,
    data: data
  });
}

function getStoredBasicAuth(props) {
  var email = props.getProperty('JIRA_AUTH_EMAIL');
  var token = props.getProperty('JIRA_TOKEN');
  if (!email || !token) return '';
  return Utilities.base64Encode(email + ':' + token);
}

function parseJsonObject(text, label) {
  try {
    return JSON.parse(text || '{}');
  } catch (err) {
    throw new Error('Invalid JSON in ' + label + ': ' + String(text).slice(0, 120));
  }
}

function getHostname(url) {
  var match = String(url).match(/^https?:\/\/([^\/?#]+)/i);
  return match ? match[1].toLowerCase() : '';
}

function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
