/* Your four trips, transcribed from the notepad.
 *
 * Loaded once on first run. Anywhere the notepad was ambiguous the item carries
 * a note saying so rather than a quietly invented number — search the app for
 * "check" to find them all.
 */
(function (global) {
  'use strict';

  function id() { return Store.uid(); }

  function pay(label, amount, dueOn, paidOn) {
    return { id: id(), label: label, amount: amount, dueOn: dueOn || '', paidOn: paidOn || null };
  }

  function leg(o) {
    return {
      id: id(),
      carrier: o.carrier || '',
      number: o.number || '',
      from: o.from || '',
      to: o.to || '',
      date: o.date || '',
      depart: o.depart || '',
      arrive: o.arrive || '',
      plusDays: o.plusDays || 0,
      notes: o.notes || ''
    };
  }

  function trips() {
    return [
      // ------------------------------------------------------------ Albufeira
      {
        id: id(),
        name: 'Albufeira',
        destination: 'Albufeira, Portugal',
        startDate: '2026-11-16',
        endDate: '2026-11-20',
        travellers: 2,
        currency: 'GBP',
        notes: 'Jet2 package, self catering.',
        createdAt: new Date().toISOString(),
        items: [
          {
            title: 'Jet2 Holidays — Tropical Sol (self catering)',
            category: 'accommodation',
            provider: 'Jet2 Holidays',
            booked: true,
            startDate: '2026-11-16',
            endDate: '2026-11-20',
            total: 231.60,
            payments: [pay('Balance', 231.60, '2026-09-21')],
            notes: 'Self catering. 2 meals and seats included (−20%).\nNotepad only recorded the £231.60 balance due, not the full package price — check and update the total.'
          },
          {
            title: 'Flights — Luton ⇄ Faro',
            category: 'flights',
            provider: 'Jet2',
            booked: true,
            included: true,
            startDate: '2026-11-16',
            endDate: '2026-11-20',
            notes: 'Seats booked. 2 meals included. Part of the Jet2 package.',
            legs: [
              leg({ carrier: 'Jet2', number: 'LS3831', from: 'LTN', to: 'FAO', date: '2026-11-16', depart: '09:30', arrive: '12:25' }),
              leg({ carrier: 'Jet2', number: 'LS3832', from: 'FAO', to: 'LTN', date: '2026-11-20', depart: '13:25', arrive: '16:20' })
            ]
          },
          {
            title: 'Premier Inn Stevenage North',
            category: 'accommodation',
            provider: 'Premier Inn',
            booked: true,
            startDate: '2026-11-15',
            endDate: '2026-11-16',
            total: 35,
            payments: [],
            notes: 'Night before the flight. Check whether this was already paid at booking.'
          },
          {
            title: 'Airparks Drop & Go — Luton',
            category: 'transport',
            provider: 'Holiday Extras',
            booked: true,
            startDate: '2026-11-16',
            endDate: '2026-11-20',
            total: 24.40,
            payments: [],
            notes: 'Drop & Go. Check whether this was already paid at booking.'
          }
        ]
      },

      // -------------------------------------------------------------- Madeira
      {
        id: id(),
        name: 'Madeira — Christmas',
        destination: 'Funchal, Madeira',
        startDate: '2026-12-17',
        endDate: '2026-12-24',
        travellers: 2,
        currency: 'GBP',
        notes: 'Notepad total: £766 (package £699.60 + parking £66.40), plus the £54 Leeds hotel.',
        createdAt: new Date().toISOString(),
        items: [
          {
            title: 'Jet2 Holidays — Dorisol Florasol',
            category: 'accommodation',
            provider: 'Jet2 Holidays',
            booked: true,
            startDate: '2026-12-17',
            endDate: '2026-12-24',
            total: 699.60,
            payments: [
              pay('Deposit', 576.00, '', 'paid'),
              pay('Balance', 123.60, '2026-10-22')
            ],
            notes: 'Hotel + flights + seats + meals.\nDeposit inferred as £699.60 − £123.60 = £576.00 — correct it if the real deposit was different.'
          },
          {
            title: 'Flights — Leeds Bradford ⇄ Funchal',
            category: 'flights',
            provider: 'Jet2',
            booked: true,
            included: true,
            startDate: '2026-12-17',
            endDate: '2026-12-24',
            notes: 'Seats + meals included in the Jet2 package.',
            legs: [
              leg({ carrier: 'Jet2', number: 'LS425', from: 'LBA', to: 'FNC', date: '2026-12-17', depart: '09:00', arrive: '13:05' }),
              leg({ carrier: 'Jet2', number: 'LS426', from: 'FNC', to: 'LBA', date: '2026-12-24', depart: '13:55', arrive: '17:55' })
            ]
          },
          {
            title: 'Westwood Hall Estate, Leeds',
            category: 'accommodation',
            provider: 'Booking.com',
            booked: true,
            startDate: '2026-12-16',
            endDate: '2026-12-17',
            total: 54,
            cancelBy: '2026-12-13',
            payments: [pay('Balance', 54, '2026-12-12')],
            notes: 'Night before the flight. Free cancellation until 13 Dec, 23:59.'
          },
          {
            title: 'Leeds Bradford long stay parking',
            category: 'transport',
            provider: 'Booked direct',
            booked: true,
            startDate: '2026-12-17',
            startTime: '06:30',
            endDate: '2026-12-24',
            endTime: '19:00',
            total: 66.40,
            payments: [],
            notes: 'Booked direct with the airport.'
          }
        ]
      },

      // ----------------------------------------------- Madeira & Azores, long
      {
        id: id(),
        name: 'Madeira & Azores',
        destination: 'Madeira, then the Azores',
        startDate: '2027-01-20',
        endDate: '2027-02-08',
        travellers: 2,
        currency: 'GBP',
        notes: 'Notepad totals: accommodation €1134.04 / £972.92, Azores flights €153.12 / £131.37, easyJet £182.10.',
        createdAt: new Date().toISOString(),
        items: [
          {
            title: 'easyJet — Luton ⇄ Funchal',
            category: 'flights',
            provider: 'Trip.com',
            ref: 'U22471 / U22472',
            booked: true,
            startDate: '2027-01-20',
            endDate: '2027-02-08',
            total: 182.10,
            payments: [],
            notes: '15kg hold case + personal item. Seats booked, £18.',
            legs: [
              leg({ carrier: 'easyJet', number: 'U22471', from: 'LTN', to: 'FNC', date: '2027-01-20', depart: '08:10', arrive: '12:00' }),
              leg({ carrier: 'easyJet', number: 'U22472', from: 'FNC', to: 'LTN', date: '2027-02-08', depart: '18:15', arrive: '22:00' })
            ]
          },
          {
            title: 'Calheta apartment',
            category: 'accommodation',
            provider: 'Booking.com',
            booked: true,
            startDate: '2027-01-20',
            endDate: '2027-01-30',
            total: 519,
            localCurrency: 'EUR',
            localAmount: 607,
            cancelBy: '2026-12-20',
            payWith: 'Chase cc',
            payments: [pay('Balance', 519, '2026-12-19')],
            notes: 'Free cancellation until 20 Dec 2026.'
          },
          {
            title: 'Azores accommodation',
            category: 'accommodation',
            provider: 'Booking.com',
            booked: true,
            startDate: '2027-01-30',
            endDate: '2027-02-06',
            total: 265.15,
            localCurrency: 'EUR',
            localAmount: 309.10,
            cancelBy: '2026-12-30',
            payWith: 'Chase cc',
            payments: [pay('Balance', 265.15, '2026-12-29')],
            notes: 'Free cancellation until 30 Dec 2026.'
          },
          {
            title: 'Caniçal apartment',
            category: 'accommodation',
            provider: 'Booking.com',
            booked: true,
            startDate: '2027-02-06',
            endDate: '2027-02-08',
            total: 109.75,
            localCurrency: 'EUR',
            localAmount: 127.94,
            cancelBy: '2027-01-06',
            payWith: 'Chase cc',
            payments: [pay('Balance', 109.75, '2027-01-05')],
            notes: 'Free cancellation until 6 Jan 2027.'
          },
          {
            title: 'Azores Airlines — Funchal ⇄ Azores',
            category: 'flights',
            provider: 'Azores Airlines',
            booked: true,
            startDate: '2027-01-30',
            endDate: '2027-02-06',
            total: 131.37,
            localCurrency: 'EUR',
            localAmount: 153.12,
            payments: [],
            notes: 'Confirm which Azores airport — the notepad only said "Azores".',
            legs: [
              leg({ carrier: 'Azores Airlines', number: 'S4263', from: 'FNC', to: 'Azores', date: '2027-01-30', depart: '11:55', arrive: '12:45' }),
              leg({ carrier: 'Azores Airlines', number: 'S4160', from: 'Azores', to: 'FNC', date: '2027-02-06', depart: '08:25', arrive: '11:05' })
            ]
          },
          {
            title: 'The Luton hotel',
            category: 'accommodation',
            provider: 'Expedia',
            booked: true,
            startDate: '2027-01-19',
            endDate: '2027-01-20',
            total: 50,
            cancelBy: '2027-01-19',
            payments: [],
            notes: 'Night before the flight. Cancellable until the 19th. −11% via Expedia.'
          },
          {
            title: 'Airparks Drop & Go + Car Care — Luton',
            category: 'transport',
            provider: 'Holiday Extras',
            booked: true,
            startDate: '2027-01-20',
            endDate: '2027-02-08',
            total: 52,
            payments: [],
            notes: 'Drop and go with car care. −19%.'
          },
          {
            title: 'Car hire',
            category: 'transport',
            booked: false,
            bookBy: '2026-10-22',
            notes: 'Notepad: "Car hire to book". Book early with free cancellation and rebook if the price drops.'
          },
          {
            title: 'Switch Booking.com card to Chase',
            category: 'money',
            booked: false,
            bookBy: '2026-12-18',
            notes: 'Notepad: "Chase cc — change before b.com payments". The first Booking.com charge is 19 Dec 2026, so this needs doing before then.'
          },
          {
            title: 'Check the accommodation total — about €90 unaccounted',
            category: 'other',
            booked: false,
            bookBy: '2026-12-01',
            notes: 'The notepad totals accommodation at €1134.04 / £972.92, but Calheta + Azores + Caniçal come to €1044.04 / £893.90. About €90 / £79 is unaccounted for — either a fourth booking that never made it into the notes, or a slip in the addition.'
          }
        ]
      },

      // ------------------------------------------------------------- Zanzibar
      {
        id: id(),
        name: 'Zanzibar',
        destination: 'Zanzibar, Tanzania',
        startDate: '2027-11-10',
        endDate: '2027-11-17',
        travellers: 2,
        currency: 'GBP',
        notes: 'TUI package, all inclusive.',
        createdAt: new Date().toISOString(),
        items: [
          {
            title: 'TUI — Zanzibar Bay Resort (all inclusive)',
            category: 'accommodation',
            provider: 'TUI',
            booked: true,
            startDate: '2027-11-10',
            endDate: '2027-11-17',
            total: 1694.18,
            payments: [
              pay('Deposit', 165, '2026-08-23', '2026-08-23'),
              pay('Instalment', 125, '2026-11-16'),
              pay('Balance', 1529.18, '2027-08-18')
            ],
            notes: 'All inclusive, extra legroom seats.\nCheck: the three instalments add up to £1,819.18, which is £125 more than the £1,694.18 price recorded. Either the price is higher than noted or the £125 due 16 Nov 26 covers something else.'
          },
          {
            title: 'Flights — Gatwick ⇄ Zanzibar',
            category: 'flights',
            provider: 'TUI Airways',
            booked: true,
            included: true,
            startDate: '2027-11-10',
            endDate: '2027-11-17',
            notes: 'Gatwick North Terminal. Extra legroom seats booked. Included in the TUI package.',
            legs: [
              leg({ carrier: 'TUI', number: 'TOM068', from: 'LGW', to: 'ZNZ', date: '2027-11-10', depart: '08:30', arrive: '21:00', notes: 'North Terminal' }),
              leg({ carrier: 'TUI', number: 'TOM069', from: 'ZNZ', to: 'LGW', date: '2027-11-17', depart: '23:00', arrive: '05:45', plusDays: 1 })
            ]
          },
          {
            title: 'Zanzibar visa',
            category: 'documents',
            url: 'https://visitzanzibar.go.tz',
            booked: false,
            bookBy: '2027-08-22',
            localCurrency: 'USD',
            localAmount: 50,
            notes: 'Notepad: apply 80 days before travel, $50. 80 days before 10 Nov 2027 is 22 Aug 2027.'
          },
          {
            title: 'Zanzibar travel insurance (mandatory)',
            category: 'documents',
            booked: false,
            bookBy: '2027-10-11',
            localCurrency: 'USD',
            localAmount: 44,
            notes: 'Notepad: "$44". Zanzibar requires its own inbound cover on top of any UK policy.'
          },
          {
            title: 'Travel to Gatwick — train or parking',
            category: 'transport',
            booked: false,
            bookBy: '2027-09-10',
            notes: 'Notepad: "Travel to Gatwick / train / parking" — still to decide and book.'
          }
        ]
      }
    ];
  }

  global.Seed = {
    load: function () {
      var state = Store.get();
      var built = trips().map(function (t) {
        t.items = t.items.map(function (raw) {
          var item = Store.newItem(raw);
          item.payments = raw.payments || [];
          item.legs = raw.legs || [];
          return item;
        });
        return t;
      });
      state.trips = state.trips.concat(built);
      state.activeTripId = built[0].id;
      state.settings.seeded = true;
      Store.save();
    }
  };
})(window);
