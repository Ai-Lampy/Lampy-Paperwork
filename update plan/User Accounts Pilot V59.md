# V59 — Private user accounts pilot

Status: implementation in progress. This document records requirements and evidence; unchecked work is not complete.

## Release boundary

- Keep the V58.4 public app working while V59 is tested separately.
- Publish the pilot through the existing manually triggered GitHub Pages workflow. Keep authentication and private project storage in a separate backend.
- Restrict online account access to the owner. Do not introduce public registration or team access.
- Preserve .lampy imports/exports, fixture data, imported MVR GDTFs, stable equipment IDs, generated labels and the existing local workflow.
- Do not upload project data, credentials, required workbooks, local rules or backups as runtime assets.

## Recovery baseline

- Verified local archive: `backups/V58.4-before-V59-20261122-041544.tar.gz`.
- Matching SHA256 manifest: `backups/V58.4-before-V59-20261122-041544.manifest.json`.
- All 1,667 archived files verified against source bytes before changes.
- GitHub V58.4 commit: `f2dd74472095b0c0aae3c44815e5b42524a2f546`, preserved on `backup/v58.4-before-v59`.
- Both `ailampy.com/paperwork/` and the GitHub Pages origin returned V58.4 in live checks. Evidence: `backups/V58.4-remote-baseline.json`.
- Back up the live deployment and verify the restored baseline before publication. A rollback must restore both the app and its manual workflow, without deleting cloud projects.

## Required account behaviour

1. Save and reopen multiple projects online. Give each project a stable identity independent of its name.
2. Open different projects in separate tabs/windows safely. Also detect conflicting edits to the same project.
3. Save offline on the device using IndexedDB, including complete project payloads. Do not silently drop imported GDTF bytes to meet localStorage quotas.
4. Show local save and online sync states separately. Authentication expiry and network failures must retain unsynced work.
5. Use conditional online writes. A stale client must never overwrite a newer project silently. Preserve both versions and offer reviewed recovery actions.
6. Keep the public/local project untouched until the user explicitly copies it into the pilot. Preserve a local recovery copy before migration or replacement.
7. Support project creation, naming, listing, opening, duplication, download and reviewed deletion. Deleting one project must not affect another.

## Reviewed cross-project imports

Allow independent selection and Add/Replace decisions for:

- Fixture Patch, including its sheets and required imported fixture references.
- Positions and colours.
- Distros and Supplies, including circuit labels and power assignments.
- Looms and their cables.
- Control/Network devices and ports.
- Rack Layouts and their device links.
- Contacts.
- Logos.
- PDF settings.

Show source and destination counts, duplicate names/IDs, address/IP conflicts, dependent areas, broken links and exactly what Replace removes. Build the result on a cloned payload, validate it, then apply atomically. Cancel makes no changes. Remap imported IDs consistently; do not change destination identities merely to resolve a collision. Do not match unrelated objects by name or channel count. When dependencies cannot be mapped safely, require their inclusion or an explicit reviewed resolution.

## Defaults and templates

- One personal default plus named templates such as Tour and Festival.
- Choose settings and starting equipment separately; never capture unwanted project history or account/session information.
- Show template contents before applying them.
- Changes to a default/template affect new projects only. Existing projects retain their own copied values.
- Applying a template to an existing project is an explicit reviewed import, with Add/Replace decisions and recovery protection.
- Preserve the template version used to create/apply a project; do not retain live references that mutate projects later.

## Backend and security

Use a dedicated Cloudflare Worker API, managed Access authentication and private R2 object storage where available. Validate the authenticated identity and application audience on every private request. Scope storage keys to the authenticated owner. Require same-origin or explicit approved-origin requests and protect state-changing requests from CSRF. No tokens or private payloads in public source, logs or browser URLs. Validate project/template payloads in the client before upload and after download. The server validates bounded chunk sizes, content hashes and manifests; it does not execute or parse the potentially large private project document. Use object ETags for atomic compare-and-swap updates; preserve recovery versions.

Current infrastructure evidence (23 November 2026): Access configuration and R2 are enabled. A private bucket and Worker are deployed. Use the dedicated API custom domain `paperwork-api.ailampy.com`; the main website remains on its existing DNS-only records and hosting. The initial Access application-not-found error cleared after propagation. Real owner sign-in and an authenticated R2 project listing now pass. Full deployed project/template round trips remain pending.

## Implementation sequence

1. Preserve and verify local/remote/live V58.4 baselines.
2. Implement pure project transfer/template rules and unit tests with realistic linked data.
3. Implement transactional local project repository, per-tab project identity and conflict recovery.
4. Implement authenticated storage API, conditional writes and endpoint tests.
5. Add project/account manager, save status, reviewed transfer and template UI without changing approved page toolbars.
6. Connect persistence and restore paths, including file open, New Project, update/reload protection and offline reopening.
7. Run required regression suites, release validator, clean external build and actual browser tests, including Safari.
8. Upload reviewed source to GitHub, manually deploy the isolated pilot, then verify both pilot and unchanged public app.
9. Record deployment, rollback and remaining limitations. Only describe the release as stable after end-to-end checks pass.
10. Write the detailed native macOS architecture and staged migration plan from the verified V59 implementation.

## Acceptance evidence

- [x] Local V58.4 backup verified against every source file.
- [x] GitHub currently reports V58.4; its baseline is preserved on a backup branch.
- [x] Immutable remote baseline and live response verification recorded.
- [ ] Account allows the owner and rejects anonymous/other identities.
- [ ] Two different projects survive concurrent tabs, reload and offline edits.
- [ ] Same-project races preserve both versions locally and online.
- [ ] Lost responses, authentication expiry, storage quota and interrupted saves preserve recoverable data.
- [ ] Every listed import area has Add/Replace, dependency review, cancellation and atomic application tests.
- [ ] Defaults and named templates work; changing them leaves existing projects unchanged.
- [ ] Existing file imports/exports and all required app regressions pass.
- [ ] Browser flows verified locally and on the deployed pilot.
- [ ] Public V58.4 still works after pilot deployment; rollback is verified.
- [ ] Runtime artifact is below 900 MB and excludes development/private files.
- [ ] Complete native macOS plan delivered.

## Implementation evidence — 22 November 2026, work in progress

Implemented locally:

- Complete IndexedDB project snapshots, separate project URLs/tabs, compare-and-swap revisions, recovery copies, upload leases and recoverable deletion.
- Account/project manager integrated with the existing editor, save status, project switching, file imports, update/reload protection and local recovery. Guest localStorage remains separate.
- All listed transfer areas, Add/Replace, per-area inspection, linked identity remapping and stale-review rejection. Replace clears destination values absent from the source. Fixture Patch PDF layouts are included without importing source filters.
- Personal default and named templates, independently copied project settings, version provenance and explicit reviewed application to an existing project. Template update tests compare existing stored projects byte-for-byte.
- Account transport with bounded response bodies, timeouts through body consumption, verified chunk hashes, authentication checks and conditional online updates. Pending projects and templates have separate sync timers.
- Worker with owner-only signed Access JWT verification, origin/CSRF protection, immutable 1 MiB chunks, a 64 MiB project limit, R2 conditional manifests and revision history.
- V59 offline service worker and hash-verified app/catalogue manifest. Private API responses are excluded. Large fixture details and images cache on use.
- Isolated deployment build: the verified V58.4 runtime remains at the public root; V59 is under `pilot/`, sharing unchanged fixture/image assets. Manual workflow checks out the immutable V58.4 commit and verifies shared assets before publication.
- V59 release markers and welcome content updated together. README remains unchanged. Blank projects reset label settings and fixture references rather than inheriting the previous open project; reopening restores each project’s own settings.

Validation completed during development:

- Project-store, workspace, project-transfer and API/sync Node checks passed, including stale writes, lost commit responses, offline edits, deletion, corrupt downloads, required linked data and template isolation.
- Both full app regression suites and release validation passed on the final source before this upload. Validation covered 808 catalogue fixtures, 731 stored definitions and 636 referenced images; the 14 unavailable optional cable catalogues remain supported.
- Actual workerd/Miniflare R2 tests passed: signed identity rejection, owner isolation, multi-chunk round trips, idempotent retry, conditional-write rejection, revision history, lists, deletion and templates. This found and fixed primitive module exports that Node alone accepted but workerd rejected. Runtime compatibility date is `2026-07-30`, matching the pinned test runtime.
- WebKit browser checks passed for project creation/editing, separate tabs, reloading, unchanged guest storage, template capture/use, cancelled imports and recovery after conflicting tabs.
- Chrome passed offline reopening in a closed/new tab and offline saving. WebKit passed the same checks with its temporary origin server stopped, including cached fixture catalogues and correct shared image paths. Public V58.4 remained outside the pilot worker scope.
- WebKit's `setOffline(true)` has a documented service-worker emulation defect (Playwright #42775); the test can stop its own server instead. This is WebKit testing, not native Safari verification. Native Safari WebDriver previously timed out creating a session.
- WebKit browser-to-Worker/R2 checks passed: online project saves, simultaneous project/template sync, conflicting template Keep both, unchanged existing project after template resolution, fresh-browser-profile downloads and retained local edits after authentication expiry. The local test harness supplies signed test identity; this does not prove live Cloudflare Access sign-in.
- Final isolated build: 694,210,565 bytes, below 900 MB, no GDTF archives. Built-artifact WebKit UI and offline tests passed, with the public V58.4 entry point and asset catalogue preserved. Final browser-to-Worker/R2 checks also passed.

Not complete:

- Live Access/R2 setup, real owner sign-in, live backend deployment and end-to-end online verification.
- Manual pilot deployment and live verification. Source was uploaded to `pilot/v59-accounts` at `52c548a719c178fdd6e535dc7f6a97a832a27f57`; all 36 blobs were verified against local bytes. Main remains the preserved V58.4 commit. No pilot workflow run has started. Deployment steps and recovery are recorded in `backend/DEPLOYMENT.md`.
- Final release/browser checks, deployed public/pilot checks, rollback exercise and the final native macOS implementation plan.

The user explicitly approved Cloudflare setup. On 22 November 2026 the Zero Trust organisation `ai-lampy.cloudflareaccess.com` was created and read back successfully, and an email one-time PIN identity provider was configured. This resolves the earlier approval block. On 23 November, R2 activation and the corrected owner identity were confirmed. The private bucket, Worker, dedicated API hostname and owner-only Access policy are configured. GitHub browser dispatch works, but run 45091122151 was rejected by the github-pages branch allowlist before any steps executed. Real owner sign-in and authenticated R2 listing subsequently passed after Access propagation. The isolated pilot configuration is enabled for online testing. The exact pilot-branch deployment permission and full deployed round trips remain outstanding. The backend continues to require verified owner authentication.

Development dependencies are `fake-indexeddb` and Miniflare. They are excluded from Pages assets. Browser checks are explicitly invoked and are not silently added to the unattended regression scripts.

## Sources checked

- Cloudflare Access JWT validation: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
- R2 conditional writes and consistency: https://developers.cloudflare.com/r2/reference/consistency/
- Original Main Build account discussion and approved Add/Replace/template choices, recovered from the project chat.

- Miniflare R2 testing: https://developers.cloudflare.com/workers/testing/miniflare/storage/r2/
- WebKit offline emulation limitation: https://github.com/microsoft/playwright/issues/42775

## Upload state

V59 source is uploaded to the isolated testing branch. The public main branch and live site remain V58.4. The GitHub connector has no workflow-dispatch action; no non-interactive GitHub terminal credential was available, and the browser automation query did not complete. No claim of publication or live account availability is made.
