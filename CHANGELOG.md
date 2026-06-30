# Lampy Paperwork Changelog

All notable fixes and testing changes should be recorded here before sharing a new test build.

## V4 - 2026-06-30

- Published Lampy Paperwork V4.
- Reworked label navigation into a Distro Labels tab with Front RCBO Labels, Rear Labels, and Table View sub-tabs.
- Moved Settings out of the action menu and exposed it as Label Settings inside Distro Labels.
- Removed the old Label Sheet Preview header.
- Added Position Summary Colour 3, live colour display in the position editor, and a Position Summary PDF download.
- Added collapsible Power Calculations supply cards.
- Added Vendor / Company Logo support, PDF logo inclusion options, and first-page-only logo export behavior.
- Reduced Fixture Patch Format Bold, Italic, and Underline controls to compact text bubbles.
- Added an in-app walk-through with workflow tips for first-time users.
- Syntax-checked the V4 single-file JavaScript.

## V3.12 - 2026-06-30

- Published Lampy Paperwork V3.12.
- Capped Fixture Patch fixture-title font size at 28pt, including older saved settings above the cap.
- Updated Table View Fix ID entry so matching Fixture Patch rows fill the Fix Type and apply the Fix ID's position colours to the label colour fields.
- Updated Power Calculations Fix ID entry so linked RCBO label ways inherit the matching Fixture Patch position colours.
- Browser-state tested the title cap plus Table View and Power Calculations Fix ID colour syncing.

## V3.11 - 2026-06-30

- Published Lampy Paperwork V3.11.
- Reworked Fixture Patch PDF download fallback to draw from the measured preview layout instead of the older hard-coded vector table.
- Added standard PDF serif/italic font resources so Cochin/serif-style Fixture Patch title and table formatting carries into downloaded PDFs more closely.
- Fixed Fixture Patch PDF logo placement so it no longer covers fixture titles, while keeping the logo on every page.
- Fixed Fixture Patch PDF underlines, footer page numbers, and long colour-label text fitting inside colour bubbles.
- Browser/PDF-tested a Cochin-styled Fixture Patch export with a tour logo, long fixture titles, page numbers, and `LAVENDER` colour labels.

## V3.10 - 2026-06-30

- Published Lampy Paperwork V3.10.
- Fixed Position Summary colour edits so matching Fixture Patch rows update their Col 1 and Col 2 values.
- Propagated Position Summary colour edits to linked RCBO label ways when their Fix IDs are used in Power Calculations or label text.

## V3.9 - 2026-06-30

- Published Lampy Paperwork V3.9.
- Added a Fixture Patch PDF fallback so download still completes if the browser rejects preview-page rasterization.
- Wrapped preview PDF raster styles in CDATA to reduce SVG conversion failures.

## V3.8 - 2026-06-30

- Published Lampy Paperwork V3.8.
- Fixed Fixture Patch PDF download failures caused by loading the tour logo inside the cloned preview page.
- Draw the tour logo onto the generated PDF page canvas separately, after the preview page has been rasterized.

## V3.7 - 2026-06-30

- Published Lampy Paperwork V3.7.
- Changed Fixture Patch PDF download to generate from the preview pages only, avoiding the older fallback renderer that caused mismatched formatting.
- Removed `continued` from Fixture Patch PDF group titles.
- Added explicit tour-logo image loading before Fixture Patch preview pages are rasterized into the downloaded PDF.

## V3.6 - 2026-06-30

- Published Lampy Paperwork V3.6.
- Removed the `18mm x 34mm` badge from the top page header.

## V3.5 - 2026-06-30

- Published Lampy Paperwork V3.5.
- Added a `New Project` action menu option to start a blank project and replace the current browser project state.

## V3.4 - 2026-06-30

- Published Lampy Paperwork V3.4.
- Updated Fixture Type Options Fix ID changes so selected patched units increment from the entered value, matching the Add Fixtures patch options behavior.

## V3.3 - 2026-06-30

- Published Lampy Paperwork V3.3.
- Added project JSON download and open actions so projects can be saved, restored, updated, and edited later.
- Restored browser local project persistence on startup instead of clearing project state on every reload.
- Fixed Fixture Type Options bulk mode changes so Select all preserves the chosen fields and all selected units update together.
- Browser-tested a three-unit fixture type bulk mode change, confirming all selected units changed mode and channel count.

## V3.2 - 2026-06-30

- Published Lampy Paperwork V3.2.
- Added Fixture Patch fixture-type gear menus for bulk changes to selected patched units, limited to Mode, Fix ID, Universe, Address, Position, Col 1, Col 2, and Notes.
- Added a tab-scoped `Select all` option to the Unpatch Fixture modal.
- Added an `Add New Fixture` tab to the Add Fixtures modal with custom fixture creation, immediate patching, and copy/email update request actions.
- Browser-tested custom fixture creation, fixture-type bulk edit field visibility, and Unpatch tab select-all behavior.

## V3.1 - 2026-06-30

- Published Lampy Paperwork V3.1.
- Added an `Add New Fixture` option for unmatched patch imports, requiring manufacture, name, mode, channel count, wattage at 230V, and weight before import.
- Browser-tested the unmatched fixture import path, including required-field validation and imported fixture metadata.

## V3 - 2026-06-30

- Bumped Lampy Paperwork to V3.
- Added a Home page `Project Info` button for faster project updates.
- Added a `Tour Logo` tab in Project Info with image upload, preview, and remove controls.
- Added a shared top-right tour logo slot in the app header.
- Added the uploaded tour logo to export preview pages.
- Fixed Fixture Patch PDF download scaling so font sizes, row heights, and table spacing match the PDF preview more closely.
- Updated Fixture Patch table formatting so column headers keep their fixed header style.
- Changed Fixture Patch PDF download to render from the export preview page, so downloaded PDFs match the in-app preview layout more closely.
- Added an empty Fixture Patch import workflow with an `Import Patch` button when no fixtures are patched.
- Added CSV, XLSX, and Excel XML patch import with first-row headers, imported-header mapping dropdowns, ignored-column support, and an eight-row preview.
- Added fixture-library matching during patch import, including manual matching for imported fixture types that cannot be found automatically.

## V2.3 - 2026-06-30

- Added Fixture Patch sort controls for Fix ID, Universe, Type, and Position with ascending/descending direction.
- Added Fixture Patch filters for Type, Universe, and Position.
- Added Fixture Patch column visibility controls so patch sheet columns can be shown or hidden before preview/export.
- Added Fixture Patch formatting controls for page size/orientation, fixture title font/size/alignment/B/I/U, and per-column table formatting.
- Tidied the Fixture Patch filter, sort, column, and format controls into a collapsible `Filter & Sort` menu so they do not stay open over the sheet.
- Updated Fixture Patch preview/PDF rendering to share the same filtered, sorted, and visible-column data.
- Added a Fixture Patch PDF export preview before download, matching the existing Export workflow with paper size, orientation, page count, and zoom controls.
- Updated Fixture Patch PDF generation so the downloaded PDF follows the selected preview paper size and orientation.
- Refined the Fixture Patch PDF renderer to better match the patch sheet layout, including larger centred titles, grey header bands, dashed column dividers, centred row text, and colour pills.
- Fixed the Position Summary editor so `+ Position` creates an editable draft row instead of being removed immediately by position syncing.
- Verified Position Summary add, edit, remove, and Home summary refresh in the browser.
- Fixed GitHub Pages JSON lookup so all reference files resolve from the Lampy Paperwork project root, e.g. `/Lampy-Paperwork/fixture_patch_reference.json`, instead of the account root `/json/`.
- Confirmed `json/fixture_patch_reference.json` parses cleanly while leaving user-entered DMX mode, watts, and weight data unchanged.

## V2.2 - 2026-06-29

- Removed the old Power Calcs section from the Project Info menu.
- Added Recommended Supply below the phase totals in the Power Calculations tab.
- Removed the duplicate per-supply `Supply Total` panel from supply cards.
- Updated `Supply Phase Totals` to show linked distro names in brackets.
- Added an Input Supply dropdown to each supply using the distro input supply reference options.
- Loaded distro/input JSON options on app startup so Power Calculations can use them without opening Distro Settings first.
- Fixed published V2.2 JSON loading for GitHub Pages by making the JSON resolver handle version-folder paths and adding a self-contained `published_versions/V2/json/` reference copy.
- Fixed invalid JSON in `fixture_patch_reference.json` where `Pixel Brick` was missing its `fixture` key.

## V2.1 - 2026-06-29

- Moved the always-visible top action buttons into a right-side Actions menu.
- Temporarily limited the Actions menu to Project Info, Export, and Settings.
- Tightened the Power Calculations Socapex column.
- Changed Power Calculations phase cells to white text.
- Added Distro Settings gear buttons beside Power Calculations distro tabs.
- Added selected-distro phase totals and `+ Supply` grouping to Power Calculations.
- Added shared-supply phase totals when one or more distros are assigned to a supply.
- Added fixture wattage and weight details to Home fixture summaries.
- Added `published_versions/V2/V2.1.html` for tracking this UI and power summary update.

## V2 - 2026-06-29

- Published a cleaned V2 baseline for Lampy Paperwork.
- Removed obsolete Navigation sidebar CSS, functions, and stale update calls from the old RCBO-only layout.
- Removed unused JSON save/load leftovers, legacy local-storage migration code, and dead helper functions.
- Removed the internal File Name field from new project info state.
- Rechecked RCBO Labels, Table View, Power Calculations, Project Info live Home updates, JSON loading, and Export preview in the browser.
- Added `published_versions/V2/V2.html` for tracking this stable cleanup release.

## V1.13 - 2026-06-29

- Split Socapex blocks in Power Calculations with stronger top and bottom borders for easier reading.
- Hid Power Calculations watts columns by default.
- Added a `Show Watts` checkbox in Power Calculations to reveal or hide watts columns.
- Added `published_versions/V1/V1.13.html` for tracking this power sheet readability update.

## V1.12 - 2026-06-29

- Made Socapex names editable directly in the Power Calculations sheet.
- Linked Power Calculations Fix ID entries back into the shared RCBO label data.
- Power Calculations now updates matching Socapex way `Fix ID` and `Fix Type` fields so they appear in RCBO Labels and Table View.
- Existing filled Power Calculations rows resync when the tab renders without clearing manually entered blank rows.
- Added `published_versions/V1/V1.12.html` for tracking this power sheet linking update.

## V1.11 - 2026-06-29

- Moved fixture wattage into `json/fixture_patch_reference.json` so fixture patch data, channels, watts, and weight can live in one reference file.
- Added future-ready `weight` support at fixture and mode level.
- Removed the unused `json/fixture_watts.json` file and all app references to it.
- Kept support for existing simple mode values like `"Basic": 54`, while allowing richer mode objects like `{ "channels": 54, "watts": 1500, "weight": 36 }`.
- Added `published_versions/V1/V1.11.html` for tracking this reference-data cleanup.

## V1.10 - 2026-06-29

- Added per-outlet Text Format controls to Aux Outlets, including font size, bold, underline, outline, and outline colour.
- Added the `Power Calculations` tab as a spreadsheet-style view per distro.
- Added power sheet rows in the requested Socapex / Way / Fix ID / Fix Type / Watts / Amps layout.
- Linked power sheet Fix ID entries to the Fixture Patch data, with invalid Fix IDs highlighted.
- Added initial fixture wattage support for power calculations.
- Updated Position Summary syncing so repeated positions are summarized once and patch-sheet location/colour edits update the summary model.
- Bumped Lampy Paperwork to V1.10 and published `published_versions/V1/V1.10.html`.

## V1.8 - 2026-06-29

- Kept the Patch Options window open after adding fixtures, updating the next Fix ID and address for faster patching.
- Added linked Positions data so Location quick options can also fill saved Col 1 and Col 2 values.
- Added colour quick options in Patch Options.
- Changed Position Summary to show one row per position instead of one row per patched fixture/colour combination.
- Made blank Col 2 values display blank in Position Summary.
- Added a Position menu from Home Position Summary and from the Fixture Patch toolbar.
- Added `published_versions/V1/V1.8.html` for tracking this Fixture Patch and Position workflow update.

## V1.7 - 2026-06-27

- Paired Project Dates From/To on one row in File Info.
- Paired Version and Version Date on one row in File Info.
- Changed the Home hero Production Info into fixed rows for management, lighting team, and vendor details.
- Fixed the Home tab going blank after adding Fixture Patch data by correcting the DMX Universe summary render path.
- Added `published_versions/V1/V1.7.html` for tracking this Home and Project Info fix.

## V1.6 - 2026-06-27

- Removed the Project Info button from the Home hero.
- Removed File Name from the File Info menu and stopped showing file name in the Home hero.
- Made the Home hero Production Info area blank when no visible production fields have content.
- Added a red Unpatch Fixture workflow in Fixture Patch with fixture-type tabs and selectable Fix IDs.
- Changed Add Fixtures so Patch Options opens as a separate modal with quick options for Location, Fix ID, and Universe/Address.
- Added `published_versions/V1/V1.6.html` for tracking this Fixture Patch workflow update.

## V1.5 - 2026-06-26

- Stacked Version below Project Dates in the Home hero.
- Changed Home hero project and version date display to `DD/MM/YYYY`.
- Added `published_versions/V1/V1.5.html` for tracking this Home hero date layout update.

## V1.4 - 2026-06-26

- Changed Production Info visibility checkboxes to be off by default.
- Automatically turns a Production Info field on for the Home hero when text is entered.
- Automatically shows vendor-linked fields when the selected vendor fills them.
- Added `published_versions/V1/V1.4.html` for tracking this Home hero visibility update.

## V1.3 - 2026-06-26

- Moved visible Production Info into the centre of the Home hero.
- Removed the separate Production Info Home card to avoid duplicate information.
- Added `published_versions/V1/V1.3.html` for tracking this hero layout refinement.

## V1.2 - 2026-06-26

- Reduced the Home hero height by replacing the large field grid with compact summary chips.
- Moved detailed Project Info and Production Info into normal Home cards below the stats.
- Added Production Info visibility checkboxes so each field can be shown or hidden on the Home page.
- Added `published_versions/V1/V1.2.html` for tracking this layout update.

## V1.1 - 2026-06-26

- Added Universe count to the Home stats.
- Expanded the Home hero so project and production info, including version, is visible at the top.
- Restyled Position Summary to match the app's standard white panel/table styling.
- Added DMX Universe percentage bars and expandable universe channel tables with patched and free address ranges.
- Added Patched and Library tabs to the Add Fixtures modal, with previously patched fixture types surfaced first.
- Locked the Fixture Patch Type column in edit mode.
- Added fitting for Fixture Patch table text so long values shrink toward 10px and wrap where possible.

## V1.0 - 2026-06-26

- Restarted version numbering for Lampy Paperwork as its own new app.
- Set the visible app version, internal version, JSON filenames, and Excel template filenames to `V1.0`.
- Added new Lampy Paperwork local storage keys so future progress is tracked separately from the old RCBO Label Generator version sequence.
- Kept previous RCBO storage keys as legacy fallbacks only.
- Added `published_versions/V1/V1.0.html` as the new baseline release.

## V19.4 - 2026-06-26

- Refreshed the Home page immediately while Project Info fields are edited.
- Changed the DMX Universe summary to show each universe's next available address.
- Restyled Position Summary as a table with colour-backed Col 1 and Col 2 cells.
- Expanded Home Production Info so all production fields are visible.
- Made Vendor Details read-only and linked to the selected Lighting Vendor reference.
- Made Fixture Patch channel counts display-only in the editable patch sheet.
- Added automatic next-available patching when a Fixture Patch address is left blank.
- Added duplicate DMX address highlighting with a confirmation prompt for intentional duplicates.

## V19.3 - 2026-06-26

- Added Fixture Patch search across all fixtures before a manufacturer is selected.
- Added Notes to the Add Fixtures patch options.
- Added duplicate Fix ID warnings with choices to keep the new ID or highlight the existing units for renumbering.
- Made the Fixture Patch sheet lockable/unlockable, with editable patch table columns when unlocked.
- Added mode dropdown editing in the patch sheet, updating channel counts and repacking DMX addresses.
- Added row selection for group editing selected Fixture Patch rows.
- Removed the Navigation pane from the app layout.
- Hid the quick `+ Distro` button except on RCBO Labels, Rear Labels, and Table View.
- Expanded the Home page with Fixture Info, Position Summary, DMX Universes, Revision Summary, and Production Info panels.
- Added a Production Info tab to Project Info, including lighting vendor data loaded from `json/lighting_vendors.json`.
- Updated the fallback welcome link to the Lampy Paperwork GitHub Pages URL.

## V19.2 - 2026-06-26

- Moved `Fixture Patch` next to `Home` in the page tabs.
- Restyled Fixture Patch sheets to match the original patch sheet layout more closely.
- Centred patch table text in each column.
- Removed the `Name` column from the Fixture Patch sheet.
- Added editable `Notes`, `Col 1`, and `Col 2` columns to the patch sheet.
- Added DMX-aware address allocation so fixtures cannot exceed address 512 in a universe.
- Added next-available address suggestions when selecting fixture modes and universes.

## V19.1 - 2026-06-26

- Renamed the app from RCBO Label Generator to Lampy Paperwork.
- Updated default welcome copy and export filenames for the new project name.
- Split the V19 app into its own `Lampy Paperwork` project folder with dedicated `json` references and published versions.

## V19 - 2026-06-26

- Added a new `Fixture Patch` page/tab.
- Added an `Add Fixtures` popup with searchable Manufacture, Fixture, and Mode columns loaded from `json/fixture_patch_reference.json`.
- Added patch options for Name, Quantity, Location, Fix ID, Universe, and Address.
- Generated patch-sheet rows from selected fixture modes, including channel count and automatic Fix ID/address increments.
- Added a grouped patch sheet preview based on the existing patch sheet table layout.
- Saved Fixture Patch data with the project payload.
- Added `published_versions/V19/V19.html` for tracking this major update.

## V18.10 - 2026-06-26

- Added a Home tab as the default app view.
- Added project summary cards for distro count, Socapex count, front labels, rear labels, Aux labels, Output labels, filled fields, and total labels.
- Added a Home distro summary list and Project Info summary panel.
- Added quick Home actions for Project Info and adding a distro.
- Added `published_versions/V18/V18.10.html` for tracking this Home page update.

## V18.9 - 2026-06-22

- Added Aux and Output rear-label blocks to the Rear Labels preview tab.
- Fixed Table View colour typing so colour names are not overwritten while typing.
- Added remove buttons to Socapex, Aux, and Output tables in Table View.
- Kept the Add Output modal open after adding an output so multiple output types can be added quickly.
- Added Front and Rear label toggles to the export preview.
- Added `published_versions/V18/V18.9.html` for tracking this workflow update.

## V18.8 - 2026-06-22

- Added Sheet Settings controls for rear/extra label dimensions.
- Added adjustable Rear Socapex label width and height.
- Added adjustable Aux label width and height.
- Added adjustable Output label width and height.
- Updated preview/export sizing so Aux, Output, and Rear Socapex labels use the new settings.
- Added `published_versions/V18/V18.8.html` for tracking this label sizing update.

## V18.7 - 2026-06-22

- Changed Table View colour cells from colour pickers to typed colour fields for faster data entry.
- Allowed typed colour names and hex values in Socapex, Aux, and Output table colour columns.
- Made typing into a Socapex way colour cell automatically enable Colour Override for that way.
- Fixed Colour Override off in Table View so the row immediately returns to the master Socapex colour.
- Improved spreadsheet-style paste so a single copied value fills all selected cells.
- Added `published_versions/V18/V18.7.html` for tracking this Table View workflow update.

## V18.6 - 2026-06-22

- Changed Excel template download from legacy `.xls` XML to modern `.xlsx`.
- Added formatted workbook output based on the supplied example layout, with separate Socapex, Aux, and Output blocks.
- Kept one worksheet per distro in the downloaded workbook.
- Hid the internal import columns in the `.xlsx` template.
- Changed default white colour values so they export as blank cells instead of the word `white`.
- Updated Excel upload to accept `.xlsx` files while retaining legacy XML `.xls` import support.
- Added `published_versions/V18/V18.6.html` for tracking this Excel template update.

## V18.5 - 2026-06-21

- Tidied the downloadable Excel template by hiding internal columns: `Section`, `Group Index`, `Colour 2 On`, and `Colour Override`.
- Renamed visible Excel columns to user-friendly labels: `Socapex`, `Fix ID`, and `Fix Type`.
- Changed template export so `Colour 2` cells start blank for easier data entry.
- Changed Excel import so entering a `Colour 2` value automatically enables Colour 2 and override behaviour for the appropriate label.
- Added `published_versions/V18/V18.5.html` for tracking this workflow refinement.

## V18.4 - 2026-06-21

- Added `Download Excel Template` for generating an Excel-compatible workbook from the distros currently in the app.
- Added one worksheet per distro in the exported template.
- Added Socapex, Aux, and Output rows to the workbook template.
- Added `Upload Excel` to import the edited workbook back into the app.
- Made colour columns text-based for Excel entry, supporting common colour names and hex values.
- Added `published_versions/V18/V18.4.html` for tracking this workflow update.

## V18.3 - 2026-06-21

- Fixed Table View way colour boxes so non-overridden ways visibly mirror the selected Socapex Colour values.
- Updated live Socapex Colour changes so disabled/read-only way colour boxes refresh immediately.
- Added `published_versions/V18/V18.3.html` for tracking this fix.

## V18.2 - 2026-06-21

- Tightened the Table View Socapex layout so two Socapex tables fit more comfortably on screen.
- Changed the first table column to `Way` with rows numbered `1` to `6`.
- Renamed the master colour header to `Socapex Colour`.
- Moved `Colour Override` to the right-hand side after `Colour 2`.
- Changed Colour Override so enabling it turns Colour 2 on for that way and copies Colour 1 into Colour 2.
- Added `published_versions/V18/V18.2.html` for tracking this update.

## V18.1 - 2026-06-21

- Changed RCBO Labels to use per-distro tabs so only one distro is shown at a time in the working preview.
- Kept export rendering all selected distros even though the working RCBO Labels view is tabbed.
- Simplified Table View colour columns to picker-only controls with no visible hex fields.
- Added Socapex master colour controls in Table View, including a Colour 2 enable toggle.
- Added per-way Colour Override controls for custom way colours.
- Added spreadsheet-style cell selection, copy, and tab/newline paste support for Socapex text cells.
- Tidied the Table View master colour header to better match the cleaner preview styling.
- Added `published_versions/V18/V18.1.html` for tracking this update.

## V18 - 2026-06-21

- Added a new Table View tab for spreadsheet-style data entry.
- Added per-distro tabs inside Table View.
- Added editable Distro name fields in Table View.
- Added editable Socapex tables for Socapex name, Fixture ID, Fixture Type, Colour 1, and Colour 2.
- Added Aux Outlets to Table View with editable label names and colours.
- Added Outputs to Table View with editable output label names and colours.
- Linked table edits directly to the existing preview/export data model.
- Changed Export from Table View to fall back to the RCBO Labels preview so print/export still uses label layout.
- Added `published_versions/V18/V18.html` and `published_versions/V18/json/` for tracking this major update.

## V17.6 - 2026-06-21

- Added a tidy `json/` reference folder for editable app data.
- Added `json/distro_options.json` and moved supply/welcome references to `json/supply_reference.json` and `json/welcome_message.json`.
- Removed Google Sheets CSV loading from Distro Settings; distro references now load from JSON with local fallbacks.
- Restored Distro Type as the main dropdown selector for distro size, with Socapex count driven by the selected JSON option.
- Fixed Power Calcs inputs losing focus while typing by updating totals in place instead of re-rendering the whole tab.
- Added `published_versions/V17/V17.6.html` and `published_versions/V17/json/` for tracking this update.

## V17.5 - 2026-06-21

- Moved Rear Labels into a top-level Sheet Preview tab.
- Rear Labels now display as a preview-only view separate from the RCBO Labels preview.
- Updated export so it follows the selected sheet tab, allowing Rear Labels to be exported on their own.
- Added JSON fallback loading for `supply_reference.json` and `welcome_message.json` from the current folder, repo root, or published V17 folder.
- Added `published_versions/V17/V17.5.html` for tracking this update.

## V17.4 - 2026-06-18

- Added a placeholder Rear Labels preview block for each distro.
- Rear Labels are generated from each Socapex name and Socapex colour settings.
- Included Rear Labels in export previews for their selected distro.
- Added `published_versions/V17/V17.4.html` for tracking this update.

## V17.3 - 2026-06-18

- Fixed export preview scaling so Fit uses both available page width and height.
- Constrained export-only distro headers and Socapex rows to the selected paper page width to prevent clipped previews.
- Added editable `welcome_message.json` for the load-time welcome popup.
- Changed startup to open as a blank canvas and clear any previously saved project data.
- Added `published_versions/V17/V17.3.html` and `published_versions/V17/welcome_message.json` for tracking this update.

## V17.2 - 2026-06-18

- Replaced the Power Calcs distro dropdown with expandable distro menus.
- Added a per-distro option to link distros that share the same upstream power supply.
- Added a linked supply summary with combined Total Supply Draw, Total Phase 1, Total Phase 2, Total Phase 3, and Recommended Supply.
- Generated linked Recommended Supply from the combined phase totals of all linked distros.
- Added `published_versions/V17/V17.2.html` for tracking this update.

## V17.1 - 2026-06-18

- Fixed Recommended Supply so it is based on the largest individual phase draw, not Total Supply Draw.
- Kept the Power Calcs view focused on Total Supply Draw and Recommended Supply only.
- Updated `supply_reference.json` so editable ranges are based on largest phase draw.
- Added `published_versions/V17/V17.1.html` for tracking this fix.

## V17 - 2026-06-18

- Added a Project Info menu with File Info, Power Calcs, and Revisions tabs.
- Added File Info fields for file name, project name, project date range, version, version date, and a Today button.
- Added per-distro Power Calcs with Phase 1, Phase 2, Phase 3, calculated total draw, and recommended supply.
- Added editable `supply_reference.json` for recommended supply ranges, with fallback values if the file cannot be loaded.
- Added revision entries with version, default-today date, notes, and remove controls.
- Saved Project Info data as part of the project state and reset it with Reset All.
- Added `published_versions/V17/V17.html` and `published_versions/V17/supply_reference.json` for tracking this release.

## V16.14 - 2026-06-18

- Restored internal Aux label spacing in export to follow the master Label Spacing setting.
- Kept the larger export-only spacing between separate Aux groups and Output blocks for cutting.
- Verified Aux labels use the master 0.5mm spacing while Aux groups keep a larger cut gap.
- Added `published_versions/V16/V16.14.html` for tracking this release.

## V16.13 - 2026-06-18

- Added export zoom controls: Fit, 50%, 75%, 100%, and 125%.
- Changed the export preview to fit the full selected paper width inside the modal by default.
- Kept manual zoom levels available for checking fine label details, with scrolling enabled when zoomed in.
- Added `published_versions/V16/V16.13.html` for tracking this release.

## V16.12 - 2026-06-18

- Increased export-only horizontal spacing between Aux and Output blocks to make printed labels easier to cut out.
- Increased export-only spacing between individual Aux labels.
- Verified the wider Aux/Output spacing still fits on one A4 landscape row without export overflow.
- Added `published_versions/V16/V16.12.html` for tracking this release.

## V16.11 - 2026-06-18

- Reduced vertical spacing in the sheet preview so more label blocks fit on screen.
- Tightened export preview vertical spacing between Socapex, Aux, and Output blocks.
- Removed the grey Socapex separator lines from the export preview while keeping them in the working sheet preview.
- Includes the V16.10 preview title/header refinements and export Aux/Output row packing.
- Added `published_versions/V16/V16.11.html` for tracking this release.

## V16.10 - 2026-06-18

- Matched the distro header width to a three-Socapex preview row.
- Changed Socapex preview titles to `Distro Name - Socapex x > x` and removed the word `Preview`.
- Fixed Socapex preview title numbering so each distro starts at `Socapex 1`.
- Removed the visible Save JSON and Load JSON buttons from the top toolbar.
- Reworked export packing so Aux and Output blocks share rows when they fit on the selected paper size.
- Superseded by V16.11 before a published copy was created.

## V16.9 - 2026-06-18

- Changed the navigation pane into an off-canvas sidebar opened by a fixed Navigation button.
- Freed the label preview to use the full browser width when navigation is closed.
- Added paper size and orientation controls directly inside the export layout modal.
- Made export paper/orientation changes update the export preview immediately.
- Tightened Socapex spacing in portrait export layouts so the page space is used more efficiently.
- Added `published_versions/V16/V16.9.html` for tracking this release.

## V16.8 - 2026-06-17

- Added 1mm `#c7c7c7` separator lines between Socapex blocks in the preview.
- Changed the main preview action from `+ Socapex` to `+ Distro`.
- Moved `+ Socapex` into each distro's preview controls.
- Made Distro Type calculate from Socapex count, e.g. 1 Socapex = `6 Way`, 2 Socapex = `12 Way`.
- Added a short Google Sheets fetch timeout so Distro Settings falls back gracefully if the sheet is unavailable.
- Added `published_versions/V16/V16.8.html` for tracking this release.

## V16.7 - 2026-06-17

- Increased export-only spacing between Socapex blocks so labels are better distributed across each page.
- Added a gear button to each distro preview header.
- Added a single-distro settings popup opened from each distro header gear.
- Removed header gear buttons from export page clones.
- Added `published_versions/V16/V16.7.html` for tracking this release.

## V16.6 - 2026-06-17

- Rebuilt export pagination so Socapex labels are packed onto each paper page by available space instead of by on-screen preview groups.
- Changed export so each distro starts on a fresh page and distros never share an export page.
- Kept repeated pages for the same distro labelled with that distro's header.
- Added `published_versions/V16/V16.6.html` for tracking this release.

## V16.5 - 2026-06-17

- Removed distro prefixes from Socapex preview titles and Socapex editor title fields.
- Changed generated Socapex names to store only `Socapex N`.
- Updated the navigation tree so each distro is the parent item and children show only Socapex, Aux, or Output names.
- Added backwards-compatible display cleanup for older saved Socapex names such as `Distro Name - Socapex 1`.
- Added `published_versions/V16/V16.5.html` for tracking this release.

## V16.4 - 2026-06-17

- Grouped duplicate Output types together within each distro preview and editor.
- Changed `+ Output` so adding an existing Output type extends that group instead of creating a separate group.
- Simplified Output label editors by removing per-output dropdown/details controls and font dropdowns.
- Updated Output navigation entries to show `Distro Name - Text Input (Output Type)`.
- Added `published_versions/V16/V16.4.html` for tracking this release.

## V16.3 - 2026-06-17

- Added a `Select All` checkbox to the export distro controls.
- Unchecking `Select All` now clears every distro from the export preview.
- Re-checking `Select All` restores every distro to the export preview.
- Reorganised `published_versions` into major-version folders for easier release browsing.
- Added `published_versions/V16/V16.3.html` for tracking this release.

## V16.2 - 2026-06-17

- Refined the distro preview header first line to show distro name, distro type with Socapex count in brackets, and output summaries separated with ` - `.
- Changed navigation links so they expand the target distro, preview block, and nested editor before scrolling.
- Changed export preview cloning so collapsed Socapex, Aux, and Output blocks still export all labels.
- Added per-distro export toggles to include or exclude each distro from the export preview.
- Added `published_versions/V16.2.html` for tracking this release.

## V16.1 - 2026-06-17

- Simplified distro preview headers to the requested two-line format.
- Added output type and quantity summaries to the first header line.
- Moved label count to the second header line with input supply and P/Lock adaptor status.
- Removed the Socapex Phasing control from Distro Settings.
- Added `published_versions/V16.1.html` for tracking this release.

## V16 - 2026-06-17

- Moved Socapex, Aux, and Output editors into the same collapsible preview block as their matching labels.
- Added nested editor collapse controls so previews can stay open while their editors are hidden.
- Changed all text outline rendering to use a `1mm` stroke.
- Kept export pages label-only by stripping embedded editor controls from export preview pages.
- Added `published_versions/V16.html` for tracking this release.

## V15.2 - 2026-06-17

- Resized the Socapex way `Text Format` menu so controls have more room inside each Way card.
- Removed the per-way Socapex font selector; fonts are now controlled from app settings only.
- Moved per-way text colour into the Socapex `Text Format` menu.
- Removed the text colour picker from Socapex colour override controls.
- Hid the Socapex outline colour picker unless `Outline` is enabled.
- Added `published_versions/V15.2.html` for tracking this release.

## V15.1 - 2026-06-17

- Tidied the Socapex editor so per-way colour controls only appear after `Override colours` is enabled.
- Hid each way's Colour 2 picker unless `Colour 2 On` is enabled.
- Added per-way Socapex `Text Format` controls for font size, font, bold, underline, outline, and outline colour.
- Added `published_versions/V15.1.html` for tracking this release separately from V15.

## V15 - 2026-06-17

- Created publish-ready `V15.html` from the tested V14.11 build.
- Updated visible app version, internal save version, and JSON export filename for the V15 release.
- Added `published_versions/V15.html` so published release files can be tracked separately.

## V14.11 - 2026-06-17

- Made Aux Outlet and Output sheet preview sections collapsible like Socapex preview sections.
- Made Output editor groups collapsible.
- Added remove buttons for Aux editor groups.
- Changed Output removal to remove each individual Output label instead of the whole Output group.

## V14.10 - 2026-06-17

- Increased Output outline text stroke thickness to `1mm`.
- Changed export preview from one endlessly growing sheet to fixed paper-size page previews.
- Added export page counting and visible page numbers in the export preview.

## V14.9 - 2026-06-17

- Fixed Output font size controls so each label starts from its own chosen size before text fitting.
- Moved Output text formatting controls into a collapsible `Text Format` menu.
- Changed default label spacing to `0.5mm` and default stripe width to `4mm`.
- Added `Cochin` to font choices and made it the default font for labels and Output labels.

## V14.8 - 2026-06-17

- Added visible spacing between separate 54mm Output labels in the sheet preview and export.
- Added per-label Output text formatting controls: font size, font, bold, underline, outline, and outline colour.
- Output text formatting now saves/loads with each Output label.
- Added a remove button to each grouped Output editor.

## V14.7 - 2026-06-17

- Added `+ Output` controls to each distro in Distro Settings.
- Added an Output modal for `32/3ø`, `63/3ø`, `125/3ø`, and custom output labels.
- Added quantity selection from 1 to 10 for each output type.
- Added grouped Output editors inside each distro.
- Added 54mm x 34mm Output labels to the sheet preview and export layout.
- Output labels now save/load as part of each distro.

## V14.6 - 2026-06-17

- Restored saved project state on page load instead of always resetting to a blank canvas.
- Fixed distro renaming so generated Socapex editor headers and navigation entries keep the full distro name.
- Set Colour 2 to off by default for new Socapex and Aux labels.
- Changed Aux outlets to use individual colour controls per Aux label instead of one shared group colour.
- Updated Aux navigation entries to include the distro name, for example `Distro 1 - Aux 1`.
- Changed Aux preview rendering to grouped blocks of 3 labels with headers such as `Aux Outlets 1 > 3`.
- Simplified Aux editors to one text input field per Aux outlet.
- Added text fitting for Aux labels and Socapex preview labels so long text shrinks to stay inside the label area.
- Verified Export preserves Aux grouping and fitted label text.

## V14.5 - 2026-06-16

- Stable base file provided as the working baseline.
- Includes distro settings, Socapex labels, Aux groups, navigation, save/load JSON, reset, welcome popup, and export preview.
