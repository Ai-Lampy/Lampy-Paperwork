# V59 private account backend and pilot deployment

The app source is on `pilot/v59-accounts`. Public V58.4 must remain available throughout this pilot. Online accounts remain disabled in `js/account-config.json` until the following setup and live checks pass. Local runtime/browser tests are not proof of live authentication.

## Current gates

- The user approved Cloudflare setup. The Zero Trust organisation `ai-lampy.cloudflareaccess.com` was created and read back successfully on 22 November 2026. Its email one-time PIN identity provider is configured. No Access application or owner Allow policy has been created yet.
- R2 still reports that dashboard activation is required. The user must complete its subscription checkout.
- Confirm the owner's login email. The connected Cloudflare account email must not automatically become the approved app identity.
- The available GitHub connector can upload source but cannot dispatch a workflow. No non-interactive local GitHub credential was available. Start the manual run through an authenticated GitHub session when available.

## Complete the approved Cloudflare setup

1. Retain the existing Zero Trust organisation `ai-lampy.cloudflareaccess.com` and email one-time PIN provider. Enable R2 through its dashboard. Do not change nameservers, the main website or other products.
2. Create a private R2 bucket, for example `lampy-paperwork-pilot-projects`. Keep public access and custom public bucket domains disabled. Bind it to the Worker as `PROJECTS`.
3. Create a self-hosted Access application for `ailampy.com/paperwork/account-api/*`, with an Allow policy for only the confirmed owner email. Use the chosen identity provider or email one-time PIN. Do not add bypass or Everyone policies. Record the application audience and exact issuer.
4. Upload `accounts-worker.mjs` as an ES module Worker, with compatibility date `2026-07-30`. This matches the tested runtime. Disable its public `workers.dev` address unless specifically needed for an authenticated test.
5. Set these Worker bindings. They are configuration, not browser-provided identity:

| Binding | Value |
| --- | --- |
| `PROJECTS` | The private R2 bucket binding |
| `ACCESS_ISSUER` | `https://<approved-team-domain>.cloudflareaccess.com` |
| `ACCESS_AUDIENCE` | The Access application's audience string |
| `ALLOWED_EMAIL` | The confirmed pilot owner email |
| `ALLOWED_ORIGINS` | `https://ailampy.com` initially |
| `API_PREFIX` | `/paperwork/account-api` |
| `APP_URL` | `https://ailampy.com/paperwork/pilot/` |

6. Add only the Worker route `ailampy.com/paperwork/account-api/*`. This must intercept API requests before the existing website's read-only Paperwork proxy. Do not replace the wider `/paperwork/` route.
7. Validate anonymous rejection, other-email rejection, owner sign-in, session expiry, private bucket access and actual project/template round trips. The GitHub Pages origin is not a production API origin by default. Use the AI-Lampy URL for account tests.
8. Change `js/account-config.json` to `enabled: true` only after successful live checks. Keep its API URL `https://ailampy.com/paperwork/account-api/`. Never add credentials, JWTs or private project content to source.

## Publish the isolated pilot

In GitHub Actions, open **Deploy Lampy Paperwork** and choose **Run workflow**:

- Branch: `pilot/v59-accounts`.
- Release version: `59`.
- Confirmation: enabled.

The branch workflow checks out public baseline commit `f2dd74472095b0c0aae3c44815e5b42524a2f546`, runs both app suites, account tests, the real Workers/R2 test and release validation, then builds an isolated artifact. The root remains V58.4. V59 is placed under `/pilot/` and shares unchanged fixture/image assets. The build rejects changed shared assets and artifacts above 900 MB. It excludes backend code, tests, dependencies, workbooks and backups from Pages assets.

Do not add a push deployment trigger. Do not upload a generated `_site/` directory.

After deployment, verify:

- `https://ailampy.com/paperwork/js/app-version.json` remains V58.4.
- `https://ailampy.com/paperwork/pilot/js/app-version.json` reports V59.
- The same root/pilot versions appear on the GitHub Pages origin.
- Pilot scripts, styles, shared JSON/images, release polling and offline manifest resolve correctly through the website proxy.
- The pilot service worker scope ends in `/paperwork/pilot/` and does not control the public app.
- Public V58.4 opens an existing project normally. Do not test using the user's only copy of a real project.
- With online activation enabled, authenticate as the owner and verify two projects/tabs, fresh-device downloads, offline edits/reconnection, template update isolation, reviewed application, concurrent-device conflicts, deletion/restoration and downloaded `.lampy` backups.

Until these live checks pass, call the upload a testing pilot, not a stable online account release.

## Recovery and rollback

- Verified local V58.4 archive and its SHA256 manifest are under `backups/`; they remain local-only.
- Remote branch `backup/v58.4-before-v59` preserves the original public source and workflow.
- To restore the original Pages artifact, manually run the preserved baseline workflow from `backup/v58.4-before-v59` with release `58.4`. Verify the public release and assets afterwards. This removes the pilot from the published artifact without deleting account storage.
- Disable the Access application or remove only the pilot API route if backend access must be stopped. Do not delete the R2 bucket, recovery manifests or local IndexedDB data as part of rollback.
- Download unsynced device projects before clearing browser data. Backend rollback cannot recover data that never reached R2.
- An installed offline pilot can remain cached after server rollback. Instruct the tester to retain/download their projects first; then unregister the pilot's worker and clear only its app-shell cache. Do not clear shared site data or the project IndexedDB database.

## Test commands

Development dependencies are pinned in `package.json` and `pnpm-lock.yaml`.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm run test:accounts
pnpm run test:accounts:runtime
node tests/display-regressions.cjs
node tests/release-regressions.cjs
node scripts/validate-release.cjs
python3 scripts/build_site.py /new/external/temporary/site --baseline /verified/V58.4/source
```

Browser checks require explicit authorization. `tests/accounts-browser.cjs` covers the app UI. `tests/accounts-offline-browser.cjs` accepts `LAMPY_TEST_SITE` to start/stop its own temporary origin, avoiding WebKit's offline-emulation defect. Setting `LAMPY_BROWSER_CHECK=1` when running `tests/accounts-runtime.mjs` additionally exercises the UI against the local Worker/R2 runtime using signed test identity. It never enables authentication bypass in production code. Native Safari and real Access login remain separate verification requirements.

References: [Access JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/), [R2 consistency](https://developers.cloudflare.com/r2/reference/consistency/), [Miniflare R2 testing](https://developers.cloudflare.com/workers/testing/miniflare/storage/r2/).
