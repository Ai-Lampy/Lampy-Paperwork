# Lampy Paperwork V56.1

Lampy Paperwork is a browser-based tool for preparing lighting, power, control, network, rack and label paperwork for live entertainment productions.

[Open the live app](https://ai-lampy.github.io/Lampy-Paperwork/). The repository version and live version can differ because deployment is manual.

## Latest changes

- V56.1 organises stored fixture definitions into manufacturer folders with readable filenames, for example `json/fixture-details/fine-art/fine-407-wash.json`.
- V56 replaced the bundled GDTF library with stored fixture data and compressed fixture images. Images also use manufacturer folders and readable names.
- Ordinary MVR exports do not embed library GDTFs. GDTFs attached to an imported MVR remain available for export with their linked fixtures.
- MVR imports preserve Universe 1 addresses and universe-boundary addresses.
- The Patch PDF fixture summary lists fixtures alphabetically.

See [CHANGELOG.md](CHANGELOG.md) for release history.

## What you can do

- Build and import fixture patches from CSV, Excel, XLSM and MVR files.
- Match fixtures to the stored library and view fixture images, physical data and mode/channel information.
- Export patch, position, power, Fan Out and distro-label PDFs.
- Manage distros, supplies, Socapex assignments and phase totals.
- Manage consoles, NPUs, network devices, IP addresses, VLANs and device ports.
- Plan rack layouts with front, rear and side views.
- Save production details, logos, revisions and PDF footer contact details.
- Download portable `.lampy` project files to reopen later.

## Fixture library

The library contains 808 fixtures and 7,033 modes across 35 manufacturers, with 731 stored definitions and 636 fixture images.

| Location | Contents |
| --- | --- |
| `json/fixture_library_manifest.json` | Manufacturer catalogue index |
| `json/fixtures/<manufacturer>.json` | Fixture names, modes, channel counts, watts, weight and asset links |
| `json/fixture-details/<manufacturer>/<fixture>.json` | Detailed mode/channel data and extracted source definitions |
| `images/fixtures/<manufacturer>/<fixture>.<extension>` | Standalone fixture images |
| `json/fixture_image_manifest.json` | Image identities and checksums |

The manufacturer catalogues link to the detailed definitions. Shared definitions use one file with the associated fixture names in its filename. Source GDTF filenames and SHA-256 hashes remain in the stored provenance; the original archives are not runtime dependencies.

GDTFs are reference inputs for extracting and checking fixture data. Keep a reference archive until its required data has been verified. The app shows fixture images, not gobo or colour-wheel galleries. Older projects may require fixtures to be re-matched to the current library.

## Saving and MVR export

Project processing runs in your browser. Browser storage keeps a working copy; download a `.lampy` backup after meaningful changes. If storage fails, use **Download recovery** before reloading or closing the page.

MVR exports include Lampy fixture identity, mode and channel-count metadata. Imported GDTF attachments retain their bytes through project saving and re-export. Changing a fixture's mode clears its previous attachment reference.

PDF export loads its browser rendering library when needed. Chrome checks for V56 covered fixture images and stored data, MVR import/export, saved attachment persistence and byte-identical GDTF retention. Those checks do not establish Firefox or Safari coverage.

## Local checks and deployment

The app uses HTML, CSS and vanilla JavaScript and supports static GitHub Pages hosting.

```sh
node tests/display-regressions.cjs
node tests/release-regressions.cjs
node scripts/validate-release.cjs
python3 scripts/build_site.py /tmp/lampy-pages-check
```

Use a new temporary build directory outside the project. The builder includes only runtime assets, excludes GDTF archives and rejects artifacts larger than 900 MB. Keep tests, build tools, the changelog and the browser checklist: the deployment workflow uses them. Local fixture-name and mode-name workbooks are maintenance inputs and are excluded from the Pages artifact.

Deployment requires a manual run of **Deploy Lampy Paperwork** in GitHub Actions. Select the branch, enter the version without `V` and confirm deployment. Committing or uploading files does not deploy the app.

Browser checks follow [tests/BROWSER-CHECKLIST.md](tests/BROWSER-CHECKLIST.md) when explicitly authorised.

## Feedback

Report bugs, missing fixtures and feature requests through the [issue tracker](https://github.com/Ai-Lampy/Lampy-Paperwork/issues).
