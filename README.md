# Lampy Paperwork

Lampy Paperwork is a browser-based tool for preparing lighting, power, control, network, rack and label paperwork for live entertainment productions.

Live app: [https://ai-lampy.github.io/Lampy-Paperwork/](https://ai-lampy.github.io/Lampy-Paperwork/)

## What You Can Do

- Build and import fixture patches from CSV, Excel, XLSM and MVR files.
- Match fixtures to the library and available GDTF files.
- Produce fixture patch, position summary, power, Fan Out and distro-label PDF paperwork.
- Create distros, supplies, Socapex assignments, phase totals and Fan Outs.
- Manage consoles, NPUs, network devices, IP addresses, VLANs and device ports.
- Plan rack layouts with front, rear and side views.
- Store project details, logos, revisions and optional PDF footer contact details.
- Download a portable `.lampy` project file to reopen later.

See [CHANGELOG.md](CHANGELOG.md) for release history, fixes and rollback notes.

## Quick Start

1. Open the live app.
2. Open **Actions → Project Info** and enter the project name, dates and production details.
3. In **Labels**, add each distro and complete its basic settings.
4. Build or import the **Fixture Patch**.
5. Create positions and colours from the Position Summary when required.
6. In **Power**, assign fixtures to ways, check Fan Outs, and review Phase Totals when available.
7. Add consoles and NPUs in **Control**. Add racks in **Rack Layout** and IP-only equipment in **Network**.
8. Use **Network → Device Config** and **IP Address’** to complete network details.
9. Preview and export the required PDFs.
10. Use **Download Project** regularly to keep an editable backup.

## Saving and Exporting

The app processes project data locally in your browser. It does not require an account or server for normal project work.

Browser storage keeps a working copy, but it is not a substitute for backups. Download the `.lampy` project file after meaningful changes and store it with the production paperwork. If the app reports a storage failure, use **Download recovery** before reloading or closing the page.

PDF export loads a pinned browser rendering library only when needed. Project, GDTF and MVR processing remains in the browser.

## Browser Support

Lampy Paperwork is intended for current desktop browsers. Chrome is recommended for the most consistent export behaviour.

## Project Reference Data

Reference data is stored in `/json/` and loaded directly by the browser.

- Fixture manufacturers: `json/fixture_library_manifest.json`
- Fixture library records: `json/fixtures/`
- Console library records: `json/consoles/`
- Rack-device library records: `json/rack_devices/`
- Power-supply choices: `json/power_supply.json`
- VLAN colour choices: `json/vlan_colour_options.json`
- Welcome and walk-through text: `info_txt/`
- Matched GDTF files: `gdtf/fixtures/`

## Publishing Updates

GitHub Pages deployment is manual. Uploading or committing files does not publish a release by itself. When a release is ready, run **Deploy Lampy Paperwork** from the repository’s **Actions** tab, enter the release version, and confirm deployment.

The repository Pages source must be **GitHub Actions**. See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment, rollback and approval details.

## Development Checks

The app is plain HTML, CSS and vanilla JavaScript, and must remain GitHub Pages compatible.

Run the static checks after an update:

```sh
node tests/display-regressions.cjs
node tests/release-regressions.cjs
node scripts/validate-release.cjs
python3 scripts/build_site.py /tmp/lampy-site
```

Browser testing requires an explicit request. See [tests/BROWSER-CHECKLIST.md](tests/BROWSER-CHECKLIST.md) when browser testing is authorised.

## Feedback

Report bugs, missing library items and feature requests through the [GitHub issue tracker](https://github.com/Ai-Lampy/Lampy-Paperwork/issues).
