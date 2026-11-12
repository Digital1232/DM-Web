// DailyReportEmail.gs – One Desk daily report email (replaces the old "WorkSync Daily Report")
// ------------------------------------------------------------------------------------------
// Builds the report from Firebase on the server, so it looks the same whether it is sent
// by the daily trigger or by the app (POST { type: 'SEND_REPORT_EMAIL' }).
//
// What the email shows:
//   • Totals: time logged, tasks worked on, people who logged time (people on leave excluded)
//   • Team table: work time, break time and number of tasks per person
//   • Per-person detail: tasks grouped by client, with time per task
//   • Who logged no time, who is on leave, and timers left running from an earlier day
//
// Script Properties (Project Settings → Script Properties):
//   FIREBASE_DB_URL     optional, defaults to the WorkSync database
//   FIREBASE_DB_SECRET  optional, only if the database needs auth for REST reads
//   REPORT_RECIPIENTS   optional, comma-separated; overrides REPORT_DEFAULTS.recipients below
//   REPORT_HOUR         optional, hour of day (0-23, script time zone) for the daily send, default 19
//
// Setup (once):
//   1. Run listProjectTriggers() and delete the trigger that sends the old "WorkSync Daily Report".
//   2. Run sendDailyReportNow() to send a test email.
//   3. Run setupDailyReportTrigger() to schedule it every day.
// The in-app "Automatic daily reports" switch (worksync/settings/email_reports_enabled)
// still controls the scheduled send: when it is off, the trigger skips sending.

var REPORT_DEFAULTS = {
  dbUrl: 'https://worksync-vilpower-default-rtdb.firebaseio.com',
  recipients: 'vildigitalseo@gmail.com, palanivilpower@gmail.com, nanjil@vilpower.com',
  hour: 19,
  senderName: 'One Desk Reports'
};

/** Trigger handler: sends only when the in-app switch is on. */
function sendDailyReport() {
  if (!isDailyReportEnabled_()) {
    Logger.log('Automatic daily reports are switched off in the app. Not sending.');
    return;
  }
  sendDailyReportNow();
}

/** Sends today's report immediately (manual run, or from the web app). */
function sendDailyReportNow() {
  var props = PropertiesService.getScriptProperties();
  var recipients = props.getProperty('REPORT_RECIPIENTS') || REPORT_DEFAULTS.recipients;
  var report = buildDailyReport_(new Date());

  MailApp.sendEmail({
    to: recipients,
    subject: report.subject,
    htmlBody: report.html,
    body: report.text,
    name: REPORT_DEFAULTS.senderName
  });

  Logger.log('Sent "%s" to %s', report.subject, recipients);
  return { success: true, subject: report.subject, sentTo: recipients };
}

/** Builds the report without sending; run it and check the log to preview the numbers. */
function previewDailyReport() {
  var report = buildDailyReport_(new Date());
  Logger.log(report.subject);
  Logger.log(report.text);
}

/** Installs (or replaces) the daily trigger for sendDailyReport. */
function setupDailyReportTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sendDailyReport') ScriptApp.deleteTrigger(t);
  });
  var hour = parseInt(PropertiesService.getScriptProperties().getProperty('REPORT_HOUR'), 10);
  if (isNaN(hour) || hour < 0 || hour > 23) hour = REPORT_DEFAULTS.hour;

  ScriptApp.newTrigger('sendDailyReport').timeBased().everyDays(1).atHour(hour).create();
  Logger.log('Daily report trigger installed (around %s:00, %s).', hour, Session.getScriptTimeZone());
}

/** Logs every trigger in this project, to find and remove the old report sender. */
function listProjectTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  if (!triggers.length) Logger.log('No triggers in this project.');
  triggers.forEach(function (t) {
    Logger.log('%s  (%s, id %s)', t.getHandlerFunction(), t.getEventType(), t.getUniqueId());
  });
}

// ── Data ────────────────────────────────────────────────────────────────────

/**
 * Reads a Firebase path over REST.
 * Auth: FIREBASE_DB_SECRET if set; otherwise (or if the secret is rejected) the Google
 * account running the script, which needs the firebase.database scope in appsscript.json
 * and access to the Firebase project.
 */
function fbGet_(path, query) {
  var props = PropertiesService.getScriptProperties();
  var secret = (props.getProperty('FIREBASE_DB_SECRET') || '').trim();

  var resp = fbFetch_(path, query, secret ? { auth: secret } : null);
  if (resp.getResponseCode() === 401) {
    resp = fbFetch_(path, query, { access_token: ScriptApp.getOAuthToken() });
  }
  if (resp.getResponseCode() !== 200) {
    throw new Error('Firebase read failed for ' + path + ' (' + resp.getResponseCode() + '): ' +
      resp.getContentText().slice(0, 200) + ' — run checkFirebaseAccess() for details.');
  }
  return JSON.parse(resp.getContentText() || 'null');
}

function fbFetch_(path, query, auth) {
  var props = PropertiesService.getScriptProperties();
  var base = (props.getProperty('FIREBASE_DB_URL') || REPORT_DEFAULTS.dbUrl).trim().replace(/\/+$/, '');
  var params = query ? JSON.parse(JSON.stringify(query)) : {};
  if (auth) Object.keys(auth).forEach(function (k) { params[k] = auth[k]; });

  var qs = Object.keys(params).map(function (k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
  }).join('&');
  return UrlFetchApp.fetch(base + '/' + path + '.json' + (qs ? '?' + qs : ''), { muteHttpExceptions: true });
}

/** Run this to see which way of connecting to Firebase works. */
function checkFirebaseAccess() {
  var props = PropertiesService.getScriptProperties();
  var secret = (props.getProperty('FIREBASE_DB_SECRET') || '').trim();
  var path = 'worksync/settings';

  Logger.log('Database: %s', props.getProperty('FIREBASE_DB_URL') || REPORT_DEFAULTS.dbUrl);
  Logger.log('FIREBASE_DB_SECRET property: %s', secret ? 'set (' + secret.length + ' characters)' : 'NOT SET');
  if (secret) {
    Logger.log('With secret → HTTP %s', fbFetch_(path, { shallow: true }, { auth: secret }).getResponseCode());
  }
  try {
    var token = ScriptApp.getOAuthToken();
    Logger.log('With Google account (%s) → HTTP %s', Session.getEffectiveUser().getEmail(),
      fbFetch_(path, { shallow: true }, { access_token: token }).getResponseCode());
  } catch (err) {
    Logger.log('With Google account → failed: %s', err);
  }
  Logger.log('200 = works. 401 = rejected.');
}

function isDailyReportEnabled_() {
  try {
    return fbGet_('worksync/settings/email_reports_enabled') !== false;
  } catch (err) {
    Logger.log('Could not read the report switch, sending anyway: %s', err);
    return true;
  }
}

/** Today's time logs. Uses an indexed query when available, otherwise reads all logs. */
function fetchTodayLogs_(dayStart, dayEnd) {
  var raw;
  try {
    raw = fbGet_('worksync/timelogs', { orderBy: '"endTime"', startAt: dayStart });
  } catch (err) {
    raw = fbGet_('worksync/timelogs');
  }
  return Object.keys(raw || {}).map(function (k) { return raw[k]; }).filter(function (log) {
    var ts = Number((log && (log.endTime || log.startTime)) || 0);
    return ts >= dayStart && ts < dayEnd;
  });
}

/** Break seconds, break intervals, and first check-in timestamp per email for the day. */
function fetchTodayAttendance_(dayKey, dayStart, dayEnd, tz) {
  var raw;
  try {
    raw = fbGet_('worksync/attendance_events', { orderBy: '"timestamp"', startAt: dayStart - 86400000, endAt: dayEnd + 86400000 });
  } catch (err) {
    try {
      raw = fbGet_('worksync/attendance_events');
    } catch (err2) {
      Logger.log('Could not read attendance events: %s', err2);
      return { breaks: {}, breakIntervals: {}, firstCheckIns: {} };
    }
  }
  var breaks = {};
  var breakIntervals = {};
  var firstCheckIns = {};
  Object.keys(raw || {}).forEach(function (k) {
    var evt = raw[k];
    if (!evt) return;
    var date = evt.date || (evt.timestamp ? Utilities.formatDate(new Date(Number(evt.timestamp)), tz, 'yyyy-MM-dd') : '');
    if (date !== dayKey) return;
    var email = String(evt.userId || evt.email || '').toLowerCase();
    if (!email) return;

    if (evt.type === 'check_in' && evt.timestamp) {
      var ts = Number(evt.timestamp);
      if (!firstCheckIns[email] || ts < firstCheckIns[email]) {
        firstCheckIns[email] = ts;
      }
    } else if (evt.type === 'break_end' && evt.duration) {
      var dur = Math.floor(Number(evt.duration) / 1000);
      breaks[email] = (breaks[email] || 0) + dur;
      var bEnd = Number(evt.timestamp || 0);
      var bStart = bEnd - Number(evt.duration);
      if (bEnd > 0 && bStart > 0) {
        if (!breakIntervals[email]) breakIntervals[email] = [];
        breakIntervals[email].push({ start: bStart, end: bEnd });
      }
    }
  });
  return { breaks: breaks, breakIntervals: breakIntervals, firstCheckIns: firstCheckIns };
}

function fetchLeaveEmails_(dayKey) {
  var requests;
  try {
    requests = fbGet_('worksync/requests') || {};
  } catch (err) {
    Logger.log('Could not read leave requests: %s', err);
    return {};
  }
  var onLeave = {};
  Object.keys(requests).forEach(function (k) {
    var r = requests[k];
    if (!r || r.type !== 'leave') return;
    var approved = r.status === 'approved' ||
      (Array.isArray(r.approvals) && r.approvals.length > 0 &&
        r.approvals.every(function (a) { return a && a.status === 'approved'; }));
    if (!approved) return;
    var from = r.fromDate || r.date || '';
    var to = r.toDate || r.date || from;
    if (from && from <= dayKey && dayKey <= to) {
      onLeave[String(r.userId || r.userEmail || '').toLowerCase()] = true;
    }
  });
  return onLeave;
}

// ── Report ──────────────────────────────────────────────────────────────────

function buildDailyReport_(now) {
  var tz = Session.getScriptTimeZone();
  var dayKey = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
  var dayStart = Utilities.parseDate(dayKey + ' 00:00:00', tz, 'yyyy-MM-dd HH:mm:ss').getTime();
  var dayEnd = dayStart + 86400000;
  var nowTs = now.getTime();
  var dateLabel = Utilities.formatDate(now, tz, 'EEEE, d MMMM yyyy');
  var sentAt = Utilities.formatDate(now, tz, 'h:mm a');

  var usersRaw = fbGet_('worksync/users') || {};
  var logs = fetchTodayLogs_(dayStart, dayEnd);
  var onLeave = fetchLeaveEmails_(dayKey);
  var attData = fetchTodayAttendance_(dayKey, dayStart, dayEnd, tz);
  var breaks = attData.breaks;
  var breakIntervals = attData.breakIntervals;
  var firstCheckIns = attData.firstCheckIns;

  // One entry per real user
  var people = {};
  Object.keys(usersRaw).forEach(function (k) {
    var u = usersRaw[k];
    if (!u || typeof u.email !== 'string' || u.email.indexOf('@') < 0) return;
    if (u.disabled === true || u.deleted === true || u.active === false) return;
    var email = u.email.trim().toLowerCase();
    people[email] = {
      email: email,
      name: (typeof u.name === 'string' && u.name.trim()) || email,
      currentTask: u.currentTask || null,
      tasks: {},
      seconds: 0,
      breakSeconds: 0
    };
  });

  // Deduplicate and adjust any cumulative logs with identical/close startTime for the same task & user
  var sortedLogs = logs.slice().sort(function (a, b) {
    var uA = String((a && a.userId) || '').toLowerCase();
    var uB = String((b && b.userId) || '').toLowerCase();
    var uA = String((a && a.userId) || '').trim().toLowerCase();
    var uB = String((b && b.userId) || '').trim().toLowerCase();
    if (uA !== uB) return uA.localeCompare(uB);
    var tA = String((a && a.taskId) || '');
    var tB = String((b && b.taskId) || '');
    var tA = String((a && a.taskId) || '').trim().toLowerCase();
    var tB = String((b && b.taskId) || '').trim().toLowerCase();
    if (tA !== tB) return tA.localeCompare(tB);
    var sA = Number((a && a.startTime) || 0);
    var sB = Number((b && b.startTime) || 0);
    if (sA !== sB) return sA - sB;
    return Number((a && a.endTime) || 0) - Number((b && b.endTime) || 0);
  });

  var cleanLogs = [];
  var lastGroupKey = '';
  var lastRawCumSec = 0;
  var lastRawStart = 0;
  var lastRawEnd = 0;
  for (var i = 0; i < sortedLogs.length; i++) {
    var cur = sortedLogs[i];
    var prev = cleanLogs.length > 0 ? cleanLogs[cleanLogs.length - 1] : null;
    var curUser = String((cur && cur.userId) || '').toLowerCase();
    var prevUser = prev ? String((prev && prev.userId) || '').toLowerCase() : '';
    var curTask = String((cur && cur.taskId) || '');
    var prevTask = prev ? String((prev && prev.taskId) || '') : '';
    if (!cur) continue;
    // Skip break logs accidentally saved in timelogs
    var rawTaskId = String(cur.taskId || '').toLowerCase();
    var rawDesc = String(cur.taskDesc || cur.taskName || '').toLowerCase();
    if (cur.isBreak || cur.type === 'break' || rawTaskId.indexOf('break') === 0 || rawDesc === 'break') continue;

    var curUser = String(cur.userId || '').trim().toLowerCase();
    var curTask = rawTaskId.trim();
    var curStart = Number(cur.startTime || 0);
    var curSec = Number(cur.durationSeconds || 0);
    var groupKey = curUser + '|' + curTask;

    if (groupKey === lastGroupKey && Math.abs(curStart - lastRawStart) < 5000) {
      if (curSec > lastRawCumSec) {
        var segSec = curSec - lastRawCumSec;
        var segLog = JSON.parse(JSON.stringify(cur));
        segLog.startTime = lastRawEnd || curStart;
        segLog.durationSeconds = segSec;
        cleanLogs.push(segLog);
        lastRawCumSec = curSec;
        lastRawEnd = Number(cur.endTime || 0) || lastRawEnd;
      }
    } else {
      cleanLogs.push(cur);
      lastGroupKey = groupKey;
      lastRawCumSec = curSec;
      lastRawStart = curStart;
      lastRawEnd = Number(cur.endTime || 0);
    }
  }

  // ── Logged time ──────────────────────────────────────────────────────────────
  // For each user we:
  //   1. Collect every log as a [start, end] interval anchored correctly within today.
  //   2. Add the running timer (currentTask) as an additional interval.
  //   3. Sort + merge all intervals so overlapping clock time is never double-counted.
  //   4. Write the merged total back to person.seconds.
  //
  // Task-breakdown seconds are added using the GROSS per-log duration (they may sum to
  // more than the merged total when sessions overlap, which is the same behaviour that
  // tools like One Report use).
  // ── Collect today's work intervals (logged + live running), clamped to check-in ──
  var userIntervals = {}; // email → [{start, end, taskId, taskDesc, client, running}]

  cleanLogs.forEach(function (log) {
    var email = String(log.userId || '').trim().toLowerCase();
    if (!email) return;
    if (!people[email]) {
      people[email] = { email: email, name: log.userName || email, currentTask: null, tasks: {}, seconds: 0, breakSeconds: 0 };
    }

    var startTs = Number(log.startTime || 0);
    var durSec = Number(log.durationSeconds || 0);
    var endTs = Number(log.endTime || 0) || (startTs && durSec > 0 ? startTs + durSec * 1000 : 0);

    // Must have an end-time within today to place the interval
    if (!endTs || endTs <= dayStart) return;
    var clampedEnd = Math.min(endTs, dayStart + 86400000);

    // today's portion: at most durationSeconds, at most (endTs – midnight)
    var maxSec = Math.floor((clampedEnd - dayStart) / 1000);
    var todaySec;
    if (durSec > 0) {
      todaySec = Math.min(durSec, maxSec);
    } else if (startTs > 0) {
      todaySec = Math.floor((clampedEnd - Math.max(startTs, dayStart)) / 1000);
    } else {
      return;
    }
    if (todaySec <= 0) return;

    var ivEnd = clampedEnd;
    var ivStart = ivEnd - todaySec * 1000;

    // Discard overnight ghost sessions (started <= 6 AM when check-in >= 8 AM) and clamp to firstCheckIn
    var checkInTs = firstCheckIns[email];
    if (checkInTs && checkInTs > dayStart) {
      var origStart = startTs || ivStart;
      var startHour = Number(Utilities.formatDate(new Date(origStart), tz, 'H'));
      var checkInHour = Number(Utilities.formatDate(new Date(checkInTs), tz, 'H'));
      if (checkInHour >= 8 && startHour <= 6) return;
      if (ivStart < checkInTs) {
        if (ivEnd <= checkInTs) return;
        ivStart = checkInTs;
      }
    }
    if (ivEnd <= ivStart) return;

    if (!userIntervals[email]) userIntervals[email] = [];
    userIntervals[email].push({
      start: ivStart,
      end: ivEnd,
      taskId: log.taskId,
      taskDesc: log.taskDesc,
      client: log.client,
      running: false
    });
  });

  var staleTimers = [];

  // ── Running timers ───────────────────────────────────────────────────────────
  // Add the running timer as one more interval so its time is merged with the
  // already-logged intervals instead of being added on top of them.
  // Running timers (clamped to dayStart and firstCheckIns[email])
  Object.keys(people).forEach(function (email) {
    var p  = people[email];
    var ct = p.currentTask;
    if (!ct || !ct.taskId) return;
    var startedAt = Number(ct.startedAt || 0);
    if (ct.state === 'on_hold') return; // on-hold time was already logged
    if (ct.state === 'on_hold') return;

    if (startedAt && startedAt < dayStart) {
      var since = Utilities.formatDate(new Date(startedAt), tz, 'd MMM, h:mm a');
      staleTimers.push({ name: p.name, since: since, task: cleanTaskName_(ct.taskDesc, ct.client, ct.taskId) });
      return;
    }

    var checkInTs = firstCheckIns[email];
    var timerStart = Math.max(startedAt || nowTs, dayStart, (checkInTs && checkInTs > dayStart) ? checkInTs : 0);
    if (nowTs <= timerStart) return;

    if (!userIntervals[email]) userIntervals[email] = [];
    userIntervals[email].push({
      start: timerStart,
      end: nowTs,
      taskId: ct.taskId,
      taskDesc: ct.taskDesc,
      client: ct.client,
      running: true
    });
  });

  // ── Deduct breaks, remove overlaps via cursor sweep, and attribute net time per task ──
  Object.keys(people).forEach(function (email) {
    var rawBreaks = (breakIntervals[email] || []).slice().sort(function (a, b) { return a.start - b.start; });
    var mergedBreaks = [];
    rawBreaks.forEach(function (b) {
      if (!mergedBreaks.length || b.start >= mergedBreaks[mergedBreaks.length - 1].end) {
        mergedBreaks.push({ start: b.start, end: b.end });
      } else {
        mergedBreaks[mergedBreaks.length - 1].end = Math.max(mergedBreaks[mergedBreaks.length - 1].end, b.end);
      }
    });

    var netWorkSec = 0;
    var ivs = (userIntervals[email] || []).slice().sort(function (a, b) { return a.start - b.start || a.end - b.end; });
    var cursor = 0;

    ivs.forEach(function (iv) {
      var effStart = Math.max(iv.start, cursor);
      if (effStart >= iv.end) {
        // Fully overlapped by earlier interval; still mark running flag if applicable
        if (iv.running) addTaskTime_(people[email], iv.taskId, iv.taskDesc, iv.client, 0, true);
        return;
      }
      cursor = Math.max(cursor, iv.end);

      var segments = [{ start: effStart, end: iv.end }];
      mergedBreaks.forEach(function (bIv) {
        var nextSegments = [];
        segments.forEach(function (seg) {
          if (bIv.end <= seg.start || bIv.start >= seg.end) {
            nextSegments.push(seg);
          } else {
            if (bIv.start > seg.start) nextSegments.push({ start: seg.start, end: bIv.start });
            if (bIv.end < seg.end) nextSegments.push({ start: bIv.end, end: seg.end });
          }
        });
        segments = nextSegments;
      });

      var netTaskSec = 0;
      segments.forEach(function (seg) {
        netTaskSec += Math.floor((seg.end - seg.start) / 1000);
      });
      netWorkSec += netTaskSec;
      if (netTaskSec > 0 || iv.running) {
        addTaskTime_(people[email], iv.taskId, iv.taskDesc, iv.client, netTaskSec, iv.running);
      }
    });

    people[email].seconds = Math.max(0, netWorkSec);
  });

  var list = Object.keys(people).map(function (k) { return people[k]; });
  var leaveList = list.filter(function (p) { return onLeave[p.email]; });
  var available = list.filter(function (p) { return !onLeave[p.email]; });
  available.forEach(function (p) { p.breakSeconds = breaks[p.email] || 0; });
  var worked = available.filter(function (p) { return p.seconds > 0 || Object.keys(p.tasks).length > 0; });
  var noTime = available.filter(function (p) { return worked.indexOf(p) < 0; });

  worked.sort(byName_);
  worked.sort(function (a, b) { return b.seconds - a.seconds; });
  noTime.sort(byName_);
  leaveList.sort(byName_);

  var totalSeconds = worked.reduce(function (s, p) { return s + p.seconds; }, 0);
  var totalBreak = available.reduce(function (s, p) { return s + p.breakSeconds; }, 0);
  var totalTasks = worked.reduce(function (s, p) { return s + Object.keys(p.tasks).length; }, 0);

  var data = {
    dateLabel: dateLabel, sentAt: sentAt, tz: tz,
    totalSeconds: totalSeconds, totalBreak: totalBreak, totalTasks: totalTasks,
    worked: worked, noTime: noTime, leaveList: leaveList, staleTimers: staleTimers,
    availableCount: available.length
  };

  return {
    subject: 'One Desk Daily Report - ' + dateLabel,
    html: renderReportHtml_(data),
    text: renderReportText_(data)
  };
}

function addTaskTime_(person, taskId, taskDesc, client, seconds, running) {
  var idKey = String(taskId || taskDesc || 'unknown').trim().toLowerCase();
  if (!person.tasks[idKey]) {
    person.tasks[idKey] = {
      id: String(taskId || '').trim(),
      name: cleanTaskName_(taskDesc, client, taskId),
      client: (typeof client === 'string' && client.trim()) || 'Other tasks',
      seconds: 0,
      running: false
    };
  }
  person.tasks[idKey].seconds += seconds;
  person.tasks[idKey].running = person.tasks[idKey].running || running;
}

/** Task name without the "Client - " / " - Client" decoration; falls back to the ID. */
function cleanTaskName_(desc, client, taskId) {
  var name = (typeof desc === 'string' && desc.trim()) || '';
  if (name && typeof client === 'string' && client.trim()) {
    var c = client.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    name = name.replace(new RegExp('\\s*-\\s*' + c + '\\s*$', 'i'), '')
      .replace(new RegExp('^' + c + '\\s*-\\s*', 'i'), '').trim();
  }
  return name || String(taskId || 'Untitled task');
}

function byName_(a, b) { return a.name.localeCompare(b.name); }

/** 30125 → "8h 22m", 300 → "5m", 20 → "<1m" */
function fmtDuration_(seconds) {
  var s = Math.max(0, Math.round(seconds));
  var h = Math.floor(s / 3600);
  var m = Math.floor((s % 3600) / 60);
  if (h) return h + 'h ' + (m < 10 ? '0' : '') + m + 'm';
  if (m) return m + 'm';
  return s > 0 ? '<1m' : '0m';
}

function esc_(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Rendering (table layout + inline styles so it renders the same in Gmail/Outlook) ──

var C_ = {
  text: '#0f172a', muted: '#64748b', line: '#e2e8f0', soft: '#f8fafc', tile: '#f1f5f9',
  accent: '#4f46e5', green: '#047857', greenBg: '#ecfdf5', amber: '#b45309', amberBg: '#fffbeb',
  grey: '#475569', greyBg: '#f1f5f9'
};
var FONT_ = 'font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;';

function kpiTile_(label, value, note) {
  return '<td width="25%" valign="top" style="padding:0 5px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + C_.tile + ';border-radius:10px;">' +
    '<tr><td style="padding:14px 16px;">' +
    '<div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:' + C_.muted + ';font-weight:600;">' + esc_(label) + '</div>' +
    '<div style="font-size:24px;font-weight:700;color:' + C_.text + ';padding-top:4px;">' + esc_(value) + '</div>' +
    (note ? '<div style="font-size:12px;color:' + C_.muted + ';padding-top:2px;">' + esc_(note) + '</div>' : '') +
    '</td></tr></table></td>';
}

function sectionTitle_(text) {
  return '<div style="font-size:16px;font-weight:700;color:' + C_.text + ';padding:28px 0 10px;border-bottom:1px solid ' +
    C_.line + ';margin-bottom:4px;">' + esc_(text) + '</div>';
}

function renderReportHtml_(d) {
  var th = 'style="text-align:left;font-size:12px;font-weight:600;color:' + C_.muted + ';padding:10px 8px;border-bottom:1px solid ' + C_.line + ';"';
  var td = 'style="font-size:14px;color:' + C_.text + ';padding:10px 8px;border-bottom:1px solid ' + C_.line + ';vertical-align:top;"';

  var teamRows = d.worked.map(function (p) {
    return '<tr>' +
      '<td ' + td + '><strong>' + esc_(p.name) + '</strong></td>' +
      '<td ' + td + ' nowrap>' + fmtDuration_(p.seconds) + '</td>' +
      '<td ' + td + ' nowrap>' + (p.breakSeconds ? fmtDuration_(p.breakSeconds) : '<span style="color:' + C_.muted + ';">-</span>') + '</td>' +
      '<td ' + td + '>' + Object.keys(p.tasks).length + '</td>' +
      '</tr>';
  }).join('');

  var details = d.worked.map(function (p) {
    var groups = {};
    Object.keys(p.tasks).forEach(function (k) {
      var t = p.tasks[k];
      (groups[t.client] = groups[t.client] || []).push(t);
    });
    var clients = Object.keys(groups).sort();
    var body = clients.map(function (client) {
      var items = groups[client].sort(function (a, b) { return b.seconds - a.seconds; });
      var rows = items.map(function (t) {
        return '<tr>' +
          '<td style="font-size:14px;color:' + C_.text + ';padding:5px 0;">' + esc_(t.name) +
          (t.id && t.id !== t.name ? ' <span style="font-size:12px;color:' + C_.muted + ';">' + esc_(t.id) + '</span>' : '') +
          (t.running ? ' <span style="font-size:11px;color:' + C_.green + ';font-weight:600;">● running</span>' : '') +
          '</td>' +
          '<td align="right" nowrap style="font-size:14px;color:' + C_.grey + ';padding:5px 0 5px 12px;">' + fmtDuration_(t.seconds) + '</td>' +
          '</tr>';
      }).join('');
      return '<div style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:' + C_.accent +
        ';font-weight:700;padding:10px 0 2px;">' + esc_(client) + '</div>' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + rows + '</table>';
    }).join('');

    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ' + C_.line +
      ';border-radius:10px;margin-top:12px;"><tr><td style="padding:14px 16px;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' +
      '<td style="font-size:15px;font-weight:700;color:' + C_.text + ';">' + esc_(p.name) + '</td>' +
      '<td align="right" style="font-size:13px;color:' + C_.muted + ';">' + fmtDuration_(p.seconds) + ' work · ' +
      (p.breakSeconds ? fmtDuration_(p.breakSeconds) + ' break · ' : '') +
      Object.keys(p.tasks).length + ' task' + (Object.keys(p.tasks).length === 1 ? '' : 's') + '</td>' +
      '</tr></table>' + body + '</td></tr></table>';
  }).join('');

  var nameList = function (arr) { return arr.map(function (p) { return esc_(p.name); }).join(', '); };
  var extras = '';
  if (d.staleTimers.length) {
    extras += '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + C_.amberBg +
      ';border-radius:10px;margin-top:12px;"><tr><td style="padding:12px 16px;font-size:13px;color:' + C_.amber + ';">' +
      '<strong>Timers left running from an earlier day</strong> (not counted in today\'s time):<br>' +
      d.staleTimers.map(function (s) { return esc_(s.name) + ' since ' + esc_(s.since) + ' (' + esc_(s.task) + ')'; }).join('<br>') +
      '</td></tr></table>';
  }
  if (d.noTime.length) {
    extras += '<p style="font-size:14px;color:' + C_.text + ';margin:14px 0 0;"><strong>No time logged today:</strong> ' + nameList(d.noTime) + '</p>';
  }
  if (d.leaveList.length) {
    extras += '<p style="font-size:14px;color:' + C_.text + ';margin:8px 0 0;"><strong>On leave:</strong> ' + nameList(d.leaveList) + '</p>';
  }

  var teamTable = d.worked.length
    ? '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
      '<tr><th ' + th + '>Employee</th><th ' + th + '>Work time</th><th ' + th + '>Break time</th><th ' + th + '>Tasks</th></tr>' +
      teamRows + '</table>'
    : '<p style="font-size:14px;color:' + C_.muted + ';">Nobody has logged time today yet.</p>';

  return '<!doctype html><html><body style="margin:0;padding:0;background:' + C_.soft + ';">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + C_.soft + ';' + FONT_ + '">' +
    '<tr><td align="center" style="padding:24px 12px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;background:#ffffff;border-radius:14px;">' +
    '<tr><td style="padding:28px 28px 32px;' + FONT_ + '">' +
    '<div style="font-size:22px;font-weight:800;color:' + C_.text + ';">One Desk Daily Report</div>' +
    '<div style="font-size:14px;color:' + C_.muted + ';padding:4px 0 20px;">' + esc_(d.dateLabel) + ' · sent at ' + esc_(d.sentAt) + '</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 -6px;"><tr>' +
    kpiTile_('Work time', fmtDuration_(d.totalSeconds), d.worked.length ? 'avg ' + fmtDuration_(d.totalSeconds / d.worked.length) + ' per person' : '') +
    kpiTile_('Break time', fmtDuration_(d.totalBreak), d.worked.length ? 'avg ' + fmtDuration_(d.totalBreak / d.worked.length) + ' per person' : '') +
    kpiTile_('Tasks', String(d.totalTasks), '') +
    kpiTile_('People who worked', d.worked.length + ' of ' + d.availableCount,
      d.leaveList.length ? d.leaveList.length + ' on leave' : '') +
    '</tr></table>' +
    sectionTitle_('Team summary') + teamTable + extras +
    (d.worked.length ? sectionTitle_('What each person worked on') + details : '') +
    '<div style="font-size:12px;color:' + C_.muted + ';padding-top:24px;">Time includes timers still running when this email was sent. ' +
    'Times shown in ' + esc_(d.tz) + '.</div>' +
    '</td></tr></table></td></tr></table></body></html>';
}

function renderReportText_(d) {
  var lines = ['One Desk Daily Report - ' + d.dateLabel + ' (sent ' + d.sentAt + ')', '',
    'Work time: ' + fmtDuration_(d.totalSeconds),
    'Break time: ' + fmtDuration_(d.totalBreak),
    'Tasks: ' + d.totalTasks,
    'People who worked: ' + d.worked.length + ' of ' + d.availableCount, ''];
  d.worked.forEach(function (p) {
    lines.push(p.name + ' - work ' + fmtDuration_(p.seconds) + ', break ' + fmtDuration_(p.breakSeconds) +
      ', ' + Object.keys(p.tasks).length + ' tasks');
    Object.keys(p.tasks).forEach(function (k) {
      var t = p.tasks[k];
      lines.push('   [' + t.client + '] ' + t.name + ' - ' + fmtDuration_(t.seconds) + (t.running ? ' (running)' : ''));
    });
  });
  if (d.staleTimers.length) {
    lines.push('', 'Timers left running from an earlier day:');
    d.staleTimers.forEach(function (s) { lines.push('   ' + s.name + ' since ' + s.since); });
  }
  if (d.noTime.length) lines.push('', 'No time logged today: ' + d.noTime.map(function (p) { return p.name; }).join(', '));
  if (d.leaveList.length) lines.push('On leave: ' + d.leaveList.map(function (p) { return p.name; }).join(', '));
  return lines.join('\n');
}
