# Lampy Paperwork V60

Lampy Paperwork prepares lighting, power, control, network, rack, label and truck-pack paperwork for live entertainment productions.

[Open Lampy Paperwork](https://ailampy.com/paperwork/).

V60 is the public release. The deployment publishes the complete app at `/paperwork/`. Repository changes do not go live until the manual GitHub Actions workflow succeeds.

## What's new in V60

- **Account** sits below **Menu** in the sidebar and opens a full page.
- Projects, Defaults & Templates and Account Details are available through the account portal.
- Verified-email sign-up collects name, company, phone, job role, county, country and referral source. Profile details remain separate from production contacts.
- Account saves detect competing edits and retain your entries if a save fails.

Online sign-in remains restricted to the approved owner. Public account registration and shared gig paperwork are not enabled. Other users can choose **Continue on this device** and use the app without signing in.

See [CHANGELOG.md](CHANGELOG.md) for the full release history.

## App features

- Import and edit fixture patches from CSV, Excel, XLSM and MVR files.
- Match fixtures to stored names, modes, channel counts, images, wattage and weight.
- Export patch, position, power, Fan Out, cable and label paperwork.
- Calculate distro and supply phase totals; manage Socapex assignments.
- Manage consoles, network devices, IP addresses, VLANs, ports and rack layouts.
- Plan truck loads using a case inventory, stacking, orientations, measurements and 2D/3D views.
- Manage production contacts, logos, revisions and PDF settings.
- Download portable `.lampy` project files and reopen them later.

## Projects, accounts and offline use

Device projects and account projects use browser storage. Account projects can sync to private Cloudflare R2 storage through the authenticated Worker API. The app distinguishes local saving from online sync and keeps recovery copies for conflicting edits.

Personal defaults and named templates are copied into new projects. Editing a template does not alter existing projects. Applying it to an existing project requires an explicit review, with Add/Replace choices and dependency checks.

After the app reports **App available offline**, its shell and fixture catalogues can reopen without a connection. Detailed fixture data and images are available offline after they have been opened. Sign-in and online sync require a connection. Download `.lampy` backups after meaningful changes; do not clear browser storage while unsynced work remains.

Signing out leaves saved copies on the device. Use account projects only on devices you trust.

## Fixture data and MVR

| Location | Contents |
| --- | --- |
| `json/fixture_library_manifest.json` | Manufacturer catalogue index |
| `json/fixtures/` | Fixture names, modes, loads, weights and asset links |
| `json/fixture-details/<manufacturer>/` | Stored detailed fixture definitions |
| `images/fixtures/<manufacturer>/` | Compressed fixture images |
| `json/fixture_image_manifest.json` | Image identities and checksums |

The app uses stored fixture data and images. Original library GDTF archives are not runtime dependencies and are not embedded in ordinary MVR exports. GDTFs attached to imported MVR files retain their bytes for export with the linked fixtures. Older project fixtures may need re-matching. The app displays fixture images, not gobo or colour-wheel galleries.

## Repository contents

GitHub contains runtime source, assets, the account Worker, this README and the files required by the manual deployment checks. Build dependencies include tests, release metadata and validation tools; the website build excludes these from its runtime assets.

Supporting plans, deployment notes, maintenance-only tools, editable workbooks, backups and delivery ZIPs stay local. Their removal from GitHub does not remove your local copies.

## Deploy V60

1. Update the existing Cloudflare Worker using `backend/accounts-worker.mjs` if its code has changed.
2. In that Worker's **Settings → Variables and Secrets**, set `APP_URL` to `https://ailampy.com/paperwork/` and deploy the setting. Keep its existing R2 binding, Access policy, approved email and compatibility date. Keep the existing account resources to preserve stored projects.
3. Upload the current source files to `main`.
4. In GitHub Actions, open **Deploy Lampy Paperwork**, select **main**, enter release version **60**, enable confirmation and run the workflow.
5. Check that the public app reports V60, Account opens a page, sign-in returns to `/paperwork/`, and saved account details and projects reopen.

The workflow builds one public app, checks the release, creates a uniquely named Pages artifact and deploys it. It runs only when manually requested. Uploading backend code to GitHub does not deploy the Cloudflare Worker.

The build must remain below **900 MB**. Never upload a generated `_site/` directory. Keep existing project storage and backups when changing releases.

## Validation

Install the pinned development dependencies, then run:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm run test:accounts
pnpm run test:accounts:runtime
node tests/display-regressions.cjs
node tests/release-regressions.cjs
node scripts/validate-release.cjs
python3 scripts/build_site.py /new/temporary/lampy-v60-site
```

Use a new build directory outside the project. The Worker/R2 runtime test uses temporary local storage and a synthetic verified identity; it does not prove live Cloudflare sign-in. Browser checks require explicit authorisation. Native Safari and live offline/reconnection acceptance remain separate checks.

## Feedback

Report bugs, missing fixtures and feature requests in the [issue tracker](https://github.com/Ai-Lampy/Lampy-Paperwork/issues).
