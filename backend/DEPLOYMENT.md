# V61: replace accounts with Fixture Patch sharing

These are deployment instructions, not a record of a live deployment. Keep Workers Free. Do not change billing, delete databases, delete R2 objects, rename resources or recreate the Worker.

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
