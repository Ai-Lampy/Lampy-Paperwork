# Lampy Paperwork Changelog

All notable fixes, cleanup work, and published version changes should be recorded here.

## V17.16 - 2026-07-24

- Vertically centred the Fixture Patch Clear Filters controls.
- Removed the standalone `Distro Phase Totals;` heading from Power Calculations.
- Updated supply and distro phase-total card widths, spacing, borders and internal layout.
- Split each supply card's input supply and assigned distro summary onto separate metadata lines.
- Applied the same reusable summary-card layout to the Power Calculations PDF supply summary.

## V17.15 - 2026-07-24

- Removed the collapsible Filter & Sort summary and `<details>` wrapper from Fixture Patch.
- Made the Fixture Patch filter controls permanently visible.
- Applied the supplied Clear Filters positioning and removed the unused panel styles and toggle state.

## V17.14 - 2026-07-24

- Consolidated the updated Home and Fixture Patch styles into their original CSS definitions.
- Removed the obsolete overridden copies of the updated statistic, toolbar and Filter & Sort rules.

## V17.13 - 2026-07-24

- Reduced the vertical gap between Fixture Patch sections.
- Updated the Fixture Patch toolbar and Filter & Sort body with the supplied three-pixel grey borders.
- Changed the Filter & Sort body and control grid to the supplied flex layouts.

## V17.12 - 2026-07-24

- Reduced the Fixture Patch statistic cards to the supplied compact dimensions.
- Tightened the card spacing, padding, value sizing and label spacing for the Fixture Patch toolbar.

## V17.11 - 2026-07-24

- Reordered the Home statistics to Fixtures, Universes, Consoles, Parameters Required, Parameters Available, Distros and Socapexes.
- Restyled the Fixture Patch fixture quantity, fixture type count and required parameters as Home statistic cards.
- Removed the selected-fixture counter from the Fixture Patch statistics.

## V17.10 - 2026-07-23

- Restyled the Home statistic cards with the supplied red borders, grey backgrounds, fixed dimensions and centred content.
- Reduced the spacing between Home statistic cards and increased the statistic-label prominence.

## V17.9 - 2026-07-23

- Added an exact `Parameters Required` total beside the Fixture Patch statistics and to the Home page statistics.
- Added per-mode grandMA3 parameter counts to every matched fixture-library GDTF reference.
- Updated browser-side GDTF parsing to retain parameter counts for imported and manually uploaded GDTF files.
- Renamed the existing Home parameter capacity statistic to `Parameters Available` for clarity.

## V17.8 - 2026-07-23

- Moved the Distro Labels `+ Distro` button into the shared sheet-toolbar actions.
- Removed the former standalone `+ Distro` control and its unused preview-header action wrapper.

## V17.7 - 2026-07-23

- Updated the Distro Labels toolbar to use the shared sheet-toolbar action layout.
- Separated the Front RCBO Labels, Rear Labels and Table View navigation from the right-aligned action controls.
- Stacked the Distro Labels Fixture Names label above its Full Name / Short Name selector.

## V17.6 - 2026-07-23

- Rebuilt the Power Calculations toolbar with an empty left section and the supplied action order.
- Moved the Power Calculations Fixture Names control directly into the toolbar markup.
- Standardised Fixture Patch, Power Calculations and Control/Network toolbar actions with the same spacing, alignment and wrapping.
- Stacked toolbar Fixture Names labels above their Full Name / Short Name selectors.
- Preserved Power Calculations PDF page headings by generating them in the export clone.

## V17.5 - 2026-07-23

- Added the active sheet-tab name after the Lampy Paperwork version in the main header.
- Made the header update immediately when switching between Home, Fixture Patch, Power Calculations, Control/Network and Distro Labels.

## V17.4 - 2026-07-22

- Moved the Fixture Names label above the Full Name / Short Name selector in the Fixture Patch toolbar.
- Kept the shared fixture-name selector layout unchanged in Power Calculations and Distro Labels.

## V17.3 - 2026-07-22

- Updated the shared button background, border and horizontal padding.
- Changed Fixture Patch statistics into a compact vertical grid.
- Reordered the Fixture Patch toolbar to place fixture actions first, followed by name display, column/format tools, position summary, import and export.
- Removed the redundant Fixture Patch heading from the toolbar.

## V17.2 - 2026-07-22

- Moved the Fixture Patch lock beside each fixture-group options button.
- Scoped patch unlocking, row selection and editing to the selected fixture group instead of the entire patch.
- Moved `Show/Hide Columns` and `Format` from Filter & Sort into the Fixture Patch toolbar.
- Removed the changing sheet-description hint beneath the main navigation tabs.
- Updated the preview header spacing and main project/sheet tab container styling.

## V17.1 - 2026-07-22

- Completed a production cleanup and performance audit across the app, fixture library, GDTF collection and static assets.
- Removed unreachable JavaScript functions, disconnected legacy CSS, obsolete DMX Chart styling and accumulated Patch Options overrides.
- Consolidated the shared Universe Viewer styling without changing its 14-column layout or current appearance.
- Enabled normal browser caching for static JSON and GDTF information requests instead of forcing repeat downloads.
- Prevented fixture-library thumbnails and fixture-information views from retaining entire GDTF archives in memory unnecessarily.
- Removed exported PDF/project diagnostic payloads that retained large data objects after downloads.
- Coalesced asynchronous startup reference loads to avoid repeated full renders.
- Optimized large byte-array Base64 conversion used by project and GDTF processing.
- Removed the persistent Welcome-screen keyboard listener after the overlay closes.
- Restored backdrop closing for the single-distro settings pane by connecting its existing close-state handler.
- Removed macOS metadata files and confirmed every remaining GDTF is referenced, unique, structurally valid and below GitHub's individual-file limit.

## V17 - 2026-07-22

- Removed the legacy 20-column DMX Chart from the DMX Summary Universe pane.
- Replaced it with the 14-column Universe Viewer used by Patch Options.
- Added consistent alternating address cells, patched-range borders, FIX ID boundary labels and hover details.
- Preserved the universe utilisation summary, move-universe control and patched-fixture table.
- Increased Universe Viewer patched-range labels to 15px.
- Updated Location Quick Options to populate two 150px columns immediately, with capacity for 12 rows.

## V16.8 - 2026-07-22

- Updated alternating Universe Viewer cells to black.
- Updated the selected fixture range and legend key to the stronger blue styling.
- Updated patched fixture ranges to a translucent grey fill with red top and bottom borders.
- Simplified patched fixture labels in the grid to display only the FIX ID.
- Retained the fixture type in each patched address hover description.

## V16.7 - 2026-07-22

- Increased Quick Options to a 565px-high panel.
- Arranged Quick Options into 12 rows and two 150px columns.
- Updated the header return control to **⬅ Fixture Library**.

## V16.6 - 2026-07-22

- Enlarged the Universe Viewer legend text and colour keys.
- Renamed the proposed-range legend entry from **Selected range** to **Selected**.
- Updated the Patched legend key to the requested translucent grey fill with red border.
- Increased the fixture options card height to 622px.
- Removed the lower Back button from the rendered Patch Options actions.
- Anchored the Add Fixtures button to the bottom-left of the Patch Options window.
- Removed the modal column gap while retaining the 760px Universe Viewer column.

## V16.5 - 2026-07-22

- Kept the Universe Viewer template at 14 addresses per row and aligned fixture-range borders to the same row boundaries.
- Removed the fixture/address usage metadata line beneath the Universe Viewer heading.
- Increased spacing between the Universe Viewer heading and navigation controls.
- Added left padding to the Universe Viewer header.
- Reset the generic grid-wrapper border, radius, and background while retaining the Patch Options scrolling dimensions.

## V16.4 - 2026-07-22

- Simplified the viewer heading to **Universe Viewer**.
- Added previous and next arrow controls for moving between universes.
- Added an editable universe-number button that switches to a numeric input when pressed.
- Kept the Patch Options Universe field synchronized with the universe currently displayed in the viewer.

## V16.3 - 2026-07-22

- Rebuilt the Patch Options layout to the supplied 1500px-wide design.
- Moved **← Fixture Library** beside the Patch Options heading.
- Increased Patch Options inputs to 45px with bold text and retained blue borders.
- Updated Patch Options field labels to the larger 15px underlined style.
- Sized the settings card to 650px × 600px with a blue border and moved its actions lower.
- Updated the fields/Quick Options layout to 260px plus a flexible 220px minimum column.
- Reduced Quick Option auto-columns to a 130px minimum width.
- Expanded the Universe Viewer to 770px × 600px with a 750px scroll area.
- Allowed the Universe Viewer to fill the available Patch Options window height while retaining an independently scrollable address grid.
- Set the Universe Viewer to 14 addresses per row and aligned occupied-range borders to those row boundaries.
- Added automatic fixture-summary text fitting from 18px down when its full manufacturer, fixture, mode, and channel description exceeds the available width.

## V16.2 - 2026-07-22

- Reworked Patch Options into three columns: fields, Quick Options, and Universe Viewer.
- Reduced the Patch Options field grid to 300px × 350px.
- Changed the Universe Viewer to 10 addresses per row and a 620px grid width.
- Updated occupied-range edge calculations for the new 10-column layout.
- Updated the **← Fixture Library** button text and weight.

## V16.1 - 2026-07-22

- Sized the Patch Options input grid to 400px × 350px.
- Updated text, number, select, and textarea controls to a 40px height with blue borders.

## V16.0 - 2026-07-22

- Added an interactive 512-address universe viewer to Patch Options.
- Displayed universe addresses in a 20-column grid with selectable cells that update the Universe and Address fields.
- Marked existing fixture ranges with rounded red borders and fixture identity labels on their start and end addresses.
- Highlighted the currently proposed fixture range separately from existing patch data.
- Increased the Patch Options fixture summary to 20px black text.
- Kept Quick Options empty until a Patch Options field is selected.
- Allowed long Quick Options lists to continue into additional columns.

## V15.16 - 2026-07-22

- Added a **<-- Fixture Library** button directly beneath the Patch Options header.
- Returning to the fixture library now preserves the selected manufacturer and fixture.

## V15.15 - 2026-07-22

- Reduced the Add Fixtures library grid height to 560px.
- Added browser-verified keyboard navigation fixes for the Add Fixtures picker.
- Restored focus to the selected manufacturer or fixture after the picker rerenders and made the focused option clearly outlined.

## V15.14 - 2026-07-22

- Moved Add Fixtures keyboard handling to the document level while the modal is open, preventing arrow keys from scrolling the page behind it.
- Restored picker focus automatically when a fixture selection rerender leaves no focused control.
- Kept focused manufacturer, fixture, mode, patched-fixture, and tab options scrolling into view during keyboard navigation.

## V15.13 - 2026-07-22

- Rebuilt keyboard navigation throughout the Add Fixtures window.
- Added reliable Up/Down, Home/End, and Left/Right movement across tabs, search fields, patched fixtures, manufacturers, fixtures, and modes.
- Allowed Arrow Up from a search field and Left/Right from a single patched result to return focus to the picker tabs.
- Kept Enter and Space selection moving focus into the next available library column.
- Added Escape-key closing for the Add Fixtures window.

## V15.12 - 2026-07-22

- Reduced the Add Fixtures modal height from 1000px to 700px.
- Retained the 1900px maximum modal width and 600px internal fixture-picker area.

## V15.11 - 2026-07-22

- Reduced the Add Fixtures picker-list maximum height from 1000px to 480px.
- Kept overflowing manufacturer, fixture, and mode results independently scrollable.

## V15.10 - 2026-07-22

- Audited **No Colour** handling across Fixture Patch, Add Fixtures, positions, Socapex labels, per-way overrides, Aux outlets, and output labels.
- Prevented blank and **No Colour** values from being converted to white in every background/position colour field.
- Preserved intentional white as a real colour in Aux and Output table views.
- Made a per-way **No Colour** override remain blank instead of falling back to the Socapex master colour.
- Removed **No Colour** from menus for required text, outline, and border colours, which continue to use their safe defaults.
- Normalised legacy `No Colour`, `No Color`, `None`, `Blank`, and `Clear` saved values when project data is loaded.

## V15.9 - 2026-07-22

- Fixed **No Colour** being converted to white when adding fixtures.
- Preserved empty Colour 1 and Colour 2 values when no fixture colour is entered.
- Fixed blank and **No Colour** selections made directly in the Fixture Patch table.
- Cleared previously selected Add Fixtures colours when choosing a project position that has no stored colours.

## V15.8 - 2026-07-22

- Enlarged the Add Fixtures modal to a maximum width of 1900px and a height of 1000px.
- Set the fixture picker workspace to 600px and the four-column library grid to 570px.
- Increased the fixture picker column minimum height and list maximum height to 1000px.
- Kept the larger modal-card height scoped to Add Fixtures so other app dialogs retain their existing viewport limits.

## V15.7 - 2026-07-22

- Added keyboard arrow navigation throughout the Add Fixtures picker.
- Added Up/Down and Home/End movement within manufacturer, fixture, mode, and previously patched fixture lists.
- Added Left/Right movement between the Manufacture, Fixture, and Mode columns.
- Added Arrow Down/Up movement from each library search field into its first or last visible result.
- Added Enter/Space selection with automatic focus movement to the next picker column and a visible keyboard focus outline.

## V15.6 - 2026-07-21

- Added a fourth Fixture Info column to the Add Fixtures library picker.
- Displayed the selected fixture's GDTF thumbnail, with a clear fallback when the archive has no usable image.
- Displayed the fixture-library Short Name, weight in kilograms and pounds, and wattage for the selected fixture.
- Cached GDTF thumbnails for the duration of the Add Fixtures window to avoid repeated downloads and ZIP processing while searching.

## V15.5 - 2026-07-20

- Added a Product Page button beneath the GDTF fixture thumbnail at the same width as the image.
- Added an optional, validated `productPage` field to fixture-library JSON entries and opened verified manufacturer links in a separate tab.
- Added the official Chauvet Professional product page for Maverick Storm 1 Flex.
- Displayed a disabled Product Page button when a fixture does not yet have a verified manufacturer URL instead of generating or guessing a link.

## V15.4 - 2026-07-20

- Added fixture weight to the GDTF Fixture Information header in both kilograms and pounds.
- Added fixture wattage using the selected mode or fixture-library JSON value.
- Added the quantity of the selected fixture type, mode, and channel count currently patched in the project.

## V15.3 - 2026-07-20

- Made every GDTF DMX mode button expand into its parsed channel list.
- Added channel offsets, attributes, channel functions, geometry, and DMX-break information to the expandable mode details.
- Changed the Fixture Information Short Name to use the fixture-library JSON value instead of the GDTF archive value.
- Changed colour, gobo, prism, animation, and other wheel slots to wrap onto additional rows instead of producing sideways scrolling.

## V15.2 - 2026-07-20

- Fixed the GDTF fixture-information window so long wheel and slot content scrolls vertically within the available screen height.
- Kept the fixture-information header and close control visible while its content scrolls.
- Removed the GDTF fixture marketing-description paragraph from the information window.

## V15.1 - 2026-07-20

- Simplified the GDTF fixture-information header to display the fixture identity and Short Name without the technical file, identifier, and element-count chips.
- Kept DMX modes, thumbnails, colour wheels, gobos, prisms, animation wheels, and other wheel data dynamically generated from the selected GDTF.

## V15.0 - 2026-07-20

- Made each fixture type in the Home Fixture Info card open a dedicated fixture-information window.
- Added local, on-demand GDTF display of fixture metadata, DMX modes and channel counts.
- Added visual wheel data for colour wheels, gobos, prisms, animation wheels, and other GDTF wheels.
- Displayed embedded GDTF wheel media and fixture thumbnails directly from the matched archive without uploading data or adding server processing.
- Added clear loading, unavailable-file, missing-media, click-away, and Escape-key behaviour for the fixture-information window.

## V14.2 - 2026-07-20

- Preserved imported MVR fixture matrices and fixture-attached geometry as hidden background metadata.
- Carried retained fixture matrices and safe fixture geometry back into MVR exports without displaying them in Fixture Patch.
- Added an MVR discrepancy review for unmatched fixture types, non-exact manufacturer or fixture matches, missing GDTF fields, mode mismatches, and channel-count mismatches.
- Prevented ambiguous MVR modes from silently falling back to the first fixture-library mode.
- Required users to select the appropriate library fixture and mode before discrepant MVR rows can be imported.

## V14.1 - 2026-07-20

- Changed Position in Fixture Type Options from free-text entry to the project's Position Summary list.
- Kept the position list hidden until Position is selected for the fixture-type update.
- Included a No position choice so positions can still be cleared from selected fixtures.
- Added `+ Add New Position` to the Position list, with a name field that creates the project position and assigns it to the selected fixtures.

## V14.0 - 2026-07-20

- Corrected GDTF DMX footprint parsing for pixel fixtures that use geometry references and per-reference DMX offsets.
- Enforced exact GDTF matching by manufacturer, fixture type, GDTF mode, and channel count while preserving reviewed fixture-library filename mappings.
- Added GDTF metadata capture for DataVersion, FixtureTypeID, long name, short name, file size, and SHA-256 checksum.
- Added a local GDTF import report covering added files, new fixtures, revisions, duplicates, missing patch matches, file errors, and GitHub size warnings.
- Improved MVR 1.5 and 1.6 import handling, including embedded GDTF names with or without the `.gdtf` extension.
- Added MVR position, layer, class, and fixture UUID import metadata.
- Updated MVR export to version 1.6 metadata, standards-formatted UUIDs, absolute DMX addresses, exact GDTF mode references, and one layer per Lampy fixture position.
- Kept all GDTF and MVR work in the browser, retained manual GDTF upload, and did not add `.show` or grandMA3 cache/library modification.

## V12.39 - 2026-07-20

- Added a GDTF availability line to every fixture choice in the Add Fixture library picker.
- Displays `GDTF ✅` when the fixture has a repository GDTF file with at least one fully matched mode/channel entry; otherwise displays `GDTF ❌`.
- Kept final MVR eligibility tied to the selected fixture mode and exact channel count.

## V12.38 - 2026-07-20

- Grouped similar automatic revision notes into concise count-based summaries, such as fixtures added, fixtures updated, consoles changed, or project fields updated.
- Added a detailed per-version automatic change log that retains individual item descriptions and timestamps without cluttering the visible revision notes.
- Added a Download Change Log action to revisions containing automatic log entries.
- Migrated existing detailed automatic notes into grouped summaries and detailed logs when older project files are opened.
- Kept detailed log entries attached when grouped automatic notes are moved between versions.

## V12.37 - 2026-07-20

- Added a GDTF File status line to every fixture group in the Home Fixture Info card.
- Displays ✅ only when the repository fixture library contains a fully matched GDTF reference for the fixture's manufacturer, fixture type, mode, and channel count; otherwise displays ❌.
- Increased Fixture Info group headings to 17px and refreshed the Home view when the repository fixture library finishes loading.

## V12.36 - 2026-07-20

- Changed Fixture Patch group title lines to always use the fixture's full name.
- Kept the Full Name / Short Name selector available for Fixture Patch table cells without allowing it to shorten on-screen or PDF fixture titles.

## V12.35 - 2026-07-20

- Optimized Fix ID typing in Power Calculations to update only the edited row and rows affected by duplicate Fix IDs.
- Reused a single duplicate-ID scan and reduced table text fitting from once per row to one pass per input update.
- Deferred phase-summary rebuilding, revision capture, local saving, and the optional Fixtures pane refresh until typing pauses or the field is committed.

## V12.34 - 2026-07-20

- Set Power Calculations Amp columns to 16px text while retaining automatic width and the 90px maximum width.

## V12.33 - 2026-07-20

- Added PDF-only empty-column suppression to Power Calculations exports.
- Each exported Socapex or Aux page now hides table columns that contain no data on that page, allowing populated columns to use more of the selected paper width.
- Kept the live Power Calculations spreadsheet unchanged and updated the vector PDF renderer to ignore hidden table cells.

## V12.32 - 2026-07-20

- Linked each Power Calculations Position cell background to the matched fixture's colour data in Fixture Patch.
- Position cells now use a solid Colour 1 background or the existing diagonal pattern when Fixture Patch Colour 2 is also set.
- Added automatic contrasting text and outline colours, with the same appearance retained in Power Calculations PDF preview and export.

## V12.31 - 2026-07-20

- Added a Position column after every Fix Type column in Power Calculations.
- Linked each Position value directly to the corresponding fixture's Position in Fixture Patch, keeping the worksheet and PDF output synchronized without storing duplicate position data.
- Applied compact, content-aware sizing to the new Position columns so the expanded table continues to fit the selected PDF page.

## V12.30 - 2026-07-19

- Linked each Power Calculations Socapex name to its rear-label text format.
- Power Socapex names now inherit the rear label font, size, weight, italic, underline, outline, and text colour settings, then automatically fit within the spreadsheet cell.
- Kept Power Calculations, rear labels, PDF preview, and downloaded Power Calculations PDFs synchronized when the Socapex name or rear-label formatting changes.

## V12.29 - 2026-07-19

- Set Power Calculations Fix ID cells to 16px text with an 800 font weight.
- Retained the automatic width, zero minimum width, and 70px maximum width introduced in V12.28.

## V12.28 - 2026-07-19

- Reduced the Power Calculations Fix ID column maximum width from 100px to 70px.
- Removed the Fix ID column minimum width so compact IDs can shrink the column further.

## V12.27 - 2026-07-18

- Added content-aware Power Calculations header sizing.
- Headers now reduce their font size when the widest populated body value is narrower than the header label, preventing header text from holding compact columns open.
- Applied the same header fitting to the live worksheet, PDF preview, and downloaded Power Calculations PDF.

## V12.26 - 2026-07-18

- Reduced the Power Calculations spreadsheet type size to 14px.
- Changed the main Power Calculations table to automatic column layout.
- Converted the existing Socapex, Way, Fix ID, Fixture Type, Watts, and Amps widths into maximum widths so compact content produces narrower columns without allowing long content to expand beyond the established layout.

## V12.25 - 2026-07-18

- Added backward-compatible `shortName` support to fixture library entries and patched fixture records.
- Populated `shortName` in all 375 bundled fixture-library records, using compact, manufacturer-specific model names up to 24 characters.
- Added independent **Full Name / Short Name** selectors to Power Calculations, Front RCBO Labels, and Fixture Patch.
- Applied the selected name format to live worksheets, label exports, Fixture Patch PDF exports, and Fixture Patch Excel exports.
- Added Short Name editing to Fixture Type Options and Short Name fields when creating custom or imported fixtures.
- Existing projects and library fixtures without a defined short name continue to display the full fixture name.

## V12.24 - 2026-07-18

- Removed the Aux Outlet `Include in Power Calcs?` settings column from Power Calculations PDF previews and downloaded PDFs while retaining it in the live worksheet.
- Added each configured Socapex colour or multi-colour stripe to its Socapex name cell in Power Calculations and PDF exports.

## V12.23 - 2026-07-18

- Centred the Aux Outlet label column.
- Split Aux Outlets into separate Power Calculations tables, with each table retaining a three-output Phase 1, Phase 2, and Phase 3 group.
- Limited expanded Watts and Amps columns to the individual Aux table containing an included output.

## V12.22 - 2026-07-18

- Set the single-distro Input Supply selector to a 36px height and 14px font size.
- Set the single-distro RCBO selector to a 36px height.
- Added the requested top and bottom borders, bottom padding, and bottom margin to the single-distro P/Lock Adaptor row.

## V12.21 - 2026-07-18

- Set the single-distro Type and Output Voltage selectors to a 36px height.
- Set the single-distro P/Lock Adaptor button to a 184px width with the requested horizontal padding and top margin.

## V12.20 - 2026-07-18

- Updated shared form labels, including the Distro Name and Distro Type labels, to use a 5px bottom margin and a 1.5px `#969393` bottom border.

## V12.19 - 2026-07-18

- Updated the shared `.row` rule to the requested `grid-lanes` display declaration while retaining the two-column layout, gap, and margins.
- Limited the `Show Colour 3 In Table View` distro control to distro settings opened from **Distro Labels → Table View**; it no longer appears from **Power Calculations**.
- Updated shared label styling with a 3px bottom margin, heavier text, a grey bottom border, and 3px bottom padding.

## V12.18 - 2026-07-18

- Changed the shared `.row` layout to flex while retaining its existing two-column metadata, gap, and margins.
- Changed `.distroActions` to inline-grid while retaining right alignment, spacing, and top margin.

## V12.17 - 2026-07-18

- Increased RCBO warning-note text from 9px to 11px.
- Grouped Aux Outlet power rows into visually distinct sets of three, matching their Phase 1, Phase 2, and Phase 3 allocation.
- Updated the P/Lock Adaptor button labels to `P/Lock Adaptor: Yes!` and `P/Lock Adaptor: No!`.

## V12.16 - 2026-07-18

- Extended console and NPU position strips to display all three configured position colours when Colour 3 is present.
- Position strips now generate equal continuous diagonal bands for one, two, or three colours without transparent gaps.

## V12.15 - 2026-07-18

- Updated overloaded RCBO Amp cells to display `Warning! exceeds the [selected RCBO].`
- Added the requested large red warning symbol beside overloaded Amp cells.
- Kept the warning symbol inside valid table markup and positioned it outside the Amp cell without introducing an invalid element between table rows.
- Retained the detailed calculated-current and threshold warning in the Amp cell title.

## V12.14 - 2026-07-18

- Updated console and NPU cards to display position strips using the position's first two configured colours.
- Replaced the previous transparent gaps with a continuous alternating two-colour diagonal stripe pattern.
- Kept single-colour positions compatible by using the same colour for both halves of the strip.

## V12.13 - 2026-07-18

- Changed the P/Lock Adaptor control in the distro settings side pane from a checkbox to an Enabled/Disabled button.
- Split Aux Outlets into a dedicated spreadsheet beneath the selected distro's Socapex spreadsheet.
- Added Aux number, editable label, and per-Aux `Include in Power Calcs?` controls.
- Added expandable Watts 1, Watts 2, Watts 3, and calculated Amps columns when at least one Aux Outlet is included.
- Assigned Aux 1/2/3 in each group to phases 1/2/3 respectively and included enabled Aux loads in distro and supply phase totals.
- Preserved compatibility with Aux power data created in V12.12.

## V12.12 - 2026-07-18

- Added a per-distro RCBO selector to the distro settings side pane with `16 Amp RCBO` as the default and `10 Amp RCBO` as the alternative.
- Added overload detection at 15.01 A for 16 Amp RCBOs and 9.01 A for 10 Amp RCBOs.
- Highlighted overloaded Amp cells in red and added a detailed warning containing the calculated current, limit, and selected RCBO.
- Added configured Aux Outlets to each distro Power Calculations spreadsheet with four fixture slots, Watts, Amps, overload checking, and inclusion in phase and supply totals.
- Stored Aux Outlet power rows separately so adding or removing Socapexes cannot shift or overwrite Aux assignments.
- Added dedicated Aux Outlet pages to the Power Calculations PDF while retaining the four-Socapex-per-page layout.

## V12.11 - 2026-07-18

- Set Power Calculation Socapex name cells to a complete 1.5px solid black border.
- Added a 1.5px solid black top border to Power Calculation table headings.

## V12.10 - 2026-07-18

- Removed the remaining `Distro Phase Totals;` heading generated on the first PDF page of each distro.
- Corrected the measured PDF fallback so it draws summary divider lines only when the preview element actually has a visible bottom border.
- Prevented zero-width preview borders from becoming artificial lines in downloaded Power Calculations PDFs.
- Made the measured live-preview renderer the direct Power PDF export path, avoiding Chrome's tainted-canvas failure and ensuring the preview and download use the same measured geometry and border styles.

## V12.9 - 2026-07-18

- Removed the `Distro Phase Totals;` heading from the final Power Calculations PDF summary preview.
- Set the Power PDF sheet view and table width to 1400px while retaining a 100% maximum width.

## V12.8 - 2026-07-18

- Corrected Power Calculations PDF border widths so card and table borders retain their computed thickness in the downloaded vector fallback.
- Preserved the individual top, right, bottom, and left table-cell border styles, including the heavier Socapex group boundaries.
- Allowed the Power Calculations PDF preview to close by clicking its backdrop or pressing Escape.
- Kept fit-to-window Power PDF zoom synchronized after the browser window is resized.

## V12.7 - 2026-07-18

- Limited each distro phase-total card to the first PDF page for that distro.
- Added a final Power Calculations summary page containing every supply phase-total card.
- Grouped each supply with the phase-total cards for all distros assigned to it, making the supply total visibly traceable to its component distro totals.

## V12.6 - 2026-07-18

- Started every distro on a new Power Calculations PDF preview page.
- Limited each Power PDF page to four complete Socapex groups and kept all six ways together.
- Changed each page heading to `Power Calculations - Distro Name - Distro Type`.
- Limited the phase-total summary to the distro shown on that page.
- Sized the Power Calculations table to the usable width of the selected PDF paper size.

## V12.5 - 2026-07-18

- Refined the Power Calculations measured-preview fallback to match the in-app preview composition more closely.
- Exported toolbar metadata as one line instead of separately wrapping each value.
- Expanded measured heading boxes to prevent Supply and Distro Phase Total headings from wrapping incorrectly.
- Added rounded summary and phase-card borders plus the preview divider lines.
- Embedded the project/export logo in measured Power Calculations PDF pages.
- Restored preview transforms safely after each exported page, including when an individual page fails.

## V12.4 - 2026-07-18

- Added the same two-stage preview export strategy used by Fixture Patch to Power Calculations.
- Added an automatic measured-preview vector fallback when the browser cannot convert a rendered Power preview page into an image.
- Measured fallback pages now use the live preview positions, sizes, computed colours, borders, typography, phase cards, tables, and page numbers.
- Normalized unsupported PDF separator glyphs in the vector fallback so they no longer appear as question marks.

## V12.3 - 2026-07-18

- Fixed Power Calculations PDF downloads so they are generated directly from the rendered in-app preview pages.
- Preserved the preview typography, spacing, colours, tables, summary cards, and Unicode characters in the downloaded PDF.
- Removed the obsolete parallel Power Calculations vector renderer that produced a different layout from the preview.
- Waited for document fonts and final content-fit calculations before capturing each PDF page.

## V12.2 - 2026-07-18

- Removed 17 proven-unused JavaScript functions, including obsolete vector PDF helpers and unused XLSX, GDTF, power-preview, patch-merge, and colour-export helpers.
- Cached normalized Project Info data instead of rebuilding the full object during every render and lookup.
- Debounced project persistence to avoid repeatedly serializing the complete project and writing localStorage on every keystroke.
- Added a final page-hide persistence flush so pending project changes are safely stored before navigation.
- Throttled resize-driven export preview calculations to one animation frame and marked the listener passive.
- Rechecked repository-relative JSON, image, GDTF, GitHub issue, and email paths for static GitHub Pages deployment.

## V12.1 - 2026-07-18

- Moved Revisions out of Project Info into its own manager, directly accessible from the Actions sidebar and Home Revision Summary card.
- Grouped revision notes by Project Info, Fixture Patch, Power Calculations, Control/Network, and Manual Notes within each version.
- Displayed revision dates now use `DD/MM/YYYY`.
- Automatically generated revision notes now describe the affected project field, fixture, power supply, console, or network device.
- Console notes include the console type, assigned name, role, and location.
- Repeated edits to the same field or item update its current automatic note instead of adding a note for every keystroke.

## V12 - 2026-07-18

- Added automatic revision-note generation when Project Info, Fixture Patch, Power Calculations, or Control/Network data changes.
- Added a `Bump Version Number` action that increments the project version by one, records the current date, and starts a new active revision.
- Changed revisions from single text blocks into individually managed notes while automatically migrating older saved-project revision text.
- Added controls to select revision notes and edit, remove, or move them to another version.
- Added version-level editing for version numbers, dates, and optional manual notes.
- Updated the Home revision summary to display the new individual revision-note structure.

## V11.1 - 2026-07-18

- Fixed saved projects with blank GDTF fields by refreshing matched fixture rows from the current repository library before MVR export.
- Kept the current repository fixture library separate from the older fixture-library snapshot embedded in a saved project.
- Added an MVR processing pop-up with a countdown and automatic download when the completed file is ready.
- Removed the second-click step after repository GDTF files have loaded so MVR export completes from one button press.

## V11 - 2026-07-17

- Added repository-backed GDTF references to the fixture library, matched by manufacturer, fixture type, mode, and channel count.
- Added automatic loading of matched GDTF files from `gdtf/fixtures/` during MVR export.
- Embedded repository GDTFs directly into exported MVR files while keeping the full binary data out of localStorage.
- Retained manual GDTF upload and MVR export without GDTF data as fallback workflows.
- Added selective `description.xml` extraction so large GDTF model and texture assets are not inflated during metadata matching.
- Cleared repository GDTF memory when starting or opening another project to prevent stale cross-project file data.
- Removed the redundant `gdtf/json/` fixture-library mirror so `json/fixtures/` is the single authoritative source.
- Losslessly recompressed the Maverick Storm 1 Flex GDTF below GitHub's browser-upload limit without removing fixture assets or metadata.
- Published the verified Chauvet batch: Color Strike M, COLORado PXL Curve 12, COLORado PXL Curve 5, Maverick Storm 1 Beam, Maverick Storm 1 Flex, and Rogue Outcast 1 BeamWash.
- Verified the resulting MVR fixture patch and embedded GDTFs load successfully in grandMA3.

## V10.9 - 2026-07-17

- Fixed large manual GDTF uploads exceeding browser localStorage by keeping full GDTF data in memory and project downloads while saving only lightweight GDTF metadata locally.
- Updated MVR export warnings to distinguish unmatched GDTFs from matched GDTFs whose full file data needs re-uploading before export.

## V10.8 - 2026-07-17

- Strengthened GDTF matching after manual upload by scoring Fixture Type, Mode name, and channel-count matches so GDTF Share naming differences do not leave valid uploads marked as missing.

## V10.7 - 2026-07-17

- Improved manual GDTF upload matching so stored GDTF files link to patch rows by Fixture Type and Mode, including compatible mode names and matching channel counts.

## V10.6 - 2026-07-17

- Grouped MVR missing-GDTF export warnings by Fixture Type and Mode instead of listing every affected Fix ID.

## V10.5 - 2026-07-17

- Replaced the MVR export warning confirm dialog with an in-app warning modal that offers Add GDTF File, Open GDTF Share, and Export Without GDTF Data actions.
- Added an explicit MVR export path that omits embedded GDTF data when the user chooses to continue without GDTF files.

## V10.4 - 2026-07-17

- Kept imported GDTFSpec and GDTFMode data as background metadata by hiding those fields from the patch import preview and user mapping dropdowns while retaining them for MVR export.

## V10.3 - 2026-07-17

- Tightened patch import header auto-mapping so GDTF Mode maps to the GDTF metadata field instead of the normal fixture mode field.
- Changed MVR patch import so fixture type, mode, channel count, watts, and weight are matched back to the Lampy fixture library while preserving the original imported GDTFSpec and GDTFMode for MVR export.
- Improved imported mode matching to prefer exact mode names, compatible partial names, and matching channel counts before falling back to the first library mode.

## V10.2 - 2026-07-17

- Fixed MVR imports so original GDTFSpec and GDTFMode data are retained on fixture patch rows instead of being replaced by fixture-library default matches.
- Updated MVR export to prefer stored imported GDTF references and carry them through comparison merge, overwrite, and master-patch actions.
- Corrected embedded GDTF channel counting to use the highest DMX offset in each mode, preserving modes such as 33Ch correctly.

## V10.1 - 2026-07-17

- Fixed MVR imports that encode DMX as absolute address values so universe and address fields are restored correctly, and ignored placeholder fixtures with no real ID or address.

## V10 - 2026-07-17

- Updated console card image sizing so console images render at 200px wide, full image-container height, and object-fit contain.
- Added Fixture Patch MVR import support that reads GeneralSceneDescription.xml and imports fixture ID, fixture type, mode, universe/address, position, manufacturer, and channel count.
- Added embedded GDTF preservation from imported MVR files with project storage for GDTF files and GDTF match metadata.
- Added manual GDTF upload from the Fixture Patch export modal with automatic matching to current patch rows.
- Added Fixture Patch Export to MVR with GeneralSceneDescription.xml generation, matched embedded GDTF files, and pre-export validation warnings for missing addressing, invalid addresses, missing modes, missing GDTFs, duplicate Fix IDs, and duplicate DMX ranges.

## V9.14 - 2026-07-17

- Extended the Fixture Patch comparison floating action bar to selected row actions as well as selected column/cell actions.

## V9.13 - 2026-07-17

- Changed the Fixture Patch comparison selected-cell action bar from sticky to fixed positioning so Merge, Ignore, Overwrite Rows, and Clear Selection remain visible while scrolling the patch sheet.

## V9.12 - 2026-07-17

- Made the Fixture Patch comparison selected-cell action bar sticky while scrolling so Merge, Ignore, Overwrite Rows, and Clear Selection remain available.

## V9.11 - 2026-07-17

- Split Fixture Patch manual fixture matching into Manufacture and Fixture Type selectors.
- Added search fields for manual match manufacture and fixture type filtering.

## V9.10 - 2026-07-17

- Linked Fixture Patch comparison merges for Mode and Channel Count so merging either field updates both values from the imported patch.

## V9.9 - 2026-07-17

- Scoped Fixture Patch comparison column-header selection to the fixture type table that was clicked.

## V9.8 - 2026-07-17

- Added Fixture Patch comparison column selection by clicking changed column headers.
- Added selected-cell bulk actions for Merge, Ignore, and Overwrite Rows, with undo support.

## V9.7 - 2026-07-17

- Added an Undo control to Fixture Patch comparison mode that lists the last six review actions and restores the selected previous patch state.

## V9.6 - 2026-07-17

- Hid the Fixture Patch tab strip when the project only has the master patch sheet and no imported comparison patch tabs.

## V9.5 - 2026-07-17

- Updated README.md into a useful GitHub project landing page with live app link, workflow overview, source structure, reference data notes, deployment notes, and development rules.

## V9.4 - 2026-07-16

- Added a Fixture Patch comparison filter to show only imported patch lines with differences.
- Added multi-line selection and bulk review actions for imported patch changes.
- Added a side-by-side comparison view for difference-filtered imported patches.

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
