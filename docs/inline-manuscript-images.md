# Inline manuscript images

Status: proposed design

## Summary

Beta Bot should support dragging, pasting, or attaching an image while editing a chapter and inserting it at the cursor as ordinary Markdown. The exported workspace should preserve that Markdown and the corresponding image file so the same chapter renders in GitHub, Docusaurus-style tools, and Manuscript Reader. Re-importing the workspace into Beta Bot should restore the image without rewriting the chapter body.

Beta Bot and Manuscript Reader will implement image handling differently because one is an editor backed by local storage and the other is a static build. Their compatibility boundary is the canonical workspace: standard Markdown references, deterministic asset locations, asset metadata, and image bytes.

## Goals

- Keep chapter Markdown readable and portable outside Beta Bot.
- Make inline images round-trip through Beta Bot export, Git editing, and Beta Bot import.
- Let GitHub and conventional Markdown tooling render images without a Beta Bot plugin.
- Let Manuscript Reader emit optimized static image assets without introducing a database.
- Continue using Beta Bot's existing stable asset IDs, integrity metadata, and binary storage.
- Detect broken references and unsafe deletion before content is lost.

## Non-goals

- Giving Manuscript Reader an upload or editing interface.
- Embedding base64 image data in chapter Markdown.
- Making a text-only export self-contained when it intentionally omits image bytes.
- Treating remote third-party image URLs as managed Beta Bot assets.
- Replacing chapter cover images or the existing illustration library. Inline placement is an additional relationship between chapter text and those assets.

## Canonical Markdown contract

An inline image is represented with standard Markdown image syntax:

```md
![Supaya beneath the observatory](../../assets/abc123/supaya-observatory.webp)
```

The path is relative to `chapter.md`. It points to the existing canonical bundle layout:

```text
books/<book>/
├── chapters/<chapter>/chapter.md
└── assets/<asset-directory>/
    ├── asset.yaml
    └── supaya-observatory.webp
```

The chapter body stored in Beta Bot should contain the canonical relative reference even though Beta Bot reads the image bytes from IndexedDB, the desktop filesystem, or the mobile filesystem. The reference should not be rewritten during export or import.

The asset directory continues to be derived deterministically from the stable asset ID. Each asset has its own directory, so identical filenames do not collide. Keeping assets at book level also means renaming or moving a chapter does not move its images.

### Why not a custom URL scheme?

A reference such as this would be convenient inside Beta Bot:

```md
![Supaya beneath the observatory](beta-bot-asset:550e8400-e29b-41d4-a716-446655440000)
```

It would not render in GitHub or ordinary Markdown tools without a plugin. Standard relative paths make the exported workspace useful on its own and keep Beta Bot-specific behavior out of the prose.

### Alt text

Beta Bot should ask for or derive editable alt text at insertion time. An empty alt attribute is valid only when the image is deliberately decorative:

```md
![](../../assets/abc123/divider.webp)
```

Captions are not part of the first version. They can later use a documented Markdown extension or nearby prose without changing asset identity.

## Beta Bot responsibilities

### Insertion

When an author drops, pastes, or selects an image in the chapter editor, Beta Bot should:

1. Validate the file type, file size, and decodability using the existing image validation.
2. Create a stable asset ID and image metadata.
3. Store the image bytes using the active image content store.
4. Calculate integrity metadata.
5. Insert the canonical relative Markdown reference at the current selection.
6. Preserve focus and place the cursor after the inserted reference.

The image and chapter save should behave transactionally from the user's perspective. If byte storage or metadata creation fails, no Markdown reference should be inserted. If the author cancels the chapter edit after uploading, Beta Bot may either remove the newly orphaned asset immediately or retain it for an explicit orphan-cleanup process; the chosen behavior must be predictable.

An existing chapter illustration should also be insertable inline without duplicating its bytes. Multiple Markdown references may point to the same asset.

### Rendering

Beta Bot's Markdown renderer should recognize managed relative asset paths, map them to asset metadata, obtain a blob URL from the image content store, and render that URL. The stored Markdown remains unchanged.

Resolution should be based on normalized canonical paths and stable asset records, not filenames alone. Unresolved managed paths should produce a visible placeholder in preview/reading mode and a diagnostic rather than a broken or silently omitted image.

Remote `https` images can remain ordinary external Markdown images if Beta Bot chooses to allow them, but they are not included in exports and should be visually distinguishable or warned about. Unsafe schemes and paths escaping the book tree must be rejected.

### Export

A full export writes all of the following:

- The unchanged image reference in `chapter.md`.
- `asset.yaml` containing the existing asset metadata.
- The image bytes at the referenced canonical path.
- Updated inventory and integrity hashes.

A text-only export retains chapter Markdown and asset metadata but omits the bytes by definition. Export should warn when chapters contain managed inline images so the author understands that the text-only workspace cannot render them independently.

### Import

Import should validate that every managed inline reference:

- Normalizes to a permitted asset path inside the same book.
- Has corresponding `asset.yaml` metadata.
- Has bytes in a full bundle.
- Refers to bytes matching the declared length and SHA-256 digest.

After validation, Beta Bot restores the asset into its content store and saves the chapter body unchanged. Existing imports without inline references continue to work.

## Manuscript Reader responsibilities

Manuscript Reader remains read-only. At build time it should:

1. Discover the assets referenced by chapter Markdown.
2. Validate the same path and ownership rules needed for safe rendering.
3. Read the corresponding bytes from a full workspace.
4. Emit each image through the Vite asset pipeline, allowing hashed deployment filenames and CDN caching.
5. Provide the Markdown renderer with a mapping from canonical source paths to emitted URLs.
6. Render useful placeholders or fail the build according to the configured policy when referenced bytes are missing.

The browser must never attempt to resolve `../../assets/...` relative to the current Vue Router URL. That URL describes the reading route, not the location of `chapter.md`. Resolution belongs in the build/content layer.

Image bytes should be lazy in the ordinary browser sense: a chapter's images should load when the chapter is rendered, not become part of the initial JavaScript bundle. Native image lazy loading can be used for images below the fold.

## GitHub and Docusaurus-style behavior

Because the exported reference is ordinary relative Markdown, GitHub can display an image beside the chapter source and include the reference in text diffs. A Docusaurus-style build can resolve or bundle the same relative file.

Binary changes are visible in a pull request as added, replaced, or deleted files even though they do not have a useful line diff. The meaningful textual placement remains visible in `chapter.md`.

The canonical workspace's `asset.yaml` and inventory are currently managed data. Merely dropping an arbitrary image file into the repository is not enough for Beta Bot to import it as a managed asset. Manual image addition therefore needs supported tooling.

## Workspace tooling

A future command could support authors working entirely from Git and VS Code:

```sh
npm run manuscript:add-image -- path/to/chapter.md path/to/image.webp
```

The command should:

- Generate a stable asset ID.
- Copy the image into its canonical asset directory.
- Create `asset.yaml` with ownership, MIME type, size, timestamps, and SHA-256.
- Insert or print the correct relative Markdown reference.
- Refresh the bundle inventory.
- Refuse ambiguous ownership or unsafe filenames.

A companion validation command should report missing, orphaned, corrupt, cross-book, and escaping references before a pull request is merged or a workspace is imported.

An alternative is teaching Beta Bot import to adopt unknown referenced files automatically. That is more magical and makes identity, metadata, timestamps, and deletion semantics harder to review. Explicit workspace tooling is the preferred first implementation.

## Asset lifecycle and validation

Validation should distinguish these conditions:

| Condition | Recommended behavior |
| --- | --- |
| Reference and valid asset both exist | Render normally |
| Reference exists but metadata is missing | Error on full import/build |
| Metadata exists but full-bundle bytes are missing | Error on full import/build |
| Text-only export omits bytes | Expected warning/placeholder |
| Asset exists but has no references or cover role | Orphan warning; do not delete automatically |
| User deletes a referenced asset | Block or require confirmation listing affected chapters |
| Multiple references point to one asset | Supported |
| Reference crosses into another book | Reject initially |
| Reference escapes the workspace with `..` | Reject |
| Integrity metadata does not match bytes | Reject |

References should be found by parsing Markdown tokens, not with a regular expression. Code blocks and escaped Markdown must not create false asset references.

Deletion checks should cover chapter bodies as well as cover IDs and other structured asset relationships. A safe first policy is to prevent deletion until all inline references have been removed.

## Security and privacy

- Continue sanitizing rendered Markdown after image URL resolution.
- Permit only expected image MIME types and verified image contents.
- Reject `javascript:`, executable SVG, filesystem, and other unsafe schemes.
- Do not expose local filesystem paths in rendered HTML or exported Markdown.
- Revoke generated blob URLs when their chapter or component is unloaded.
- Remember that emitted static image assets contain manuscript material and must be covered by the same Cloudflare Access rules as HTML and chapter assets.

## Compatibility and versioning

Standard image Markdown can already live inside the version 1 chapter `body`, and assets already have canonical metadata and binary locations. A minimal implementation may therefore remain readable by existing importers: older Beta Bot versions will preserve the Markdown text and asset records even if they cannot resolve the inline image in the chapter renderer.

Before shipping, test exact round trips to determine whether the new validation and text-only semantics are backward-compatible enough for format version 1. Increment the bundle format only if the importer must enforce new required fields or reinterpret existing data in a way older implementations cannot safely preserve.

## Suggested implementation phases

### Phase 1: shared contract and validation

- Extract canonical asset-path helpers so export, import, Beta Bot rendering, and tests use one algorithm.
- Parse managed image references from Markdown.
- Add fixtures and round-trip tests for full and text-only bundles.
- Define missing, orphaned, cross-book, and unsafe-path diagnostics.

### Phase 2: Beta Bot authoring

- Add drag, paste, file-picker, and existing-illustration insertion to the chapter editor.
- Resolve managed references through the image content store in previews and reading mode.
- Add referenced-asset deletion protection.

### Phase 3: Manuscript Reader

- Include full-bundle asset metadata and bytes in its content loader.
- Emit referenced images as static assets and resolve their rendered URLs.
- Add responsive sizing, native lazy loading, placeholders, and build tests.

### Phase 4: Git-first tooling

- Add the image-import and workspace-validation commands.
- Document the Git/VS Code workflow.
- Add CI validation to the manuscript repository.

## Acceptance criteria

The first complete version is successful when this scenario works without manual repair:

1. An author drops an image between two paragraphs in Beta Bot.
2. Beta Bot previews it in that exact position.
3. A full export contains ordinary Markdown, metadata, and verified image bytes.
4. GitHub renders the image in the chapter source.
5. Manuscript Reader renders it at the same location from a static deployment.
6. Editing surrounding prose in Git does not disturb the image reference.
7. Re-importing the workspace restores the chapter and image in Beta Bot.
8. Exporting again produces the same reference and canonical asset identity.

