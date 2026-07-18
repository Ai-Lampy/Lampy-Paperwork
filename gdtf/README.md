# GDTF Repository

This folder stores the GDTF files used by Lampy Paperwork V11 when exporting
fixture patches as MVR files.

## Structure

- `fixtures/<manufacturer>/` contains repository-hosted `.gdtf` files.
- Empty manufacturer folders contain `.gitkeep` so GitHub preserves them.

Fixture definitions and GDTF references have one authoritative location:
`../json/fixtures/<manufacturer>.json`.

When adding a GDTF, match it by manufacturer, fixture type, mode, and channel
count. Do not match by Fix ID.

Full GDTF binary data is fetched only when required for MVR export and is not
stored in browser localStorage. Manual GDTF upload remains available as a
fallback.
