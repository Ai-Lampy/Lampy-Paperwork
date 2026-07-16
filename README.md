# Lampy Paperwork

This folder is the clean GitHub Pages deploy structure for the live app. The app is dependency-free and runs directly from `index.html`.

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
  json/
    colour_reference_template.json
    console_reference.json
    distro_options.json
    fixture_library_manifest.json
    fixtures/
      <manufacturer>.json
      ...
    lighting_vendors.json
    network_expansion_reference.json
    npu_reference.json
    supply_reference.json
    walkthrough.json
    welcome_message.json
```

## Deployment Notes

- Deploy `index.html` from the repository root or from a dedicated GitHub Pages branch/folder.
- Keep the `/json/` folder at the same level as `index.html`; the app currently loads reference data from `/json/`.
- Keep the `/images/` folder at the same level as `index.html`; console and NPU reference data use relative image paths from there.
- Keep `CHANGELOG.md` in the repo to track updates. It is small and does not hurt GitHub Pages deployment.
- Do not use a `published_versions/` folder; rollback notes live in `CHANGELOG.md`.
- Keep the app dependency-free. No build step is required for GitHub Pages.
- Use `.nojekyll` so GitHub Pages serves files exactly as placed.
