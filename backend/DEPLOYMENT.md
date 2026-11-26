# V60 account backend deployment

V60 publishes the complete app at https://ailampy.com/paperwork/.
GitHub Pages deployment is manual. The Worker is deployed separately.

## V60.1 logout routing — required before publishing

Completed on 26 November 2026: updated Worker deployed and the exact `/signed-out` Access override applied. Live HTTP checks confirmed the 303 return to Lampy and 302 sign-in protection on private API routes and adjacent callback paths. Worker bindings, compatibility date and owner-only Access policy were preserved. Browser sign-in/logout testing was not performed. Deployment record: `backups/V60.1-cloudflare-logout-deployment.json`; rollback snapshot: `backups/V60.1-cloudflare-before-logout.json`.

The public Lampy domain is not an Access application, so Cloudflare rejects it as a direct logout `returnTo` destination. V60.1 uses:

`paperwork-api.ailampy.com/cdn-cgi/access/logout` → `paperwork-api.ailampy.com/signed-out` → `https://ailampy.com/paperwork/?portal=signin`.

1. Deploy the updated `backend/accounts-worker.mjs` to the existing Worker. Preserve all bindings and variables in `wrangler.jsonc`.
2. On the existing Access application (ID `435ca1b2-2dd5-466e-98bb-4b2b51fda2f5`), retain public destination `paperwork-api.ailampy.com` and add the exact-path public override `{"path_pattern":"/signed-out","behavior":"public"}` to that destination's `overrides` array. Do not use a wildcard. Preserve all other settings, the application ID/audience, policy and allowed email. Do not create a replacement authentication application.
3. Verify an unauthenticated GET to `/signed-out` returns 303 to the Lampy login page, while `/paperwork/account-api/session`, `/profile`, `/projects` and `/templates` remain protected.
4. Upload V60.1 source and trigger GitHub Pages manually with release version `60.1`.
5. When browser testing is authorised, sign in, sign out, confirm the Lampy sign-in page appears, and verify private API access requires sign-in again. Verify Create your account displays “Accounts are coming soon.”

The callback accepts GET only, ignores caller-supplied destinations, and reads no account storage. It uses APP_URL with a fresh `portal=signin` query and no project identity. Every data route still checks a signed Access identity in the Worker as well as the Access policy.

Rollback: remove that exact public override and restore the previous Worker/frontend sources. Do not change account data or storage. The source change does not itself update Cloudflare Access or deploy the Worker.

## Required before publishing V60

1. Open the existing account Worker in Cloudflare Workers & Pages.
2. Replace its ES module entry-point code with the current local backend/accounts-worker.mjs and deploy.
3. In Settings → Variables and Secrets, set APP_URL to https://ailampy.com/paperwork/ and deploy the setting.
4. Preserve PROJECTS, the existing private R2 bucket, ACCESS_ISSUER, ACCESS_AUDIENCE, ALLOWED_EMAIL, ALLOWED_ORIGINS and API_PREFIX. Keep compatibility date 2026-07-30.
5. Keep the custom domain paperwork-api.ailampy.com and the current Access policy. Sign-in remains restricted to mitch@mandrewslighting.com. Do not rename or delete account storage.
6. In GitHub Actions, run Deploy Lampy Paperwork from main with release_version 60 and confirmation enabled.
7. Verify the public version, login return URL, account details save/reload, project save/reopen and device-only use.

The active Worker code and APP_URL are verified. The root wrangler.jsonc records these settings for future CLI deployments. Keep dashboard changes and this file in sync. Worker/R2 resource names are preserved; the website has no separate testing deployment.

## Data and authentication

Profiles use owners/<verified-id>/account/profile. Projects and templates remain under the same authenticated owner. The server derives identity from verified Cloudflare Access claims. Conditional writes and retry IDs protect against competing edits and interrupted responses. No public registration or paperwork sharing is enabled.

Do not clear browser storage, change the Access issuer or recreate the R2 bucket during release. Keep downloaded .lampy backups and local recovery copies. Existing cloud identifiers are retained to preserve data.

## Validation and limits

The public build, account tests, Worker/R2 runtime tests and required release checks passed locally. Runtime tests use synthetic identity and temporary storage. This is not a live sign-in or Safari test. The V60 public release has not been deployed by this cleanup.

See the root README.md for current app and release instructions. This deployment guide stays local.
