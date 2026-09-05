# Wardrobe — working notes

A single-user, offline-first PWA for photographing clothing, recording which
combinations work, and getting suggested matches. Built to SPEC.pdf; this file
records the decisions and deviations taken while building it, phase by phase.

## Conventions (from the spec, §10)

- TypeScript strict. No `any`.
- All storage access goes through `src/db/*`. No raw IndexedDB in components.
- `src/engine/` is pure functions — no React, no DB imports — so the scorer is
  directly testable with Vitest.
- Components stay under ~150 lines; extract hooks and sub-components.
- Commit at the end of each phase, naming the phase.

## Layout

```
src/
  backup/     export/import: format + migrations, exporter, importer
  components/ presentational pieces, all under ~150 lines
  db/         typed IndexedDB wrappers (items, outfits, pairs, blobs, meta)
  engine/     pure scoring functions (phase 4)
  hooks/      useAsync
  lib/        colour maths, image processing, saveFile, storage, ids
  screens/    one file per screen from §7
  router.tsx  ~50-line hash router; no routing dependency
```

Commands: `npm run dev`, `npm run build`, `npm test`, `npm run icons`.

---

## Phase 1 — Skeleton

Shipped: IndexedDB layer with typed wrappers, blob storage, thumbnail
generation, add-item flow with manual colour picking, wardrobe grid,
retire/delete, PWA manifest and service worker, `navigator.storage.persist()`
on first launch, quick JSON export and import with the three-path `saveFile`
helper.

### Decisions and deviations

- **`retired` is stored as `0 | 1`.** IndexedDB cannot index booleans, and the
  spec asks for an index on `retired`. The domain type in `src/types.ts` keeps
  `retired: boolean` exactly as specified; `src/db/schema.ts` defines an
  `ItemRow` row shape and converts at the wrapper boundary, so nothing outside
  `src/db` sees the difference.
- **Pairs use a composite key `['a', 'b']`** rather than a synthesised string
  id, with indexes on `a` and `b` as the spec asks. `pairKey()` normalises to
  a < b at every entry point.
- **Cluster-merge ΔE is CIELAB ΔE76, not OKLab distance.** The spec's two
  thresholds are on different scales: the background cut is "12%, Euclidean,
  OKLab" (0.12 in OKLab units) while cluster merging is "ΔE 8", which is only
  meaningful on the CIELAB 0–100 scale. `lib/colour.ts` exposes both
  (`oklabDistance`, `deltaE`), which is also why the spec lists both spaces.
- **"Denim as neutral-ish"** is implemented as a second window next to the navy
  rule: hue 230–290, L < 0.6, C < 0.075. The spec names denim without giving
  numbers.
- **No routing library.** `src/router.tsx` is a hash router in ~50 lines.
  Hash routes also mean the service worker never has to handle deep-link
  navigation fallbacks.
- **Photos are re-encoded to WebP** at 1400px long edge (quality 0.82) and
  300px for thumbnails (0.75), with a JPEG fallback for browsers that refuse
  `canvas.toBlob('image/webp')`. The spec fixes the thumbnail at 300px WebP and
  is silent on the full photo.
- **Object URLs for blobs are cached for the page's lifetime**
  (`db/blobs.ts`). Revoking per render made grid thumbnails flicker on filter
  changes.
- **`Field` renders a `<div role="group">`, not a `<label>`.** Most field
  groups are buttons; wrapping those in a label folded the entire group's text
  into each button's accessible name. Caught by the browser smoke test.
- **ZIP import is refused with a clear message in this phase.** The branch
  lands in phase 5 rather than shipping a stub.
- **PWA icons are generated** by `scripts/make-icons.mjs` (raw PNG encoding, no
  image dependency), so no binary asset has to be hand-maintained.

### Known gaps at the end of phase 1

Colour extraction is manual only (tap-to-sample plus a hue/lightness nudge);
automatic extraction is phase 3. No outfits, no scoring, no suggestions.

---

## Phase 2 — Outfits

Shipped: slot-based outfit builder (no scoring yet), save with a
`works` / `no` verdict plus optional rating, occasion tags and notes, the
outfits list filterable by occasion, "in N outfits" on item detail, and
`PairVerdict` records derived from every saved outfit.

### Decisions and deviations

- **Slots map one-to-one onto categories** (`lib/slots.ts`), so the picker for
  a slot is just that category. `accessory` is the only slot holding more than
  one item.
- **A one-piece closes the top and bottom slots** and vice versa. The spec's
  slot list does not mention the `full` category; blocking is the smallest
  thing that keeps both consistent without inventing rules.
- **Derived pairs never overwrite explicit ones.** `derivePairsFromOutfit`
  skips any pair whose stored record has `source: 'explicit'`, so a verdict the
  user set by hand survives saving an outfit that contradicts it.
- **Deleting an item cascades** (`deleteItemCascade`): its pair verdicts go,
  it is removed from every outfit, and an outfit left with fewer than two items
  is deleted rather than left as a one-item "combination". The spec does not
  say what happens to referencing records; leaving dangling ids would poison the
  learned term in phase 4.
- **The outfit-derived pair store is a cache, not the scoring input.** Phase 4
  reads outfit counts directly for the ±25 terms, and uses the `pairs` store
  only for explicit ±40 verdicts, so nothing is double-counted.
- **Saving requires at least two items**, since a single item is not a
  combination and produces no pairs.

---

## Phase 3 — Colour

Shipped: automatic extraction (§4) feeding the swatch-confirm step, and a
colour-family filter on the wardrobe grid.

### Decisions and deviations

- **Extraction lives in `lib/extract.ts` as a pure function** over a
  `PixelGrid`, so it is unit-testable without a canvas. `lib/image.ts` owns the
  canvas work (`pixelsForExtraction`, 120px long edge).
- **k-means seeding is deterministic** — centroids start at four evenly spaced
  points along the lightness-sorted samples, not at random. The same photo has
  to produce the same suggestions twice, and a seeded RNG would be one more
  thing to keep stable.
- **Cluster colours are averaged in sRGB, not read back from the centroid.**
  An OKLab centroid can land outside the sRGB gamut and clip to a colour no
  pixel in the photo actually had; the mean of the member pixels cannot.
- **Fallback when the foreground filter eats everything.** A garment that fills
  the frame reads as its own background, so if the corner-distance cut leaves
  fewer than 5% of pixels (or under 20), extraction falls back to the
  lightness-filtered set. Returning no suggestions there would be worse than
  returning the obvious one.
- **Suggestions are prefilled, not presented as a separate "accept" step.** The
  extracted swatches land straight in the phase 1 picker, where deselect,
  promote-to-dominant, tap-to-sample and the hue/lightness nudge already exist.
  This is the spec's "suggest, then confirm" with the confirm step being the
  normal editor.
- **The colour-family filter matches any swatch**, not just the dominant one,
  so filtering for "blue" finds the shirt with a blue stripe.
- Extraction is covered by `src/lib/extract.test.ts` (background rejection,
  secondary colour, ΔE merging, full-frame fallback, empty input).

---

## Phase 4 — Engine

Shipped: pair scoring in `src/engine/` as pure functions, "Goes with" on item
detail, live outfit score in the builder, compatibility-sorted slot pickers,
explanation strings, and a Vitest fixture set of twenty hand-labelled pairs.

### Decisions and deviations

- **"Overrides everything" is scoped to the learned term.** An explicit
  `PairVerdict` short-circuits the other learned signals (outfit counts,
  colour-family precedent) and contributes ±40, but it does not bypass the rest
  of the formula — the spec presents those bullets as alternatives *within*
  `learned`, and the final score is capped to 0–100 as specified.
- **The learned term is never gated on the cold-start thresholds.** §9 says the
  term "is inactive" under ~20 items and ~10 rated outfits; that is a
  description of having no data, not an instruction to ignore verdicts the user
  did record. Suppressing a verdict because the wardrobe has 19 items would be
  wrong. `Learning.coldStart` is computed and surfaced in the UI ("Early days…")
  exactly as §9 asks — say so rather than pretending.
- **Outfit counts come from the outfits, explicit verdicts from the pairs
  store.** The derived `PairVerdict` records written in phase 2 are a lookup
  cache; counting them as well would double-weight the same evidence.
- **Harmony rules are evaluated in a fixed precedence** because the spec's table
  overlaps: both-neutral, then either-neutral, then hue < 25° (splitting tonal
  from analogous on ΔL > 0.25), then 150–180° complementary, then the 25–70°
  clash zone, then 100–140° triadic. Hue gaps of 70–100° and 140–150° score 0.
- **`valueContrast` above 0.55 ΔL scores 0**, not +15: the spec's band stops at
  0.55 and says nothing beyond it, so white-on-black gets no bonus and no
  penalty.
- **`seasonFit` is unspecified beyond its range**: shared season +5, both
  tagged but disjoint −10, either untagged 0.
- **Colour names for explanations** come from `lib/colourName.ts`, a 28-entry
  wardrobe vocabulary matched by CIELAB ΔE, so a reason reads "navy + rust"
  the way the spec's example does.
- **"Goes with" excludes items of the same category.** Ranking a shirt against
  other shirts fills the list with things you cannot wear together. Layering two
  tops is possible, but the outfit builder covers that case.
- **Explicit verdicts are settable from the "Goes with" list** (✓ / ✕, tap again
  to clear). Nothing else in the app creates `source: 'explicit'` records, and
  the strongest term in the engine needs a way in.
- **Test bands are loose and overlapping; the ordering assertion is the real
  test.** The spec's weights put a wrong-formality pair with pleasant colour in
  the mid-40s and an all-neutral high-contrast pair in the mid-50s, so tight
  thresholds would test arithmetic rather than judgement. The suite asserts that
  no `bad` pair outranks any `good` one, plus exact deltas for each learned
  signal.

---

## Phase 5 — Suggest and full backup

Shipped: the Suggest screen (greedy fill plus one swap pass), ZIP backup with
photos, ZIP import, the export reminder banner, and the wear log.

### Decisions and deviations

- **Suggestion diversity comes from the opening move.** Eight outfits are built
  by seeding each with a different one of the eight best candidates for the
  first empty slot, then greedy-filling the rest and running one swap pass.
  Identical results are deduplicated by item signature, so a small wardrobe
  honestly returns fewer than eight rather than eight copies of one outfit.
- **"Complete" means a one-piece or a top and bottom, plus shoes.** Outerwear
  and accessories are not force-filled: a suggestion should not put a coat on
  you in July because a slot was empty.
- **A suggestion's reason is its weakest pair's reason**, which is the pair
  driving the score down and the thing worth knowing before wearing it.
- **The backup ZIP is `data.json` + `photos/<key>.webp` + `thumbs/<key>.webp`**,
  as specified, with photos stored rather than base64'd into the JSON.
  Compression level 6: the WebP payloads are already compressed, so the archive
  is a container rather than a squeezer.
- **The export reminder is a pure function** (`lib/reminder.ts`, unit-tested):
  it fires only when data changed since the last export and 14 days have passed
  since the later of the last export and the last dismissal. A device that has
  never exported counts from `firstLaunchAt`, recorded on first launch.
- **Verified end to end in a headless browser**: seed a wardrobe, take a full
  backup, wipe, and restore from the ZIP with photos intact. Headless Chromium
  exposes `showSaveFilePicker` but never resolves its dialog, so the browser
  test pins itself to the anchor-download path; the picker path is what real
  Chromium uses and is feature-detected at call time as the spec requires.

### Where the spec's known limitations bite

Extraction on the synthetic test fixtures reads a garment whose colour is close
to its background as a blend of the two — exactly the "colour under artificial
light" caveat in §9. The manual sampling step is the fix, and it is one tap.
