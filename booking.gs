/**
 * SSS Booking — Google Apps Script backend
 *
 * Endpoints (Web App):
 *   GET  ?action=availability&start=YYYY-MM-DD&end=YYYY-MM-DD&tz=America/Montreal
 *        → { tz, slots: { "YYYY-MM-DD": ["09:00","09:30",...] } }
 *   GET  ?action=ping
 *        → { ok:true }
 *   GET  ?action=debug_events&start=YYYY-MM-DD&end=YYYY-MM-DD
 *        → { events: [{startIso, endIso, allDay, myStatus, blocking}, ...] }
 *          (No event titles are exposed — only metadata. Useful to diagnose
 *           "every slot reports slot_taken" by seeing what's on the calendar.)
 *   POST { action:"book", name, email, phone?, clinic?, notes?, date, slot, tz, duration, lang }
 *        → { ok:true, eventId, summary, googleLink }
 *        or { error:"slot_taken" | "missing_fields" | "invalid_email" | ... }
 *
 * Setup (one-time):
 *   1. Open https://script.google.com → New project, paste this file.
 *   2. Project Settings → set Time zone to America/Montreal (or your business zone).
 *   3. (Optional) Services → "+" → enable "Calendar API" if you want Google Meet
 *      links to be auto-created. Without it, events are still created and emailed.
 *   4. Deploy → New deployment → Type: Web app
 *        - Description: SSS Booking
 *        - Execute as: Me (your @sss.marketing or owning Google account)
 *        - Who has access: Anyone
 *      Copy the resulting /exec URL.
 *   5. Paste that URL into index.html on #bookerHost:
 *        data-booking-api="https://script.google.com/macros/s/AKfyc.../exec"
 *   6. Visit /exec?action=ping in a browser to confirm it returns {"ok":true}.
 *   7. If you change CONFIG, redeploy: Deploy → Manage deployments → pencil →
 *      Version: New version → Deploy. The /exec URL stays the same.
 */

const CONFIG = {
  // 'primary' uses the deploying account's primary calendar.
  // Otherwise set the calendar's email/id, e.g. "info@sss.marketing".
  CALENDAR_ID: 'primary',

  TIMEZONE: 'America/Montreal',

  // Per-day-of-week working hours (0=Sun..6=Sat). Mirrors the homepage UI.
  // { start, end } are 24h hour numbers; end is exclusive of the last slot's end.
  // e.g. start:11, end:15 → slots 11:00, 11:30, 12:00, 12:30, 13:00, 13:30, 14:00, 14:30.
  WORKING_HOURS_BY_DOW: {
    0: { start: 11, end: 15 },   // Sun
    1: { start: 12, end: 14 },   // Mon
    2: { start: 12, end: 14 },   // Tue
    3: { start: 12, end: 14 },   // Wed
    4: { start: 10, end: 17 },   // Thu
    5: { start: 10, end: 17 },   // Fri
    6: { start: 11, end: 15 },   // Sat
  },
  WORKING_DAYS: [0, 1, 2, 3, 4, 5, 6],

  // Slot cadence and audit duration.
  SLOT_MINUTES:     30,
  DURATION_MINUTES: 30,

  // Booking guardrails.
  ADVANCE_NOTICE_HOURS: 2,
  MAX_ADVANCE_DAYS:     45,

  // Calendar event template.
  EVENT_SUMMARY: 'SSS Audit \u00B7 {name}',
  EVENT_LOCATION: 'Google Meet',
  REMINDERS_MINUTES: [10, 60 * 24],               // 10 min + 24 h before

  // Confirmation email.
  CONFIRMATION_SUBJECT_FR: 'Audit SSS \u00B7 Confirmation',
  CONFIRMATION_SUBJECT_EN: 'SSS Audit \u00B7 Confirmation',
  REPLY_TO: 'info@sss.marketing',
  ORG_NAME: 'SSS Marketing',
  ORG_SIGNATURE_FR: 'Hamza \u00B7 SSS Marketing',
  ORG_SIGNATURE_EN: 'Hamza \u00B7 SSS Marketing',

  // Set true to also email yourself an internal copy of every booking.
  NOTIFY_INTERNAL: true,
  INTERNAL_NOTIFY_TO: 'info@sss.marketing',

  // Set true to attempt Google Meet creation via Advanced Calendar API.
  // Requires enabling the Calendar API service in the Apps Script project.
  CREATE_MEET_LINK: true,
};

/* ────────────────── HTTP handlers ────────────────── */

function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = String(params.action || '').toLowerCase();
  try {
    if (action === 'availability') {
      const slots = getAvailability_(params.start, params.end);
      return jsonOut_({ tz: CONFIG.TIMEZONE, slots: slots });
    }
    if (action === 'ping') {
      return jsonOut_({ ok: true, tz: CONFIG.TIMEZONE, duration: CONFIG.DURATION_MINUTES });
    }
    if (action === 'debug_events') {
      return jsonOut_(debugEvents_(params.start, params.end));
    }
    return jsonOut_({ error: 'unknown_action', action: action });
  } catch (err) {
    Logger.log('doGet error: ' + (err && err.stack || err));
    return jsonOut_({ error: 'server_error', detail: String(err) });
  }
}

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) || '{}';
    const body = JSON.parse(raw);
    const action = String(body.action || '').toLowerCase();
    Logger.log('doPost action=' + action + ' from=' + (body.email || '(no email)'));
    if (action === 'book') return jsonOut_(book_(body));
    return jsonOut_({ error: 'unknown_action', action: action });
  } catch (err) {
    Logger.log('doPost error: ' + (err && err.stack || err));
    return jsonOut_({ error: 'server_error', detail: String(err) });
  }
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ────────────────── Availability ────────────────── */

/**
 * Returns the events on `cal` between [start, end) that should BLOCK a slot.
 *
 * This is the single source of truth for "is the calendar busy". Both
 * getAvailability_ (which decides what shows up as free in the UI) and book_
 * (which decides whether to accept a booking) MUST go through this. If these
 * two paths ever disagree, the UI will show a slot as free and submitting it
 * will fail with slot_taken — exactly the bug we hit in production.
 *
 * Filter rules:
 *   - All-day events do NOT block. Google adds many automatic all-day events
 *     to a calendar (Working Location, Birthday, Tasks, Out-of-office in
 *     some configurations) that would otherwise lock out every slot in a day.
 *     If a full-day block is intended, the operator should remove the day
 *     from WORKING_DAYS or temporarily shrink WORKING_HOURS_BY_DOW.
 *   - Events the deploying user has declined do NOT block. They've said no
 *     to that meeting, so they're effectively free at that time.
 */
function listBusyEvents_(cal, rangeStart, rangeEnd) {
  const NO_STATUS = (CalendarApp.GuestStatus && CalendarApp.GuestStatus.NO) || null;
  return cal.getEvents(rangeStart, rangeEnd).filter(function(ev){
    try { if (ev.isAllDayEvent()) return false; } catch (_) {}
    try {
      if (NO_STATUS && typeof ev.getMyStatus === 'function') {
        if (ev.getMyStatus() === NO_STATUS) return false;
      }
    } catch (_) { /* getMyStatus throws on non-attendable events; ignore */ }
    return true;
  });
}

function getAvailability_(startStr, endStr) {
  if (!isYmd_(startStr) || !isYmd_(endStr)) return {};

  const tz = CONFIG.TIMEZONE;
  const cal = resolveCalendar_();
  if (!cal) return {};

  const now = new Date();
  const earliest = new Date(now.getTime() + CONFIG.ADVANCE_NOTICE_HOURS * 3600 * 1000);
  const latest   = new Date(now.getTime() + CONFIG.MAX_ADVANCE_DAYS * 86400 * 1000);

  const rangeStart = parseTzDate_(startStr, '00:00', tz);
  let   rangeEnd   = parseTzDate_(endStr,   '23:59', tz);
  if (rangeEnd > latest) rangeEnd = latest;
  if (rangeStart > rangeEnd) return {};

  const events = listBusyEvents_(cal, rangeStart, rangeEnd);

  const result = {};

  // Walk each day in the range (in business tz).
  let cursorYmd = startStr;
  while (cursorYmd <= endStr) {
    const dayDate = parseTzDate_(cursorYmd, '12:00', tz); // midday avoids DST edges
    if (dayDate > latest) break;

    const dow = Number(Utilities.formatDate(dayDate, tz, 'u')) % 7; // 0=Sun..6=Sat
    const hours = CONFIG.WORKING_HOURS_BY_DOW && CONFIG.WORKING_HOURS_BY_DOW[dow];
    if (CONFIG.WORKING_DAYS.indexOf(dow) !== -1 && hours) {
      const slots = [];
      const startMin = hours.start * 60;
      const endMin   = hours.end   * 60;
      for (let mins = startMin; mins + CONFIG.DURATION_MINUTES <= endMin; mins += CONFIG.SLOT_MINUTES) {
        const h = Math.floor(mins / 60), m = mins % 60;
        const slotStr = pad2_(h) + ':' + pad2_(m);
        const slotStart = parseTzDate_(cursorYmd, slotStr, tz);
        const slotEnd   = new Date(slotStart.getTime() + CONFIG.DURATION_MINUTES * 60 * 1000);
        if (slotStart < earliest) continue;
        if (slotStart > latest) break;
        if (overlaps_(events, slotStart, slotEnd)) continue;
        slots.push(slotStr);
      }
      if (slots.length) result[cursorYmd] = slots;
    }
    cursorYmd = addOneDay_(cursorYmd);
  }
  return result;
}

function overlaps_(events, start, end) {
  for (let i = 0; i < events.length; i++) {
    const evS = events[i].getStartTime();
    const evE = events[i].getEndTime();
    if (start < evE && end > evS) return true;
  }
  return false;
}

/**
 * Returns the FIRST blocking event that overlaps [start, end), or null.
 * Used by book_ to log a diagnostic before returning slot_taken.
 */
function firstOverlap_(events, start, end) {
  for (let i = 0; i < events.length; i++) {
    const evS = events[i].getStartTime();
    const evE = events[i].getEndTime();
    if (start < evE && end > evS) return events[i];
  }
  return null;
}

/**
 * Diagnostic endpoint: returns event metadata (no titles) so operators can
 * see what's on the calendar without leaking content. Safe to expose.
 */
function debugEvents_(startStr, endStr) {
  if (!isYmd_(startStr) || !isYmd_(endStr)) return { error: 'invalid_range' };
  const tz = CONFIG.TIMEZONE;
  const cal = resolveCalendar_();
  if (!cal) return { error: 'no_calendar' };
  const rangeStart = parseTzDate_(startStr, '00:00', tz);
  const rangeEnd   = parseTzDate_(endStr,   '23:59', tz);
  const all = cal.getEvents(rangeStart, rangeEnd);
  const NO_STATUS = (CalendarApp.GuestStatus && CalendarApp.GuestStatus.NO) || null;
  const out = all.map(function(ev){
    let allDay = false, myStatus = null;
    try { allDay = ev.isAllDayEvent(); } catch (_) {}
    try { myStatus = (ev.getMyStatus && ev.getMyStatus().toString()) || null; } catch (_) {}
    const blocking = !allDay && !(NO_STATUS && myStatus === NO_STATUS.toString());
    return {
      startIso: ev.getStartTime().toISOString(),
      endIso:   ev.getEndTime().toISOString(),
      allDay:   allDay,
      myStatus: myStatus,
      blocking: blocking,
    };
  });
  return {
    tz: tz,
    range: { start: startStr, end: endStr },
    total: out.length,
    blocking: out.filter(function(e){ return e.blocking; }).length,
    events: out,
  };
}

/* ────────────────── Booking ────────────────── */

function book_(body) {
  const tz = CONFIG.TIMEZONE;
  const name   = String(body.name   || '').trim();
  const email  = String(body.email  || '').trim();
  const phone  = String(body.phone  || '').trim();
  const clinic = String(body.clinic || '').trim();
  const notes  = String(body.notes  || '').trim();
  const dateS  = String(body.date   || '').trim();
  const slotS  = String(body.slot   || '').trim();
  const lang   = body.lang === 'en' ? 'en' : 'fr';
  const duration = Math.max(5, Math.min(120, parseInt(body.duration || CONFIG.DURATION_MINUTES, 10)));

  if (!name || !email || !dateS || !slotS) return { error: 'missing_fields' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'invalid_email' };
  if (!isYmd_(dateS))                            return { error: 'invalid_date' };
  if (!/^\d{2}:\d{2}$/.test(slotS))              return { error: 'invalid_slot' };

  const cal = resolveCalendar_();
  if (!cal) return { error: 'no_calendar' };

  const start = parseTzDate_(dateS, slotS, tz);
  const end   = new Date(start.getTime() + duration * 60 * 1000);

  const now = new Date();
  if (start < new Date(now.getTime() + 30 * 60 * 1000)) return { error: 'too_soon' };
  if (start > new Date(now.getTime() + CONFIG.MAX_ADVANCE_DAYS * 86400 * 1000)) return { error: 'too_far' };

  // Use a script lock so two simultaneous bookings can't race for the same slot.
  const lock = LockService.getScriptLock();
  try { lock.waitLock(8000); } catch (_) { return { error: 'busy' }; }

  let event, summary, googleLink;
  try {
    // Use the SAME filter as availability so the two paths never disagree.
    // If they ever do, a slot will look free in the UI but every booking
    // attempt will fail with slot_taken — the production bug we just fixed.
    const busy = listBusyEvents_(cal, start, end);
    const blocker = firstOverlap_(busy, start, end);
    if (blocker) {
      Logger.log('slot_taken at ' + start.toISOString() +
                 ' blocked by event ' + blocker.getStartTime().toISOString() +
                 '..' + blocker.getEndTime().toISOString() +
                 ' (allDay=' + blocker.isAllDayEvent() + ')');
      return { error: 'slot_taken' };
    }

    summary = CONFIG.EVENT_SUMMARY.replace('{name}', name);
    const description = buildDescription_({ name, email, phone, clinic, notes, lang });

    // Try advanced Calendar API for a Meet link; fall back to simple event.
    event = createEventWithMeet_(cal, summary, start, end, description, email);

    // Reminders.
    try {
      event.removeAllReminders();
      CONFIG.REMINDERS_MINUTES.forEach(function(m){ event.addPopupReminder(m); });
    } catch (_) { /* ignore */ }

    googleLink = buildAddToCalendarUrl_(summary, start, end, description);
  } finally {
    lock.releaseLock();
  }

  Logger.log('Event created id=' + event.getId() + ' for ' + email + ' at ' + start.toISOString());

  // Confirmation email to the lead (non-fatal; logged on failure).
  let leadEmailOk = false;
  try {
    MailApp.sendEmail({
      to: email,
      replyTo: CONFIG.REPLY_TO,
      name: CONFIG.ORG_NAME,
      subject: lang === 'en' ? CONFIG.CONFIRMATION_SUBJECT_EN : CONFIG.CONFIRMATION_SUBJECT_FR,
      htmlBody: buildConfirmationHtml_({ name, email, phone, clinic, notes, start, end, lang, googleLink }),
    });
    leadEmailOk = true;
  } catch (e) {
    Logger.log('Lead email failed: ' + (e && e.stack || e));
  }

  // Internal notification (non-fatal; logged on failure).
  let internalEmailOk = false;
  if (CONFIG.NOTIFY_INTERNAL && CONFIG.INTERNAL_NOTIFY_TO) {
    try {
      MailApp.sendEmail({
        to: CONFIG.INTERNAL_NOTIFY_TO,
        subject: 'New audit booking \u00B7 ' + name + ' \u00B7 ' + formatWhen_(start, 'en'),
        htmlBody: buildInternalHtml_({ name, email, phone, clinic, notes, start, end }),
      });
      internalEmailOk = true;
    } catch (e) {
      Logger.log('Internal email failed: ' + (e && e.stack || e));
    }
  }

  return {
    ok: true,
    eventId: event.getId(),
    summary: formatWhen_(start, lang) + ' \u00B7 ' + duration + ' min',
    googleLink: googleLink,
    emailLead: leadEmailOk,
    emailInternal: internalEmailOk,
  };
}

/* ────────────────── Event creation helpers ────────────────── */

function resolveCalendar_() {
  const id = CONFIG.CALENDAR_ID;
  if (!id || id === 'primary') return CalendarApp.getDefaultCalendar();
  const cal = CalendarApp.getCalendarById(id);
  return cal || CalendarApp.getDefaultCalendar();
}

function createEventWithMeet_(cal, summary, start, end, description, guestEmail) {
  // Advanced Calendar API path (creates a Google Meet link).
  if (CONFIG.CREATE_MEET_LINK && typeof Calendar !== 'undefined' && Calendar && Calendar.Events) {
    try {
      const calId = cal.getId();
      const inserted = Calendar.Events.insert({
        summary: summary,
        description: description,
        location: CONFIG.EVENT_LOCATION,
        start: { dateTime: start.toISOString(), timeZone: CONFIG.TIMEZONE },
        end:   { dateTime: end.toISOString(),   timeZone: CONFIG.TIMEZONE },
        attendees: [{ email: guestEmail }],
        conferenceData: {
          createRequest: {
            requestId: 'sss-' + Date.now() + '-' + Math.random().toString(36).slice(2,9),
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        },
        reminders: { useDefault: false, overrides: CONFIG.REMINDERS_MINUTES.map(function(m){ return { method:'popup', minutes:m }; }) }
      }, calId, { conferenceDataVersion: 1, sendUpdates: 'all' });
      return cal.getEventById(inserted.id);
    } catch (e) {
      // Fall through to simple creation
    }
  }
  // Simple path.
  const ev = cal.createEvent(summary, start, end, {
    description: description,
    location: CONFIG.EVENT_LOCATION,
    guests: guestEmail,
    sendInvites: true,
  });
  return ev;
}

/* ────────────────── Templates ────────────────── */

function buildDescription_(c) {
  const lines = [
    c.lang === 'en' ? 'Free 15-minute SSS audit.' : 'Audit SSS gratuit \u00B7 15 minutes.',
    '',
    'Name:  ' + c.name,
    'Email: ' + c.email,
  ];
  if (c.phone)  lines.push('Phone: ' + c.phone);
  if (c.clinic) lines.push('Clinic: ' + c.clinic);
  if (c.notes)  lines.push('', 'Notes:', c.notes);
  return lines.join('\n');
}

function buildConfirmationHtml_(c) {
  const tz = CONFIG.TIMEZONE;
  const whenLong = formatWhenLong_(c.start, c.lang);
  const t = c.lang === 'en' ? {
    title: 'Audit confirmed',
    hi:    'Hi ' + c.name + ',',
    body:  'Your free 15-minute audit is on the books. Hamza will reach you at the scheduled time.',
    when:  'When',
    tz:    'Timezone',
    add:   'Add to Google Calendar',
    note:  'Need to reschedule? Just reply to this email.',
    sig:   CONFIG.ORG_SIGNATURE_EN,
  } : {
    title: 'Audit confirm\u00E9',
    hi:    'Bonjour ' + c.name + ',',
    body:  'Votre audit gratuit de 15 minutes est confirm\u00E9. Hamza vous rejoindra \u00E0 l\'heure pr\u00E9vue.',
    when:  'Quand',
    tz:    'Fuseau',
    add:   'Ajouter \u00E0 Google Calendar',
    note:  'Besoin de reprogrammer ? R\u00E9pondez simplement \u00E0 cet email.',
    sig:   CONFIG.ORG_SIGNATURE_FR,
  };
  return ''
    + '<div style="font-family:Helvetica,Arial,sans-serif;color:#1c1812;line-height:1.65;max-width:560px">'
    +   '<div style="border-bottom:1px solid #d4a373;padding-bottom:14px;margin-bottom:20px">'
    +     '<div style="font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#d4a373">SSS Marketing</div>'
    +     '<h2 style="font-family:Georgia,serif;font-weight:500;font-size:26px;margin:8px 0 0;color:#1c1812">'+esc_(t.title)+'</h2>'
    +   '</div>'
    +   '<p>'+esc_(t.hi)+'</p>'
    +   '<p>'+esc_(t.body)+'</p>'
    +   '<table style="border-collapse:collapse;margin:18px 0">'
    +     '<tr><td style="padding:6px 18px 6px 0;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#d4a373">'+esc_(t.when)+'</td>'
    +         '<td style="padding:6px 0;color:#1c1812"><strong>'+esc_(whenLong)+'</strong></td></tr>'
    +     '<tr><td style="padding:6px 18px 6px 0;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#d4a373">'+esc_(t.tz)+'</td>'
    +         '<td style="padding:6px 0;color:#1c1812">'+esc_(tz)+'</td></tr>'
    +   '</table>'
    +   (c.googleLink
        ? '<p><a href="'+esc_(c.googleLink)+'" style="display:inline-block;padding:12px 22px;background:#1c1812;color:#fefae0;text-decoration:none;font-size:12px;letter-spacing:.18em;text-transform:uppercase">'+esc_(t.add)+'</a></p>'
        : '')
    +   '<p style="color:#666;font-size:13px">'+esc_(t.note)+'</p>'
    +   '<p style="margin-top:28px">\u2014<br>'+esc_(t.sig)+'</p>'
    + '</div>';
}

function buildInternalHtml_(c) {
  const whenLong = formatWhenLong_(c.start, 'en');
  return ''
    + '<div style="font-family:Helvetica,Arial,sans-serif;color:#1c1812;line-height:1.6">'
    +   '<h3 style="font-family:Georgia,serif;margin:0 0 12px">New audit booking</h3>'
    +   '<p><strong>'+esc_(whenLong)+'</strong> ('+esc_(CONFIG.TIMEZONE)+')</p>'
    +   '<table style="border-collapse:collapse">'
    +     row_('Name',   c.name)
    +     row_('Email',  c.email)
    +     row_('Phone',  c.phone || '\u2014')
    +     row_('Clinic', c.clinic || '\u2014')
    +   '</table>'
    +   (c.notes ? '<p style="margin-top:14px"><em>Notes:</em><br>'+esc_(c.notes).replace(/\n/g,'<br>')+'</p>' : '')
    + '</div>';
}

function row_(label, val) {
  return '<tr><td style="padding:4px 16px 4px 0;color:#888;font-size:12px">'+esc_(label)+'</td>'
       + '<td style="padding:4px 0;color:#1c1812">'+esc_(val)+'</td></tr>';
}

function buildAddToCalendarUrl_(summary, start, end, description) {
  const fmt = function(d){ return Utilities.formatDate(d, 'UTC', "yyyyMMdd'T'HHmmss'Z'"); };
  return 'https://calendar.google.com/calendar/r/eventedit'
    + '?text='    + encodeURIComponent(summary)
    + '&dates='   + fmt(start) + '/' + fmt(end)
    + '&details=' + encodeURIComponent(description)
    + '&location=' + encodeURIComponent(CONFIG.EVENT_LOCATION)
    + '&ctz='     + encodeURIComponent(CONFIG.TIMEZONE);
}

/* ────────────────── Date utilities ────────────────── */

function pad2_(n)   { return n < 10 ? '0' + n : '' + n; }
function isYmd_(s)  { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s); }

// Parse "YYYY-MM-DD" + "HH:MM" in the given timezone → JS Date (UTC moment).
function parseTzDate_(dateStr, timeStr, tz) {
  return Utilities.parseDate(dateStr + ' ' + timeStr + ':00', tz, 'yyyy-MM-dd HH:mm:ss');
}

function addOneDay_(ymdStr) {
  const p = ymdStr.split('-').map(Number);
  const d = new Date(p[0], p[1]-1, p[2]+1);
  return d.getFullYear()+'-'+pad2_(d.getMonth()+1)+'-'+pad2_(d.getDate());
}

function formatWhen_(d, lang) {
  const tz = CONFIG.TIMEZONE;
  // FR: "jeu. 10 déc. · 14:00"   EN: "Thu Dec 10 · 2:00 PM"
  return lang === 'en'
    ? Utilities.formatDate(d, tz, "EEE MMM d \u00B7 HH:mm")
    : Utilities.formatDate(d, tz, "EEE d MMM \u00B7 HH:mm");
}
function formatWhenLong_(d, lang) {
  const tz = CONFIG.TIMEZONE;
  return lang === 'en'
    ? Utilities.formatDate(d, tz, "EEEE, MMMM d, yyyy \u00B7 HH:mm")
    : Utilities.formatDate(d, tz, "EEEE d MMMM yyyy \u00B7 HH:mm");
}

function esc_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
