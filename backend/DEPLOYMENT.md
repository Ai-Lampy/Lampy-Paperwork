# V59 private account backend and pilot deployment

The app source is on `pilot/v59-accounts`. Public V58.4 must remain available throughout this pilot. Online accounts are enabled in the pilot configuration after successful real owner sign-in and authenticated R2 listing. Full deployed project/template round trips remain a release acceptance gate. Local runtime/browser tests alone are not proof of live authentication.

## Current gates

- R2 is enabled. The private `lampy-paperwork-pilot-projects` bucket and `lampy-paperwork-v59-accounts` Worker are deployed. Public bucket access, Worker preview URLs and workers.dev access are disabled.
- The owner email was explicitly confirmed on 23 November 2026 and is configured in both the Access Allow policy and Worker. Deployment identifiers and the confirmed identity are recorded locally in `backups/V59-cloudflare-deployment.json`.
- The Access application protects `paperwork-api.ailampy.com` using the existing email one-time PIN provider. The initial application-not-found error cleared after propagation. Real owner sign-in returned a verified session, and the authenticated project listing reached R2 successfully. Anonymous requests redirect to Access. CORS permits the exact app origin and omits permission headers for untrusted origins.
- GitHub browser sign-in works. The first pilot run was rejected before executing steps because the github-pages environment permits only main. Approval to add the exact pilot branch is pending.

## Complete the approved Cloudflare setup

1. Retain the existing Zero Trust organisation `ai-lampy.cloudflareaccess.com` and email one-time PIN provider. Complete verification of Access sign-in. Do not change nameservers, the main website or other products.
2. Keep `lampy-paperwork-pilot-projects` private, with public access and custom public bucket domains disabled. It is bound to the Worker as `PROJECTS`.
3. Retain the self-hosted Access application for `paperwork-api.ailampy.com`, with an Allow policy for only the confirmed owner email. Do not add bypass or Everyone policies. CORS permits credentialed requests only from `https://ailampy.com`, methods GET/PUT/OPTIONS, and headers Content-Type/If-Match/If-None-Match/X-Lampy-Request.
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

6. Use the Worker custom domain `paperwork-api.ailampy.com`. The main website's DNS records are DNS-only in this account, so the original same-host API route did not intercept its requests. That unused route was removed. The dedicated API hostname avoids changing the main website's DNS, hosting or Paperwork proxy.
7. Validate anonymous rejection, other-email rejection, owner sign-in, session expiry, private bucket access and actual project/template round trips. The GitHub Pages origin is not a production API origin by default. Use the AI-Lampy URL for account tests.
8. `js/account-config.json` is now `enabled: true` for the isolated testing pilot. Its API URL is `https://paperwork-api.ailampy.com/paperwork/account-api/`. Keep the fallback in `js/account-manager.js` consistent. Never add credentials, JWTs or private project content to source.

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
