/* Offline shell and background reminders. Bump CACHE when the app files change. */
var CACHE = 'holidays-v5';

importScripts('./js/reminders.js');

var SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/catalog.js',
  './js/store.js',
  './js/seed.js',
  './js/reminders.js',
  './js/notify.js',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(SHELL);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        return key === CACHE ? null : caches.delete(key);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Stale-while-revalidate: instant offline start, quietly picks up new versions. */
self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== location.origin) return;

  event.respondWith(
    caches.match(request).then(function (cached) {
      var network = fetch(request).then(function (response) {
        if (response && response.status === 200 && response.type === 'basic') {
          var copy = response.clone();
          caches.open(CACHE).then(function (cache) { cache.put(request, copy); });
        }
        return response;
      }).catch(function () {
        return cached || caches.match('./index.html');
      });
      return cached || network;
    })
  );
});

// ------------------------------------------------------------- reminder data
function idbGet(dbName, version, store, key, upgrade) {
  return new Promise(function (resolve) {
    var req;
    try { req = indexedDB.open(dbName, version); } catch (e) { return resolve(null); }
    req.onupgradeneeded = function () {
      if (upgrade && !req.result.objectStoreNames.contains(store)) {
        req.result.createObjectStore(store);
      }
    };
    req.onsuccess = function () {
      var db = req.result;
      if (!db.objectStoreNames.contains(store)) return resolve(null);
      try {
        var r = db.transaction(store, 'readonly').objectStore(store).get(key);
        r.onsuccess = function () { resolve(r.result || null); };
        r.onerror = function () { resolve(null); };
      } catch (e) { resolve(null); }
    };
    req.onerror = function () { resolve(null); };
  });
}

function idbPut(dbName, store, key, value) {
  return new Promise(function (resolve) {
    var req;
    try { req = indexedDB.open(dbName, 1); } catch (e) { return resolve(false); }
    req.onupgradeneeded = function () {
      if (!req.result.objectStoreNames.contains(store)) req.result.createObjectStore(store);
    };
    req.onsuccess = function () {
      try {
        var tx = req.result.transaction(store, 'readwrite');
        tx.objectStore(store).put(value, key);
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { resolve(false); };
      } catch (e) { resolve(false); }
    };
    req.onerror = function () { resolve(false); };
  });
}

/* The fallback path: the browser wakes us occasionally, we look for anything
   whose reminder time has passed and that we have not already raised.
   Reminders older than three days are dropped rather than arriving as a
   surprise pile after the app has been left alone for a while. */
function runBackgroundCheck() {
  return Promise.all([
    idbGet('holidays', 1, 'state', 'current', false),
    idbGet('holidays-notify', 1, 'meta', 'sent', true)
  ]).then(function (results) {
    var state = results[0];
    var sent = results[1] || {};
    if (!state || !state.trips) return;

    var now = Date.now();
    var due = self.Reminders.due(state, sent, now);
    if (!due.length) return 0;

    return Promise.all(due.map(function (e) {
      sent[e.key] = now;
      return self.registration.showNotification(e.title, {
        tag: e.key,
        body: e.body,
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        data: { tripId: e.tripId, itemId: e.itemId }
      }).catch(function () {});
    })).then(function () {
      // Forget keys well past their moment so the record cannot grow forever.
      Object.keys(sent).forEach(function (k) {
        if (sent[k] < now - 90 * 24 * 60 * 60 * 1000) delete sent[k];
      });
      return idbPut('holidays-notify', 'meta', 'sent', sent).then(function () {
        return due.length;
      });
    });
  }).catch(function () { return 0; });
}

self.addEventListener('periodicsync', function (event) {
  if (event.tag === 'holidays-reminders') event.waitUntil(runBackgroundCheck());
});

self.addEventListener('sync', function (event) {
  if (event.tag === 'holidays-reminders') event.waitUntil(runBackgroundCheck());
});

self.addEventListener('message', function (event) {
  var msg = event.data || {};

  if (msg.type === 'check-reminders') {
    var port = event.ports && event.ports[0];
    event.waitUntil(
      runBackgroundCheck().then(function (raised) {
        if (port) port.postMessage({ raised: raised || 0 });
      })
    );
    return;
  }

  /* Diagnostics, so the Settings screen can report what the worker itself
     sees rather than what the page assumes. */
  if (msg.type === 'ping') {
    var reply = event.ports && event.ports[0];
    if (!reply) return;
    event.waitUntil(
      idbGet('holidays', 1, 'state', 'current', false).then(function (state) {
        return idbGet('holidays-notify', 1, 'meta', 'sent', true).then(function (sent) {
          reply.postMessage({
            remindersLoaded: typeof self.Reminders !== 'undefined',
            stateVisible: !!(state && state.trips),
            enabled: state ? self.Reminders.config(state).enabled : false,
            queued: state ? self.Reminders.build(state).filter(function (e) {
              return e.fireAt > Date.now();
            }).length : 0,
            dueNow: state ? self.Reminders.due(state, sent || {}, Date.now()).length : 0,
            alreadySent: Object.keys(sent || {}).length
          });
        });
      }).catch(function (err) {
        reply.postMessage({ error: String(err && err.message) });
      })
    );
  }
});

/* Tapping a reminder should land in the app, reusing a window if one is open. */
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var target = new URL('./', self.location.href).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url.indexOf(target) === 0 && 'focus' in list[i]) {
          if (event.notification.data && list[i].postMessage) {
            list[i].postMessage({ type: 'reminder-opened', data: event.notification.data });
          }
          return list[i].focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
