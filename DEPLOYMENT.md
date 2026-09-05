# GitHub Pages Deployment

Lampy Paperwork uses a manually triggered GitHub Actions workflow. Committing or uploading files to the repository does not deploy the live site.

## One-time GitHub setup

1. Add the complete `.github/workflows/deploy-pages.yml` file to the GitHub repository.
2. Open the Lampy Paperwork repository on GitHub.
3. Select **Settings**.
4. In **Code and automation**, select **Pages**.
5. Under **Build and deployment**, set **Source** to **GitHub Actions**.
6. Do not select **Deploy from a branch**.

The existing live deployment remains available until a new workflow deployment succeeds.

## Updating repository files without deploying

Commit or upload changed files normally. The deployment workflow has no `push` trigger, so these changes will not update GitHub Pages.

## Publishing a release

1. Confirm all intended files are committed to the branch that should become live.
2. Open the repository's **Actions** tab.
3. Select **Deploy Lampy Paperwork** in the workflow list.
4. Select **Run workflow**.
5. Choose the branch to publish.
6. Enter the Lampy version number shown in the app, without the `V` prefix.
7. Enable **Deploy the current selected branch to the live GitHub Pages site**.
8. Select the green **Run workflow** button.
9. Wait for the workflow titled **Deploy Lampy Paperwork Vxx.xx** to finish successfully.
10. Open the deployment URL shown in the completed workflow and verify the release.

The workflow checks that the entered release version matches `VERSION` in `index.html` before deploying. The selected branch is captured at the commit shown in the workflow run. Later commits are not published until the workflow is run again.

## Optional deployment approval

For another confirmation gate:

1. Open **Settings → Environments → github-pages**.
2. Add a deployment protection rule or required reviewer if that option is available for the repository plan.
3. Save the environment settings.

The workflow will then pause for approval after it has been started manually and before the live deployment occurs.

## Rolling back

1. Restore or revert the repository to the last known working commit on a branch.
2. Run **Deploy Lampy Paperwork** manually against that branch.
3. Confirm the live site after the workflow completes.

Do not re-enable branch-based Pages publishing, because pushes to that publishing branch would deploy automatically.

## V33 release checks and artifact

The workflow runs both Node regression suites and the JSON/asset/version validator before building `_site`. Python recompresses GDTF ZIP entries at level 9 and compares every extracted byte with its source. Source GDTFs remain unchanged. The artifact must remain below 900 MB. Only runtime HTML, JavaScript, JSON, images, help text and GDTF archives are published; tests and development documents are excluded. No external asset host is required.

For a local check, run `python3 scripts/build_site.py /tmp/lampy-site` with a new output directory. The script refuses an existing destination to avoid deleting unrelated files. Do not start a browser or browser automation unless the user explicitly requests browser testing. The optional browser checklist applies only after that explicit request.
