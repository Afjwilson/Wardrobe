# Wardrobe

A personal, single-user app for photographing clothing items, recording which
combinations work, and getting suggested matches for an item you're holding.

Built for one phone. No accounts, no server, no sharing — everything lives in
IndexedDB on the device, and photos never leave it.

## Running it

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
npm test         # vitest (scoring engine)
```

Install it to the home screen from the browser's share sheet; it is a PWA and
works offline.

## Backup

The data is on one device, so export early. **Settings → Quick export** writes
a small JSON file with every item, outfit and verdict (no photos).
**Full backup** writes a ZIP that also contains the photos and restores
everything. Import offers Merge or Replace after showing you what is in the
file.

See `CLAUDE.md` for architecture notes and the per-phase build log.
