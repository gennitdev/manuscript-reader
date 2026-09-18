# Manuscript Reader

A private, read-only Vue reader for canonical Beta Bot library workspaces. It reads `beta-bot.yaml`, `book.yaml`, chapter and wiki Markdown, parts, and image assets directly; it does not introduce another manuscript format.

## Local development

Requirements: Node.js 22.12+ or 24.

```sh
cp .env.example .env.local
npm install
npm run dev
```

`MANUSCRIPT_CONTENT_ROOT` may be absolute or relative to this project. The default expects the current Beta Bot text workspace to be checked out beside this repository.

Content files are watched by Vite. Saving a chapter, wiki page, image, or changing book order reloads the reader automatically.

## GitHub editing links

Set these in `.env.local` or the deployment environment:

```dotenv
MANUSCRIPT_GITHUB_REPOSITORY=owner/private-manuscript-repository
MANUSCRIPT_GITHUB_BRANCH=main
```

When configured, chapter and wiki-page footers link to GitHub's editor for the source Markdown file. Editing links are hidden when the repository is not configured.

## Validation and production build

```sh
npm test
npm run type-check
npm run build
```

The build fails for unsupported bundle versions, malformed frontmatter, duplicate entity IDs, invalid asset ownership, or chapter-order inconsistencies. Missing part metadata is shown as an explicit fallback group so an incomplete draft remains readable. Keep using Beta Bot's full standalone bundle validator before importing changes; Manuscript Reader validates only the relationships required for reading.

The output in `dist/` is completely static. Authentication should be applied by the host (for example, Cloudflare Access), never as a client-side password prompt. Production source maps are disabled and `noindex` metadata is included, though neither is a substitute for access control.

For a private hosted reading copy, see [Cloudflare Pages and Access](docs/cloudflare-pages-and-access.md). The guide covers building the reader with the separate manuscript repository, deploying the static output, and protecting production, preview, custom-domain, and asset URLs.

For the proposed cross-project contract for images embedded in chapter Markdown, see [Inline manuscript images](docs/inline-manuscript-images.md).

## Current scope

- Multiple books and ordered parts/chapters
- Responsive chapter reader
- Lazy full-text search across chapter and world-guide content
- Related world-guide links on chapters and browsable wiki pages
- Book, part, chapter, and wiki imagery with chapter albums and a keyboard-accessible lightbox
- Previous/next navigation
- Persistent type size and font preferences
- Resume reading per book
- Configurable GitHub edit links for chapters and wiki pages
- Beta Bot workspace validation during builds

Full bundles render their exported images as hashed static build assets. Text-only bundles remain readable and show intentional placeholders wherever image metadata exists without the corresponding bytes.
