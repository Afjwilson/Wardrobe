/* Reminder scheduling logic, shared by the page and the service worker.
 *
 * Loaded in the page with a <script> tag and in sw.js with importScripts, so
 * it must stay free of any DOM or window reference. Pure functions only: the
 * two callers decide what to do with the events this produces.
 */
(function (root) {
  'use strict';

  var DEFAULTS = {
    enabled: false,
    leadDays: [7, 1],
    hour: 9
  };

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
    try {
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch (e) {
      return iso;
    }
  }

  /* The moment a reminder should appear: `lead` days before the due date, at
     the configured hour in the device's own timezone. */
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

    // Largest lead first so a burst reads in a sensible order.
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

  /* Every future reminder implied by the data, one per deadline per lead time.
     Muted bookings and muted or already-paid instalments never appear. */
  function build(state, opts) {
    opts = opts || {};
    var cfg = config(state);
    var leads = opts.leadDays || cfg.leadDays;
    var hour = opts.hour == null ? cfg.hour : opts.hour;
    var out = [];

    (state.trips || []).forEach(function (trip) {
      (trip.items || []).forEach(function (item) {
        if (item.muted) return;

        var deadlines = [];

        if (!item.booked && item.bookBy) {
          deadlines.push({
            kind: 'book',
            id: item.id,
            dueOn: item.bookBy,
            label: 'Still to book'
          });
        }

        (item.payments || []).forEach(function (p) {
          if (p.paidOn || p.muted || !p.dueOn) return;
          deadlines.push({
            kind: 'pay',
            id: item.id + ':' + p.id,
            dueOn: p.dueOn,
            amount: p.amount,
            label: p.label || 'Payment'
          });
        });

        var total = item.included ? 0 : (Number(item.total) || 0);
        var settled = total > 0 && paidTotal(item) + 0.005 >= total;
        if (item.cancelBy && !settled) {
          deadlines.push({
            kind: 'cancel',
            id: item.id,
            dueOn: item.cancelBy,
            label: 'Free cancellation ends'
          });
        }

        deadlines.forEach(function (d) {
          leads.forEach(function (lead) {
            var at = fireTime(d.dueOn, lead, hour);
            if (at === null) return;

            var when = whenPhrase(lead);
            var title;
            if (d.kind === 'pay') {
              title = trip.name + ': ' + money(d.amount, trip.currency) + ' due ' + when;
            } else if (d.kind === 'book') {
              title = trip.name + ': book ' + when;
            } else {
              title = trip.name + ': free cancellation ends ' + when;
            }

            out.push({
              key: TAG_PREFIX + d.kind + ':' + d.id + ':' + lead,
              fireAt: at,
              lead: lead,
              dueOn: d.dueOn,
              tripId: trip.id,
              itemId: item.id,
              title: title,
              body: d.label + ' · ' + item.title + ' · ' + shortDate(d.dueOn)
            });
          });
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

    var cfg = config(state);
    if (!cfg.enabled) return [];

    var ready = build(state).filter(function (e) {
      return e.fireAt <= now && e.fireAt > now - staleAfter && !sent[e.key];
    });

    // Keep the most recent, which are the ones still worth acting on.
    return ready.slice(-limit);
  }

  root.Reminders = {
    DEFAULTS: DEFAULTS,
    due: due,
    TAG_PREFIX: TAG_PREFIX,
    config: config,
    build: build,
    fireTime: fireTime,
    money: money,
    whenPhrase: whenPhrase
  };
})(typeof self !== 'undefined' ? self : this);
