# Lampy Paperwork Changelog

All notable fixes, cleanup work, and published version changes should be recorded here.

## V4.13 - 2026-07-01

- Fixed Fixture Patch format menu Bold, Italic, and Underline bubbles so they keep the same flex shape and sizing as the column header toggle bubbles.
- Syntax-checked `index.html`.

## V4.12 - 2026-07-01

- Updated the Fixture Patch format menu so Bold, Italic, and Underline bubbles match the compact column-toggle styling.
- Added Select All for Fixture Patch table-format column selection.
- Changed Fixture Patch format font-size controls to fixed dropdown sizes from 8 to 30.
- Expanded the Fixture Patch font-size summary to show B, I, and U style flags for each column.
- Syntax-checked `index.html`.

## V4.11 - 2026-07-01

- Fixed Fixture Patch PDF light-colour labels so black text is drawn cleanly without a white outline, improving Orange, Yellow, and Lavender readability.
- Browser/PDF-tested Fixture Patch colour labels and confirmed Orange renders as readable clean black text.

## V4.10 - 2026-07-01

- Reworked Fixture Patch PDF colour-label text rendering so labels stay centred while using normal filled text with a light offset outline for readability.
- Browser/PDF-tested colour-label readability and centring with Red, Orange, Yellow, Grey, Blue, Lavender, and Green.

## V4.9 - 2026-07-01

- Improved Fixture Patch PDF colour-label centring using measured browser canvas text widths.
- Browser/PDF-tested the colour-label layout.

## V4 - 2026-07-01

- Reworked the project into a lean GitHub Pages structure.
- Kept the app dependency-free with `index.html` and `/json/` reference files at the deploy root.
- Added `README.md`, `.nojekyll`, and `docs/cleanup-report.md`.
- Removed old local published-version archives from the live deploy tree.

