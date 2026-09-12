/* State, derived totals, and durable persistence.
 *
 * Data is written to localStorage AND mirrored into IndexedDB on every change.
 * Neither survives a deliberate "clear all site data", so the app also keeps
 * rolling snapshots, asks the browser for persistent storage, and nags for a
 * file export when the last backup gets stale. Export/import is the only
 * genuinely safe backup and the UI says so.
 */
(function (global) {
  'use strict';

  var LS_KEY = 'holidays.state.v1';
  var LS_SNAPSHOTS = 'holidays.snapshots.v1';
  var IDB_NAME = 'holidays';
  var IDB_STORE = 'state';
  var SCHEMA = 1;
  var MAX_SNAPSHOTS = 10;

  var state = null;
  var listeners = [];
  var idb = null;

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function emptyState() {
    return {
      schema: SCHEMA,
      trips: [],
      activeTripId: null,
      settings: {
        homeCurrency: 'GBP',
        theme: 'auto',
        group: 'category',
        lastExport: null,
        seeded: false
      }
    };
  }

  // ---------------------------------------------------------------- IndexedDB
  function openIdb() {
    return new Promise(function (resolve) {
      if (!global.indexedDB) return resolve(null);
      var req;
      try { req = indexedDB.open(IDB_NAME, 1); } catch (e) { return resolve(null); }
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { resolve(null); };
      setTimeout(function () { resolve(null); }, 2000);
    });
  }

  function idbPut(value) {
    if (!idb) return;
    try {
      var tx = idb.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, 'current');
    } catch (e) { /* mirror is best effort */ }
  }

  function idbGet() {
    return new Promise(function (resolve) {
      if (!idb) return resolve(null);
      try {
        var tx = idb.transaction(IDB_STORE, 'readonly');
        var req = tx.objectStore(IDB_STORE).get('current');
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { resolve(null); };
      } catch (e) { resolve(null); }
    });
  }

  // ------------------------------------------------------------- persistence
  function readLocal() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function writeLocal(s) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(s));
      return true;
    } catch (e) {
      return false;
    }
  }

  function snapshot() {
    try {
      var list = JSON.parse(localStorage.getItem(LS_SNAPSHOTS) || '[]');
      list.unshift({ at: new Date().toISOString(), data: state });
      list = list.slice(0, MAX_SNAPSHOTS);
      localStorage.setItem(LS_SNAPSHOTS, JSON.stringify(list));
    } catch (e) { /* snapshots are a nicety, never fatal */ }
  }

  var snapshotTimer = null;
  function save() {
    state.updatedAt = new Date().toISOString();
    var ok = writeLocal(state);
    idbPut(state);
    clearTimeout(snapshotTimer);
    snapshotTimer = setTimeout(snapshot, 4000);
    if (!ok && global.App && App.toast) {
      App.toast('Could not save — storage is full or blocked. Export a backup now.', 'warn');
    }
    listeners.forEach(function (fn) { fn(state); });
  }

  function migrate(s) {
    if (!s || typeof s !== 'object') return null;
    if (!s.trips) return null;
    s.schema = s.schema || SCHEMA;
    s.settings = s.settings || emptyState().settings;
    s.trips.forEach(function (t) {
      t.items = t.items || [];
      t.items.forEach(function (it) {
        it.payments = it.payments || [];
        it.legs = it.legs || [];
        if (it.startTime == null) it.startTime = '';
        if (it.endTime == null) it.endTime = '';
      });
    });
    return s;
  }

  // ------------------------------------------------------------------ totals
  function itemTotal(item) {
    if (item.included) return 0;
    return Number(item.total) || 0;
  }

  function itemPaid(item) {
    return (item.payments || []).reduce(function (sum, p) {
      return p.paidOn ? sum + (Number(p.amount) || 0) : sum;
    }, 0);
  }

  function itemDue(item) {
    return Math.max(0, itemTotal(item) - itemPaid(item));
  }

  /* Payment rows that are scheduled but not yet paid. */
  function itemSchedule(item) {
    return (item.payments || []).filter(function (p) { return !p.paidOn; });
  }

  function itemPayState(item) {
    if (item.included) return 'included';
    var total = itemTotal(item);
    if (!total) return 'free';
    var paid = itemPaid(item);
    if (paid <= 0) return 'unpaid';
    if (paid + 0.005 < total) return 'part';
    return 'paid';
  }

  /* Payments recorded add up to more than the stated price — worth flagging. */
  function itemOverpaid(item) {
    var total = itemTotal(item);
    if (!total) return false;
    var scheduled = (item.payments || []).reduce(function (s, p) {
      return s + (Number(p.amount) || 0);
    }, 0);
    return scheduled > total + 0.005;
  }

  function itemSettled(item) {
    return !!item.booked && (itemPayState(item) === 'paid' ||
      itemPayState(item) === 'free' || itemPayState(item) === 'included');
  }

  /* The next date this item needs a human to do something. */
  function itemNextDate(item) {
    var dates = [];
    if (!item.booked && item.bookBy) dates.push(item.bookBy);
    if (item.booked && item.cancelBy && itemPayState(item) !== 'paid') dates.push(item.cancelBy);
    itemSchedule(item).forEach(function (p) { if (p.dueOn) dates.push(p.dueOn); });
    dates.sort();
    return dates[0] || null;
  }

  function tripTotals(trip) {
    var t = { total: 0, paid: 0, due: 0, toBook: 0, toPay: 0, items: 0 };
    (trip.items || []).forEach(function (item) {
      t.items++;
      t.total += itemTotal(item);
      t.paid += Math.min(itemPaid(item), itemTotal(item));
      t.due += itemDue(item);
      if (!item.booked) t.toBook++;
      if (item.booked && itemDue(item) > 0.005) t.toPay++;
    });
    return t;
  }

  // -------------------------------------------------------------- public API
  var Store = {
    uid: uid,
    clone: clone,

    init: function () {
      return openIdb().then(function (db) {
        idb = db;
        var local = migrate(readLocal());
        if (local) { state = local; return null; }
        return idbGet();
      }).then(function (fromIdb) {
        if (!state) {
          var recovered = migrate(fromIdb);
          state = recovered || emptyState();
          if (recovered) writeLocal(state);
        }
        if (navigator.storage && navigator.storage.persist) {
          navigator.storage.persisted().then(function (already) {
            if (!already) navigator.storage.persist();
          }).catch(function () {});
        }
        return state;
      });
    },

    get: function () { return state; },
    subscribe: function (fn) { listeners.push(fn); },
    save: save,

    settings: function () { return state.settings; },
    setSetting: function (key, value) { state.settings[key] = value; save(); },

    // ---- trips
    trips: function () { return state.trips; },

    activeTrip: function () {
      var id = state.activeTripId;
      var found = null;
      state.trips.forEach(function (t) { if (t.id === id) found = t; });
      if (!found && state.trips.length) {
        found = state.trips[0];
        state.activeTripId = found.id;
      }
      return found;
    },

    setActiveTrip: function (id) { state.activeTripId = id; save(); },

    addTrip: function (data) {
      var trip = {
        id: uid(),
        name: data.name || 'New trip',
        destination: data.destination || '',
        startDate: data.startDate || '',
        endDate: data.endDate || '',
        travellers: Number(data.travellers) || 2,
        currency: data.currency || state.settings.homeCurrency,
        notes: data.notes || '',
        createdAt: new Date().toISOString(),
        items: []
      };
      state.trips.push(trip);
      state.activeTripId = trip.id;
      save();
      return trip;
    },

    updateTrip: function (id, patch) {
      state.trips.forEach(function (t) {
        if (t.id === id) Object.keys(patch).forEach(function (k) { t[k] = patch[k]; });
      });
      save();
    },

    deleteTrip: function (id) {
      state.trips = state.trips.filter(function (t) { return t.id !== id; });
      if (state.activeTripId === id) {
        state.activeTripId = state.trips.length ? state.trips[0].id : null;
      }
      save();
    },

    duplicateTrip: function (id) {
      var src = null;
      state.trips.forEach(function (t) { if (t.id === id) src = t; });
      if (!src) return null;
      var copy = clone(src);
      copy.id = uid();
      copy.name = src.name + ' (copy)';
      copy.createdAt = new Date().toISOString();
      copy.items.forEach(function (item) {
        item.id = uid();
        item.booked = false;
        item.payments = (item.payments || []).map(function (p) {
          return { id: uid(), label: p.label, amount: p.amount, dueOn: '', paidOn: null };
        });
        item.ref = '';
        (item.legs || []).forEach(function (l) { l.id = uid(); l.ref = ''; });
      });
      state.trips.push(copy);
      state.activeTripId = copy.id;
      save();
      return copy;
    },

    // ---- items
    newItem: function (data) {
      return {
        id: uid(),
        title: data.title || 'Untitled',
        category: data.category || 'other',
        provider: data.provider || '',
        ref: data.ref || '',
        url: data.url || '',
        booked: !!data.booked,
        startDate: data.startDate || '',
        startTime: data.startTime || '',
        endDate: data.endDate || '',
        endTime: data.endTime || '',
        bookBy: data.bookBy || '',
        cancelBy: data.cancelBy || '',
        payWith: data.payWith || '',
        total: data.total == null ? null : Number(data.total),
        localCurrency: data.localCurrency || '',
        localAmount: data.localAmount == null ? null : Number(data.localAmount),
        included: !!data.included,
        notes: data.notes || '',
        payments: data.payments || [],
        legs: data.legs || [],
        createdAt: new Date().toISOString()
      };
    },

    addItem: function (tripId, data) {
      var trip = null;
      state.trips.forEach(function (t) { if (t.id === tripId) trip = t; });
      if (!trip) return null;
      var item = Store.newItem(data);
      trip.items.push(item);
      save();
      return item;
    },

    updateItem: function (tripId, itemId, patch) {
      var trip = null;
      state.trips.forEach(function (t) { if (t.id === tripId) trip = t; });
      if (!trip) return;
      trip.items.forEach(function (item) {
        if (item.id === itemId) {
          Object.keys(patch).forEach(function (k) { item[k] = patch[k]; });
        }
      });
      save();
    },

    deleteItem: function (tripId, itemId) {
      state.trips.forEach(function (t) {
        if (t.id === tripId) {
          t.items = t.items.filter(function (i) { return i.id !== itemId; });
        }
      });
      save();
    },

    findItem: function (tripId, itemId) {
      var found = null;
      state.trips.forEach(function (t) {
        if (t.id !== tripId) return;
        t.items.forEach(function (i) { if (i.id === itemId) found = i; });
      });
      return found;
    },

    // ---- derived
    itemTotal: itemTotal,
    itemPaid: itemPaid,
    itemDue: itemDue,
    itemSchedule: itemSchedule,
    itemPayState: itemPayState,
    itemSettled: itemSettled,
    itemNextDate: itemNextDate,
    itemOverpaid: itemOverpaid,
    tripTotals: tripTotals,

    // ---- backup
    exportData: function () {
      return JSON.stringify({
        app: 'holiday-tracker',
        exportedAt: new Date().toISOString(),
        schema: SCHEMA,
        state: state
      }, null, 2);
    },

    markExported: function () {
      state.settings.lastExport = new Date().toISOString();
      save();
    },

    importData: function (text, mode) {
      var parsed = JSON.parse(text);
      var incoming = parsed.state || parsed;
      incoming = migrate(incoming);
      if (!incoming) throw new Error('That file does not look like a holiday tracker backup.');
      if (mode === 'merge') {
        var existing = {};
        state.trips.forEach(function (t) { existing[t.id] = t; });
        incoming.trips.forEach(function (t) {
          if (existing[t.id]) t.id = uid();
          state.trips.push(t);
        });
      } else {
        state = incoming;
      }
      if (!state.activeTripId && state.trips.length) state.activeTripId = state.trips[0].id;
      save();
      return state;
    },

    snapshots: function () {
      try { return JSON.parse(localStorage.getItem(LS_SNAPSHOTS) || '[]'); }
      catch (e) { return []; }
    },

    restoreSnapshot: function (index) {
      var list = Store.snapshots();
      if (!list[index]) return false;
      state = migrate(list[index].data);
      save();
      return true;
    },

    replaceState: function (next) {
      state = migrate(next) || emptyState();
      save();
    },

    reset: function () {
      state = emptyState();
      save();
    }
  };

  global.Store = Store;
})(window);
