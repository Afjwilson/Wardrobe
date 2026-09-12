/* UI. Plain DOM, no framework, no build step. */
(function (global) {
  'use strict';

  var App = {};
  global.App = App;

  var ui = {
    filter: 'all',
    category: null,
    search: '',
    attentionScope: 'all',
    attentionExpanded: false
  };

  // ------------------------------------------------------------- utilities
  function h(tag, props, kids) {
    var e = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        var v = props[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') e.className = v;
        else if (k === 'text') e.textContent = v;
        else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2).toLowerCase(), v);
        else e.setAttribute(k, v === true ? '' : v);
      });
    }
    (kids || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  function $(sel) { return document.querySelector(sel); }

  var fmtCache = {};
  function money(value, currency) {
    var cur = currency || 'GBP';
    if (!fmtCache[cur]) {
      try {
        fmtCache[cur] = new Intl.NumberFormat('en-GB', {
          style: 'currency', currency: cur, minimumFractionDigits: 2
        });
      } catch (e) {
        fmtCache[cur] = { format: function (v) { return cur + ' ' + v.toFixed(2); } };
      }
    }
    return fmtCache[cur].format(Number(value) || 0);
  }

  function money0(value, currency) {
    var s = money(value, currency);
    return s.replace(/\.00$/, '');
  }

  function parseD(s) {
    if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    var p = s.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function today() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function toISO(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
      '-' + String(d.getDate()).padStart(2, '0');
  }

  function daysTo(s) {
    var d = parseD(s);
    if (!d) return null;
    return Math.round((d - today()) / 86400000);
  }

  function minusDays(iso, n) {
    var d = parseD(iso);
    if (!d) return '';
    d.setDate(d.getDate() - n);
    return toISO(d);
  }

  function fmtD(s, opts) {
    var d = parseD(s);
    if (!d) return '';
    return d.toLocaleDateString('en-GB', opts || { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function fmtShort(s) { return fmtD(s, { day: 'numeric', month: 'short' }); }

  /* Deadlines carry the year once they fall outside the current one — these
     trips run far enough ahead that "6 Jan" alone is ambiguous. */
  function fmtDeadline(s) {
    var d = parseD(s);
    if (!d) return '';
    return d.getFullYear() === new Date().getFullYear()
      ? fmtShort(s)
      : fmtD(s, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function fmtRange(a, b) {
    if (!a && !b) return '';
    if (!b || a === b) return fmtShort(a);
    var da = parseD(a), db = parseD(b);
    if (!da || !db) return fmtShort(a || b);
    if (da.getMonth() === db.getMonth() && da.getFullYear() === db.getFullYear()) {
      return da.getDate() + '–' + fmtShort(b);
    }
    return fmtShort(a) + ' – ' + fmtShort(b);
  }

  function nights(a, b) {
    var da = parseD(a), db = parseD(b);
    if (!da || !db) return 0;
    return Math.max(0, Math.round((db - da) / 86400000));
  }

  function relative(iso) {
    var n = daysTo(iso);
    if (n === null) return '';
    if (n < 0) return Math.abs(n) === 1 ? '1 day ago' : Math.abs(n) + ' days ago';
    if (n === 0) return 'today';
    if (n === 1) return 'tomorrow';
    if (n < 21) return n + ' days';
    if (n < 60) return Math.round(n / 7) + ' weeks';
    return Math.round(n / 30.4) + ' months';
  }

  App.toast = function (message, kind) {
    var t = $('#toast');
    t.textContent = message;
    t.className = 'toast' + (kind === 'warn' ? ' toast--warn' : '');
    t.hidden = false;
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.hidden = true; }, kind === 'warn' ? 5200 : 2600);
  };

  // ---------------------------------------------------------------- sheets
  var sheetStack = [];

  function openSheet(opts) {
    var body = h('div', { class: 'sheet__body' }, []);
    var sheet = h('section', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' }, [
      h('div', { class: 'sheet__head' }, [
        h('h2', { text: opts.title }),
        h('button', {
          class: 'sheet__close', type: 'button', 'aria-label': 'Close',
          onclick: function () { closeSheet(); }
        }, ['✕'])
      ]),
      body
    ]);

    if (opts.footer) {
      sheet.appendChild(h('div', { class: 'sheet__foot' }, opts.footer));
    }

    $('#sheets').appendChild(sheet);
    $('#scrim').hidden = false;
    document.body.style.overflow = 'hidden';

    var entry = { el: sheet, body: body, onClose: opts.onClose };
    sheetStack.push(entry);
    if (opts.render) opts.render(body, entry);
    return entry;
  }

  function closeSheet() {
    var entry = sheetStack.pop();
    if (!entry) return;
    entry.el.remove();
    if (entry.onClose) entry.onClose();
    if (!sheetStack.length) {
      $('#scrim').hidden = true;
      document.body.style.overflow = '';
    }
  }

  function closeAllSheets() {
    while (sheetStack.length) closeSheet();
  }

  function refreshSheet(entry, renderFn) {
    entry.body.innerHTML = '';
    renderFn(entry.body, entry);
  }

  // ------------------------------------------------------------ form bits
  function field(label, input, hint) {
    return h('div', { class: 'field' }, [
      label ? h('label', { text: label }) : null,
      input,
      hint ? h('div', { class: 'field__hint', text: hint }) : null
    ]);
  }

  function textInput(value, attrs) {
    var props = { type: 'text', value: value || '' };
    Object.keys(attrs || {}).forEach(function (k) { props[k] = attrs[k]; });
    return h('input', props);
  }

  function dateInput(value) { return h('input', { type: 'date', value: value || '' }); }

  function numInput(value, placeholder) {
    return h('input', {
      type: 'number', inputmode: 'decimal', step: '0.01',
      value: (value === null || value === undefined || value === '') ? '' : value,
      placeholder: placeholder || ''
    });
  }

  function select(options, value) {
    return h('select', {}, options.map(function (o) {
      return h('option', { value: o.value, selected: o.value === value }, [o.label]);
    }));
  }

  function switchRow(label, checked, sub) {
    var input = h('input', { type: 'checkbox', checked: checked });
    var row = h('label', { class: 'switch' }, [
      input,
      h('span', {}, [label, sub ? h('small', { text: sub }) : null])
    ]);
    row.input = input;
    return row;
  }

  // ----------------------------------------------------------- item pieces
  function payLabel(state) {
    return {
      unpaid: 'To pay', part: 'Part paid', paid: 'Paid',
      free: 'No cost', included: 'Included'
    }[state] || '';
  }

  function itemTags(item, trip) {
    var tags = [];
    var cat = Catalog.category(item.category);

    if (!item.booked) {
      var n = daysTo(item.bookBy);
      if (item.bookBy) {
        tags.push({
          text: (n !== null && n < 0 ? 'Overdue — ' : (cat.task ? 'Do by ' : 'Book by ')) + fmtDeadline(item.bookBy),
          kind: n === null ? 'warn' : (n < 0 ? 'bad' : (n < 30 ? 'warn' : ''))
        });
      } else {
        tags.push({ text: cat.task ? 'To do' : 'To book', kind: 'warn' });
      }
    }

    Store.itemSchedule(item).forEach(function (p) {
      if (!p.dueOn) return;
      var n = daysTo(p.dueOn);
      tags.push({
        text: (n !== null && n < 0 ? 'Was due ' : 'Pay ') +
          (p.amount ? money0(p.amount, trip.currency) + ' by ' : '') + fmtDeadline(p.dueOn),
        kind: n === null ? '' : (n < 0 ? 'bad' : (n <= 21 ? 'warn' : ''))
      });
    });

    if (item.cancelBy) {
      var c = daysTo(item.cancelBy);
      if (c !== null && c >= 0 && Store.itemPayState(item) !== 'paid') {
        tags.push({ text: 'Free cancel to ' + fmtDeadline(item.cancelBy), kind: 'info' });
      }
    }

    if (Store.itemOverpaid(item)) {
      tags.push({ text: 'Payments exceed the total', kind: 'bad' });
    }

    return tags;
  }

  function legLine(leg) {
    var bits = [];
    if (leg.number) bits.push(h('b', { text: leg.number }));
    bits.push(h('span', { text: (leg.from || '?') + ' → ' + (leg.to || '?') }));
    var when = [];
    if (leg.date) when.push(fmtShort(leg.date));
    if (leg.depart) {
      when.push(leg.depart + (leg.arrive
        ? '–' + leg.arrive + (leg.plusDays ? '+' + leg.plusDays : '')
        : ''));
    }
    if (when.length) bits.push(h('span', { text: when.join(' ') }));
    return h('div', { class: 'row__leg' }, bits);
  }

  function itemRow(trip, item) {
    var cat = Catalog.category(item.category);
    var state = Store.itemPayState(item);
    var settled = Store.itemSettled(item);

    var sub = [];
    if (item.provider) sub.push(item.provider);
    var range = fmtRange(item.startDate, item.endDate);
    if (range) sub.push(range);
    if (item.payWith) sub.push(item.payWith);
    if (item.ref) sub.push(item.ref);

    var tags = itemTags(item, trip);

    var main = h('button', { class: 'row__main', type: 'button', onclick: function () { editItem(trip, item); } }, [
      h('div', { class: 'row__title', text: item.title }),
      sub.length ? h('div', { class: 'row__sub', text: sub.join(' · ') }) : null,
      (item.legs && item.legs.length)
        ? h('div', { class: 'row__legs' }, item.legs.map(legLine))
        : null,
      tags.length
        ? h('div', { class: 'row__tags' }, tags.map(function (t) {
            return h('span', { class: 'tag' + (t.kind ? ' tag--' + t.kind : ''), text: t.text });
          }))
        : null
    ]);

    var total = Store.itemTotal(item);
    var hasLocal = item.localAmount && item.localCurrency;
    var hasMoney = item.included || total > 0 || hasLocal;

    /* Priced abroad but never converted: show the foreign figure and say
       plainly that it is sitting outside the trip totals. */
    var unconverted = !item.included && !total && hasLocal;

    var moneyBtn = null;
    if (hasMoney) {
      moneyBtn = h('button', { class: 'row__money', type: 'button', onclick: function () { paymentSheet(trip, item); } }, [
        (hasLocal && !unconverted)
          ? h('div', { class: 'row__amt row__amt--muted', text: money0(item.localAmount, item.localCurrency) })
          : null,
        unconverted
          ? h('div', { class: 'row__amt', text: money0(item.localAmount, item.localCurrency) })
          : (item.included ? null : h('div', { class: 'row__amt', text: money0(total, trip.currency) })),
        h('div', {
          class: 'row__pay pay--' + (unconverted ? 'free' : state),
          text: unconverted ? 'Not in total' : payLabel(state)
        })
      ]);
    }

    return h('div', { class: 'row' + (item.booked ? ' row--booked' : '') + (settled ? ' row--done' : '') }, [
      h('button', {
        class: 'row__check', type: 'button',
        'aria-label': (item.booked ? 'Mark not ' : 'Mark ') + (cat.task ? 'done' : 'booked'),
        onclick: function () {
          Store.updateItem(trip.id, item.id, { booked: !item.booked });
        }
      }, [h('i', {})]),
      main,
      moneyBtn
    ]);
  }

  // ------------------------------------------------------------ rendering
  function visibleItems(trip) {
    var q = ui.search.trim().toLowerCase();
    return (trip.items || []).filter(function (item) {
      if (ui.category && item.category !== ui.category) return false;

      if (ui.filter === 'tobook' && item.booked) return false;
      if (ui.filter === 'topay' && !(item.booked && Store.itemDue(item) > 0.005)) return false;
      if (ui.filter === 'done' && !Store.itemSettled(item)) return false;

      if (q) {
        var hay = [item.title, item.provider, item.ref, item.notes, item.payWith]
          .concat((item.legs || []).map(function (l) {
            return [l.number, l.from, l.to, l.carrier].join(' ');
          })).join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function renderSummary(trip) {
    var box = $('#summary');
    var t = Store.tripTotals(trip);
    var pct = t.total > 0 ? Math.min(100, Math.round((t.paid / t.total) * 100)) : 0;
    var away = daysTo(trip.startDate);

    box.innerHTML = '';
    box.appendChild(h('div', { class: 'summary__top' }, [
      h('div', {}, [
        h('div', { class: 'summary__label', text: t.due > 0.005 ? 'Left to pay' : 'All paid' }),
        h('div', { class: 'summary__big', text: money0(t.due, trip.currency) })
      ]),
      h('div', { class: 'summary__side' }, [
        h('b', { text: money0(t.total, trip.currency) }),
        'total · ' + money0(t.paid, trip.currency) + ' paid'
      ])
    ]));

    box.appendChild(h('div', { class: 'bar' }, [h('i', { style: 'width:' + pct + '%' })]));

    box.appendChild(h('div', { class: 'summary__stats' }, [
      h('div', { class: 'stat stat--todo' }, [
        h('b', { text: String(t.toBook) }), h('span', { text: 'left to book' })
      ]),
      h('div', { class: 'stat stat--pay' }, [
        h('b', { text: String(t.toPay) }), h('span', { text: 'payments due' })
      ]),
      h('div', { class: 'stat stat--done' }, [
        h('b', { text: (away !== null && away >= 0) ? String(away) : '–' }),
        h('span', { text: away !== null && away >= 0 ? 'days to go' : 'departed' })
      ])
    ]));
  }

  /* Everything with a date that needs a human, optionally across all trips. */
  function collectDue(scopeTrip) {
    var out = [];
    var trips = ui.attentionScope === 'trip' && scopeTrip ? [scopeTrip] : Store.trips();

    trips.forEach(function (trip) {
      (trip.items || []).forEach(function (item) {
        var cat = Catalog.category(item.category);
        if (!item.booked && item.bookBy) {
          out.push({
            date: item.bookBy, trip: trip, item: item,
            label: cat.task ? 'To do' : 'To book', amount: null
          });
        }
        Store.itemSchedule(item).forEach(function (p) {
          if (!p.dueOn) return;
          out.push({
            date: p.dueOn, trip: trip, item: item,
            label: p.label || 'Payment', amount: p.amount
          });
        });
        if (item.cancelBy && Store.itemPayState(item) !== 'paid') {
          var c = daysTo(item.cancelBy);
          if (c !== null && c >= 0) {
            out.push({
              date: item.cancelBy, trip: trip, item: item,
              label: 'Free cancellation ends', amount: null, soft: true
            });
          }
        }
      });
    });

    out.sort(function (a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
    return out;
  }

  function renderAttention(trip) {
    var box = $('#attention');
    box.innerHTML = '';

    var all = collectDue(trip);
    var head = h('div', { class: 'attention__head' }, [
      h('h2', { text: 'Needs attention' }),
      h('div', { class: 'mini-toggle' }, [
        h('button', {
          type: 'button', 'aria-pressed': String(ui.attentionScope === 'all'),
          onclick: function () { ui.attentionScope = 'all'; render(); }
        }, ['All trips']),
        h('button', {
          type: 'button', 'aria-pressed': String(ui.attentionScope === 'trip'),
          onclick: function () { ui.attentionScope = 'trip'; render(); }
        }, ['This trip'])
      ])
    ]);
    box.appendChild(head);

    if (!all.length) {
      box.appendChild(h('div', { class: 'rows' }, [
        h('div', { class: 'nothing', text: 'Nothing with a deadline. Everything here is booked and paid.' })
      ]));
      return;
    }

    var shown = ui.attentionExpanded ? all : all.slice(0, 5);

    shown.forEach(function (d) {
      var n = daysTo(d.date);
      var cls = 'due ' + (n < 0 ? 'due--past' : (n <= 21 ? 'due--soon' : 'due--later'));
      box.appendChild(h('button', {
        class: cls, type: 'button',
        onclick: function () {
          if (d.trip.id !== Store.get().activeTripId) Store.setActiveTrip(d.trip.id);
          editItem(d.trip, d.item);
        }
      }, [
        h('div', { class: 'due__when' }, [
          h('div', { text: fmtShort(d.date) }),
          h('div', { text: n < 0 ? 'overdue' : relative(d.date) })
        ]),
        h('div', { class: 'due__body' }, [
          h('div', { class: 'due__title', text: d.item.title }),
          h('div', {
            class: 'due__sub',
            text: d.label + (ui.attentionScope === 'all' ? ' · ' + d.trip.name : '') +
              (d.item.payWith ? ' · ' + d.item.payWith : '')
          })
        ]),
        d.amount ? h('div', { class: 'due__amt', text: money0(d.amount, d.trip.currency) }) : null
      ]));
    });

    if (all.length > 5) {
      box.appendChild(h('button', {
        class: 'btn btn--ghost btn--sm btn--block', type: 'button',
        style: 'margin-top:8px',
        onclick: function () { ui.attentionExpanded = !ui.attentionExpanded; render(); }
      }, [ui.attentionExpanded ? 'Show less' : 'Show all ' + all.length]));
    }
  }

  function renderFilters(trip) {
    var box = $('#filters');
    box.innerHTML = '';

    var counts = { all: 0, tobook: 0, topay: 0, done: 0 };
    (trip.items || []).forEach(function (item) {
      counts.all++;
      if (!item.booked) counts.tobook++;
      if (item.booked && Store.itemDue(item) > 0.005) counts.topay++;
      if (Store.itemSettled(item)) counts.done++;
    });

    [
      { id: 'all', label: 'Everything' },
      { id: 'tobook', label: 'To book' },
      { id: 'topay', label: 'To pay' },
      { id: 'done', label: 'Sorted' }
    ].forEach(function (f) {
      box.appendChild(h('button', {
        class: 'chip', type: 'button', role: 'tab',
        'aria-selected': String(ui.filter === f.id),
        onclick: function () { ui.filter = f.id; render(); }
      }, [f.label + ' ', h('b', { text: String(counts[f.id]) })]));
    });

    var used = {};
    (trip.items || []).forEach(function (i) { used[i.category] = (used[i.category] || 0) + 1; });

    Catalog.categories.forEach(function (cat) {
      if (!used[cat.id]) return;
      box.appendChild(h('button', {
        class: 'chip', type: 'button', role: 'tab',
        'aria-selected': String(ui.category === cat.id),
        onclick: function () {
          ui.category = ui.category === cat.id ? null : cat.id;
          render();
        }
      }, [cat.icon + ' ' + cat.label]));
    });
  }

  function renderList(trip) {
    var box = $('#list');
    box.innerHTML = '';

    var items = visibleItems(trip);
    if (!items.length) {
      box.appendChild(h('div', { class: 'rows' }, [
        h('div', {
          class: 'nothing',
          text: (trip.items || []).length
            ? 'Nothing matches that filter.'
            : 'Nothing added yet. Use Checklist for the things people forget, or Add booking for your own.'
        })
      ]));
      return;
    }

    var byDate = Store.settings().group === 'date';

    if (byDate) {
      var sorted = items.slice().sort(function (a, b) {
        var da = a.startDate || Store.itemNextDate(a) || '9999';
        var db = b.startDate || Store.itemNextDate(b) || '9999';
        return da < db ? -1 : (da > db ? 1 : 0);
      });
      box.appendChild(h('div', { class: 'group' }, [
        h('div', { class: 'rows' }, sorted.map(function (i) { return itemRow(trip, i); }))
      ]));
      return;
    }

    Catalog.categories.forEach(function (cat) {
      var inCat = items.filter(function (i) { return i.category === cat.id; });
      if (!inCat.length) return;

      var sum = inCat.reduce(function (s, i) { return s + Store.itemTotal(i); }, 0);
      var due = inCat.reduce(function (s, i) { return s + Store.itemDue(i); }, 0);

      box.appendChild(h('div', { class: 'group' }, [
        h('div', { class: 'group__head' }, [
          h('h2', { text: cat.icon + '  ' + cat.label }),
          h('div', {
            class: 'group__sum',
            text: sum > 0
              ? money0(sum, trip.currency) + (due > 0.005 ? ' · ' + money0(due, trip.currency) + ' due' : '')
              : ''
          })
        ]),
        h('div', { class: 'rows' }, inCat.map(function (i) { return itemRow(trip, i); }))
      ]));
    });
  }

  function render() {
    var trips = Store.trips();
    var trip = Store.activeTrip();

    $('#empty').hidden = !!trip;
    $('#trip-view').hidden = !trip;
    document.querySelector('.actionbar').hidden = !trip;
    if (!trip) {
      $('#trip-name').textContent = 'Holidays';
      $('#trip-meta').textContent = trips.length ? 'Tap to switch trip' : 'No trips yet';
      return;
    }

    $('#trip-name').textContent = trip.name;
    var meta = [];
    if (trip.startDate) {
      meta.push(fmtRange(trip.startDate, trip.endDate));
      var n = nights(trip.startDate, trip.endDate);
      if (n) meta.push(n + (n === 1 ? ' night' : ' nights'));
      var away = daysTo(trip.startDate);
      if (away !== null && away >= 0) meta.push(away === 0 ? 'today!' : away + ' days away');
    }
    if (trip.destination && !meta.length) meta.push(trip.destination);
    $('#trip-meta').textContent = meta.join(' · ') || 'Tap to switch trip';

    renderSummary(trip);
    renderAttention(trip);
    renderFilters(trip);
    renderList(trip);
  }

  App.render = render;

  // -------------------------------------------------------- payment sheet
  function paymentSheet(trip, item) {
    openSheet({
      title: item.title,
      footer: [h('button', { class: 'btn btn--primary', type: 'button', onclick: closeSheet }, ['Done'])],
      render: function (body, entry) { drawPayments(body, entry, trip, item); }
    });
  }

  function drawPayments(body, entry, trip, item) {
    var redraw = function () {
      refreshSheet(entry, function (b) { drawPayments(b, entry, trip, item); });
      render();
    };

    var total = Store.itemTotal(item);
    var paid = Store.itemPaid(item);
    var due = Store.itemDue(item);

    body.appendChild(h('div', { class: 'summary card', style: 'margin-bottom:14px' }, [
      h('div', { class: 'summary__top' }, [
        h('div', {}, [
          h('div', { class: 'summary__label', text: due > 0.005 ? 'Outstanding' : 'Nothing outstanding' }),
          h('div', { class: 'summary__big', text: money(due, trip.currency) })
        ]),
        h('div', { class: 'summary__side' }, [
          h('b', { text: money(total, trip.currency) }),
          'total · ' + money(paid, trip.currency) + ' paid'
        ])
      ]),
      (item.localAmount && item.localCurrency)
        ? h('div', { class: 'field__hint', style: 'margin-top:8px', text: 'Priced at ' + money(item.localAmount, item.localCurrency) })
        : null
    ]));

    if (!total && item.localAmount && item.localCurrency) {
      body.appendChild(h('div', { class: 'callout callout--info' }, [
        h('strong', { text: 'Not counted in the trip totals yet' }),
        'This is priced at ' + money(item.localAmount, item.localCurrency) +
        '. Add what it costs you in ' + trip.currency + ' and it will join the figures at the top.'
      ]));
    }

    if (Store.itemOverpaid(item)) {
      body.appendChild(h('div', { class: 'callout callout--warn' }, [
        h('strong', { text: 'The payments add up to more than the total' }),
        'Recorded payments come to ' +
          money((item.payments || []).reduce(function (s, p) { return s + (Number(p.amount) || 0); }, 0), trip.currency) +
          ' against a total of ' + money(total, trip.currency) + '.'
      ]));
    }

    body.appendChild(h('div', { class: 'section-title', text: 'Payments' }));

    if (!(item.payments || []).length) {
      body.appendChild(h('div', { class: 'nothing', text: 'No payments recorded yet.' }));
    }

    (item.payments || []).forEach(function (p, index) {
      var isPaid = !!p.paidOn;
      var labelIn = textInput(p.label, { placeholder: 'Deposit, balance…' });
      var amtIn = numInput(p.amount, '0.00');
      var dueIn = dateInput(p.dueOn);

      function commit() {
        p.label = labelIn.value.trim();
        p.amount = amtIn.value === '' ? 0 : Number(amtIn.value);
        p.dueOn = dueIn.value;
        Store.save();
        render();
      }
      [labelIn, amtIn, dueIn].forEach(function (i) { i.addEventListener('change', commit); });

      body.appendChild(h('div', { class: 'mini' + (isPaid ? ' mini--paid' : '') }, [
        h('div', { class: 'mini__head' }, [
          h('strong', { text: 'Payment ' + (index + 1) }),
          h('button', {
            class: 'paychip' + (isPaid ? ' paychip--on' : ''), type: 'button',
            onclick: function () {
              commit();
              p.paidOn = isPaid ? null : toISO(new Date());
              Store.save();
              redraw();
            }
          }, [isPaid ? '✓ Paid ' + (p.paidOn === 'paid' ? '' : fmtShort(p.paidOn)) : 'Mark paid']),
          h('button', {
            class: 'mini__del', type: 'button', 'aria-label': 'Delete payment',
            onclick: function () {
              item.payments.splice(index, 1);
              Store.save();
              redraw();
            }
          }, ['✕'])
        ]),
        field('Label', labelIn),
        h('div', { class: 'grid' }, [
          field('Amount (' + trip.currency + ')', amtIn),
          field(isPaid ? 'Due date' : 'Due by', dueIn)
        ])
      ]));
    });

    var actions = h('div', { class: 'list-links', style: 'margin-top:10px' }, []);

    if (due > 0.005) {
      actions.appendChild(h('button', {
        class: 'btn btn--primary btn--block', type: 'button',
        onclick: function () {
          item.payments = item.payments || [];
          item.payments.push({
            id: Store.uid(),
            label: paid > 0 ? 'Balance' : 'Paid in full',
            amount: Number(due.toFixed(2)),
            dueOn: toISO(new Date()),
            paidOn: toISO(new Date())
          });
          Store.save();
          redraw();
          App.toast('Marked ' + money0(due, trip.currency) + ' as paid');
        }
      }, ['Mark ' + money0(due, trip.currency) + ' as paid']));
    }

    actions.appendChild(h('button', {
      class: 'btn btn--ghost btn--block', type: 'button',
      onclick: function () {
        item.payments = item.payments || [];
        item.payments.push({
          id: Store.uid(), label: 'Instalment',
          amount: Number(Math.max(0, due).toFixed(2)), dueOn: '', paidOn: null
        });
        Store.save();
        redraw();
      }
    }, ['+ Add a scheduled payment']));

    actions.appendChild(h('button', {
      class: 'btn btn--ghost btn--block', type: 'button',
      onclick: function () { closeSheet(); editItem(trip, item); }
    }, ['Edit the whole booking']));

    body.appendChild(actions);
  }

  // ----------------------------------------------------------- item editor
  function editItem(trip, item) {
    var isNew = !item;
    var draft = isNew ? Store.newItem({ category: ui.category || 'other' }) : Store.clone(item);

    var entry = openSheet({
      title: isNew ? 'Add a booking' : 'Edit booking',
      footer: [
        h('button', { class: 'btn btn--ghost', type: 'button', onclick: closeSheet }, ['Cancel']),
        h('button', { class: 'btn btn--primary', type: 'button', onclick: function () { commit(); } }, ['Save'])
      ],
      render: function (body, self) { drawEditor(body, self); }
    });

    function drawEditor(body, entry) {
      var cat = Catalog.category(draft.category);

      var titleIn = textInput(draft.title === 'Untitled' ? '' : draft.title, {
        placeholder: 'e.g. Villa in Calheta', autocapitalize: 'sentences'
      });
      var catIn = select(Catalog.categories.map(function (c) {
        return { value: c.id, label: c.icon + '  ' + c.label };
      }), draft.category);
      catIn.addEventListener('change', function () {
        draft.category = catIn.value;
        harvest();
        refreshSheet(entry, drawEditor);
      });

      var bookedSw = switchRow(
        cat.task ? 'Sorted / done' : 'Booked',
        draft.booked,
        cat.task ? 'Tick once this is dealt with' : 'Tick once the booking is confirmed'
      );

      var providerIn = textInput(draft.provider, { placeholder: 'Booking.com, Jet2, direct…' });
      var refIn = textInput(draft.ref, { placeholder: 'Confirmation number' });
      var urlIn = h('input', { type: 'url', value: draft.url || '', placeholder: 'https://' });
      var startIn = dateInput(draft.startDate);
      var endIn = dateInput(draft.endDate);
      var bookByIn = dateInput(draft.bookBy);
      var cancelByIn = dateInput(draft.cancelBy);
      var totalIn = numInput(draft.total, '0.00');
      var payWithIn = textInput(draft.payWith, { placeholder: 'Chase cc, Amex…' });
      var localCurIn = select(
        [{ value: '', label: 'None' }].concat(Catalog.currencies.map(function (c) {
          return { value: c, label: c };
        })), draft.localCurrency);
      var localAmtIn = numInput(draft.localAmount, '0.00');
      var includedSw = switchRow('Cost is included in another booking', draft.included,
        'Use this for flights or meals that came inside a package');
      var notesIn = h('textarea', { placeholder: 'Anything worth remembering' }, [draft.notes || '']);

      function harvest() {
        draft.title = titleIn.value.trim() || 'Untitled';
        draft.category = catIn.value;
        draft.booked = bookedSw.input.checked;
        draft.provider = providerIn.value.trim();
        draft.ref = refIn.value.trim();
        draft.url = urlIn.value.trim();
        draft.startDate = startIn.value;
        draft.endDate = endIn.value;
        draft.bookBy = bookByIn.value;
        draft.cancelBy = cancelByIn.value;
        draft.total = totalIn.value === '' ? null : Number(totalIn.value);
        draft.payWith = payWithIn.value.trim();
        draft.localCurrency = localCurIn.value;
        draft.localAmount = localAmtIn.value === '' ? null : Number(localAmtIn.value);
        draft.included = includedSw.input.checked;
        draft.notes = notesIn.value;
      }
      entry.harvest = harvest;

      body.appendChild(field('What is it?', titleIn));
      body.appendChild(field('Category', catIn));
      body.appendChild(bookedSw);

      body.appendChild(h('div', { class: 'section-title', text: 'Where it came from' }));
      body.appendChild(field('Booked through', providerIn));
      body.appendChild(h('div', { class: 'grid' }, [
        field('Reference', refIn),
        field('Paid with', payWithIn)
      ]));
      body.appendChild(field('Link', urlIn));

      body.appendChild(h('div', { class: 'section-title', text: 'Dates' }));
      body.appendChild(h('div', { class: 'grid' }, [
        field('From', startIn),
        field('To', endIn)
      ]));
      body.appendChild(h('div', { class: 'grid' }, [
        field('Book by', bookByIn),
        field('Free cancellation until', cancelByIn)
      ]));

      body.appendChild(h('div', { class: 'section-title', text: 'Cost' }));
      body.appendChild(includedSw);
      body.appendChild(field('Total (' + trip.currency + ')', totalIn));
      body.appendChild(h('div', { class: 'grid' }, [
        field('Priced in', localCurIn),
        field('Amount', localAmtIn)
      ]));
      body.appendChild(h('div', {
        class: 'field__hint',
        text: 'Record the local price alongside the ' + trip.currency + ' amount you actually pay.'
      }));

      // ---- payments
      body.appendChild(h('div', { class: 'section-title', text: 'Payments & deadlines' }));
      (draft.payments || []).forEach(function (p, index) {
        var lab = textInput(p.label, { placeholder: 'Deposit, balance…' });
        var amt = numInput(p.amount, '0.00');
        var dueOn = dateInput(p.dueOn);
        var paidSw = h('button', {
          class: 'paychip' + (p.paidOn ? ' paychip--on' : ''), type: 'button',
          onclick: function () {
            p.label = lab.value; p.amount = Number(amt.value) || 0; p.dueOn = dueOn.value;
            p.paidOn = p.paidOn ? null : (dueOn.value || toISO(new Date()));
            harvest();
            refreshSheet(entry, drawEditor);
          }
        }, [p.paidOn ? '✓ Paid' : 'Mark paid']);

        function sync() {
          p.label = lab.value.trim();
          p.amount = amt.value === '' ? 0 : Number(amt.value);
          p.dueOn = dueOn.value;
        }
        [lab, amt, dueOn].forEach(function (i) { i.addEventListener('change', sync); });

        body.appendChild(h('div', { class: 'mini' + (p.paidOn ? ' mini--paid' : '') }, [
          h('div', { class: 'mini__head' }, [
            h('strong', { text: 'Payment ' + (index + 1) }),
            paidSw,
            h('button', {
              class: 'mini__del', type: 'button', 'aria-label': 'Remove payment',
              onclick: function () {
                draft.payments.splice(index, 1);
                harvest();
                refreshSheet(entry, drawEditor);
              }
            }, ['✕'])
          ]),
          field('Label', lab),
          h('div', { class: 'grid' }, [
            field('Amount', amt),
            field('Due', dueOn)
          ])
        ]));
      });

      body.appendChild(h('button', {
        class: 'btn btn--ghost btn--sm btn--block', type: 'button',
        onclick: function () {
          harvest();
          draft.payments = draft.payments || [];
          var remaining = (Number(draft.total) || 0) -
            draft.payments.reduce(function (s, p) { return s + (Number(p.amount) || 0); }, 0);
          draft.payments.push({
            id: Store.uid(),
            label: draft.payments.length ? 'Balance' : 'Deposit',
            amount: remaining > 0 ? Number(remaining.toFixed(2)) : 0,
            dueOn: '', paidOn: null
          });
          refreshSheet(entry, drawEditor);
        }
      }, ['+ Add a payment']));

      // ---- legs
      if (cat.legs) {
        body.appendChild(h('div', { class: 'section-title', text: 'Legs' }));

        (draft.legs || []).forEach(function (leg, index) {
          var carrier = textInput(leg.carrier, { placeholder: 'Jet2, easyJet…' });
          var number = textInput(leg.number, { placeholder: 'LS425' });
          var from = textInput(leg.from, { placeholder: 'LTN' });
          var to = textInput(leg.to, { placeholder: 'FNC' });
          var date = dateInput(leg.date);
          var dep = h('input', { type: 'time', value: leg.depart || '' });
          var arr = h('input', { type: 'time', value: leg.arrive || '' });
          var plus = switchRow('Arrives the next day', !!leg.plusDays);
          var lnotes = textInput(leg.notes, { placeholder: 'Terminal, seats…' });

          function sync() {
            leg.carrier = carrier.value.trim();
            leg.number = number.value.trim();
            leg.from = from.value.trim();
            leg.to = to.value.trim();
            leg.date = date.value;
            leg.depart = dep.value;
            leg.arrive = arr.value;
            leg.plusDays = plus.input.checked ? 1 : 0;
            leg.notes = lnotes.value.trim();
          }
          [carrier, number, from, to, date, dep, arr, lnotes].forEach(function (i) {
            i.addEventListener('change', sync);
          });
          plus.input.addEventListener('change', sync);

          body.appendChild(h('div', { class: 'mini' }, [
            h('div', { class: 'mini__head' }, [
              h('strong', { text: 'Leg ' + (index + 1) }),
              h('button', {
                class: 'mini__del', type: 'button', 'aria-label': 'Remove leg',
                onclick: function () {
                  draft.legs.splice(index, 1);
                  harvest();
                  refreshSheet(entry, drawEditor);
                }
              }, ['✕'])
            ]),
            h('div', { class: 'grid' }, [field('Carrier', carrier), field('Number', number)]),
            h('div', { class: 'grid' }, [field('From', from), field('To', to)]),
            field('Date', date),
            h('div', { class: 'grid' }, [field('Departs', dep), field('Arrives', arr)]),
            plus,
            field('Note', lnotes)
          ]));
        });

        body.appendChild(h('button', {
          class: 'btn btn--ghost btn--sm btn--block', type: 'button',
          onclick: function () {
            harvest();
            draft.legs = draft.legs || [];
            var last = draft.legs[draft.legs.length - 1];
            draft.legs.push({
              id: Store.uid(),
              carrier: last ? last.carrier : '',
              number: '',
              from: last ? last.to : '',
              to: last ? last.from : '',
              date: '', depart: '', arrive: '', plusDays: 0, notes: ''
            });
            refreshSheet(entry, drawEditor);
          }
        }, ['+ Add a leg']));
      }

      body.appendChild(h('div', { class: 'section-title', text: 'Notes' }));
      body.appendChild(field(null, notesIn));

      if (!isNew) {
        body.appendChild(h('button', {
          class: 'btn btn--danger btn--block', type: 'button', style: 'margin-top:16px',
          onclick: function () {
            if (!confirm('Delete "' + draft.title + '"?')) return;
            Store.deleteItem(trip.id, item.id);
            closeSheet();
            App.toast('Deleted');
          }
        }, ['Delete this booking']));
      }
    }

    function commit() {
      if (entry.harvest) entry.harvest();
      if (isNew) {
        Store.addItem(trip.id, draft);
        App.toast('Added');
      } else {
        Store.updateItem(trip.id, item.id, draft);
      }
      closeSheet();
    }
  }

  // ------------------------------------------------------- checklist sheet
  function checklistSheet(trip) {
    var search = '';
    var entry = openSheet({
      title: 'Things people forget',
      footer: [h('button', { class: 'btn btn--primary', type: 'button', onclick: closeSheet }, ['Done'])],
      render: function (body, self) { entry = self; draw(body); }
    });

    function alreadyAdded() {
      var set = {};
      (trip.items || []).forEach(function (i) {
        if (i.fromSuggestion) set[i.fromSuggestion] = true;
        set['title:' + i.title.toLowerCase()] = true;
      });
      return set;
    }

    /* A lead time that has already elapsed becomes no deadline at all rather
       than an item that is born overdue. */
    function suggestedBookBy(s) {
      if (!trip.startDate || !s.lead) return '';
      var by = minusDays(trip.startDate, s.lead);
      return daysTo(by) < 0 ? '' : by;
    }

    function addSuggestion(s) {
      Store.addItem(trip.id, {
        title: s.title,
        category: s.cat,
        bookBy: suggestedBookBy(s),
        notes: s.hint || ''
      });
      var added = Store.get().trips.filter(function (t) { return t.id === trip.id; })[0];
      added.items[added.items.length - 1].fromSuggestion = s.id;
      Store.save();
      render();
    }

    function draw(body) {
      var added = alreadyAdded();

      body.appendChild(h('div', { class: 'field__hint', style: 'margin-bottom:10px' }, [
        'Tap to add. Anything with a usual lead time gets a "book by" date worked out from your departure.'
      ]));

      var packRow = h('div', { class: 'pack-row' }, Catalog.packs.map(function (pack) {
        return h('button', {
          class: 'pack', type: 'button',
          onclick: function () {
            var n = 0;
            pack.items.forEach(function (sid) {
              var s = Catalog.suggestion(sid);
              if (!s) return;
              if (added[sid] || added['title:' + s.title.toLowerCase()]) return;
              addSuggestion(s);
              n++;
            });
            refreshSheet(entry, draw);
            App.toast(n ? 'Added ' + n + ' item' + (n === 1 ? '' : 's') : 'All of those are already on the list');
          }
        }, [pack.icon + '  ' + pack.label]);
      }));
      body.appendChild(packRow);

      var searchIn = h('input', {
        type: 'search', placeholder: 'Search the checklist', value: search, autocomplete: 'off'
      });
      searchIn.addEventListener('input', function () {
        search = searchIn.value;
        var scroll = body.scrollTop;
        refreshSheet(entry, draw);
        var next = entry.body.querySelector('input[type=search]');
        if (next) { next.focus(); }
        entry.body.scrollTop = scroll;
      });
      body.appendChild(h('label', { class: 'search', style: 'margin-bottom:14px' }, [searchIn]));

      var q = search.trim().toLowerCase();
      var any = false;

      Catalog.categories.forEach(function (cat) {
        var list = Catalog.suggestions.filter(function (s) {
          if (s.cat !== cat.id) return false;
          if (!q) return true;
          return (s.title + ' ' + (s.hint || '')).toLowerCase().indexOf(q) !== -1;
        });
        if (!list.length) return;
        any = true;

        body.appendChild(h('div', { class: 'section-title', text: cat.icon + '  ' + cat.label }));

        list.forEach(function (s) {
          var isAdded = added[s.id] || added['title:' + s.title.toLowerCase()];
          var by = suggestedBookBy(s);
          var hint = s.hint || '';
          if (!isAdded && s.lead && trip.startDate) {
            hint += (hint ? '  ' : '') +
              (by ? 'Usually worth doing by ' + fmtDeadline(by) + '.' : 'Already inside the usual window.');
          }

          body.appendChild(h('button', {
            class: 'sugg' + (isAdded ? ' sugg--added' : ''), type: 'button',
            disabled: isAdded ? true : null,
            onclick: function () {
              addSuggestion(s);
              var scroll = entry.body.scrollTop;
              refreshSheet(entry, draw);
              entry.body.scrollTop = scroll;
            }
          }, [
            h('span', { class: 'sugg__plus', text: isAdded ? '✓' : '+' }),
            h('span', { class: 'sugg__body' }, [
              h('span', { class: 'sugg__title', text: s.title }),
              hint ? h('span', { class: 'sugg__hint', text: hint }) : null
            ])
          ]));
        });
      });

      if (!any) {
        body.appendChild(h('div', { class: 'nothing', text: 'Nothing in the checklist matches that.' }));
      }

      body.appendChild(h('button', {
        class: 'btn btn--ghost btn--block', type: 'button', style: 'margin-top:14px',
        onclick: function () { closeSheet(); editItem(trip, null); }
      }, ['Add something of your own instead']));
    }
  }

  // ------------------------------------------------------------ trip sheets
  function tripPicker() {
    var entry = openSheet({
      title: 'Your trips',
      footer: [
        h('button', {
          class: 'btn btn--primary', type: 'button',
          onclick: function () { closeSheet(); editTrip(null); }
        }, ['+ New trip'])
      ],
      render: draw
    });

    function draw(body) {
      var trips = Store.trips().slice().sort(function (a, b) {
        return (a.startDate || '9999') < (b.startDate || '9999') ? -1 : 1;
      });

      if (!trips.length) {
        body.appendChild(h('div', { class: 'nothing', text: 'No trips yet.' }));
        return;
      }

      var now = toISO(today());
      var upcoming = trips.filter(function (t) { return !t.endDate || t.endDate >= now; });
      var past = trips.filter(function (t) { return t.endDate && t.endDate < now; });

      function section(title, list) {
        if (!list.length) return;
        body.appendChild(h('div', { class: 'section-title', text: title }));
        list.forEach(function (trip) {
          var t = Store.tripTotals(trip);
          body.appendChild(h('div', { class: 'trip-row', 'aria-current': String(trip.id === Store.get().activeTripId) }, [
            h('button', {
              class: 'trip-row__body', type: 'button',
              style: 'background:none;border:0;text-align:left;padding:0;cursor:pointer;min-width:0',
              onclick: function () { Store.setActiveTrip(trip.id); closeSheet(); }
            }, [
              h('div', { class: 'trip-row__name', text: trip.name }),
              h('div', {
                class: 'trip-row__meta',
                text: [fmtRange(trip.startDate, trip.endDate), trip.destination]
                  .filter(Boolean).join(' · ')
              })
            ]),
            h('div', { class: 'trip-row__amt' }, [
              h('b', { text: money0(t.due, trip.currency) }),
              t.due > 0.005 ? 'to pay' : 'all paid'
            ]),
            h('button', {
              class: 'icon-btn', type: 'button', 'aria-label': 'Edit ' + trip.name,
              style: 'width:36px;height:36px',
              onclick: function () { closeSheet(); editTrip(trip); }
            }, ['✎'])
          ]));
        });
      }

      section('Upcoming', upcoming);
      section('Past', past);
    }
  }

  function editTrip(trip) {
    var isNew = !trip;
    var d = trip || {
      name: '', destination: '', startDate: '', endDate: '',
      travellers: 2, currency: Store.settings().homeCurrency, notes: ''
    };

    var nameIn = textInput(d.name, { placeholder: 'Madeira at Christmas' });
    var destIn = textInput(d.destination, { placeholder: 'Funchal, Madeira' });
    var startIn = dateInput(d.startDate);
    var endIn = dateInput(d.endDate);
    var travIn = h('input', { type: 'number', inputmode: 'numeric', min: '1', value: d.travellers || 2 });
    var curIn = select(Catalog.currencies.map(function (c) { return { value: c, label: c }; }), d.currency);
    var notesIn = h('textarea', { placeholder: 'Anything about the trip as a whole' }, [d.notes || '']);

    function values() {
      return {
        name: nameIn.value.trim() || 'New trip',
        destination: destIn.value.trim(),
        startDate: startIn.value,
        endDate: endIn.value,
        travellers: Number(travIn.value) || 1,
        currency: curIn.value,
        notes: notesIn.value
      };
    }

    openSheet({
      title: isNew ? 'New trip' : 'Edit trip',
      footer: [
        h('button', { class: 'btn btn--ghost', type: 'button', onclick: closeSheet }, ['Cancel']),
        h('button', {
          class: 'btn btn--primary', type: 'button',
          onclick: function () {
            if (isNew) {
              var created = Store.addTrip(values());
              closeSheet();
              checklistSheet(created);
            } else {
              Store.updateTrip(trip.id, values());
              closeSheet();
            }
          }
        }, [isNew ? 'Create' : 'Save'])
      ],
      render: function (body) {
        body.appendChild(field('Name', nameIn));
        body.appendChild(field('Destination', destIn));
        body.appendChild(h('div', { class: 'grid' }, [
          field('Leaving', startIn),
          field('Coming back', endIn)
        ]));
        body.appendChild(h('div', { class: 'grid' }, [
          field('Travellers', travIn),
          field('Currency you pay in', curIn)
        ]));
        body.appendChild(field('Notes', notesIn));

        if (!isNew) {
          body.appendChild(h('div', { class: 'section-title', text: 'Manage' }));
          body.appendChild(h('button', {
            class: 'btn btn--ghost btn--block', type: 'button', style: 'margin-bottom:8px',
            onclick: function () {
              var copy = Store.duplicateTrip(trip.id);
              closeSheet();
              App.toast('Copied to "' + copy.name + '" with everything unbooked');
            }
          }, ['Duplicate this trip']));
          body.appendChild(h('button', {
            class: 'btn btn--danger btn--block', type: 'button',
            onclick: function () {
              if (!confirm('Delete "' + trip.name + '" and all ' + (trip.items || []).length + ' items?')) return;
              Store.deleteTrip(trip.id);
              closeSheet();
              App.toast('Trip deleted');
            }
          }, ['Delete this trip']));
        }
      }
    });
  }

  // --------------------------------------------------------------- backup
  function backupFilename() {
    return 'holidays-backup-' + toISO(new Date()) + '.json';
  }

  function downloadBackup() {
    var blob = new Blob([Store.exportData()], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = h('a', { href: url, download: backupFilename() });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    Store.markExported();
    App.toast('Backup saved to your downloads');
  }

  function shareBackup() {
    var text = Store.exportData();
    var file;
    try {
      file = new File([text], backupFilename(), { type: 'application/json' });
    } catch (e) { file = null; }

    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'Holiday tracker backup' }).then(function () {
        Store.markExported();
        App.toast('Backup shared');
      }).catch(function () {});
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        Store.markExported();
        App.toast('Backup copied — paste it somewhere safe');
      }).catch(function () { downloadBackup(); });
      return;
    }
    downloadBackup();
  }

  function importBackup() {
    var input = h('input', { type: 'file', accept: 'application/json,.json', style: 'display:none' });
    document.body.appendChild(input);
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      input.remove();
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var mode = confirm(
          'OK = add these trips to what you already have.\n' +
          'Cancel = replace everything with the backup.'
        ) ? 'merge' : 'replace';
        try {
          Store.importData(String(reader.result), mode);
          closeAllSheets();
          App.toast('Backup restored');
        } catch (e) {
          App.toast(e.message || 'That file could not be read', 'warn');
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  function settingsSheet() {
    var entry = openSheet({
      title: 'Settings & backup',
      footer: [h('button', { class: 'btn btn--primary', type: 'button', onclick: closeSheet }, ['Done'])],
      render: draw
    });

    function draw(body) {
      var s = Store.settings();
      var last = s.lastExport ? new Date(s.lastExport) : null;
      var stale = !last || (Date.now() - last.getTime()) > 21 * 86400000;

      body.appendChild(h('div', { class: 'callout ' + (stale ? 'callout--warn' : 'callout--info') }, [
        h('strong', { text: stale ? 'Save a backup' : 'Last backup ' + last.toLocaleDateString('en-GB') }),
        'Everything lives in this browser. Clearing your browsing data, or deleting the ' +
        'app from your phone, takes the bookings with it. A backup file is the only copy ' +
        'that survives that — save one whenever you have added a few things.'
      ]));

      body.appendChild(h('div', { class: 'list-links' }, [
        h('button', { class: 'btn btn--primary btn--block', type: 'button', onclick: downloadBackup },
          ['Save a backup file']),
        h('button', { class: 'btn btn--ghost btn--block', type: 'button', onclick: shareBackup },
          ['Share or copy the backup']),
        h('button', { class: 'btn btn--ghost btn--block', type: 'button', onclick: importBackup },
          ['Restore from a backup file'])
      ]));

      // ---- automatic snapshots
      var snaps = Store.snapshots();
      body.appendChild(h('div', { class: 'section-title', text: 'Automatic snapshots' }));
      if (!snaps.length) {
        body.appendChild(h('div', { class: 'field__hint', text: 'The last ten versions are kept here as you make changes.' }));
      } else {
        body.appendChild(h('div', { class: 'field__hint', style: 'margin-bottom:8px' }, [
          'Kept in this browser only. Useful if you delete something by accident.'
        ]));
        snaps.slice(0, 6).forEach(function (snap, index) {
          var when = new Date(snap.at);
          var count = (snap.data.trips || []).reduce(function (n, t) { return n + (t.items || []).length; }, 0);
          body.appendChild(h('button', {
            class: 'linkrow', type: 'button',
            onclick: function () {
              if (!confirm('Roll back to the version from ' + when.toLocaleString('en-GB') + '?')) return;
              Store.restoreSnapshot(index);
              closeAllSheets();
              App.toast('Rolled back');
            }
          }, [
            h('span', {}, [
              when.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
              h('small', { text: (snap.data.trips || []).length + ' trips, ' + count + ' items' })
            ]),
            h('em', { text: 'Restore' })
          ]));
        });
      }

      // ---- display
      body.appendChild(h('div', { class: 'section-title', text: 'Display' }));
      body.appendChild(field('Group the list by', (function () {
        var sel = select([
          { value: 'category', label: 'Category' },
          { value: 'date', label: 'Date' }
        ], s.group);
        sel.addEventListener('change', function () {
          Store.setSetting('group', sel.value);
          render();
        });
        return sel;
      })()));

      // ---- storage status
      body.appendChild(h('div', { class: 'section-title', text: 'Storage' }));
      var status = h('div', { class: 'field__hint', text: 'Checking…' });
      body.appendChild(status);
      if (navigator.storage && navigator.storage.persisted) {
        navigator.storage.persisted().then(function (p) {
          status.textContent = p
            ? 'This browser has marked the data as persistent, so it will not be cleared to free up space.'
            : 'The browser has not granted persistent storage. Adding the app to your home screen usually earns it — and keep saving backups either way.';
        }).catch(function () { status.textContent = ''; });
      } else {
        status.textContent = 'Persistent storage is not available in this browser. Keep saving backups.';
      }

      // ---- notepad reload
      body.appendChild(h('div', { class: 'section-title', text: 'Starting over' }));
      body.appendChild(h('div', { class: 'list-links' }, [
        h('button', {
          class: 'btn btn--ghost btn--block', type: 'button',
          onclick: function () {
            if (!confirm('Add the four trips from the original notepad again?')) return;
            Seed.load();
            closeAllSheets();
            App.toast('Notepad trips added');
          }
        }, ['Load the notepad trips again']),
        h('button', {
          class: 'btn btn--danger btn--block', type: 'button',
          onclick: function () {
            if (!confirm('Delete every trip and start again? Save a backup first if you are unsure.')) return;
            if (!confirm('Really delete everything? This cannot be undone.')) return;
            Store.reset();
            closeAllSheets();
            App.toast('Everything cleared');
          }
        }, ['Delete everything'])
      ]));

      body.appendChild(h('div', { class: 'section-title', text: 'About' }));
      body.appendChild(h('div', { class: 'field__hint' }, [
        'Works offline once loaded. On iPhone use Share → Add to Home Screen; ' +
        'on Android use the browser menu → Install app.'
      ]));
    }
  }

  // ------------------------------------------------------------ bootstrap
  function wire() {
    $('#btn-trip').addEventListener('click', tripPicker);
    $('#btn-settings').addEventListener('click', settingsSheet);
    $('#btn-first-trip').addEventListener('click', function () { editTrip(null); });
    $('#scrim').addEventListener('click', closeSheet);

    $('#btn-add').addEventListener('click', function () {
      var trip = Store.activeTrip();
      if (trip) editItem(trip, null);
    });
    $('#btn-checklist').addEventListener('click', function () {
      var trip = Store.activeTrip();
      if (trip) checklistSheet(trip);
    });

    var searchBox = $('#search');
    searchBox.addEventListener('input', function () {
      ui.search = searchBox.value;
      renderList(Store.activeTrip());
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sheetStack.length) closeSheet();
    });
  }

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }

  Store.init().then(function () {
    var state = Store.get();
    if (!state.settings.seeded && !state.trips.length) Seed.load();
    Store.subscribe(render);
    wire();
    render();
    registerSW();
  });
})(window);
