/* Categories and the library of things people commonly forget to book up front. */
(function (global) {
  'use strict';

  var CATEGORIES = [
    { id: 'flights',       label: 'Flights',            icon: '✈️', legs: true },
    { id: 'accommodation', label: 'Accommodation',      icon: '🏨' },
    { id: 'transport',     label: 'Transport & parking', icon: '🚗', legs: true },
    { id: 'activities',    label: 'Activities & tickets', icon: '🎫' },
    { id: 'food',          label: 'Food & drink',        icon: '🍽️' },
    { id: 'extras',        label: 'Travel extras',       icon: '🧳' },
    { id: 'documents',     label: 'Documents & admin',   icon: '🛂', task: true },
    { id: 'money',         label: 'Money & phone',       icon: '💳', task: true },
    { id: 'health',        label: 'Health & packing',    icon: '💊', task: true },
    { id: 'home',          label: 'Home & pets',         icon: '🏡', task: true },
    { id: 'other',         label: 'Other',               icon: '📌' }
  ];

  /* leadDays = how many days before departure this is usually worth sorting.
     Used to suggest a "book by" date when you add it from the checklist. */
  var SUGGESTIONS = [
    // ---- Documents & admin -------------------------------------------------
    { id: 'passport-check', cat: 'documents', title: 'Check passport expiry (6+ months left)', lead: 180, hint: 'Many countries refuse entry inside 6 months of expiry.' },
    { id: 'passport-renew', cat: 'documents', title: 'Renew passport', lead: 120, hint: 'Allow far longer than the quoted time in peak season.' },
    { id: 'name-match', cat: 'documents', title: 'Check booking names match passports exactly', lead: 90, hint: 'Airlines charge a lot to correct a name later.' },
    { id: 'visa', cat: 'documents', title: 'Apply for visa / entry permit', lead: 90, hint: 'Some are issued in minutes, some take weeks.' },
    { id: 'esta', cat: 'documents', title: 'ESTA / eTA / ETIAS authorisation', lead: 30, hint: 'Needed before you can even board.' },
    { id: 'insurance', cat: 'documents', title: 'Travel insurance', lead: 150, hint: 'Buy when you book — cancellation cover starts from day one.' },
    { id: 'ghic', cat: 'documents', title: 'GHIC / EHIC card', lead: 60, hint: 'Free. Not a substitute for insurance.' },
    { id: 'idp', cat: 'documents', title: 'International Driving Permit', lead: 30, hint: 'Post Office, over the counter, needed in some countries.' },
    { id: 'dvla-code', cat: 'documents', title: 'DVLA licence check code for car hire', lead: 14, hint: 'Only valid 21 days — generate it close to travel.' },
    { id: 'doc-copies', cat: 'documents', title: 'Save offline copies of all bookings', lead: 7, hint: 'Screenshots work when the airport wifi does not.' },
    { id: 'leave-booked', cat: 'documents', title: 'Book time off work / check term dates', lead: 200 },

    // ---- Flights -----------------------------------------------------------
    { id: 'flight-out', cat: 'flights', title: 'Outbound flights', lead: 150 },
    { id: 'flight-back', cat: 'flights', title: 'Return flights', lead: 150 },
    { id: 'flight-internal', cat: 'flights', title: 'Internal / connecting flights', lead: 90, hint: 'Leave a sensible gap if they are separate tickets.' },
    { id: 'seats', cat: 'flights', title: 'Seat selection', lead: 60, hint: 'Cheaper when booked with the flight than added later.' },
    { id: 'bags', cat: 'flights', title: 'Checked baggage allowance', lead: 60, hint: 'Always cheaper online than at the airport desk.' },
    { id: 'sports-kit', cat: 'flights', title: 'Skis / golf clubs / bike / pushchair in the hold', lead: 45, hint: 'Limited spaces per flight — they do sell out.' },
    { id: 'meals', cat: 'flights', title: 'In-flight meals / dietary requirements', lead: 21 },
    { id: 'assistance', cat: 'flights', title: 'Special assistance', lead: 30, hint: 'Request at least 48 hours ahead.' },
    { id: 'infant', cat: 'flights', title: 'Add infant / child to booking', lead: 60 },
    { id: 'checkin', cat: 'flights', title: 'Online check-in opens', lead: 2, hint: 'Usually 24–48 hours before departure.' },

    // ---- Accommodation -----------------------------------------------------
    { id: 'hotel', cat: 'accommodation', title: 'Hotel / villa / apartment', lead: 150 },
    { id: 'hotel-balance', cat: 'accommodation', title: 'Pay accommodation balance', lead: 60 },
    { id: 'night-before', cat: 'accommodation', title: 'Hotel near the airport the night before', lead: 60, hint: 'Worth it for anything before about 8am.' },
    { id: 'extra-nights', cat: 'accommodation', title: 'Extra nights either side of the flights', lead: 90 },
    { id: 'cot-bed', cat: 'accommodation', title: 'Cot / extra bed / connecting rooms', lead: 30 },
    { id: 'early-checkin', cat: 'accommodation', title: 'Early check-in or late check-out', lead: 14 },
    { id: 'tourist-tax', cat: 'accommodation', title: 'Tourist tax / resort fee', lead: 7, hint: 'Usually paid in cash on arrival and not in the headline price.' },
    { id: 'meal-plan', cat: 'accommodation', title: 'Board basis / meal plan upgrade', lead: 45 },

    // ---- Transport & parking ----------------------------------------------
    { id: 'airport-parking', cat: 'transport', title: 'Airport parking', lead: 60, hint: 'Prices climb steeply in the last month.' },
    { id: 'lift-airport', cat: 'transport', title: 'Lift / taxi / train to the airport', lead: 21 },
    { id: 'transfer-in', cat: 'transport', title: 'Airport transfer — arrival', lead: 30 },
    { id: 'transfer-out', cat: 'transport', title: 'Airport transfer — departure', lead: 30 },
    { id: 'car-hire', cat: 'transport', title: 'Car hire', lead: 90, hint: 'Book early and free-cancel; rebook if it drops.' },
    { id: 'car-excess', cat: 'transport', title: 'Car hire excess insurance', lead: 30, hint: 'A standalone annual policy is far cheaper than the desk.' },
    { id: 'car-seat', cat: 'transport', title: 'Child car seat / booster', lead: 30 },
    { id: 'extra-driver', cat: 'transport', title: 'Additional driver', lead: 30 },
    { id: 'train', cat: 'transport', title: 'Train tickets / rail pass', lead: 84, hint: 'Advance fares release about 12 weeks out.' },
    { id: 'ferry', cat: 'transport', title: 'Ferry crossing', lead: 90 },
    { id: 'tolls', cat: 'transport', title: 'Tolls / vignette / clean-air sticker', lead: 21, hint: 'France, Germany and Switzerland all want one.' },
    { id: 'transit-pass', cat: 'transport', title: 'Local travel pass / metro card', lead: 14 },
    { id: 'breakdown', cat: 'transport', title: 'European breakdown cover', lead: 21 },
    { id: 'car-service', cat: 'transport', title: 'Service / check own car before driving', lead: 21 },

    // ---- Activities & tickets ---------------------------------------------
    { id: 'attraction', cat: 'activities', title: 'Headline attraction tickets (timed entry)', lead: 60, hint: 'The famous ones sell out months ahead.' },
    { id: 'theme-park', cat: 'activities', title: 'Theme park tickets', lead: 45 },
    { id: 'tours', cat: 'activities', title: 'Tours & excursions', lead: 45 },
    { id: 'lift-pass', cat: 'activities', title: 'Ski lift passes', lead: 60 },
    { id: 'ski-hire', cat: 'activities', title: 'Ski / snowboard hire', lead: 45 },
    { id: 'ski-school', cat: 'activities', title: 'Ski school / lessons', lead: 60, hint: 'Half-term and Christmas weeks go first.' },
    { id: 'event', cat: 'activities', title: 'Show / match / event tickets', lead: 60 },
    { id: 'spa', cat: 'activities', title: 'Spa treatments', lead: 21 },
    { id: 'golf', cat: 'activities', title: 'Golf tee times', lead: 45 },
    { id: 'watersports', cat: 'activities', title: 'Diving / watersports', lead: 30 },
    { id: 'city-pass', cat: 'activities', title: 'Museum / city pass', lead: 21 },

    // ---- Food & drink ------------------------------------------------------
    { id: 'restaurant', cat: 'food', title: 'Special occasion restaurant', lead: 45 },
    { id: 'festive-meal', cat: 'food', title: 'Christmas / New Year dinner', lead: 75, hint: 'Resorts take these bookings very early.' },
    { id: 'grocery-delivery', cat: 'food', title: 'Supermarket delivery to the villa', lead: 14 },

    // ---- Travel extras -----------------------------------------------------
    { id: 'lounge', cat: 'extras', title: 'Airport lounge', lead: 21 },
    { id: 'fast-track', cat: 'extras', title: 'Fast track security', lead: 14 },
    { id: 'luggage-buy', cat: 'extras', title: 'Buy / repair a suitcase', lead: 30 },
    { id: 'luggage-scales', cat: 'extras', title: 'Luggage scales', lead: 14 },
    { id: 'adapters', cat: 'extras', title: 'Travel adapters', lead: 21 },
    { id: 'liquids-bag', cat: 'extras', title: 'Hand luggage liquids bag', lead: 7 },
    { id: 'airtag', cat: 'extras', title: 'Tracker in the hold luggage', lead: 14 },

    // ---- Money & phone -----------------------------------------------------
    { id: 'currency', cat: 'money', title: 'Order foreign currency', lead: 21 },
    { id: 'travel-card', cat: 'money', title: 'Fee-free travel card set up & loaded', lead: 30 },
    { id: 'tell-bank', cat: 'money', title: 'Tell the bank the travel dates', lead: 7 },
    { id: 'card-expiry', cat: 'money', title: 'Check card expiry dates cover the trip', lead: 30 },
    { id: 'esim', cat: 'money', title: 'eSIM / roaming pack', lead: 7 },
    { id: 'offline-maps', cat: 'money', title: 'Download offline maps & boarding passes', lead: 3 },

    // ---- Health & packing --------------------------------------------------
    { id: 'vaccines', cat: 'health', title: 'Vaccinations', lead: 75, hint: 'Some courses need several weeks to complete.' },
    { id: 'antimalarials', cat: 'health', title: 'Antimalarials', lead: 45, hint: 'Often started before you travel.' },
    { id: 'prescriptions', cat: 'health', title: 'Repeat prescriptions ordered', lead: 30 },
    { id: 'dentist', cat: 'health', title: 'Dentist check before travelling', lead: 60 },
    { id: 'first-aid', cat: 'health', title: 'Travel first aid kit', lead: 14 },
    { id: 'suncream', cat: 'health', title: 'Sun cream & after sun', lead: 14 },
    { id: 'kids-kit', cat: 'health', title: 'Nappies / formula / snacks', lead: 7 },

    // ---- Home & pets -------------------------------------------------------
    { id: 'kennels', cat: 'home', title: 'Kennels / cattery / pet sitter', lead: 120, hint: 'School holidays book up before the flights do.' },
    { id: 'pet-passport', cat: 'home', title: 'Pet travel documents', lead: 45 },
    { id: 'house-sitter', cat: 'home', title: 'House / plant sitter', lead: 45 },
    { id: 'pause-deliveries', cat: 'home', title: 'Pause deliveries / redirect post', lead: 7 },
    { id: 'heating', cat: 'home', title: 'Set heating & light timers', lead: 2 },
    { id: 'bins', cat: 'home', title: 'Bins out / neighbour has a key', lead: 2 },
    { id: 'boiler', cat: 'home', title: 'Turn off water / check for leaks', lead: 2 }
  ];

  /* Starter packs — one tap adds a sensible group. */
  var PACKS = [
    { id: 'essentials', label: 'Trip essentials', icon: '⭐', items: [
      'passport-check', 'insurance', 'flight-out', 'flight-back', 'hotel',
      'airport-parking', 'transfer-in', 'transfer-out', 'currency', 'esim',
      'checkin', 'doc-copies', 'bins'] },
    { id: 'package', label: 'Package holiday', icon: '🏖️', items: [
      'hotel-balance', 'seats', 'bags', 'meals', 'tourist-tax', 'transfer-in',
      'airport-parking', 'insurance', 'checkin'] },
    { id: 'ski', label: 'Ski trip', icon: '⛷️', items: [
      'lift-pass', 'ski-hire', 'ski-school', 'sports-kit', 'transfer-in',
      'transfer-out', 'insurance', 'festive-meal'] },
    { id: 'beach', label: 'Beach / villa', icon: '🏖️', items: [
      'car-hire', 'car-excess', 'grocery-delivery', 'suncream', 'tours',
      'restaurant', 'tourist-tax'] },
    { id: 'city', label: 'City break', icon: '🏛️', items: [
      'attraction', 'city-pass', 'restaurant', 'transit-pass', 'train'] },
    { id: 'longhaul', label: 'Long haul', icon: '🌍', items: [
      'visa', 'vaccines', 'antimalarials', 'seats', 'lounge', 'insurance',
      'adapters', 'travel-card'] },
    { id: 'roadtrip', label: 'Road trip', icon: '🛣️', items: [
      'idp', 'tolls', 'breakdown', 'car-service', 'ferry', 'car-seat'] },
    { id: 'kids', label: 'With children', icon: '👶', items: [
      'infant', 'cot-bed', 'car-seat', 'kids-kit', 'seats', 'theme-park'] },
    { id: 'petshome', label: 'Pets & home', icon: '🐶', items: [
      'kennels', 'pet-passport', 'house-sitter', 'pause-deliveries', 'heating',
      'bins', 'boiler'] }
  ];

  var CURRENCIES = ['GBP', 'EUR', 'USD', 'CHF', 'AUD', 'CAD', 'NZD', 'JPY', 'AED', 'THB', 'ZAR', 'TZS', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'TRY', 'MAD'];

  global.Catalog = {
    categories: CATEGORIES,
    suggestions: SUGGESTIONS,
    packs: PACKS,
    currencies: CURRENCIES,
    category: function (id) {
      for (var i = 0; i < CATEGORIES.length; i++) {
        if (CATEGORIES[i].id === id) return CATEGORIES[i];
      }
      return CATEGORIES[CATEGORIES.length - 1];
    },
    suggestion: function (id) {
      for (var i = 0; i < SUGGESTIONS.length; i++) {
        if (SUGGESTIONS[i].id === id) return SUGGESTIONS[i];
      }
      return null;
    }
  };
})(window);
