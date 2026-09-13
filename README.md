# Holiday Tracker

A small installable web app for keeping track of what is **booked** and what is
**paid for** across several holidays at once — multiple flights, multiple legs,
deposits, balances and free-cancellation deadlines.

No accounts, no server, no build step. Everything is stored on the device.

---

## Where it lives

**https://afjwilson.github.io/Wardrobe/**

Pushing to this branch runs `.github/workflows/deploy.yml`, which copies the
site into a `gh-pages` branch that GitHub serves. There is no build step — the
app is plain HTML, CSS and JavaScript, and every path in it is relative, so it
runs unchanged from a `/Wardrobe/` subpath.

If the URL 404s after the first deploy, Pages has not been pointed at the
branch yet: Settings → Pages → *Deploy from a branch* → `gh-pages` / `/ (root)`.
That is a one-off.

## Running it locally

It is a static site, so anything that serves files will do.

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

A service worker needs HTTPS or `localhost`, so opening `index.html` straight
off the disk works but without offline caching.

**Installing on a phone:** iPhone — Share → *Add to Home Screen*. Android —
browser menu → *Install app*. Installing also makes the browser far less likely
to evict the stored data.

---

## What it does

**Per trip** it shows the outstanding balance, the total, how much has been
paid, how many things are still unbooked and how many days are left.

**"Needs attention"** is the part that earns its keep: every deadline across
*every* trip, in date order — balances due, book-by dates and the last day of
free cancellation. Payments for a trip a year out often fall due before a
nearer trip has even been paid for, so it defaults to showing all trips at once.

**Each booking** records who it was booked through, the reference, the dates,
what it cost, which card paid for it, a free-cancellation deadline, and any
number of scheduled payments with their own due dates. Dates can carry clock
times as well, so airport parking reads "16 Nov 06:30 - 20 Nov 18:00" rather
than just the days. An instalment plan goes in as one operation: *Add repeating
payments* takes an amount, a first date and a count, and lays out the whole
monthly run, clamping the day where a month is too short. Flights, trains and transfers also take any number of legs,
each with a flight number, airports, times and an arrives-next-day flag.

Prices can be held in two currencies at once — the local price (€607) alongside
what it actually costs you (£519). Only the home-currency figure feeds the
totals; anything with a foreign price and no conversion is marked *Not in
total* so it cannot quietly disappear.

**The checklist** (bottom left) holds about eighty things people forget to book
up front, grouped by category, each with the lead time it is usually worth
sorting by. Tap one and it is added with a *book by* date worked out backwards
from the departure date. Starter packs — ski trip, road trip, with children,
pets and home, and so on — add a sensible group in one tap. Anything not in the
list goes in through **Add booking**.

---

## Reminders

Settings -> Notifications turns on reminders for payment due dates, book-by
dates and closing cancellation windows. Lead times are global and default to
**7 days and 1 day** before, choosable from 30/14/7/3/1/on-the-day, at an hour
you pick. Any booking can be muted from its editor, and any single instalment
from its payment screen; muted things keep their dates and simply stop
notifying.

**What actually fires, and when it does not.** With no server behind it, a PWA
has three possible mechanisms and Android grants different ones to different
devices, so all three are feature-detected and the Settings screen reports
which one this device got:

1. **Notification Triggers** - the system holds an exact timestamp and fires it
   whether or not the app is running. Best case, but not shipped in most Chrome
   builds.
2. **Periodic Background Sync** - the browser wakes the service worker roughly
   daily and anything now due is raised then. Granted only to installed apps
   that Chrome considers well used, so reminders can land hours after the hour
   you set.
3. **Neither** - reminders can only appear while the app is open.

The two test buttons exist because of that spread. "Send a test notification
now" proves permission and display. "Schedule a test for 60 seconds' time" goes
through the same scheduling call a real reminder uses, so if it arrives with
the app closed, real reminders will too - and if it refuses, this device does
not have exact scheduling. A worker diagnostic below them reports what the
service worker itself can see.

Reminder-building lives in `js/reminders.js`, loaded by the page with a script
tag and by `sw.js` with `importScripts`, so the background check and the
foreground schedule are computed by the same code.

---

## Your data, and not losing it

Bookings are written to `localStorage` and mirrored into IndexedDB, the app
asks the browser for persistent storage, and the last ten versions are kept as
automatic snapshots you can roll back to from Settings.

None of that survives *Clear browsing data*, deleting the app, or a lost phone.
**A backup file is the only copy that does.** Settings → *Save a backup file*
writes a dated `.json`; *Share or copy the backup* pushes it through the phone's
share sheet (email it to yourself, drop it in cloud storage) or falls back to
the clipboard. *Restore from a backup file* reads one back, either merging the
trips into what is already there or replacing everything.

Settings nags for a fresh backup after three weeks.

---

## About the seeded trips

Four trips are loaded on first run, transcribed from the original notepad:
Albufeira, Madeira at Christmas, the Madeira & Azores trip in January, and
Zanzibar. They can be cleared or reloaded from Settings.

Where the notepad was ambiguous, the item says so in its notes rather than
carrying an invented number. Search for `check` to find them:

- **Albufeira** — only the £231.60 balance was written down, not the full Jet2
  package price, so the total currently reads £231.60.
- **Madeira at Christmas** — the £576.00 deposit is inferred from £699.60 minus
  the £123.60 balance.
- **Madeira & Azores** — the three accommodation bookings come to €1044.04 /
  £893.90, but the notepad totals them at €1134.04 / £972.92. Roughly €90 / £79
  is unaccounted for; there is a to-do item about it.
- **Zanzibar** — the three instalments (£165 + £125 + £1529.18) add up to
  £1819.18 against a recorded price of £1694.18, so the app flags *Payments
  exceed the total*. The £165 and £1529.18 do sum exactly to £1694.18, which
  suggests the £125 due 16 Nov 2026 is something separate.
- The Azores airport is only ever written as "Azores" — the flight times fit
  Ponta Delgada, but it is left unconfirmed.

Payment status was not recorded for several items (the Premier Inn, both
Airparks bookings, the Leeds Bradford parking, the easyJet and Azores flights),
so they start as unpaid. Tap the amount on the right of a row to fix that in
two taps.

---

## Layout

```
.github/workflows/      publishes the site to the gh-pages branch
index.html              markup and the app shell
manifest.webmanifest    install metadata
sw.js                   offline cache (bump CACHE when files change)
css/styles.css          all styling, light and dark
js/catalog.js           categories, the forgotten-things library, starter packs
js/store.js             state, totals, persistence, export and import
js/reminders.js         reminder logic, shared with the service worker
js/notify.js            permissions, scheduling, capability detection, tests
js/seed.js              the four trips from the notepad
js/app.js               rendering and every sheet
icons/                  generated PNG icons
```

Plain browser JavaScript throughout — no dependencies and nothing to compile.
After changing any file under `css/` or `js/`, bump `CACHE` in `sw.js` so
installed copies pick the change up.
