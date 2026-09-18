# Cloudflare Pages and Access

This is a suggested deployment for a private manuscript. It keeps Manuscript Reader static, builds it together with the private manuscript repository in GitHub Actions, uploads only `dist/` to Cloudflare Pages, and puts every Pages hostname behind Cloudflare Access.

## Recommended shape

Use a **Direct Upload** Pages project rather than Pages Git integration. The build needs two repositories (`gennitdev/manuscript-reader` and `storyteller73/rough_drafts`), so GitHub Actions is the clearest place to check out both and build them as siblings. Cloudflare documents Direct Upload as the option for a custom build platform and supports deploying the result with Wrangler.

Run the deployment workflow from `rough_drafts`, since manuscript changes are the events that normally need a new reading copy. Keep a manual `workflow_dispatch` trigger so reader changes can also be deployed on demand. If both repositories are private, create a fine-grained GitHub personal access token with read-only Contents access to `gennitdev/manuscript-reader` and save it in `rough_drafts` as `MANUSCRIPT_READER_TOKEN`. If Manuscript Reader is public, the standard GitHub token is sufficient.

Cloudflare Direct Upload projects cannot later be converted to Git-integrated projects; changing approaches requires a new Pages project. See Cloudflare's [Direct Upload guide](https://developers.cloudflare.com/pages/get-started/direct-upload/) and [continuous integration guide](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/).

## 1. Create the Pages project and credentials

1. In Cloudflare, create a Pages project using **Direct Upload**. Use `manuscript-reader` as the project name and `main` as the production branch.
2. Create a scoped Cloudflare API token with **Account > Cloudflare Pages > Edit** for the account that owns the project.
3. In the `storyteller73/rough_drafts` GitHub repository, add Actions secrets named `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
4. If required, also add `MANUSCRIPT_READER_TOKEN` as described above.

Do not put Cloudflare credentials, GitHub tokens, or manuscript contents in repository variables. Use encrypted Actions secrets.

## 2. Build both repositories in GitHub Actions

Add a workflow like this to `rough_drafts/.github/workflows/deploy-reader.yml`:

```yaml
name: Deploy private reader

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Check out manuscript
        uses: actions/checkout@v6
        with:
          path: content

      - name: Check out reader
        uses: actions/checkout@v6
        with:
          repository: gennitdev/manuscript-reader
          ref: main
          path: reader
          token: ${{ secrets.MANUSCRIPT_READER_TOKEN || github.token }}

      - name: Use Node.js 24
        uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: npm
          cache-dependency-path: reader/package-lock.json

      - name: Install, test, and build
        working-directory: reader
        env:
          MANUSCRIPT_CONTENT_ROOT: ../content
          MANUSCRIPT_GITHUB_REPOSITORY: storyteller73/rough_drafts
          MANUSCRIPT_GITHUB_BRANCH: main
        run: |
          npm ci
          npm test
          npm run build

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy reader/dist --project-name=manuscript-reader --branch=main
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

This publishes only the compiled static site. The chapter source is still present in the compiled chapter assets, so the Pages deployment must be treated as sensitive and protected before use.

Cloudflare Pages automatically uses SPA fallback routing when the output has no top-level `404.html`, so direct links to book and chapter routes should work without a redirect file. See [Serving Pages: SPA rendering](https://developers.cloudflare.com/pages/configuration/serving-pages/#single-page-application-spa-rendering).

## 3. Protect production and previews with Access

The **Enable access policy** switch on a Pages project protects preview deployments only. It does **not** protect the production `<project>.pages.dev` hostname or a custom domain. For this manuscript, protect all of them:

1. In **Workers & Pages > manuscript-reader > Settings > General**, enable the Access policy.
2. Open the generated Access application and remove the `*` from its public-hostname subdomain. That application now protects `manuscript-reader.pages.dev`.
3. Return to the Pages settings and enable the Access policy again. Confirm that there are now two Access applications: one for `manuscript-reader.pages.dev` and one for `*.manuscript-reader.pages.dev` previews.
4. If you add a custom domain, create a separate **Zero Trust > Access controls > Applications > Self-hosted and private** application for that exact hostname and attach the same policy.

These are Cloudflare's documented steps for [protecting the production `pages.dev` hostname and custom domains](https://developers.cloudflare.com/pages/platform/known-issues/#enable-access-on-your-pagesdev-domain). Cloudflare also notes in its [preview deployment documentation](https://developers.cloudflare.com/pages/configuration/preview-deployments/#customize-preview-deployments-access) that the Pages toggle alone covers previews only.

## 4. Use a narrow identity policy

For a one-person site, a practical policy is:

- Action: **Allow**
- Include: **Emails** and your exact email address
- Authentication: your existing identity provider, or Cloudflare One-Time PIN
- Session duration: long enough to make bedtime/mobile reading pleasant, such as 30 days, if that tradeoff is acceptable on your devices

Do not use **Everyone**. Do not use **Login Methods: One-time PIN** as the only Include rule: Cloudflare warns that this permits any valid email address. Pair OTP with the exact allowed email (or a deliberately restricted domain). See [common Access policy mistakes](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/#common-cloudflare-access-misconfigurations) and [One-time PIN login](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/).

## 5. Verify before relying on it

Use a signed-out private browser window and check all of the following:

- `https://manuscript-reader.pages.dev/` shows the Access login, not the library.
- A copied deep chapter URL also shows the Access login.
- A copied file URL under `/assets/` also shows the Access login. This confirms that lazy-loaded chapter assets are gated, not merely the HTML shell.
- A preview URL such as `<hash>.manuscript-reader.pages.dev` is gated.
- Any custom domain is gated separately.
- After login, refreshing a deep chapter URL loads the same chapter.
- The chapter footer's GitHub edit link goes to the expected private repository and branch.

The app's `noindex` metadata and Cloudflare's preview `X-Robots-Tag` are useful safeguards, but neither is access control. Treat a successful signed-out rejection on every hostname as the deployment's real privacy test.

## Optional refinements

- Add a second workflow in `manuscript-reader` if reader-code changes should deploy automatically rather than through the manual trigger in `rough_drafts`.
- Pin third-party GitHub Actions to commit SHAs if you want stronger supply-chain controls.
- Use a custom reading hostname only after the `pages.dev` production and preview hostnames are both protected; otherwise those alternate hostnames remain a bypass.
- Avoid custom cache rules initially. Pages already serves hashed assets through its CDN and Cloudflare recommends its defaults for most sites.
