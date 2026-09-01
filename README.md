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
- Provides a synchronized Device Config tree with expandable physical ports, editable patching, protocols, directions, VLANs and notes, plus spreadsheet navigation, copy/paste and vertical drag-fill.
- Tracks DMX universe usage and available address space.
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

Current app version: **V29.2**

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

All project data is client-side. The app runs in your browser and does not require an account, server, database, or build process. PDF export loads a pinned browser rendering library on demand, while project and export processing remain in the browser.

## Publishing Updates

GitHub Pages deployment is manual. Repository files can be committed or uploaded without changing the live site. When a release is ready, run **Deploy Lampy Paperwork** from the repository's **Actions** tab, enter the version being released, and explicitly confirm the deployment. The completed workflow run is titled with that version.

The repository's Pages source must be set to **GitHub Actions**, not **Deploy from a branch**. See [DEPLOYMENT.md](DEPLOYMENT.md) for setup, publishing, optional approval, and rollback instructions.

## Browser Support

Lampy Paperwork is intended for modern desktop browsers. Chrome is recommended for the most consistent PDF/export behaviour.

## Source Structure

```text
/
  .nojekyll
  CHANGELOG.md
  README.md
  index.html
  images/
    consoles/
    NPU/
  gdtf/
    fixtures/
      <manufacturer>/
  info_txt/
    walkthrough.json
    welcome_message.json
  json/
    colour_options.json
    lighting_consoles.json
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
- Lighting-console records are stored in `json/lighting_consoles.json` and can reference images from `images/consoles/`.
- grandMA NPU records are stored in `json/grandMA_NPU.json` and can reference images from `images/NPU/`.
- Power-supply calculation thresholds are stored in `json/power_supply.json`.
- VLAN colour choices are stored in `json/vlan_colour_options.json`.
- Colour names, aliases, and reserved text/outline style metadata are managed in `json/colour_options.json`.

When adding new reference files, keep paths relative to the repository root so GitHub Pages can serve them correctly.

## Deployment Notes

- This project is dependency-free: no framework, bundler, package manager, or build step is required.
- GitHub Pages should serve the repository root directly.
- Keep `index.html`, `json/`, and `images/` at the same level.
- Keep `.nojekyll` in the root so GitHub Pages does not run the Jekyll build pipeline.
- Do not add a `published_versions/` folder. Version tracking and rollback notes belong in `CHANGELOG.md`.

## Development Rules

- Keep the app plain HTML, CSS, and vanilla JavaScript.
- Keep the app fully GitHub Pages compatible.
- Update `CHANGELOG.md` for meaningful changes.
- Bump the visible app version when publishing updates.
- Check PDF preview/download behaviour carefully after export-related changes.

## Feedback

Use the GitHub issue tracker for bugs, feature requests, and testing notes:

[Report an issue](https://github.com/Ai-Lampy/Lampy-Paperwork/issues)
