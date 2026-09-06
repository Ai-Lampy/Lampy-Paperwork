# Lampy Paperwork

Lampy Paperwork is a browser-based paperwork tool for live entertainment lighting and power workflows. It is published as a single-page GitHub Pages app.

Live app: [https://ai-lampy.github.io/Lampy-Paperwork/](https://ai-lampy.github.io/Lampy-Paperwork/)

## What It Does

- Builds front and rear distro labels, including Socapex, Aux, and Output labels.
- Maintains fixture patch data with CSV, Excel, .xlsm, and .MVR import support.
- Compares imported fixture patches against the project master patch and highlights differences.
- Retains imported MVR fixture matrices and fixture-attached geometry as hidden background metadata.
- Requires review of unmatched MVR fixtures and conflicting GDTF, mode, or channel-count data before import.
- Produces power calculation sheets with distro and supply phase totals.
- Provides spreadsheet-style keyboard navigation and vertical drag-fill editing in Power Calculations and Distro Labels Table View.
- Produces display-only Fan Out sheets from Power Calculations, including Socapex colours, fixture details, and position colours.
- Compiles consoles, NPUs, and project network equipment into an IP Address' sheet with dual IP fields, subnet data, VLAN assignments, locations, and notes.
- Provides a synchronized Device Config tree with expandable physical ports, editable patching, protocols, VLANs and notes, JSON-defined read-only Console/NPU port capabilities, plus spreadsheet navigation, copy/paste and vertical drag-fill.
- Tracks DMX universe usage and available address space.
- Provides a project-aware, customisable Home dashboard with reorderable, resizable, hideable statistics and summary cards plus an explicit browser default.
- Provides a full-page Positions workspace that synchronises renamed or removed positions across fixtures, consoles, NPUs, network devices, and racks.
- Builds console, NPU, and network paperwork with reference images.
- Uses console-reference software versions when available, with an Other/manual version field for unlisted or empty reference data.
- Separates console and network-device library selection from the side-pane forms used to enter project details.
- Displays only network equipment that has actually been added to the project.
- Provides a centred Rack Layout builder with Front, Side, and Rear views, configurable depth, front/rear mounting, aligned U numbering, library-defined dimensions, half-width pairing, repeatable size-selectable accessories, and Simple/Detailed display modes.
- Enforces at least 100 mm of cable space behind rack devices and blocks invalid depth, placement, movement, or mounting-face changes.
- Displays configured DMX Node position colours over mapped sockets in Detailed rack views.
- Gives every added rack its own Rack Layout sub-tab so only one rack diagram is displayed at a time.
- Uses network-device line images in Detailed rack views, without applying project-position colours, while keeping consoles out of rack-device choices.
- Keeps Control, Device Config, Rack Layout, and IP Address' device data synchronized without duplicating the underlying project records.
- Exports project data as a Lampy project file for reopening later.
- Exports MVR fixture patches with matched repository GDTF files embedded when available.
- Exports paperwork previews to PDF where supported by the app workflow.

Every bundled fixture library entry includes a `shortName` alongside `fixture`. Short names can be selected independently for Power Calculations, Front RCBO Labels, Distro Labels Table View, and Fixture Patch displays; custom or older fixture data without a defined short name safely uses its full name.

## Current Version

Current app version: **V33.8**

Console tables use the final shared column proportions with automatic text fitting and scale up to fill available width. Narrow layouts retain scrolling at normal scale.
Console removal warns that its data will be deleted; “Do Not Show Again” is remembered for that project only.
Device Config fills each location group across the available page width. Its separate Filters panel starts collapsed, and physical port rows show their JSON-defined facing and permitted directions.
DMX Nodes keep management IP Address, Subnet, TX Protocol and VLAN on the parent row. Network Switches keep their management IP Address and Subnet on the parent row. Any device with one physical network port keeps that port on its parent row.
Fixture Patch has a confirmed Delete Patch action that clears the master, imported comparisons, attached GDTF data and matching patch positions.
Device Config supports a larger drag-fill target for list cells, connector-sex direction defaults and keyboard access to parent expand controls. Rack Layout Fit uses the current rack-card space.
The Device Config toolbar owns VLAN Setup. The `+ Supply` pane loads its Input Supply choices from `json/power_supply.json`, starts new supplies blank and preserves older saved values.
Fixture Patch import offers linked library suggestions after three typed characters, accepts combined Uni/Add columns, and allows new fixtures without wattage or weight.
Position Summary exports open in the shared PDF preview workspace with saved Rectangle or Box layouts.
Position names are merged case-insensitively across fixture, device, physical-port and rack records, preserving the first entered spelling and position colours.
Device Config has a final delete column with a confirmed red ❌ action on every parent device row; the Control Consoles table is unchanged.
Single white or uncoloured Position Summary entries use black text in the app and exported PDF.
Uploaded project logos are resized and compressed before local saving. If browser storage is full, the local save retains project data without embedded GDTF file contents.
Fixture Patch uses clean display labels for reviewed fixture modes while retaining the exact GDTF mode name for matching and MVR export. `MODE_NAME_REVIEW.csv` lists the remaining library modes for owner review.

See [CHANGELOG.md](CHANGELOG.md) for version history and rollback notes.

## How To Use

1. Open the live app from the GitHub Pages link above.
2. Start with **Project Info** and enter the show details.
3. Add distro details in **Distro Labels**.
4. Build or import the **Fixture Patch**.
5. Check **Power Calculations** after fixture IDs and fixture types are set.
6. Add consoles and NPUs in **Control**, then add network-capable project hardware through **Rack Layout** or **IP Address'**.
7. Use **Rack Layout** to create racks, set rack depth, and place equipment from the Front or Rear; use Side view to check physical depth and cable clearance.
8. Open **Device Config** to review and edit devices and their individual ports in a synchronized tree.
9. Open **IP Address'** to configure Global Subnet, interface subnets, VLANs, and IP-only devices.
10. Download the project file regularly to save an editable copy.

All project data is client-side. The app runs in your browser and does not require an account, server, database, for project processing. PDF export loads a pinned browser rendering library on demand, while project and export processing remain in the browser.

## Publishing Updates

GitHub Pages deployment is manual. Repository files can be committed or uploaded without changing the live site. When a release is ready, run **Deploy Lampy Paperwork** from the repository's **Actions** tab, enter the version being released, and explicitly confirm the deployment. The completed workflow run is titled with that version.

The repository's Pages source must be set to **GitHub Actions**, not **Deploy from a branch**. See [DEPLOYMENT.md](DEPLOYMENT.md) for setup, publishing, optional approval, and rollback instructions.

## Browser Support

Lampy Paperwork is intended for modern desktop browsers. Chrome is recommended for the most consistent PDF/export behaviour.

## Source Structure

```text
/
  .github/
    workflows/
      deploy-pages.yml
  .gitignore
  .nojekyll
  CHANGELOG.md
  DEPLOYMENT.md
  README.md
  index.html
  images/
    consoles/
      ETC/
      MA_lighting/
      avolites/
      chamsys/
      high_end_systems/
    NPU/
    lighting_vendors/
    luminex/
    pathway/
    rack_accessories/
    rack_power/
  gdtf/
    README.md
    fixtures/
      <manufacturer>/
  info_txt/
    walkthrough.json
    welcome_message.json
  json/
    colour_options.json
    consoles/
      README.md
      manifest.json
      avolites.json
      chamsys.json
      etc.json
      high-end-systems.json
      ma-lighting.json
    distro_options.json
    fixture_library_manifest.json
    fixtures/
      <manufacturer>.json
    lighting_vendors.json
    rack_devices/
      README.md
      manifest.json
      rack_accessories.json
      rack_power.json
      luminex.json
      pathway.json
    grandMA_NPU.json
    power_supply.json
    vlan_colour_options.json
```

## Reference Data

Reference data is stored in `/json/` and loaded directly by the browser.

- Fixture manufacturers are listed in `json/fixture_library_manifest.json`.
- Per-manufacturer fixture data lives in `json/fixtures/`.
- Welcome and walk-through text lives in the root-level `info_txt/` folder.
- Matched GDTF files used by MVR export live in `gdtf/fixtures/<manufacturer>/`.
- Console manufacturers are listed in `json/consoles/manifest.json`.
- Each manufacturer console library lives in `json/consoles/` and uses a rack-library-style `devices` collection. Console records can reference images from `images/consoles/`.
- grandMA NPU records are stored in `json/grandMA_NPU.json` and can reference images from `images/NPU/`.
- Input Supply choices are stored as unique non-empty `supplies[].label` values in `json/power_supply.json`. Its older range fields remain compatible but do not select or change a supply.
- VLAN colour choices are stored in `json/vlan_colour_options.json`.
- Colour names, aliases, and reserved text/outline style metadata are managed in `json/colour_options.json`.

When adding new reference files, keep paths relative to the repository root so GitHub Pages can serve them correctly.

## Deployment Notes

- Local use needs no framework, bundler or package manager. Publishing uses Python to package the static site and Node.js to run release checks.
- GitHub Pages serves the validated `_site` artifact. `scripts/build_site.py` compresses deployment copies of GDTF archives without changing their extracted contents or the source archives.
- Keep `index.html`, `json/`, and `images/` at the same level.
- Keep `.nojekyll` in the root so GitHub Pages does not run the Jekyll build pipeline.
- Do not add a `published_versions/` folder. Version tracking and rollback notes belong in `CHANGELOG.md`.

## Development Rules

- Keep the app plain HTML, CSS, and vanilla JavaScript.
- Keep the app fully GitHub Pages compatible.
- Update `CHANGELOG.md` for meaningful changes.
- Bump the visible app version when publishing updates.
- Browser testing requires an explicit user request. Do not use browser automation merely because a change affects the interface. Use static validation otherwise. When requested, check PDF preview/download behaviour carefully after export-related changes.
- Run `node tests/display-regressions.cjs` for static Home-position, console-capacity, table-expansion and project-package regression checks. These checks do not replace rendered browser testing.

## Feedback

Use the GitHub issue tracker for bugs, feature requests, and testing notes:

[Report an issue](https://github.com/Ai-Lampy/Lampy-Paperwork/issues)

## V33.2 engineering changes

- Device Config supports reliable Shift range selection and vertical drag-fill for compatible list cells.
- Port facing and direction now follow the connector metadata in the device reference JSON. Fixed directions remain read-only and bidirectional DMX ports offer only Input and Output.
- DMX Node and Network Switch management addressing appears on parent rows without duplicating fields on physical network-port children.
- Device Config filters now occupy a separate session-only collapsible panel. Global Subnet no longer has an enable switch; a non-empty value supplies new-device defaults and updates existing devices only when Apply to all Devices is pressed.

## V33.1 engineering changes

- Device Config promotes a single physical network port to the parent row, keeps multiple physical network ports as children and fills the available location-group width.
- VLAN Setup opens from Device Config only. Input Supply choices come from `json/power_supply.json`, and failed list loading stops supply creation.
- Control presentation and project-file structure remain unchanged.

## V33 engineering changes

- New distros default to 230 V circuit voltage. Existing selections are preserved. Power calculations assume power factor 1; verify against rated equipment current. Single-phase inputs and single-phase Socapex groups use explicit phase allocation rules.
- Supply warnings use the selected amperage. Missing or invalid loads show incomplete totals, including exports.
- Distro/Socapex ownership IDs preserve downstream labels when distros are deleted or resized. Existing saved projects gain IDs on load.
- Save status reports pending, successful and failed writes. Recovery JSON downloads work without browser crypto. Another tab changing the project pauses automatic saving until you reopen a project or reload. Manual GDTF binaries are retained in the local save attempt; large projects may exceed browser storage and require a portable download.
- Imports validate structure before committing data. Project files are limited to 64 MiB; ZIP imports to 256 MiB total, 64 MiB per entry and 10,000 entries. ZIP paths, bounds and CRCs are checked.
- Supply-card actions use delegated listeners; remaining legacy handlers use JavaScript-context encoding. New code belongs in the `js/` modules where practical.
- Distro labels, output settings, positions, network settings and GDTF metadata/matches participate in revision tracking. Saved custom fixtures remain selectable after reload. Welcome has a visible Continue control; dynamically rendered single-control form labels are associated automatically.

Run `node tests/display-regressions.cjs`, `node tests/release-regressions.cjs` and `node scripts/validate-release.cjs`. Build with `python3 scripts/build_site.py /tmp/lampy-site` using a new destination directory. See `tests/BROWSER-CHECKLIST.md` for release browser coverage.
