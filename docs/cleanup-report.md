# Lampy Paperwork Cleanup Report

## Current App Shape

- Single-page dependency-free app.
- Current live app entry point: `index.html`.
- Runtime reference data: `/json/*.json`.
- Current `index.html` size is about 360 KB.
- The JSON reference payload is about 20 KB total.
- Most folder weight comes from `published_versions/`, not the live app.

## Recommended GitHub Pages Structure

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

This is the lean GitHub Pages structure while preserving the current no-build, no-framework rule and keeping project history visible in `CHANGELOG.md`.

## Keep Out Of The Live Deploy

- `published_versions/`
- Local test PDFs/images/screenshots
- Temporary render outputs
- `.DS_Store`
- Editor backup files

The published version archive should remain local or move to a non-live archive folder. It is useful for tracking, but it should not be part of the public app payload.

Keep `CHANGELOG.md` in the repo. It is small, useful for release tracking, and safe to deploy with GitHub Pages.

## Performance And Sluggishness Risks

- The app repeatedly renders large HTML strings and then binds many listeners after render.
- Several views rebuild broad sections of DOM instead of updating only changed rows or controls.
- PDF export and preview are intentionally heavy and should remain isolated from normal interaction.
- The single-file CSS contains overlapping historical rules, which makes style fixes harder and can trigger accidental overrides.
- Inline event handlers make broad refactors harder because function names become part of the public DOM API.

## High-Value Cleanup Areas

1. **CSS grouping**
   - Split rules into logical sections inside the same `<style>` block first: base, layout, modals, distro labels, fixture patch, PDFs, responsive, print.
   - Avoid deleting export or print rules until each export mode is browser/PDF checked.

2. **Render helpers**
   - Extract repeated modal card, toggle label, select option, and action-button markup helpers.
   - Keep escaping functions central and use them consistently for JSON-rendered values.

3. **Event binding**
   - Move repeated post-render `querySelectorAll(...).forEach(addEventListener...)` blocks toward delegated event handling on stable container elements.
   - This should reduce rebind work after every render and lower memory-leak risk.

4. **State normalization**
   - Keep imported project data normalization isolated in one section.
   - Add fallbacks for missing JSON/project values at normalization boundaries rather than deep in render functions.

5. **PDF isolation**
   - Keep PDF preview and PDF download paths as closely shared as possible.
   - Any PDF formatting cleanup must be full browser/PDF tested before release.

6. **Version archive**
   - Continue creating version snapshots, but avoid shipping every snapshot in the live GitHub Pages app.
   - Keep `published_versions/` in a separate archive path or branch if public history is needed.

## Safe Immediate Cleanup Candidates

These are likely safe, but still require visual testing after removal because generated export markup can reference classes indirectly:

- `.badge`
- `.patchFormatChecks`
- `.homeMeta`
- `.homeDistroList`
- `.homeHeroField`
- `.homeInfoValue`
- `.homeProductionGrid`
- `.calcSummary`
- `.linkedSupplySummary`
- `.powerDistroList`
- `.powerDistroCard`
- `.powerDistroBody`
- `.distroEditorGroup`
- `.distroEditorGroupTitle`
- `.auxEditorGroup`
- `.outputEditorGroup`

Do not remove all of these in one pass. Remove in small groups and browser-test the affected sections.

## Workflow Improvements

- Add a short manual smoke-test checklist before each published version:
  - App loads from local server.
  - JSON references load.
  - Add/open/save project works.
  - Fixture Patch table renders.
  - Fixture Patch PDF preview and download visually match.
  - Position Summary export includes header/version/logos.
  - Distro labels export still matches preview.

- Keep changes small and versioned:
  - Small UI/CSS fix: syntax check only unless visual behavior is unclear.
  - Large render/PDF/export change: browser check and rendered PDF check.

- Maintain the current dependency-free production rule.
  - Bundled Node/Python can be used for local validation only.
