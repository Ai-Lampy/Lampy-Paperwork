# V61: replace accounts with Fixture Patch sharing

The sharing backend was deployed with approval on 2026-11-28. See the deployment record below. Keep Workers Free. Do not change billing, delete databases, delete R2 objects, rename resources or recreate the Worker.

V61 removes sign-in, account pages, email-code authentication and cloud project sync. The replacement Worker serves only capability-protected patch sharing. Existing account API requests return 410; old account data remains stored and private. `/signed-out` redirects to the app Home URL.

## Before replacing the Worker

1. Download any cloud-only projects you need through the current V60 app while its account service still works. V61 can recover project copies already stored in this browser, but cannot fetch cloud-only account projects after sign-in is retired.
2. Keep the local rollback archive `outputs/backups/V60.5-before-V61.zip` and existing Cloudflare rollback records. Never upload those backups to GitHub.
3. Keep the current R2 bucket and D1 database. The resource names include historical account/pilot wording; that is not an account feature and changing their names would risk pointing away from existing data.

## Deploy from Terminal

Use Node 24 with npm/npx available. Run from the project folder:

```sh
cd "/Users/mandrews/Documents/Lampy Paperwork"
npx --yes pnpm@11.25.0 install --frozen-lockfile --ignore-scripts
npx --yes pnpm@11.25.0 run test:sharing
npx --yes pnpm@11.25.0 exec wrangler login
npx --yes pnpm@11.25.0 exec wrangler whoami
```

Confirm account `1c2c8d449b4c98fd53e5a474c213787d`. Then inspect pending migrations:

```sh
npx --yes pnpm@11.25.0 exec wrangler d1 migrations list AUTH_DB --remote
```

Apply the additive `0002-patch-sharing.sql` migration. It creates only `patch_shares`, `patch_notes` and `patch_rate_limits` plus a notes index. Keep `0001-email-auth.sql` as migration history; do not remove its existing tables.

```sh
npx --yes pnpm@11.25.0 exec wrangler d1 migrations apply AUTH_DB --remote
```

Confirm `wrangler.jsonc` uses:

- Worker `lampy-paperwork-v59-accounts` (existing resource).
- Entry `backend/patch-sharing-worker.mjs`.
- D1 binding `AUTH_DB`, database `lampy-paperwork-accounts`, ID `c533cc7c-2e28-4fa4-aa3b-49810da68765`.
- `ALLOWED_ORIGINS=https://ailampy.com`.
- `SHARE_PREFIX=/paperwork/account-api/shares`.
- `APP_URL=https://ailampy.com/paperwork/`.

No new secrets or email bindings are required. Existing unused authentication secrets can remain for rollback; the replacement Worker does not read them. Deploy the bundled Worker from source:

```sh
npx --yes pnpm@11.25.0 exec wrangler deploy
```

This command publishes the Worker and retires the old account endpoints. Do it only when ready to release V61. Do not paste the unbundled source into the dashboard: it imports the snapshot allowlist from `js/patch-sharing-core.js`.

## Cloudflare Access

Retain the existing `/paperwork/account-api/*` bypass and `/signed-out` exception. Sharing lives under that already-approved API path. Do not make the whole API hostname public or change any unrelated Access policy. The Worker checks random owner/viewer capabilities and permitted browser origins on every request. Viewers cannot use the owner management routes.

## Verify before publishing the frontend

These read-only requests should return JSON, not a Cloudflare sign-in page:

```sh
curl -i https://paperwork-api.ailampy.com/paperwork/account-api/session
curl -i https://paperwork-api.ailampy.com/paperwork/account-api/shares/check
```

Expected: account session **410**; share without a capability **403**. Verify preflight:

```sh
curl -i -X OPTIONS https://paperwork-api.ailampy.com/paperwork/account-api/shares/check \
  -H 'Origin: https://ailampy.com' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: Content-Type,X-Lampy-Owner'
```

Expected: **204**, exact allowed origin and `X-Lampy-Owner`/`X-Lampy-Share` allowed. Do not change Access if these fail; inspect the response first.

Upload the V61 files and deletions from the release manifest. Run the existing manual GitHub Pages workflow with version `61`. Uploading source alone does not publish the site.

After publication, create a test share, save the private owner link, open the viewer in a separate window, add a test note and verify the owner notification. Edit the owner project and verify the viewer stays unchanged until **Make current patch live** is pressed. Verify revocation. These live checks have not been performed by the local implementation tests.

## Sharing operation and limits

- Viewer links are bearer links. Anyone receiving one can read the snapshot and add notes after entering a name and job role. Those names are self-declared.
- Owner links are separate bearer capabilities. Keep them private and backed up. No account recovery exists. Owner tokens stay out of `.lampy` project files; the public project-sharing ID only associates local controls with the project.
- Snapshots include only fixture fields, position colours, project title and measurement units. They exclude contacts, profiles, other paperwork, GDTF archives and account metadata.
- Ordinary saves never publish. Each explicit publication replaces the snapshot and keeps notes, including notes for removed fixtures in the owner’s Viewer notes list.
- Requests are limited to 1 MiB; normalized snapshots to 800,000 bytes and 5,000 fixtures. Notes are capped at 2,000 characters and fetched in pages of 250.
- Initial anonymous-use bounds: 200 shares total, 10 creations per IP per hour, 100 globally per hour, 30 notes per share per minute, 10,000 notes per share and 50,000 notes globally. Limits reject excess work rather than increase billing. Monitor actual usage before adjusting them. Revocation retains records for note history; it does not reclaim a share slot.
- Stay on the free plan. Local Worker/D1 tests do not prove live CPU/quota performance. Review usage after rollout without changing billing automatically.

## Rollback

Restore the saved V60.5 source and its Wrangler configuration, reinstall its lockfile, redeploy its account Worker, then redeploy the matching static frontend using the manual workflow. Keep the additive sharing tables and old account data. Do not roll back by deleting data.

## Verified deployment — 2026-11-28

- Cause of sign-in errors: the public frontend was V61, but Cloudflare still served the V60.3 email-account Worker. The sharing tables were absent.
- Applied and recorded `0002-patch-sharing.sql` in the existing D1 database. Existing account tables and R2 objects were not changed.
- Deployed the bundled `backend/patch-sharing-worker.mjs`, matching the repository source and Wrangler bindings. No billing or Access policy changes.
- Active Worker version: `91af953e-ee3a-403f-8af8-5734cb4dcbba`; deployment: `d6ff7809-9462-4b9f-8846-8bb23add5677`.
- Previous account Worker version retained for rollback: `c239cca3-090d-4ce8-84d1-e9a53a54a934`.
- Live HTTP checks passed: missing-link 403, retired session 410, CORS preflight 204, synthetic share creation without sign-in, viewer read, blocked viewer management, attributed note, explicit snapshot update with note retained, revocation and subsequent viewer 410. The synthetic test link was revoked.
- Live browser interaction was not tested in this repair. The frontend V61.1 dialog fix is local and requires its own GitHub upload and manual Pages deployment.


## V61.2 Worker update — required before the frontend release

The new shared snapshot allowlist is in `js/patch-sharing-core.js`, imported and bundled by `backend/patch-sharing-worker.mjs`. Updating only GitHub Pages will not update Cloudflare. The old Worker discards the new logo, formatting, Console Info and note fields.

Deployed with approval on 2026-11-28. No database migration, billing change, new binding or Access change was made. The commands below remain the repeatable deployment procedure; the V61.2 Worker step is already complete.

1. Open Terminal and run from the complete local V61.2 project folder:

   ```sh
   cd "/Users/mandrews/Documents/Lampy Paperwork"
   npx --yes pnpm@11.25.0 install --frozen-lockfile --ignore-scripts
   npx --yes pnpm@11.25.0 run test:sharing
   npx --yes pnpm@11.25.0 exec wrangler login
   npx --yes pnpm@11.25.0 exec wrangler whoami
   ```

2. Confirm account `1c2c8d449b4c98fd53e5a474c213787d`. The existing `wrangler.jsonc` must still name Worker `lampy-paperwork-v59-accounts`, D1 `lampy-paperwork-accounts` and entry point `backend/patch-sharing-worker.mjs`.
3. Publish the bundled Worker, which automatically includes the revised shared core:

   ```sh
   npx --yes pnpm@11.25.0 exec wrangler deploy
   ```

   Do not paste either source file separately into the dashboard. Save the deployed version ID printed by Wrangler for rollback. The previous sharing Worker version is `91af953e-ee3a-403f-8af8-5734cb4dcbba`.
4. Upload the V61.2 release files, then start a fresh manual Pages workflow with release version `61.2` and confirm deployment.
5. Open the owner project and choose **Share patch → Make current patch live**. Existing snapshots remain frozen until this is pressed. New shares include the new fields immediately.
6. Open the viewer link. Confirm the project logos, Console Info and Notes, both summary side panes, inline notes and PDF preview. The patch remains read-only; Name and Job Role are required for notes.

Snapshot additions are explicitly allowlisted. Logos are compressed to bounded raster data, while console information uses the same display rows as the main Patch PDF. Contacts, account metadata, GDTF files and unrelated paperwork remain excluded. Existing fixture notes and viewer notes are retained.


## V61.2 deployment verified — 2026-11-28 02:25 UTC

- Active Worker version: `fc267352-bc0e-4793-89d4-e05d480eada1` at 100% traffic.
- Deployment ID: `0fb746c8-fdc0-4bd4-9203-4d79ff9d2a01`.
- Rollback sharing version: `91af953e-ee3a-403f-8af8-5734cb4dcbba`.
- Bundled the existing Worker entry with the V61.2 snapshot core; 12,144 bytes.
- Verified unchanged compatibility date, flags, standard usage model, D1/R2 bindings, variables and retained secret binding. No Access, database schema, billing or plan changes.
- Billing subscription read permission is not available to the connector. No billing write was attempted; the existing plan was left unchanged.
- Isolated Worker/D1 suite passed before deployment.
- Live HTTP checks passed: schema 2; logo, Console Info, cover/revision notes and formatting retention; private field exclusion; viewer read and note entry; blocked viewer publication; owner snapshot update with notes retained; missing-capability 403 and retired account endpoint 410.
- Used only synthetic data and revoked the test viewer link after verification. Existing shares and stored project data were not edited.
- No browser testing. GitHub and Pages were not changed. Upload V61.2 and run the manual Pages workflow; then use Make current patch live for existing shares.


## V61.3 Worker update — PDF settings parity (deployed 2026-11-28)

V61.3 extends the allowlisted snapshot with the owner's selected PDF output settings. The deployed bundle includes `js/patch-sharing-core.js` and retains this field. No migration, binding, Access-rule or plan change was needed. The existing plan and billing were left unchanged; no paid features were enabled.

For a future repeat deployment, from the project folder run:

```sh
cd "/Users/mandrews/Documents/Lampy Paperwork"
npx --yes pnpm@11.25.0 install --frozen-lockfile --ignore-scripts
npx --yes pnpm@11.25.0 run test:sharing
npx --yes pnpm@11.25.0 exec wrangler login
npx --yes pnpm@11.25.0 exec wrangler whoami
```

Confirm account `1c2c8d449b4c98fd53e5a474c213787d`, then deploy the existing Worker with its unchanged configuration:

```sh
npx --yes pnpm@11.25.0 exec wrangler deploy
```

Do not paste the unbundled source into the dashboard. Keep Worker `lampy-paperwork-v59-accounts`, the existing D1/R2 resources and the current Access rules. The rollback version is `fc267352-bc0e-4793-89d4-e05d480eada1` (V61.2).

Upload V61.3 and manually deploy Pages with release version `61.3`. Use **Share patch → Make current patch live** for existing links. The viewer will use the owner's PDF options and the same preview/export pipeline. Only values used in the published header/footer or filename are included; unrelated contact fields are not shared.

Deployment record:

- Deployed through the authorised Cloudflare connector at `2026-11-28T02:53:47.526653Z`; bundle size 14,056 bytes.
- Worker version `bfe9353f-efed-43b7-949c-003467be211b`, serving 100% of traffic.
- Deployment `24c19888-48e8-47e8-8989-2238691ebdd9`.
- Existing bindings, compatibility settings and usage model match their pre-deployment values. No schema, Access or billing changes. The connector lacks billing-read permission, so the subscription name was not independently rechecked.
- Isolated Worker/D1 runtime suite passed. Live HTTP checks passed for PDF settings on creation and publication, private-field exclusion, viewer reads and notes, blocked viewer publication, retained notes, missing-capability 403 and retired sign-in 410.
- Used synthetic data only and revoked the test link after verification. Existing user shares and project data were not edited.
- No browser testing, GitHub uploads or Pages deployment performed.


## V61.4 — pending deployment: general notes and replies

Local implementation and tests are complete; this section is a procedure, not a deployment record. No V61.4 production changes have been made. Keep Workers Free, the existing Worker, D1/R2 bindings and Access rules.

Deploy the migration and Worker **before** the V61.4 frontend. The Worker imports `js/patch-sharing-core.js`; deploy the bundle from the complete project folder, not an isolated source file pasted into Cloudflare.

1. Open Terminal in the local project and check the account:

   ```sh
   cd "/Users/mandrews/Documents/Lampy Paperwork"
   npx --yes pnpm@11.25.0 install --frozen-lockfile --ignore-scripts
   npx --yes pnpm@11.25.0 run test:sharing
   npx --yes pnpm@11.25.0 exec wrangler login
   npx --yes pnpm@11.25.0 exec wrangler whoami
   ```

   Confirm account `1c2c8d449b4c98fd53e5a474c213787d`, Worker `lampy-paperwork-v59-accounts` and D1 database `lampy-paperwork-accounts` (`c533cc7c-2e28-4fa4-aa3b-49810da68765`). No paid-plan change is required.

2. Check pending migrations:

   ```sh
   npx --yes pnpm@11.25.0 exec wrangler d1 migrations list AUTH_DB --remote
   ```

   On the existing V61.3 deployment, only `0003-patch-note-replies.sql` should be pending. If other migrations are pending, inspect the database and migration history before proceeding. Do not recreate the database or delete existing data.

3. Apply the additive migration:

   ```sh
   npx --yes pnpm@11.25.0 exec wrangler d1 migrations apply AUTH_DB --remote
   npx --yes pnpm@11.25.0 exec wrangler d1 migrations list AUTH_DB --remote
   ```

   Migration 0003 adds nullable `parent_seq`, `author_type` defaulting to `viewer`, and a thread index. Existing notes remain top-level viewer notes. General notes use an empty fixture ID. Existing account tables, R2 objects and patch snapshots remain unchanged.

4. Publish the bundled Worker:

   ```sh
   npx --yes pnpm@11.25.0 exec wrangler deploy
   ```

   Keep `wrangler.jsonc` unchanged. Retain the existing API-path Access bypass. Neither passwords nor account registration return in this update.

5. Run the read-only HTTP checks under “Verify before publishing the frontend” above: missing capability **403**, retired account route **410**, CORS preflight **204**. Then upload the complete V61.4 source list and manually run the Pages workflow with version `61.4`. The workflow file itself has not changed.

6. For existing viewer links, use **Share patch → Make current patch live** to include the patch name, logo visibility and current display settings. Existing notes are retained. Verify + Note, a fixture note, a viewer reply, an owner reply, and the owner unread count using a disposable share. Revoke that test share after checking.

Rollback: restore the V61.3 frontend and Worker version `bfe9353f-efed-43b7-949c-003467be211b`. Leave migration 0003 in place; its added columns are compatible with the older Worker. Keep all new notes. Do not drop columns or tables to roll back.
