/* Reminder logic, shared by the page and the service worker.
 *
 * Loaded in the page with a <script> tag and in sw.js with importScripts, so it
 * must stay free of any DOM or window reference. Pure functions only.
 *
 * Two shapes come out of the same deadlines:
 *   build()  one entry per deadline per lead time, for notifications.
 *   ics()    one calendar event per deadline with the leads as alarms.
 */
(function (root) {
  'use strict';

  var DEFAULTS = { enabled: false, leadDays: [7, 1], hour: 9 };
  var TAG_PREFIX = 'hol:';

  function parseDate(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    var p = iso.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function money(amount, currency) {
    try {
      return new Intl.NumberFormat('en-GB', {
        style: 'currency', currency: currency || 'GBP', minimumFractionDigits: 2
      }).format(Number(amount) || 0).replace(/\.00$/, '');
    } catch (e) {
      return (currency || 'GBP') + ' ' + (Number(amount) || 0).toFixed(2);
    }
  }

  function shortDate(iso) {
    var d = parseDate(iso);
    if (!d) return '';
    try { return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
    catch (e) { return iso; }
  }

  function fireTime(dueISO, lead, hour) {
    var d = parseDate(dueISO);
    if (!d) return null;
    d.setDate(d.getDate() - lead);
    d.setHours(hour, 0, 0, 0);
    return d.getTime();
  }

  function whenPhrase(lead) {
    if (lead === 0) return 'today';
    if (lead === 1) return 'tomorrow';
    return 'in ' + lead + ' days';
  }

  function config(state) {
    var stored = (state && state.settings && state.settings.notifications) || {};
    var leads = stored.leadDays;
    if (!leads || !leads.length) leads = DEFAULTS.leadDays;

    leads = leads.map(Number).filter(function (n) {
      return !isNaN(n) && n >= 0 && n <= 365;
    }).sort(function (a, b) { return b - a; });

    var hour = Number(stored.hour);
    if (isNaN(hour) || hour < 0 || hour > 23) hour = DEFAULTS.hour;

    return { enabled: !!stored.enabled, leadDays: leads, hour: hour };
  }

  function paidTotal(item) {
    return (item.payments || []).reduce(function (sum, p) {
      return p.paidOn ? sum + (Number(p.amount) || 0) : sum;
    }, 0);
  }

  /* Every dated thing, including the ones already dealt with, each flagged.
     Reminders only want the outstanding ones, but a calendar needs to be told
     when something is finished: an entry that merely stops appearing in an
     export leaves the old one sitting in the calendar looking actionable. */
  function allDeadlines(state) {
    var out = [];

    (state.trips || []).forEach(function (trip) {
      (trip.items || []).forEach(function (item) {
        var muted = !!item.muted;

        function add(d) {
          d.trip = trip;
          d.item = item;
          if (muted && !d.done) { d.done = true; d.doneReason = 'muted'; }
          out.push(d);
        }

        if (item.bookBy) {
          add({
            kind: 'book', id: item.id, dueOn: item.bookBy, label: 'Still to book',
            done: !!item.booked, doneReason: item.booked ? 'booked' : ''
          });
        }

        (item.payments || []).forEach(function (p) {
          if (!p.dueOn) return;
          add({
            kind: 'pay', id: item.id + ':' + p.id, dueOn: p.dueOn,
            amount: p.amount, label: p.label || 'Payment',
            done: !!p.paidOn || !!p.muted,
            doneReason: p.paidOn ? 'paid' : (p.muted ? 'muted' : '')
          });
        });

        var total = item.included ? 0 : (Number(item.total) || 0);
        var settled = total > 0 && paidTotal(item) + 0.005 >= total;
        if (item.cancelBy) {
          add({
            kind: 'cancel', id: item.id, dueOn: item.cancelBy,
            label: 'Free cancellation ends',
            done: settled, doneReason: settled ? 'paid' : ''
          });
        }
      });
    });

    return out;
  }

  /* Every dated thing still wanting attention. */
  function deadlines(state) {
    return allDeadlines(state).filter(function (d) { return !d.done; });
  }

  function headline(d, when) {
    if (d.kind === 'pay') {
      return d.trip.name + ': ' + money(d.amount, d.trip.currency) + ' due ' + when;
    }
    if (d.kind === 'book') return d.trip.name + ': book ' + when;
    return d.trip.name + ': free cancellation ends ' + when;
  }

  function build(state, opts) {
    opts = opts || {};
    var cfg = config(state);
    var leads = opts.leadDays || cfg.leadDays;
    var hour = opts.hour == null ? cfg.hour : opts.hour;
    var out = [];

    deadlines(state).forEach(function (d) {
      leads.forEach(function (lead) {
        var at = fireTime(d.dueOn, lead, hour);
        if (at === null) return;
        out.push({
          key: TAG_PREFIX + d.kind + ':' + d.id + ':' + lead,
          fireAt: at,
          lead: lead,
          dueOn: d.dueOn,
          tripId: d.trip.id,
          itemId: d.item.id,
          title: headline(d, whenPhrase(lead)),
          body: d.label + ' · ' + d.item.title + ' · ' + shortDate(d.dueOn)
        });
      });
    });

    out.sort(function (a, b) { return a.fireAt - b.fireAt; });
    return out;
  }

  /* Which reminders a background check should raise right now: due, not yet
     sent, and not so stale that raising them would just be noise. Capped so a
     long absence cannot produce an avalanche. */
  function due(state, sent, now, opts) {
    opts = opts || {};
    var staleAfter = (opts.staleDays == null ? 3 : opts.staleDays) * 86400000;
    var limit = opts.limit == null ? 5 : opts.limit;
    sent = sent || {};

    if (!config(state).enabled) return [];

    var ready = build(state).filter(function (e) {
      return e.fireAt <= now && e.fireAt > now - staleAfter && !sent[e.key];
    });

    return ready.slice(-limit);
  }

  // ------------------------------------------------------------- calendar
  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function icsEscape(text) {
    return String(text == null ? '' : text)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  /* RFC 5545 caps a line at 75 octets. Folding well short of that keeps
     multi-byte characters (pound signs, dashes) safely inside the limit. */
  function icsFold(line) {
    var parts = [];
    while (line.length > 60) {
      parts.push(line.slice(0, 60));
      line = ' ' + line.slice(60);
    }
    parts.push(line);
    return parts.join('\r\n');
  }

  function icsDate(iso, offsetDays) {
    var d = parseDate(iso);
    if (!d) return null;
    if (offsetDays) d.setDate(d.getDate() + offsetDays);
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
  }

  function icsStamp(date) {
    return date.getUTCFullYear() + pad(date.getUTCMonth() + 1) + pad(date.getUTCDate()) +
      'T' + pad(date.getUTCHours()) + pad(date.getUTCMinutes()) + pad(date.getUTCSeconds()) + 'Z';
  }

  /* An alarm `lead` days before the all-day event, at the configured hour.
     All-day events start at midnight, so the hour is subtracted from the lead. */
  function icsTrigger(lead, hour) {
    var hours = lead * 24 - hour;
    if (hours === 0) return 'PT0S';
    var sign = hours > 0 ? '-' : '';
    hours = Math.abs(hours);
    var days = Math.floor(hours / 24);
    var rest = hours % 24;
    return sign + 'P' + (days ? days + 'D' : '') +
      (rest ? 'T' + rest + 'H' : (days ? '' : 'T0H'));
  }

  /* A calendar file of every deadline, each with alarms at the same lead times
     the in-app reminders use. Calendar apps have OS-level scheduling that a web
     app cannot match, so this is the dependable route for dates that matter.

     Finished and deleted entries are written too, as cancellations. Leaving one
     out of the file does not remove it from a calendar: it just stops being
     mentioned, and the old entry stays there looking like it still needs doing.

     `sent` is the map of what previous exports put in the calendar, so entries
     whose booking has since been deleted can still be withdrawn. The caller
     stores the map that comes back. */
  function ics(state, opts) {
    opts = opts || {};
    var cfg = config(state);
    var leads = opts.leadDays || cfg.leadDays;
    var hour = opts.hour == null ? cfg.hour : opts.hour;
    var now = opts.now || Date.now();
    var stamp = icsStamp(new Date(now));
    var sent = opts.sent || {};

    /* Bumped on every export so calendar apps treat a re-import as an update
       to the entry rather than something to ignore or duplicate. */
    var sequence = Math.floor(now / 60000);
    var used = {};
    var skipped = [];
    var live = 0;
    var finished = 0;
    var withdrawn = 0;
    var nextSent = {};

    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Holiday Tracker//Deadlines//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Holiday deadlines'
    ];

    function uniqueUid(base) {
      /* Calendar apps key entries by UID and quietly drop repeats, so a
         collision would lose a booking without saying anything. */
      var uid = base;
      if (used[uid]) {
        var n = 2;
        while (used[uid + '-' + n]) n++;
        uid = uid + '-' + n;
      }
      used[uid] = true;
      return uid;
    }

    function event(o) {
      lines.push('BEGIN:VEVENT');
      lines.push('UID:' + o.uid + '@holiday-tracker');
      lines.push('DTSTAMP:' + stamp);
      lines.push('LAST-MODIFIED:' + stamp);
      lines.push('SEQUENCE:' + sequence);
      lines.push('DTSTART;VALUE=DATE:' + o.start);
      lines.push('DTEND;VALUE=DATE:' + o.end);
      lines.push('SUMMARY:' + icsEscape(o.summary));
      if (o.description) lines.push('DESCRIPTION:' + icsEscape(o.description));
      lines.push('TRANSP:TRANSPARENT');
      lines.push('STATUS:' + (o.cancelled ? 'CANCELLED' : 'CONFIRMED'));
      (o.alarms || []).forEach(function (a) {
        lines.push('BEGIN:VALARM');
        lines.push('ACTION:DISPLAY');
        lines.push('DESCRIPTION:' + icsEscape(a.text));
        lines.push('TRIGGER:' + a.trigger);
        lines.push('END:VALARM');
      });
      lines.push('END:VEVENT');
    }

    var all = allDeadlines(state);

    all.forEach(function (d) {
      var start = icsDate(d.dueOn, 0);
      var end = icsDate(d.dueOn, 1);
      if (!start) {
        skipped.push({ title: d.item.title, reason: 'no usable date', dueOn: d.dueOn });
        return;
      }

      var uid = uniqueUid(d.kind + '-' + d.id);
      nextSent[uid] = { on: d.dueOn };

      var summary = d.kind === 'pay'
        ? d.trip.name + ': ' + money(d.amount, d.trip.currency) + ' due'
        : (d.kind === 'book'
            ? d.trip.name + ': book ' + d.item.title
            : d.trip.name + ': free cancellation ends');

      var detail = [d.label, d.item.title];
      if (d.item.provider) detail.push('Booked through ' + d.item.provider);
      if (d.item.payWith) detail.push('Pay with ' + d.item.payWith);
      if (d.item.ref) detail.push('Reference ' + d.item.ref);

      if (d.done) {
        /* Cancelled so calendars that honour it drop the entry, and relabelled
           with no alarm so the ones that do not at least stop nagging. */
        finished++;
        var was = d.doneReason === 'paid' ? 'Paid'
          : (d.doneReason === 'booked' ? 'Booked' : 'Muted');
        event({
          uid: uid, start: start, end: end, cancelled: true,
          summary: was + ' \u2014 ' + summary,
          description: was + '. ' + detail.join('. ')
        });
        return;
      }

      live++;
      event({
        uid: uid, start: start, end: end, cancelled: false,
        summary: summary,
        description: detail.join('\n'),
        alarms: leads.map(function (lead) {
          return { text: headline(d, whenPhrase(lead)), trigger: icsTrigger(lead, hour) };
        })
      });
    });

    /* Anything a previous export put in the calendar that no longer exists at
       all - the booking was deleted - is withdrawn by name. Kept on the list
       for a while in case a file gets saved but never imported. */
    Object.keys(sent).forEach(function (uid) {
      if (nextSent[uid]) return;
      var record = sent[uid] || {};
      var start = icsDate(record.on, 0);
      var end = icsDate(record.on, 1);
      if (!start) return;

      var since = record.since || now;
      if (now - since > 45 * 86400000) return;

      nextSent[uid] = { on: record.on, since: since };
      withdrawn++;
      used[uid] = true;
      event({
        uid: uid, start: start, end: end, cancelled: true,
        summary: 'Removed \u2014 no longer in the holiday tracker',
        description: 'This booking was deleted from the tracker.'
      });
    });

    lines.push('END:VCALENDAR');

    /* count is what the file actually contains, not what was hoped for: the
       two diverging is how a missing booking goes unnoticed. */
    return {
      text: lines.map(icsFold).join('\r\n') + '\r\n',
      count: live,
      finished: finished,
      withdrawn: withdrawn,
      deadlines: all.length,
      skipped: skipped,
      sent: nextSent
    };
  }

  root.Reminders = {
    DEFAULTS: DEFAULTS,
    TAG_PREFIX: TAG_PREFIX,
    config: config,
    deadlines: deadlines,
    allDeadlines: allDeadlines,
    build: build,
    due: due,
    ics: ics,
    fireTime: fireTime,
    money: money,
    whenPhrase: whenPhrase
  };
})(typeof self !== 'undefined' ? self : this);
