# Lampy Paperwork

This folder is the clean GitHub Pages deploy structure for the live app.

## Recommended Deploy Structure

```text
/
  CHANGELOG.md
  README.md
  index.html
  json/
    distro_options.json
    fixture_patch_reference.json
    lighting_vendors.json
    supply_reference.json
    walkthrough.json
    welcome_message.json
  docs/
    cleanup-report.md
  .nojekyll
```

## Deployment Notes

- Deploy `index.html` from the repository root or from a dedicated GitHub Pages branch/folder.
- Keep the `/json/` folder at the same level as `index.html`; the app currently loads reference data from `/json/`.
- Keep `CHANGELOG.md` in the repo to track updates. It is small and does not hurt GitHub Pages deployment.
- Keep `published_versions/` out of the live Pages deployment. It is useful as a local archive, but it adds size and clutter to the public app.
- Keep the app dependency-free. No build step is required for GitHub Pages.
- Use `.nojekyll` so GitHub Pages serves files exactly as placed.

## Version Archive Recommendation

Keep version snapshots outside the public deploy path, for example:

```text
/archive/published_versions/
```

or keep them only locally if they do not need to be publicly browsable.
