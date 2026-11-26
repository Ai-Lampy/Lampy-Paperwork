# V60.3: in-app email-code sign-in

Status: source and local tests only. No live authentication migration has been performed. Passwords have been deferred; no paid plan is required by this implementation and no billing change is authorised. Do not publish the V60.3 frontend until the Worker is configured below. Public app use stays available without an account; account registration stays closed.

The Cloudflare connection in this chat could not authenticate. These are the exact manual steps for the existing Worker, not a new deployment target. Its historical name and R2 bucket name remain unchanged to preserve stored projects.

## 1. Retain the existing owner ID

Keep **Workers Free**. Sign-in uses email codes and does not run password hashing. Local Worker tests pass, but live CPU limits and email delivery still need checking after setup. If the Free plan reports resource-limit errors during live verification, stop and review the implementation; do not upgrade billing automatically.

While the existing Cloudflare login still works, open `https://paperwork-api.ailampy.com/paperwork/account-api/session` in your signed-in browser. Record `user.id` (64 hexadecimal characters) and check `user.email` is `mitch@mandrewslighting.com`. This is an administrator migration step only; the new end-user login will stay in Lampy.

In R2 → `lampy-paperwork-pilot-projects` → Objects, confirm the saved profile/projects are under `owners/<that ID>/`. Do not generate a new owner ID or move/delete R2 objects. Download a current project backup from Lampy before migration.

## 2. Prepare the deployment tools and D1 database

Open Terminal:

```sh
cd "/Users/mandrews/Documents/Lampy Paperwork"
npx --yes pnpm@11.25.0 install --frozen-lockfile --ignore-scripts
npx --yes pnpm@11.25.0 exec wrangler login
npx --yes pnpm@11.25.0 exec wrangler whoami
```

Confirm the selected account ID is `1c2c8d449b4c98fd53e5a474c213787d`.

Create the authentication database once:

```sh
npx --yes pnpm@11.25.0 exec wrangler d1 create lampy-paperwork-accounts --location weur
```

Copy the returned database UUID into `wrangler.jsonc` → `d1_databases[0].database_id`, replacing `REPLACE_WITH_D1_DATABASE_ID`. If the database already exists, use its existing UUID instead of creating another one. Keep binding `AUTH_DB`, name `lampy-paperwork-accounts` and migrations directory `backend/migrations`.

Apply the schema:

```sh
npx --yes pnpm@11.25.0 exec wrangler d1 migrations apply AUTH_DB --remote
```

Replace `EXISTING_OWNER_ID` with the exact ID from step 1, then run:

```sh
node scripts/provision-account.mjs EXISTING_OWNER_ID > /tmp/lampy-account-owner.sql
npx --yes pnpm@11.25.0 exec wrangler d1 execute AUTH_DB --remote --file /tmp/lampy-account-owner.sql
rm /tmp/lampy-account-owner.sql
```

This inserts only the approved, already verified account. It does not generate or print a sign-in code. If the INSERT reports an existing account, inspect the D1 `user` table and confirm the email and ID match; do not replace a different ID or overwrite existing account records.

## 3. Enable email-code delivery on Workers Free

In Cloudflare, open **Compute → Email Service → Email Sending → Onboard Domain**. Choose `ailampy.com`, review the proposed SPF/DKIM/bounce/DMARC records, and finish onboarding. Preserve existing mail delivery records and any existing DMARC policy. Wait until Cloudflare reports the domain ready. See [Email Sending setup](https://developers.cloudflare.com/email-service/get-started/send-emails/).

Next go to **Compute → Email Service → Email Routing → Destination Addresses**. Add `mitch@mandrewslighting.com`, open the verification email and select **Verify email address**. Confirm it is marked verified. This is required on Workers Free. It does not require changing your normal incoming mail service or enabling new routing rules. [Cloudflare destination-address instructions](https://developers.cloudflare.com/email-service/configuration/destination-addresses/).

The configured sender is `accounts@ailampy.com`. The `EMAIL` binding is restricted to that sender and the verified recipient `mitch@mandrewslighting.com`. The binding is already declared in `wrangler.jsonc`; do not enable remote email bindings for local development. Cloudflare says sends to verified destination addresses are free on any plan. Sign-in codes expire after five minutes, allow three attempts and can be used once. Public account creation remains disabled.

## 4. Add the secret and deploy the Worker

In **Workers & Pages → lampy-paperwork-v59-accounts → Settings → Variables and Secrets**, add a secret named `AUTH_SECRET` containing a new randomly generated value of at least 32 characters. Generate it in your password manager and enter it directly in Cloudflare; do not put it in source, chat or a command argument. Retain it in the password manager. Changing it later invalidates sessions.

Before deploying, confirm `wrangler.jsonc` contains:

- `compatibility_flags`: `["nodejs_compat"]`; compatibility date remains `2026-07-30`.
- `AUTH_MODE`: `email-code`.
- `AUTH_URL`: `https://paperwork-api.ailampy.com`.
- `APP_URL`: `https://ailampy.com/paperwork/`.
- `ALLOWED_ORIGINS`: `https://ailampy.com`.
- `ALLOWED_EMAIL`: `mitch@mandrewslighting.com`.
- `API_PREFIX`: `/paperwork/account-api`.
- `EMAIL_FROM`: `accounts@ailampy.com`.
- `AUTH_DB`: the actual D1 UUID from step 2.
- `PROJECTS`: existing R2 bucket `lampy-paperwork-pilot-projects`.
- Workers.dev and preview URLs remain disabled.

Deploy through Wrangler, which bundles the authentication library. **Do not paste only accounts-worker.mjs into Cloudflare's editor**; it now imports email-auth.mjs and installed dependencies.

```sh
npx --yes pnpm@11.25.0 exec wrangler deploy
```

This updates the Worker only. It does not publish GitHub Pages. Keep the existing Access application in place until this succeeds. Then check the deployed Worker Settings show `AUTH_MODE=email-code`, the D1/R2/email bindings, and the `AUTH_SECRET` secret.

## 5. Stop Cloudflare's login page intercepting the API

Only after step 4 succeeds, open **Zero Trust → Access → Applications → Add an application → Self-hosted**:

- Name: `Lampy email API`.
- Public hostname: `paperwork-api.ailampy.com`.
- Path: `/paperwork/account-api/*`.
- Add a policy named `Worker email authentication`.
- Action: **Bypass**.
- Include selector: **Everyone**.
- Save the application.

This more-specific path lets the Worker perform email-code/session authentication; it does not make stored project data public. Every storage request still checks a signed session and the approved email. Leave the existing whole-host Access application and exact `/signed-out` callback configuration intact. Do not add a whole-domain Bypass. See [path-scoped Bypass policies](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/common-policies/) and [path precedence](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/).

Verify without a session:

```sh
curl -i https://paperwork-api.ailampy.com/paperwork/account-api/session
curl -i https://paperwork-api.ailampy.com/paperwork/account-api/projects
```

Both must return **401 JSON**, not a Cloudflare redirect and not project data. If either returns data, restore the original Access protection before continuing. If they redirect, correct the path-specific application rather than weakening protection on other paths.

## 6. Publish the frontend and verify sign-in

Upload the V60.3 files listed in the implementation report, including the changed `backend/` files and dependencies. Remove the old repository-root `sw.js`; upload `js/sw.js`. GitHub Actions emits the runtime root `sw.js` during its build. Run the existing manual Pages workflow.

Open Lampy → sidebar **Sign in**. Enter `mitch@mandrewslighting.com` and select **Send sign-in code**. Enter the six-digit code in Lampy within five minutes. No Cloudflare page should appear. Confirm your existing projects/profile are present, then sign out. Confirm sign-out stays on the Lampy sign-in page, ordinary Home loading stays on Home, and Create your account shows the coming-soon notice. Check the Worker logs/metrics for resource-limit errors while testing on Workers Free.

Browser testing, live email delivery and the live email-code session have not yet been verified. Do not call this migration complete until these checks pass.

## Rollback

Remove or disable only the new `Lampy email API` path application first, restoring the existing Cloudflare Access protection. Restore the previous Worker version/configuration and the previous frontend release together. Keep D1 and R2 data intact. Existing local project copies remain available. The separate `backups/` folder was preserved; the obsolete `outputs/releases/V60` archive was removed with approval.

---

## Historical deployment notes (superseded by V60.3 instructions above)

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
