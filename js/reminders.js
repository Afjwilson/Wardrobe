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

  /* Every dated thing still wanting attention. Muted bookings and muted or
     already-paid instalments never appear. */
  function deadlines(state) {
    var out = [];

    (state.trips || []).forEach(function (trip) {
      (trip.items || []).forEach(function (item) {
        if (item.muted) return;

        if (!item.booked && item.bookBy) {
          out.push({
            kind: 'book', id: item.id, dueOn: item.bookBy,
            label: 'Still to book', trip: trip, item: item
          });
        }

        (item.payments || []).forEach(function (p) {
          if (p.paidOn || p.muted || !p.dueOn) return;
          out.push({
            kind: 'pay', id: item.id + ':' + p.id, dueOn: p.dueOn,
            amount: p.amount, label: p.label || 'Payment', trip: trip, item: item
          });
        });

        var total = item.included ? 0 : (Number(item.total) || 0);
        var settled = total > 0 && paidTotal(item) + 0.005 >= total;
        if (item.cancelBy && !settled) {
          out.push({
            kind: 'cancel', id: item.id, dueOn: item.cancelBy,
            label: 'Free cancellation ends', trip: trip, item: item
          });
        }
      });
    });

    return out;
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
     app cannot match, so this is the dependable route for dates that matter. */
  function ics(state, opts) {
    opts = opts || {};
    var cfg = config(state);
    var leads = opts.leadDays || cfg.leadDays;
    var hour = opts.hour == null ? cfg.hour : opts.hour;
    var stamp = icsStamp(new Date());

    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Holiday Tracker//Deadlines//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Holiday deadlines'
    ];

    var list = deadlines(state);

    list.forEach(function (d) {
      var start = icsDate(d.dueOn, 0);
      var end = icsDate(d.dueOn, 1);
      if (!start) return;

      var summary = d.kind === 'pay'
        ? d.trip.name + ': ' + money(d.amount, d.trip.currency) + ' due'
        : (d.kind === 'book'
            ? d.trip.name + ': book ' + d.item.title
            : d.trip.name + ': free cancellation ends');

      var detail = [d.label, d.item.title];
      if (d.item.provider) detail.push('Booked through ' + d.item.provider);
      if (d.item.payWith) detail.push('Pay with ' + d.item.payWith);
      if (d.item.ref) detail.push('Reference ' + d.item.ref);

      lines.push('BEGIN:VEVENT');
      lines.push('UID:' + d.kind + '-' + d.id + '@holiday-tracker');
      lines.push('DTSTAMP:' + stamp);
      lines.push('DTSTART;VALUE=DATE:' + start);
      lines.push('DTEND;VALUE=DATE:' + end);
      lines.push('SUMMARY:' + icsEscape(summary));
      lines.push('DESCRIPTION:' + icsEscape(detail.join('\n')));
      lines.push('TRANSP:TRANSPARENT');

      leads.forEach(function (lead) {
        lines.push('BEGIN:VALARM');
        lines.push('ACTION:DISPLAY');
        lines.push('DESCRIPTION:' + icsEscape(headline(d, whenPhrase(lead))));
        lines.push('TRIGGER:' + icsTrigger(lead, hour));
        lines.push('END:VALARM');
      });

      lines.push('END:VEVENT');
    });

    lines.push('END:VCALENDAR');

    return {
      text: lines.map(icsFold).join('\r\n') + '\r\n',
      count: list.length
    };
  }

  root.Reminders = {
    DEFAULTS: DEFAULTS,
    TAG_PREFIX: TAG_PREFIX,
    config: config,
    deadlines: deadlines,
    build: build,
    due: due,
    ics: ics,
    fireTime: fireTime,
    money: money,
    whenPhrase: whenPhrase
  };
})(typeof self !== 'undefined' ? self : this);
