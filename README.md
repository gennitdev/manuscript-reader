# Manuscript Reader

A private, read-only Vue reader for canonical Beta Bot library workspaces. It reads `beta-bot.yaml`, `book.yaml`, chapter Markdown, parts, and wiki metadata directly; it does not introduce another manuscript format.

## Local development

Requirements: Node.js 22.12+ or 24.

```sh
cp .env.example .env.local
npm install
npm run dev
```

`MANUSCRIPT_CONTENT_ROOT` may be absolute or relative to this project. The default expects the current Beta Bot text workspace to be checked out beside this repository.

Content files are watched by Vite. Saving a chapter or changing book order reloads the reader automatically.

## GitHub editing links

Set these in `.env.local` or the deployment environment:

```dotenv
MANUSCRIPT_GITHUB_REPOSITORY=owner/private-manuscript-repository
MANUSCRIPT_GITHUB_BRANCH=main
```

When configured, each chapter footer links to GitHub's editor for the source Markdown file. Editing links are hidden when the repository is not configured.

## Validation and production build

```sh
npm test
npm run type-check
npm run build
```

The build fails for unsupported bundle versions, malformed frontmatter, duplicate entity IDs, or chapter-order inconsistencies. Missing part metadata is shown as an explicit fallback group so an incomplete draft remains readable. Keep using Beta Bot's full standalone bundle validator before importing changes; Manuscript Reader validates only the relationships required for reading.

The output in `dist/` is completely static. Authentication should be applied by the host (for example, Cloudflare Access), never as a client-side password prompt. Production source maps are disabled and `noindex` metadata is included, though neither is a substitute for access control.

For a private hosted reading copy, see [Cloudflare Pages and Access](docs/cloudflare-pages-and-access.md). The guide covers building the reader with the separate manuscript repository, deploying the static output, and protecting production, preview, custom-domain, and asset URLs.

For the proposed cross-project contract for images embedded in chapter Markdown, see [Inline manuscript images](docs/inline-manuscript-images.md).

## Current scope

- Multiple books and ordered parts/chapters
- Responsive chapter reader
- Chapter-title filtering
- Previous/next navigation
- Persistent type size and font preferences
- Resume reading per book
- Configurable GitHub edit links
- Beta Bot workspace validation during builds

The initial text-only workspace contains asset metadata but not image bytes, so illustrations are intentionally deferred until the content workflow uses full bundles or another authenticated asset source.
