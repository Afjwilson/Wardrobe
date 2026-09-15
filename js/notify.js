/* Notification plumbing.
 *
 * A PWA with no server has three ways to raise a reminder while it is closed,
 * and Android support for each varies by Chrome version and by how the app was
 * installed. Rather than pick one and hope, all three are feature-detected and
 * the Settings screen reports which one this device actually granted:
 *
 *   1. Notification Triggers  - the OS holds an exact timestamp. Best case.
 *   2. Periodic Background Sync - the browser wakes the worker roughly daily
 *      and anything now due is raised then. Approximate, but survives closing.
 *   3. Neither - reminders can only appear while the app is open.
 *
 * The test button deliberately goes through the same path as a real reminder,
 * because scheduling is the part that varies, not the displaying.
 */
(function (global) {
  'use strict';

  var DB_NAME = 'holidays-notify';
  var DB_STORE = 'meta';
  var SYNC_TAG = 'holidays-reminders';
  var MAX_SCHEDULED = 60;

  var Notify = {};
  global.Notify = Notify;

  // ------------------------------------------------------------ capabilities
  function hasTriggers() {
    return typeof Notification !== 'undefined' &&
      'showTrigger' in Notification.prototype &&
      typeof global.TimestampTrigger === 'function';
  }

  function supported() {
    return typeof Notification !== 'undefined' && 'serviceWorker' in navigator;
  }

  function permission() {
    return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
  }

  function registration() {
    if (!('serviceWorker' in navigator)) return Promise.resolve(null);
    return navigator.serviceWorker.ready.catch(function () { return null; });
  }

  // ------------------------------------------------------- notified-key store
  function openDb() {
    return new Promise(function (resolve) {
      if (!global.indexedDB) return resolve(null);
      var req;
      try { req = indexedDB.open(DB_NAME, 1); } catch (e) { return resolve(null); }
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { resolve(null); };
    });
  }

  // -------------------------------------------------------------- scheduling
  /* Replace every reminder this app previously scheduled with a fresh set.
     Triggered notifications carry our tag prefix so nothing else is touched. */
  function reschedule() {
    var state = Store.get();
    var cfg = Reminders.config(state);

    if (!supported() || permission() !== 'granted' || !cfg.enabled) {
      return Promise.resolve({ scheduled: 0, reason: 'off' });
    }

    return registration().then(function (reg) {
      if (!reg) return { scheduled: 0, reason: 'no-worker' };

      return clearScheduled(reg).then(function () {
        if (!hasTriggers()) return { scheduled: 0, reason: 'no-triggers' };

        var now = Date.now();
        var events = Reminders.build(state).filter(function (e) {
          return e.fireAt > now;
        }).slice(0, MAX_SCHEDULED);

        return Promise.all(events.map(function (e) {
          return reg.showNotification(e.title, {
            tag: e.key,
            body: e.body,
            icon: 'icons/icon-192.png',
            badge: 'icons/icon-192.png',
            showTrigger: new global.TimestampTrigger(e.fireAt),
            data: { tripId: e.tripId, itemId: e.itemId },
            requireInteraction: false
          }).catch(function () {});
        })).then(function () {
          return { scheduled: events.length, reason: 'triggers' };
        });
      });
    });
  }

  function clearScheduled(reg) {
    var opts = { includeTriggered: true };
    var got;
    try { got = reg.getNotifications(opts); } catch (e) { got = reg.getNotifications(); }
    return Promise.resolve(got).then(function (list) {
      (list || []).forEach(function (n) {
        if (n.tag && n.tag.indexOf(Reminders.TAG_PREFIX) === 0) n.close();
      });
    }).catch(function () {});
  }

  /* Ask the browser to wake the worker periodically. Chrome only grants this
     to installed apps it considers well used, and silently declines otherwise. */
  function registerPeriodicSync() {
    return registration().then(function (reg) {
      if (!reg || !('periodicSync' in reg)) return false;
      var ask = navigator.permissions
        ? navigator.permissions.query({ name: 'periodic-background-sync' }).catch(function () { return null; })
        : Promise.resolve(null);

      return ask.then(function (status) {
        if (status && status.state === 'denied') return false;
        return reg.periodicSync.register(SYNC_TAG, { minInterval: 12 * 60 * 60 * 1000 })
          .then(function () { return true; })
          .catch(function () { return false; });
      });
    });
  }

  function periodicSyncActive() {
    return registration().then(function (reg) {
      if (!reg || !('periodicSync' in reg)) return false;
      return reg.periodicSync.getTags()
        .then(function (tags) { return tags.indexOf(SYNC_TAG) !== -1; })
        .catch(function () { return false; });
    });
  }

  // ------------------------------------------------------------------- tests
  /* Straight through the worker, exactly as a real reminder is displayed. */
  function testNow() {
    if (permission() !== 'granted') {
      return Promise.reject(new Error('Notifications are not allowed yet.'));
    }
    return registration().then(function (reg) {
      if (!reg) throw new Error('The offline worker is not running yet.');
      return reg.showNotification('Test reminder', {
        tag: Reminders.TAG_PREFIX + 'test:now',
        body: 'If you can see this, notifications work on this device.',
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        data: {}
      });
    });
  }

  /* The one that matters: schedules through the same trigger path the real
     reminders use, so a failure here is a genuine failure of scheduling. */
  function testScheduled(seconds) {
    if (permission() !== 'granted') {
      return Promise.reject(new Error('Notifications are not allowed yet.'));
    }
    if (!hasTriggers()) {
      return Promise.reject(new Error('no-triggers'));
    }
    return registration().then(function (reg) {
      if (!reg) throw new Error('The offline worker is not running yet.');
      var at = Date.now() + seconds * 1000;
      return reg.showNotification('Scheduled test reminder', {
        tag: Reminders.TAG_PREFIX + 'test:scheduled',
        body: 'Scheduled ' + seconds + ' seconds ago through the same path as a real reminder. ' +
          'Close the app and it should still arrive.',
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        showTrigger: new global.TimestampTrigger(at),
        data: {}
      });
    });
  }

  // ------------------------------------------------------------------ status
  /* A plain-language account of what will actually happen on this device. */
  function status() {
    var state = Store.get();
    var cfg = Reminders.config(state);
    var out = {
      supported: supported(),
      permission: permission(),
      enabled: cfg.enabled,
      triggers: hasTriggers(),
      periodicSync: false,
      pending: 0,
      upcoming: []
    };

    if (!out.supported) {
      out.summary = 'This browser cannot show notifications at all.';
      return Promise.resolve(out);
    }

    var now = Date.now();
    out.upcoming = Reminders.build(state).filter(function (e) { return e.fireAt > now; });
    out.pending = out.upcoming.length;

    return periodicSyncActive().then(function (active) {
      out.periodicSync = active;

      if (out.permission !== 'granted') {
        out.summary = 'Notifications are not allowed yet.';
      } else if (!cfg.enabled) {
        out.summary = 'Reminders are switched off.';
      } else if (out.triggers) {
        out.summary = 'Exact scheduling is available — reminders are handed to ' +
          'the system and arrive whether or not the app is open.';
        out.quality = 'good';
      } else if (out.periodicSync) {
        out.summary = 'Exact scheduling is not available on this browser, so the app ' +
          'falls back to a background check roughly once a day. Reminders can arrive ' +
          'a few hours later than the time you set.';
        out.quality = 'ok';
      } else {
        out.summary = 'This browser grants neither exact scheduling nor background ' +
          'checks, so reminders can only appear while the app is open. Installing it ' +
          'to the home screen is what usually unlocks background checks.';
        out.quality = 'poor';
      }
      return out;
    });
  }

  // -------------------------------------------------------------- public API
  Notify.supported = supported;
  Notify.permission = permission;
  Notify.hasTriggers = hasTriggers;
  Notify.status = status;
  Notify.reschedule = reschedule;
  Notify.testNow = testNow;
  Notify.testScheduled = testScheduled;
  Notify.registerPeriodicSync = registerPeriodicSync;

  Notify.request = function () {
    if (!supported()) return Promise.resolve('unsupported');
    return Notification.requestPermission().then(function (result) {
      if (result === 'granted') registerPeriodicSync();
      return result;
    });
  };

  /* Called on load and after any change to the data, debounced so a burst of
     edits results in one rebuild. */
  var pending = null;
  Notify.sync = function () {
    clearTimeout(pending);
    pending = setTimeout(function () {
      reschedule().catch(function () {});
    }, 1200);
  };

  Notify.clearAll = function () {
    return registration().then(function (reg) {
      return reg ? clearScheduled(reg) : null;
    });
  };

  Notify.openDb = openDb;

  /* Run exactly what Android runs when it wakes the worker. On a device
     without exact scheduling this is the path real reminders take, so it is
     the meaningful thing to test. */
  Notify.runBackgroundCheck = function () {
    return registration().then(function (reg) {
      if (!reg || !reg.active) throw new Error('The offline worker is not running yet.');
      return new Promise(function (resolve) {
        var channel = new MessageChannel();
        var done = false;
        channel.port1.onmessage = function (event) {
          done = true;
          resolve((event.data || {}).raised || 0);
        };
        reg.active.postMessage({ type: 'check-reminders' }, [channel.port2]);
        setTimeout(function () { if (!done) resolve(null); }, 5000);
      });
    });
  };

  /* Ask the worker what it can see. Worth surfacing on the device itself,
     because the page and the worker can disagree about state. */
  Notify.workerPing = function () {
    return registration().then(function (reg) {
      if (!reg || !reg.active) return null;
      return new Promise(function (resolve) {
        var channel = new MessageChannel();
        var done = false;
        channel.port1.onmessage = function (event) {
          done = true;
          resolve(event.data);
        };
        reg.active.postMessage({ type: 'ping' }, [channel.port2]);
        setTimeout(function () { if (!done) resolve(null); }, 3000);
      });
    }).catch(function () { return null; });
  };
})(window);
