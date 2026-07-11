# Lampy Paperwork Changelog

All notable fixes, cleanup work, and published version changes should be recorded here.

## V7 - 2026-07-11

- Added DMX universe progress bars to the Home tab summary based on occupied addresses out of 512.
- Changed Home DMX universe rows into clickable summaries that open a right-side universe detail pane.
- Added universe detail pane tables for patched fixtures and available address ranges.
- Added a bulk universe renumber action to move all fixtures from one universe to another while preserving addresses.

## V6.20 - 2026-07-11

- Adjusted Power Calculations table Socapex name column sizing and typography.
- Increased the Power Calculations fixture type column width.

## V6.19 - 2026-07-11

- Changed the Fixture Patch `Show/Hide Columns` control to open a right-side pane instead of a floating modal.
- Kept the column toggles live-updating the Fixture Patch sheet and PDF preview.
- Made closing the Fixture Patch PDF preview also close the column side pane.

## V6.18 - 2026-07-11

- Renamed the Fixture Patch manufacturer manifest from `json/fixture_patch_reference.json` to `json/fixture_library_manifest.json`.
- Updated the app loader, in-app reference hint, and deployment docs to use the clearer manifest filename.

## V6.17 - 2026-07-11

- Split the Fixture Patch reference library into one JSON file per manufacturer under `json/fixtures/`.
- Changed `json/fixture_patch_reference.json` into a manifest that lists the manufacturer fixture files.
- Updated the Fixture Patch reference loader to fetch and merge manufacturer files while preserving mode, weight, and wattage data.
- Improved JSON reference URL fallback handling so nested JSON paths work on local servers and GitHub Pages.

## V6.16 - 2026-07-10

- Made Table View Socapex remove buttons use 900 font weight.
- Standardised Table View Aux and Output title rows and remove buttons to the requested fixed sizing.
- Treated legacy stored white values as blank in Table View Aux and Output colour fields so empty labels no longer display `White`.

## V6.15 - 2026-07-10

- Updated Fixture Patch group titles to display `Manufacturer ~ Fixture ~ Mode (Channel count)` on the sheet and PDF preview.
- Added a `Show/Hide Columns` control directly inside the Fixture Patch PDF preview.
- Made Fixture Patch column visibility changes refresh the PDF preview immediately.
- Fixed rear label side-pane B/I/U/Outline buttons so they update the selected rear label text formatting.

## V6.14 - 2026-07-10

- Matched Aux Outlet and Output colour behaviour to Socapex labels so blank Colour 1 and Colour 2 fields stay blank instead of displaying `White`.
- Updated Table View Aux and Output colour edits to refresh label previews immediately.
- Changed rear label B/I/U/Outline controls to use the same pressed-button styling as the Socapex editor.
- Added previous/next navigation to rear Socapex, rear Aux, and rear Output side-pane editors.

## V6.13 - 2026-07-10

- Fixed V6.12 startup so removed modal markup can no longer stop `attachEvents()` and block JSON reference loading.
- Confirmed local JSON startup loads distro, supply, fixture patch, lighting vendor, console, network, NPU, walkthrough, welcome, and colour reference files.
- Removed stale rear-label editor close wiring left over after rear labels moved into the side-pane editor.

## V6.12 - 2026-07-10

- Removed the password prompt from project download and open workflows.
- Changed new `.lampy` project downloads to a passwordless packaged project format with checksum validation.
- Kept legacy encrypted `.lampy` project import support for files created by V6.10.

## V6.11 - 2026-07-10

- Moved Aux Outlet and Output front-label editing into the right-side editor pane.
- Removed the front-view inline Aux and Output editor blocks so the label sheet stays label-focused.
- Routed rear Socapex, Aux, and Output label formatting through the right-side editor pane instead of the rear modal.
- Added previous/next navigation for individual Aux and Output label pane editing.

## V6.10 - 2026-07-10

- Changed project downloads from plain editable JSON to password-encrypted `.lampy` project files using browser Web Crypto.
- Added password-based encrypted project import while keeping legacy JSON project imports available.
- Updated project file input support to accept `.lampy` files.

## V6.9 - 2026-07-10

- Hid the header `+ Distro` quick action on the Power Calculations tab so only the Power Calculations toolbar button remains visible.

## V6.8 - 2026-07-10

- Added `< Previous` and `Next >` navigation to the Front RCBO Socapex side-pane editor.
- Removed obsolete Label Settings cards for fixture text defaults and new/fill colour defaults.
- Moved removed text-default dependencies onto safe Label Format fallbacks and made missing/new colour data stay blank by default.

## V6.7 - 2026-07-10

- Preserved blank Socapex Colour 1 and Colour 2 values through render, reload, and rear-label preview paths instead of falling back to `White`.
- Scoped the Front RCBO side-pane Socapex B/I/U and font controls to the selected Socapex only.
- Added Socapex-level front text format storage so unchanged ways inherit their own Socapex editor format before falling back to the global front label defaults.

## V6.6 - 2026-07-10

- Added a session-only `Don't Show Me Again` option to the power-calculation warning.
- Cleared linked Fixture Type and colour data when a Table View or side-pane Fix ID no longer exists in the Fixture Patch.
- Preserved empty Fixture Patch Colour 2 values during Fix ID autofill instead of copying Colour 1.
- Added a prompt to optionally update the Fixture Patch row when linked label colours are changed in Table View or the Front RCBO side pane.

## V6.5 - 2026-07-10

- Applied side-pane blank-colour behaviour to Table View colour cells so blanks stay blank instead of displaying `White`.
- Made blank Table View Colour 2 fields turn Colour 2 off.
- Made Socapex way colour overrides drop back to the Socapex master colours when both way colour fields are blank.
- Added a power-calculation warning when Fix ID or Fixture Type is edited from Table View or the Front RCBO side pane.

## V6.4 - 2026-07-10

- Added `Socapex Name` helper text above the Front RCBO side-pane Socapex name field.
- Reduced side-pane way title text to 18px.
- Matched Table View Fix ID behavior in the side-pane editor so known patch IDs auto-fill Fixture Type and label colours.

## V6.3 - 2026-07-10

- Fixed Front RCBO side-pane colour inputs so typed letters can be deleted and edited without immediately committing to a colour.
- Changed colour fields to commit colour values only when a valid colour is selected or entered.
- Removed the large duplicate `Socapex Editor` title cell from the side-pane Socapex editor body.
- Updated individual way editor headers to show `Socapex Name - Way x`.

## V6.2 - 2026-07-10

- Split Front RCBO side-pane way text formatting so Fix ID and Fixture Type columns can be formatted independently.
- Made colour fields open the full colour list on focus while preserving typed filtering.
- Allowed blank side-pane Colour 1 and Colour 2 fields to stay empty instead of displaying `White`.
- Made clearing Colour 2 turn Colour 2 off for the selected way or Socapex.
- Preserved explicit blank colour values when loading saved project data.

## V6.1 - 2026-07-10

- Removed inline Socapex editor blocks from the Front RCBO Labels sheet so the view displays labels only.
- Added a right-side Front RCBO editor pane that opens from Socapex headers for full Socapex editing.
- Added way-level side-pane editing when clicking an individual front label, with `< Previous` and `Next >` navigation between ways.
- Added side-pane close behaviour for Escape, pane close button, app-background clicks, and switching away from Front RCBO Labels.
- Reworked the side-pane editor layout to match the supplied table-style Socapex Editor and Way section structure.
- Added italic support for per-way front label formatting alongside bold and underline.
- Kept duplicated way controls in the side pane synchronised and made the title-section Col 2 selector enable Colour 2 automatically.
- Reduced the side-pane editor control sizing to fit the pane cleanly while preserving the supplied table layout.
- Replaced B/I/U checkbox controls in the side pane with compact word-processor-style toggle buttons.

## V5.12 - 2026-07-10

- Fixed Table View colour cells so every visible colour field can receive focus and open the shared colour list without refreshing the browser tab.
- Made Table View Colour 2 selections automatically enable the relevant Colour 2 state when chosen from the colour list.
- Set the Power Calculations table Amps column header text to black so it remains visible.

## V5.11 - 2026-07-10

- Updated Table View Socapex colour controls across all Socapex cards with wider swatches, wider colour fields, and a fixed-width remove button.
- Shortened the Socapex colour toggle label to `Col 2 On` to keep the master colour row compact.

## V5.10 - 2026-07-10

- Reordered JSON reference fallback URLs so local and project-relative `/json/` files are requested before obsolete root-level paths.
- Preserved the production GitHub Pages `/Lampy-Paperwork/` path fallback for backwards-compatible hosted loading.

## V5.9 - 2026-07-10

- Standardised the Table View grid so Socapex, Aux, and Output table cards use a consistent fixed card width and spacing.
- Added explicit table column groups for Table View cards to keep headers, inputs, colour fields, and override columns aligned.
- Constrained Table View colour inputs to their cells so colour fields no longer change the card width or grid layout.

## V5.8 - 2026-07-08

- Updated the Home tab stats to remove Front/Rear/Total label counts.
- Added Console and Parameters stats to the Home tab, with NPU stats shown only when NPUs exist in the project.
- Made Home panels collapsible and expandable.
- Added a Console / Network Summary Home panel listing added consoles and NPUs with modes, protocols, and IP addresses.
- Moved Revision Summary to the bottom of the Home panel grid.
- Normalised comma-formatted console parameter counts in `json/console_reference.json` to valid JSON numbers.

## V5.7 - 2026-07-08

- Removed duplicated `Parameters in Mode X` display labels from `json/npu_reference.json`.
- Kept NPU mode `parameterCount` values for parameter-total calculations.

## V5.6 - 2026-07-08

- Removed duplicated `Parameters in Mode X` display labels from `json/console_reference.json`.
- Kept console mode `parameterCount` values for calculations while hiding internal count keys from the parameter details panel.

## V5.5 - 2026-07-08

- Changed Control/Network parameter totals so consoles contribute only the single highest console parameter count for the selected console modes.
- Added `+ NPU` to the Consoles tab for adding parameter-expanding processing units.
- Added `json/npu_reference.json` as the dedicated NPU/processing-unit reference source.
- Migrated saved processing-unit data from the previous `expansionUnits` field into `npus` for backwards compatibility.
- Removed the `+ Expansion Unit` workflow from the Network Equipment tab.
- Restored Network Equipment as a reference-only tab for switches, DMX nodes, ETC, and other network hardware.

## V5.4 - 2026-07-08

- Fixed `json/console_reference.json` so it is valid JSON again.
- Removed duplicate console reference entries and kept one clean entry per console type.
- Normalised console IDs while preserving the Mode 2 and Mode 3 parameter counts from the broken reference file.

## V5.3 - 2026-07-08

- Promoted the safe cleanup draft into the main app.
- Removed the unused Control/Network modal-state variable and obsolete assignments.

## V5.2 - 2026-07-08

- Moved the Control/Network `Parameters Available -` total into the Consoles toolbar beside the console count and `+ Console` button.
- Removed the separate Control/Network parameter-total toolbar row.

## V5.1 - 2026-07-08

- Updated console reference JSON to include mode-specific parameter counts for Mode 2 and Mode 3.
- Added a Control/Network parameter total labelled `Parameters Available -`.
- Added project save/load support for Control/Network expansion units.
- Added a `+ Expansion Unit` workflow for adding MA Lighting processing units with software mode, IP address, and parameter-count preview.
- Updated network expansion reference JSON with editable MA Lighting processing unit entries.

## V5 - 2026-07-07

- Added a new top-level `Control/Network` tab after Power Calculations.
- Added `Consoles` and `Network Equipment` sub-tabs inside Control/Network.
- Added a `+ Console` workflow with console reference selection, software mode, two protocol selectors, and two IP address fields.
- Added project save/load support for Control/Network console data.
- Added `json/console_reference.json` for editable console, software mode, protocol, and parameter reference data.
- Added `json/network_expansion_reference.json` for editable network expansion equipment reference data.

## V4.27 - 2026-07-07

- Fixed colour-list selections in sheet-preview editors so selected colours reliably write back to the active editor field and trigger preview updates.

## V4.26 - 2026-07-07

- Changed Socapex, Aux, and Output editor Text Format font-size controls to use the same fixed dropdown options as the Front Label Format menu.

## V4.25 - 2026-07-07

- Resized per-way Socapex editor Override Colour 1 and Colour 2 fields so both stay contained within the fixed 223px Way card.

## V4.24 - 2026-07-07

- Fixed the Socapex Way editor cards at 223px wide so colour and text-format controls no longer change the editor layout.

## V4.23 - 2026-07-07

- Reduced the per-way Text Format colour fields in the Socapex editor to compact fixed widths so opening text formatting no longer stretches the way card layout.

## V4.22 - 2026-07-07

- Reduced RCBO per-way Override colour fields to fixed compact widths so Colour 1 and Colour 2 no longer stretch across the Socapex editor card.
- Moved the per-way Colour 2 toggle onto its own row inside the override controls to keep the colour fields aligned and small.

## V4.21 - 2026-07-07

- Fixed RCBO Socapex editor layout so enabling per-way Override colours no longer widens the editor cards or shifts the sheet preview.
- Constrained override Colour 1 and Colour 2 text fields to the compact editor sizing used before the typed colour-name controls.

## V4.20 - 2026-07-07

- Changed colour fields and colour summaries to display the first JSON colour name instead of stored hex values where a matching colour exists.
- Updated Position Summary, Fixture Patch colour cells, Fixture Patch quick options, and fixture-type colour edit fields to use shared colour-name display logic.
- Kept internal colour values normalised to hex for reliable rendering and exports while keeping user-facing fields readable.

## V4.19 - 2026-07-07

- Restored the Distro Label preview/editor layout by constraining typed colour controls to the compact footprint of the previous colour inputs.
- Replaced the native colour datalist with a custom colour menu so colour options can show their resolved background colour.
- Changed the colour menu to show only the first alias/name for each colour in `json/colour_reference_template.json` while keeping all aliases valid when typed manually.

## V4.18 - 2026-07-07

- Replaced all native browser colour pickers with typed colour fields backed by `json/colour_reference_template.json`.
- Added a shared colour reference datalist so colour fields can show approved colour names while still allowing typed input.
- Normalised typed colour aliases through the JSON colour resolver before applying label, position, and format colours.
- Kept colour fields styled as swatches so users can see the resolved colour without opening a colour picker.

## V4.17 - 2026-07-07

- Added rear-label-only font sizes from 34pt to 50pt in the rear label format controls.
- Made the rear label floating format dialog more transparent and removed its label text editor so it only controls formatting.
- Changed rear Socapex sheet previews and exports to show 4 Socapex labels per row.
- Loaded `/json/colour_reference_template.json` as the app colour alias source so named colours resolve to the exact hex values in the JSON file.

## V4.16 - 2026-07-07

- Added a Distro Labels `Label Format` menu with `Front Labels` and `Rear Labels` tabs.
- Added master text-format settings for front and rear labels: font, fixed font-size dropdown, bold, italic, underline, outline, and text colour.
- Defaulted master label text to Cochin, 16pt, black text, and outline on with automatic opposite-colour outline.
- Applied master front formatting to Socapex RCBO, Aux Outlet, and Output label text with shrink-to-fit retained.
- Applied master rear formatting to rear Socapex, Aux Outlet, and Output label text while preserving the click-to-edit rear label dialog.

## V4.15 - 2026-07-07

- Restored rear label colour backgrounds for Socapex, Aux, and Output rear label views while keeping rear label colour controls hidden.
- Replaced the large inline rear label formatting editors with a click-to-edit rear label formatting dialog.
- Wired rear label previews to refresh when related Socapex, Aux, or Output colour/text data changes.
- Removed the unused rear inline editor builder code.

## V4.14 - 2026-07-07

- Updated default label sizes: front Socapex/Aux labels stay 18mm x 34mm with 0.5mm spacing, front 3-phase output labels default to 72mm x 34mm, rear Socapex labels default to 70mm x 50mm, rear Aux output labels default to 85mm x 30mm with 5mm spacing, and rear 3-phase output labels default to 90mm x 60mm.
- Split front and rear output sizing so front output labels and rear output labels no longer share the same size variable.
- Added a settings migration so unchanged old label-size defaults update to the new V4.14 defaults while preserving obvious custom values.
- Added per-label rear text formatting for rear Socapex, rear Aux, and rear Output labels without exposing rear label colour controls.
- Syntax-checked `index.html` and validated all JSON files.

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
