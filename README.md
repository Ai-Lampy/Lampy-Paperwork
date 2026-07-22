# Lampy Paperwork

Lampy Paperwork is a browser-based paperwork tool for live entertainment lighting and power workflows. It is built as a single-page GitHub Pages app using plain HTML, CSS, and vanilla JavaScript.

Live app: [https://ai-lampy.github.io/Lampy-Paperwork/](https://ai-lampy.github.io/Lampy-Paperwork/)

## What It Does

- Builds front and rear distro labels, including Socapex, Aux, and Output labels.
- Maintains fixture patch data with CSV, Excel, .xlsm, and .MVR import support.
- Compares imported fixture patches against the project master patch and highlights differences.
- Retains imported MVR fixture matrices and fixture-attached geometry as hidden background metadata.
- Requires review of unmatched MVR fixtures and conflicting GDTF, mode, or channel-count data before import.
- Produces power calculation sheets with distro and supply phase totals.
- Tracks DMX universe usage and available address space.
- Builds console, NPU, and network paperwork with reference images.
- Exports project data as a Lampy project file for reopening later.
- Exports MVR fixture patches with matched repository GDTF files embedded when available.
- Exports paperwork previews to PDF where supported by the app workflow.

Every bundled fixture library entry includes a `shortName` alongside `fixture`. Short names can be selected independently for Power Calculations, Front RCBO Labels, and Fixture Patch displays; custom or older fixture data without a defined short name safely uses its full name.

## Current Version

Current app version: **V17.1**

See [CHANGELOG.md](CHANGELOG.md) for version history and rollback notes.

## How To Use

1. Open the live app from the GitHub Pages link above.
2. Start with **Project Info** and enter the show details.
3. Add distro details in **Distro Labels**.
4. Build or import the **Fixture Patch**.
5. Check **Power Calculations** after fixture IDs and fixture types are set.
6. Add consoles, NPUs, and network data in **Control/Network**.
7. Download the project file regularly to save an editable copy.

All project data is client-side. The app runs in your browser and does not require an account, server, database, or build process.

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
  json/
    colour_reference_template.json
    console_reference.json
    distro_options.json
    fixture_library_manifest.json
    fixtures/
      <manufacturer>.json
    lighting_vendors.json
    network_expansion_reference.json
    npu_reference.json
    supply_reference.json
    walkthrough.json
    welcome_message.json
```

## Reference Data

Reference data is stored in `/json/` and loaded directly by the browser.

- Fixture manufacturers are listed in `json/fixture_library_manifest.json`.
- Per-manufacturer fixture data lives in `json/fixtures/`.
- Matched GDTF files used by MVR export live in `gdtf/fixtures/<manufacturer>/`.
- Console and NPU records can include relative image paths from `images/consoles/` and `images/NPU/`.
- Colour names and aliases are managed in `json/colour_reference_template.json`.

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
