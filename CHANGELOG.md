# Lampy Paperwork Changelog

All notable fixes, cleanup work, and published version changes should be recorded here.

## V9.3 - 2026-07-16

- Added a Delete Patch button to the Fixture Patch comparison banner for imported patch tabs.

## V9.2 - 2026-07-16

- Updated imported Fixture Patch comparisons so changed existing fixtures highlight only the cells that differ from the master patch.
- Added hover comparison text on highlighted cells showing the master patch value.
- Added click-to-review actions on highlighted cells for Merge, Ignore, or Overwrite.

## V9.1 - 2026-07-16

- Added .xlsm support to Fixture Patch imports.
- Added workbook sheet selection before mapping patch columns for multi-sheet Excel imports.

## V9 - 2026-07-16

- Added Fixture Patch import choices for CSV/Excel and .MVR files.
- Imported patches are now named and opened as comparison tabs when a master patch already exists.
- Added highlighted review states for new, changed, and removed patch rows with actions to add, merge, ignore, overwrite, or remove changes.
- Added a Make Master Patch action for imported patch tabs and persisted comparison tabs in project files.

## V8.28 - 2026-07-16

- Updated two-colour Control/Network position strips to render on a white base with both selected colours shown as diagonal stripe bands.
- Fixed malformed network expansion reference JSON so the Pathport VIA 12 entry can load correctly.

## V8.27 - 2026-07-16

- Updated Control/Network position strips so single-colour positions render as white cards with diagonal colour stripes instead of solid colour blocks.

## V8.26 - 2026-07-16

- Updated the Power Calculations PDF renderer to use the current supply and distro phase summary card proportions, preventing overlapping cards in downloaded PDFs.
- Made the stable direct Power Calculations PDF renderer primary after browser testing showed styled canvas capture is blocked by canvas security.

## V8.25 - 2026-07-16

- Updated Power Calculations PDF download to capture the styled export preview pages so downloaded PDFs match the preview formatting.
- Kept the direct vector Power PDF renderer as a fallback only if preview capture fails.

## V8.24 - 2026-07-16

- Updated Home stats cards to use the requested flex layout, wider spacing, and fixed 200px card width.

## V8.23 - 2026-07-16

- Rebuilt the Power Calculations PDF download to generate a direct vector PDF from power sheet data instead of screenshotting the preview.
- Kept supply and distro phase totals plus power table data in the exported PDF while avoiding the browser SVG capture failure.

## V8.22 - 2026-07-16

- Updated the Power Calculations summary layout with Supply Phase Totals and Distro Phase Totals headings.
- Added divider spacing around the power supply and distro phase total sections.

## V8.21 - 2026-07-16

- Fixed Power Calculations PDF export by making the shared preview capture XML-safe for HTML void tags used in phase total cards.

## V8.20 - 2026-07-16

- Updated all visible Export toolbar buttons to use the green primary button styling.
- Moved the Fixture Patch Export button before Position Summary in the Fixture Patch toolbar.

## V8.19 - 2026-07-16

- Updated the README to document the current GitHub Pages source structure.
- Added a keep file for the `images/NPU` asset folder.
- Clarified that rollback tracking lives in `CHANGELOG.md` rather than a published versions folder.

## V8.18 - 2026-07-16

- Updated the Fixture Patch Export button to use the green primary button styling.

## V8.17 - 2026-07-16

- Added an Export button after + Supply in Power Calculations.
- Added a Power Calculations export preview modal with paper size, orientation, zoom controls, and Export to PDF.
- Corrected the internal app version constant so project downloads match the displayed app version.

## V8.16 - 2026-07-16

- Updated the app footer to show the fixed Lampy Paperwork Webapp copyright line.
- Kept the footer text fixed across tab changes instead of replacing it with per-tab help text.

## V8.15 - 2026-07-16

- Added the Distro tab selector to the Rear Labels tab so it matches the other Distro Labels views.
- Added an Export button to the Distro Labels navigation after Label Format.
- Added an Export to PDF button to the Export Layout preview modal using the existing preview pages as the PDF source.

## V8.14 - 2026-07-16

- Updated the source `.distroPreviewSection` rule to the requested margin, white background, auto overflow, and scroll offset.
- Removed the duplicate later `.distroPreviewSection` override so the section styling is controlled from one rule.

## V8.13 - 2026-07-16

- Updated Distro Preview sections to use the requested margin, white background, auto overflow, and scroll offset.
- Updated Socapex blocks inside preview windows with the requested left border, left padding, and removed right divider width.
- Fixed the Distro Settings side pane so internal button clicks stay inside the pane instead of closing it.

## V8.12 - 2026-07-16

- Updated the Distro Labels sub-navigation border to the requested 2.2px red divider.
- Checked the pasted generated Distro Labels markup against the current renderer; no markup changes were required for the nav structure.

## V8.11 - 2026-07-16

- Fixed Position Summary colour clearing so blank and No Colour fields are no longer normalized back to White by the global colour handler.
- Marked Position editor colour fields as blank-allowed so cleared colours propagate through patch rows and linked labels correctly.
- Updated blank Position Summary colour cells to render as empty dashed cells instead of white swatches.

## V8.10 - 2026-07-16

- Added a `noColour` reference block to `json/colour_reference_template.json` for the No Colour option and aliases.
- Wired No Colour handling to the colour reference metadata so cleared position colours remain blank instead of rendering as White.
- Fixed the Home Position Summary and Position editor to treat cleared colours and No Colour selections as empty colour fields.

## V8.9 - 2026-07-16

- Fixed the Distro Settings Colour 3 toggle so it only shows or hides the Socapex way table Colour 3 column.
- Kept the main Socapex colour controls fixed to Colour 1, Colour 2, Colour 3, and Remove.
- Added explicit two-colour and three-colour Socapex way table layouts so columns resize cleanly when Colour 3 is hidden or shown.

## V8.8 - 2026-07-16

- Fixed the Distro Settings Colour 3 toggle so it only shows or hides the Socapex way table Colour 3 column.
- Added the first pass of separate Socapex way table column widths for two-colour and three-colour table layouts.

## V8.7 - 2026-07-16

- Cleaned up Distro Labels Table View by removing the distro meta panel, the Socapex Labels section title, and the Socapex Colour title line.
- Made the Table View Colour 3 column hidden by default and opt-in per distro from the Distro Settings side pane.
- Tightened Socapex Table View colour controls, override buttons, headers, and column sizing so two cards can fit on a row.
- Updated distro heading spacing and the black Edit button sizing.
- Removed the obsolete cleanup report source and updated the README deploy structure to match the current JSON and image folders.
- Removed the old `published_versions` path fallback from live reference loading.

## V8.6 - 2026-07-16

- Updated Power Supply cards to 449px wide with 427px inner headers.
- Updated Distro Phase Total cards to 449px wide and arranged them in a three-column 460px grid with 15px gaps.
- Reduced the Power Supply summary minimum width to 147px.

## V8.5 - 2026-07-14

- Added Previous and Next navigation to the Distro Settings side pane.
- Moved the Distro side-pane Remove Distro button below the editor options and applied the requested compact black-border styling.
- Constrained Distro Phase Total cards to two cards per row.
- Improved Console/NPU image loading by preloading reference images, prioritising add-menu previews, and lazy-loading card images.
- Changed the Socapex way editor colour controls to a single three-column row.
- Added Colour 3 to Distro Labels Table View for Socapex, Aux, and Output tables.
- Changed Table View colour override controls from checkboxes to buttons.

## V8.4 - 2026-07-14

- Added a `No Colour` option to the shared colour picker list so colour fields can be cleared from the menu.

## V8.3 - 2026-07-14

- Changed Power Calculations distro tabs to use an `Edit` button that opens distro settings in the right-side editor pane.
- Kept `+ Distro` focused on the add-distro modal instead of exposing existing distro editing controls.
- Added the Remove Distro action to the distro side-pane editor.
- Restyled supply and distro phase summary cards to the requested compact 510px layout.
- Moved Console and NPU add-menu image previews beside their device dropdowns.
- Added Col 3 colour fields to Socapex, way, Aux, and Output label editor panes.

## V8.2 - 2026-07-14

- Reduced Power Calculations Socapex name input text to 20px for the requested table display size.

## V8.1 - 2026-07-14

- Fixed Fixture Patch picker lists so selecting a manufacturer or fixture no longer jumps the list back to the top.
- Changed `+ Distro` to immediately create and show a new distro setup card with JSON options loaded.
- Updated additional distro creation so the add modal shows only the new distro instead of the current existing distro.
- Made the Power Calculations distro settings gear clearer with visible `Settings` text.
- Restyled distro phase total cards to match the compact supply phase total card layout and removed the recommended supply bubble.
- Changed `Show Watts` in Power Calculations from a checkbox to a button.
- Restored Console/NPU add flows to a floating modal while keeping card/image edits in the right-side editor pane.
- Added Console/NPU image previews inside the add/edit menu when a device is selected.
- Added third-colour support to linked distro label stripe rendering from Position Summary data.
- Updated Control/Network position strip styling to match the requested PDF position stripe spacing.

## V8.0 - 2026-07-14

- Promoted the validated V8 cleanup build to the working stable `index.html`.
- Removed verified unused JavaScript, including the old distro Excel-template helpers and unused legacy encrypted-project writer.
- Fixed NPU reference image paths to match the case-sensitive GitHub Pages filenames.
- Removed macOS `.DS_Store` files from the deploy tree.

## V7.45 - 2026-07-14

- Removed standalone Power Supply phase total cards now that supply totals are embedded in the supply cards.
- Added automatic Power Supply creation when the first distro is added.
- Automatically assigns additional new distros to the existing Power Supply.
- Added a warning when any Power Supply phase exceeds 360.01 A.

## V7.44 - 2026-07-14

- Updated Power Supply card width to 510px with a 485px inner header.
- Increased the Power Supply card name text to 20px.

## V7.43 - 2026-07-14

- Updated Power Supply cards to render at 600px wide with a 1.2px black border.
- Applied the same 1.2px black border treatment to Power Calculations phase total blocks.

## V7.42 - 2026-07-14

- Adjusted Power Supply card phase totals layout to the requested 50px header and 280px totals block.

## V7.41 - 2026-07-14

- Updated Power Supply card phase totals to use the established styled Phase 1, Phase 2, and Phase 3 blocks.

## V7.40 - 2026-07-14

- Added compact phase totals directly into each Power Supply card while preserving the existing card height.
- Kept the standalone supply phase total cards in place for visual comparison.

## V7.39 - 2026-07-14

- Added a phase total card for every Power Supply.
- Updated supply phase total card headers to use the supply name.
- Removed recommended supply output from supply phase total cards.

## V7.38 - 2026-07-14

- Simplified Power Supply cards to compact clickable summaries.
- Moved Power Supply editing controls into a right-side editor pane with Previous and Next navigation.
- Updated distro phase total cards to use the distro name instead of `Selected Distro Phase Totals`.

## V7.37 - 2026-07-14

- Tightened Power Calculations supply list spacing.
- Updated Power Phase Summary cards with compact vertical padding and smaller recommended supply blocks.

## V7.36 - 2026-07-14

- Updated Power Calculations phase summaries to show every distro phase totals card in distro order.
- Kept the Supply Phase Totals card last in the phase summary row.

## V7.35 - 2026-07-14

- Moved Power Supply cards above the Power Phase Summary cards.
- Updated Power Supply cards to display in one horizontal row together.

## V7.34 - 2026-07-14

- Updated all Power Phase Summary cards to the compact 338px layout with 300px phase totals and 98px centered phase blocks.
- Centered the recommended supply block inside Power Phase Summary cards.

## V7.33 - 2026-07-13

- Locked Power Calculations table layout so Fix Type cells stay constrained instead of widening the table.
- Set Power Calculations Fix Type text to shrink between 16px and 12px inside its fixed cell.
- Shortened the Amps column header to `Amps` and reduced the column width to 90px.
- Fixed Power Phase Summary card and phase total widths to the requested dimensions.

## V7.32 - 2026-07-13

- Set the `Fixtures Not Added` side-pane table headers to 16px and body cells to 14px.
- Added a `Keep Visible` toggle so the fixtures side pane can stay open while editing Power Calculations.
- Changed duplicate Fix ID highlighting in Power Calculations to yellow background with red text.
- Added auto-shrink handling for Power Calculations Fix Type cell text that would otherwise overflow.

## V7.31 - 2026-07-13

- Updated the Power Calculations fixtures side pane title, pane sizing, body sizing, and table column widths to match the latest layout.

## V7.30 - 2026-07-13

- Set the Power Calculations `Fixtures` side pane to a fixed 501px width with 14px body text.
- Added a Position column to the unassigned fixtures list.

## V7.29 - 2026-07-13

- Fixed the Power Calculations `Fixtures` side pane so it renders the unassigned fixture list when opened.
- Added a defensive fixture name fallback in the `Fixtures` side pane Type column.

## V7.28 - 2026-07-13

- Added duplicate Fix ID validation to Power Calculations, using the same error styling as missing Fix IDs.
- Moved the `+ Supply` action into the Power Calculations toolbar next to `+ Distro`.
- Added a `Fixtures` side pane in Power Calculations that lists patched Fix IDs and fixture types still missing from the power sheet.

## V7.27 - 2026-07-13

- Added a custom Name field to Console entries and displayed it above the console model on cards.
- Added the selected device model subtitle under the Console/NPU side-pane editor title.
- Updated Console/NPU editor Previous and Next navigation so it moves through consoles and NPUs as one continuous list.
- Updated DMX Port card table headers to match the editor field labels.
- Removed parameter chip rows from Console and NPU cards.
- Added current grandMA2 Mode 2 software versions to Full-Size, Light, and onPC Command Wing console references.

## V7.26 - 2026-07-13

- Changed the Console/NPU add-edit form from a floating modal to a right-side editor pane.
- Added Previous and Next navigation when editing Console and NPU cards.
- Made Console/NPU card images open the matching editor.
- Added six DMX Port fields to Console and NPU entries, with populated ports displayed as a 2-row, 6-column table on device cards.

## V7.25 - 2026-07-13

- Updated Control/Network position strips to use the PDF Position Summary stripe-fill and outlined serif text styling while preserving the existing 700px by 60px card strip size.

## V7.24 - 2026-07-13

- Restyled Control/Network position colour strips to match the Position Summary table styling.
- Updated NPU cards so custom names appear above the NPU reference title.
- Added outside-click and Escape-key closing for the Console/NPU modal.

## V7.23 - 2026-07-13

- Added Console role selection to the Add/Edit Console modal.
- Added Location fields to Console and NPU entries, with matching Position Summary colours shown as a 700px by 60px strip on cards.
- Added editable NPU card names.
- Updated Control/Network parameter totals to only show active modes with parameters and center-align the summary.
- Updated Console and NPU cards so the Master console software version displays across all control devices.

## V7.22 - 2026-07-13

- Added a selected Software Version field to Console entries.
- Made the Master console role unique and sync compatible Backup console software versions to match the Master.

## V7.21 - 2026-07-13

- Added Master and Backup role buttons to Console cards, with the selected role saved in project data.

## V7.20 - 2026-07-13

- Added grandMA3 software version data to console cards, showing each latest release as a Mode 3 version with the matching Mode 2 version in brackets.

## V7.19 - 2026-07-13

- Removed the Control/Network reference console count from the Consoles toolbar.
- Split the Control/Network available parameter summary into separate Mode 2 and Mode 3 totals.

## V7.18 - 2026-07-13

- Fixed NPU image URLs to match the lowercase filenames served by GitHub Pages.

## V7.17 - 2026-07-13

- Updated the Control/Network parameters available summary to use red, larger, underlined text.

## V7.16 - 2026-07-13

- Updated Console and NPU cards with larger bold titles and clearer mode metadata styling.
- Added quantity fields when adding new Console or NPU entries so multiple matching cards can be created at once.

## V7.15 - 2026-07-13

- Fixed Console/NPU card image resolution so current JSON reference images override stale saved image paths.
- Removed empty image frames from Console/NPU cards when no image source is available.

## V7.14 - 2026-07-13

- Added local NPU image assets under the GitHub Pages `images/NPU` path used by the NPU reference JSON.
- Corrected the duplicate NPU reference ID so `grandMA3 NPU XL` uses its own `ma-npu-xl` identifier.

## V7.13 - 2026-07-13

- Removed the generated placeholder graphic from Console and NPU card image frames.
- Moved Console and NPU card action buttons below the image in the right-side card column.

## V7.12 - 2026-07-13

- Updated Console and NPU card image frames to use the blue border styling and no dark background.
- Anchored Console and NPU card action buttons to the bottom-right of each card.

## V7.11 - 2026-07-13

- Moved Console and NPU card images to the right side of each Control/Network card.
- Set Control/Network card images to a fixed 200px presentation on desktop with a responsive fallback on smaller screens.

## V7.10 - 2026-07-13

- Updated console reference image paths to load from the app's GitHub Pages `images/consoles` folder instead of external MA image URLs.

## V7.9 - 2026-07-13

- Fixed Console and NPU card images so they load behind the placeholder and reveal once the image has finished loading.
- Added repository image folders for GitHub Pages-hosted console and NPU image assets.

## V7.8 - 2026-07-13

- Added image panels to Console and NPU cards in the Control/Network tab.
- Added support for optional `image` or `imageUrl` fields in console and NPU JSON references, with built-in placeholders when no image is provided.

## V7.7 - 2026-07-11

- Matched the Fixture Patch `Export to Excel` button styling to `Export to PDF`.
- Grouped the Fixture Patch PDF and Excel export buttons on the same row in the export preview.

## V7.6 - 2026-07-11

- Changed Fixture Patch Excel export colour columns to output colour names instead of stored hex values.

## V7.5 - 2026-07-11

- Renamed the Fixture Patch toolbar export button to `Export`.
- Changed the Fixture Patch export preview to offer separate `Export to PDF` and `Export to Excel` actions.
- Added a Fixture Patch Excel export using the currently visible patch columns and fixture type grouping.

## V7.4 - 2026-07-11

- Changed Fixture Patch PDF preview/export pagination so each fixture type starts on a new page.

## V7.3 - 2026-07-11

- Enlarged the DMX universe side-pane chart for better readability.
- Allowed occupied DMX chart cells to wrap repeated FIX ID and fixture name text across patched address ranges.

## V7.2 - 2026-07-11

- Changed the DMX universe side-pane chart to display 20 channels per row.
- Added patched FIX ID and fixture type detail to occupied DMX chart cells.

## V7.1 - 2026-07-11

- Changed the DMX universe detail pane to show available addresses as a numbered 1-512 grid with free and used address states.

## V7 - 2026-07-11

- Added DMX universe progress bars to the Home tab summary based on occupied addresses out of 512.
- Changed Home DMX universe rows into clickable summaries that open a right-side universe detail pane.
- Added universe detail pane tables for patched fixtures and available address visibility.
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
