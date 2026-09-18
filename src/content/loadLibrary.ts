import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { parse } from 'yaml'
import type {
  LibraryManifest,
  ManuscriptAsset,
  ManuscriptBook,
  ManuscriptLibrary,
  ManuscriptPart,
  ManuscriptSearchRecord,
  SourceManuscriptChapter,
  SourceManuscriptLibrary,
  SourceManuscriptWikiPage,
} from './types.ts'

interface LoadLibraryOptions {
  projectRoot: string
  contentRoot?: string
  githubRepository?: string
  githubBranch?: string
}

interface MarkdownDocument {
  frontmatter: Record<string, unknown>
  body: string
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`[manuscript-reader] ${message}`)
}

function filesBelow(root: string): string[] {
  const files: string[] = []
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name)
      if (entry.isDirectory()) visit(path)
      else if (entry.isFile()) files.push(path)
    }
  }
  visit(root)
  return files
}

function sourcePath(root: string, path: string): string {
  return relative(root, path).split(sep).join('/')
}

function yamlFile(path: string): Record<string, unknown> {
  const value: unknown = parse(readFileSync(path, 'utf8'), { merge: false, uniqueKeys: true })
  invariant(value && typeof value === 'object' && !Array.isArray(value), `${path} must contain a YAML mapping.`)
  return value as Record<string, unknown>
}

export function parseMarkdownDocument(text: string, path = '<markdown>'): MarkdownDocument {
  const normalized = text.replace(/^\uFEFF/, '')
  invariant(normalized.startsWith('---\n') || normalized.startsWith('---\r\n'), `${path} is missing YAML frontmatter.`)
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(normalized)
  invariant(match, `${path} has unclosed YAML frontmatter.`)
  const frontmatter: unknown = parse(match[1]!, { merge: false, uniqueKeys: true })
  invariant(frontmatter && typeof frontmatter === 'object' && !Array.isArray(frontmatter), `${path} frontmatter must be a mapping.`)
  return { frontmatter: frontmatter as Record<string, unknown>, body: normalized.slice(match[0].length) }
}

function string(value: unknown, field: string, path: string): string {
  invariant(typeof value === 'string' && value.length > 0, `${path}: ${field} must be a non-empty string.`)
  return value
}

function nullableString(value: unknown, field: string, path: string): string | null {
  invariant(value === null || typeof value === 'string', `${path}: ${field} must be a string or null.`)
  return value
}

function stringArray(value: unknown, field: string, path: string): string[] {
  invariant(Array.isArray(value) && value.every((item) => typeof item === 'string'), `${path}: ${field} must be a string array.`)
  return value
}

function optionalStringArray(value: unknown, field: string, path: string): string[] {
  return value === undefined ? [] : stringArray(value, field, path)
}

function readBook(root: string, path: string): ManuscriptBook {
  const value = yamlFile(path)
  const relativePath = sourcePath(root, path)
  return {
    id: string(value.id, 'id', relativePath),
    title: string(value.title, 'title', relativePath),
    chapter_order: stringArray(value.chapter_order, 'chapter_order', relativePath),
    part_order: stringArray(value.part_order, 'part_order', relativePath),
    cover_image_id: nullableString(value.cover_image_id, 'cover_image_id', relativePath),
    sourcePath: relativePath,
  }
}

function readPart(root: string, path: string): ManuscriptPart {
  const value = yamlFile(path)
  const relativePath = sourcePath(root, path)
  return {
    id: string(value.id, 'id', relativePath),
    book_id: string(value.book_id, 'book_id', relativePath),
    name: string(value.name, 'name', relativePath),
    cover_image_id: nullableString(value.cover_image_id, 'cover_image_id', relativePath),
    sourcePath: relativePath,
  }
}

function readChapter(root: string, path: string): SourceManuscriptChapter {
  const relativePath = sourcePath(root, path)
  const { frontmatter, body } = parseMarkdownDocument(readFileSync(path, 'utf8'), relativePath)
  const mentions = frontmatter.wiki_mentions
  invariant(Array.isArray(mentions), `${relativePath}: wiki_mentions must be an array.`)
  return {
    id: string(frontmatter.id, 'id', relativePath),
    book_id: string(frontmatter.book_id, 'book_id', relativePath),
    part_id: nullableString(frontmatter.part_id, 'part_id', relativePath),
    title: nullableString(frontmatter.title, 'title', relativePath),
    word_count: body.trim().split(/\s+/u).filter(Boolean).length,
    body,
    cover_image_id: nullableString(frontmatter.cover_image_id, 'cover_image_id', relativePath),
    wiki_mentions: mentions.map((mention, index) => {
      invariant(mention && typeof mention === 'object' && !Array.isArray(mention), `${relativePath}: wiki_mentions[${index}] must be a mapping.`)
      const value = mention as Record<string, unknown>
      const source = value.source
      invariant(source === null || source === 'ai_summary' || source === 'manual', `${relativePath}: wiki mention source is invalid.`)
      return {
        id: string(value.id, `wiki_mentions[${index}].id`, relativePath),
        wiki_page_id: string(value.wiki_page_id, `wiki_mentions[${index}].wiki_page_id`, relativePath),
        source,
      }
    }),
    created_at: string(frontmatter.created_at, 'created_at', relativePath),
    updated_at: string(frontmatter.updated_at, 'updated_at', relativePath),
    sourcePath: relativePath,
  }
}

function readWikiPage(root: string, path: string): SourceManuscriptWikiPage {
  const relativePath = sourcePath(root, path)
  const { frontmatter, body } = parseMarkdownDocument(readFileSync(path, 'utf8'), relativePath)
  return {
    id: string(frontmatter.id, 'id', relativePath),
    book_id: string(frontmatter.book_id, 'book_id', relativePath),
    page_name: string(frontmatter.page_name, 'page_name', relativePath),
    page_type: string(frontmatter.page_type, 'page_type', relativePath),
    body,
    summary: typeof frontmatter.summary === 'string' ? frontmatter.summary : '',
    aliases: stringArray(frontmatter.aliases, 'aliases', relativePath),
    tags: optionalStringArray(frontmatter.tags, 'tags', relativePath),
    cover_image_id: frontmatter.cover_image_id === undefined ? null : nullableString(frontmatter.cover_image_id, 'cover_image_id', relativePath),
    sourcePath: relativePath,
  }
}

function readAsset(root: string, path: string): ManuscriptAsset {
  const value = yamlFile(path)
  const relativePath = sourcePath(root, path)
  const fileName = string(value.file_name, 'file_name', relativePath)
  invariant(!/[\\/\0\r\n]/.test(fileName) && fileName !== '.' && fileName !== '..', `${relativePath}: file_name is not portable.`)
  const binaryPath = resolve(dirname(path), fileName)
  const assetType = value.asset_type
  invariant(assetType === 'cover' || assetType === 'chapter' || assetType === 'part_cover' || assetType === 'wiki', `${relativePath}: asset_type is invalid.`)
  const byteLength = Number(value.byte_length)
  invariant(Number.isInteger(byteLength) && byteLength >= 0, `${relativePath}: byte_length must be a nonnegative integer.`)
  return {
    id: string(value.id, 'id', relativePath),
    book_id: string(value.book_id, 'book_id', relativePath),
    chapter_id: nullableString(value.chapter_id, 'chapter_id', relativePath),
    asset_type: assetType,
    file_name: fileName,
    mime_type: value.mime_type === null ? null : string(value.mime_type, 'mime_type', relativePath),
    notes: typeof value.notes === 'string' ? value.notes : '',
    wiki_page_ids: optionalStringArray(value.wiki_page_ids, 'wiki_page_ids', relativePath),
    created_at: string(value.created_at, 'created_at', relativePath),
    updated_at: string(value.updated_at, 'updated_at', relativePath),
    sha256: string(value.sha256, 'sha256', relativePath),
    byte_length: byteLength,
    has_bytes: existsSync(binaryPath),
    sourcePath: relativePath,
    binarySourcePath: existsSync(binaryPath) ? sourcePath(root, binaryPath) : null,
  }
}

function assertUnique(values: { id: string; sourcePath: string }[], kind: string): void {
  const seen = new Map<string, string>()
  for (const value of values) {
    const prior = seen.get(value.id)
    invariant(!prior, `Duplicate ${kind} ID ${value.id} in ${prior} and ${value.sourcePath}.`)
    seen.set(value.id, value.sourcePath)
  }
}

function validateRelations(library: SourceManuscriptLibrary): void {
  assertUnique(library.books, 'book')
  assertUnique(library.parts, 'part')
  assertUnique(library.chapters, 'chapter')
  assertUnique(library.wikiPages, 'wiki page')
  assertUnique(library.assets, 'asset')
  const chapters = new Map(library.chapters.map((chapter) => [chapter.id, chapter]))
  const books = new Set(library.books.map((book) => book.id))
  for (const book of library.books) {
    const owned = library.chapters.filter((chapter) => chapter.book_id === book.id)
    invariant(new Set(book.chapter_order).size === book.chapter_order.length, `${book.sourcePath}: chapter_order contains duplicates.`)
    for (const id of book.chapter_order) invariant(chapters.get(id)?.book_id === book.id, `${book.sourcePath}: chapter_order refers to unknown chapter ${id}.`)
    for (const chapter of owned) invariant(book.chapter_order.includes(chapter.id), `${book.sourcePath}: chapter_order omits ${chapter.id}.`)
  }
  for (const asset of library.assets) {
    invariant(books.has(asset.book_id), `${asset.sourcePath}: asset refers to unknown book ${asset.book_id}.`)
    if (asset.chapter_id) invariant(chapters.get(asset.chapter_id)?.book_id === asset.book_id, `${asset.sourcePath}: asset refers to unknown chapter ${asset.chapter_id}.`)
  }
}

export function splitLibraryContent(library: SourceManuscriptLibrary): {
  library: ManuscriptLibrary
  chapterBodies: Map<string, string>
  wikiBodies: Map<string, string>
  searchIndexes: Map<string, ManuscriptSearchRecord[]>
} {
  const chapterBodies = new Map<string, string>()
  const chapters = library.chapters.map(({ body, ...chapter }) => {
    chapterBodies.set(chapter.id, body)
    return chapter
  })
  const wikiBodies = new Map<string, string>()
  const wikiPages = library.wikiPages.map(({ body, ...page }) => {
    wikiBodies.set(page.id, body)
    return page
  })
  const searchIndexes = new Map(library.books.map((book) => [book.id, [
    ...library.chapters.filter((chapter) => chapter.book_id === book.id).map((chapter): ManuscriptSearchRecord => ({
      kind: 'chapter', id: chapter.id, title: chapter.title || 'Untitled',
      subtitle: library.parts.find((part) => part.id === chapter.part_id)?.name || 'Chapter', body: chapter.body,
    })),
    ...library.wikiPages.filter((page) => page.book_id === book.id).map((page): ManuscriptSearchRecord => ({
      kind: 'wiki', id: page.id, title: page.page_name, subtitle: page.page_type, body: `${page.summary}\n${page.body}`,
    })),
  ]]))
  return { library: { ...library, chapters, wikiPages }, chapterBodies, wikiBodies, searchIndexes }
}

/** @deprecated Use splitLibraryContent. */
export const splitChapterBodies = splitLibraryContent

export function loadLibrary(options: LoadLibraryOptions): SourceManuscriptLibrary {
  const requestedRoot = options.contentRoot || '../beta-bot-text-workspace-2026-09-04'
  const root = isAbsolute(requestedRoot) ? requestedRoot : resolve(options.projectRoot, requestedRoot)
  invariant(existsSync(root), `Content root does not exist: ${root}`)
  const manifestPath = resolve(root, 'beta-bot.yaml')
  invariant(existsSync(manifestPath), `No beta-bot.yaml found in ${root}`)
  const rawManifest = yamlFile(manifestPath)
  invariant(rawManifest.format === 'beta-bot-library', 'beta-bot.yaml is not a Beta Bot library bundle.')
  const manifest: LibraryManifest = {
    format: 'beta-bot-library',
    format_version: Number(rawManifest.format_version),
    bundle_id: string(rawManifest.bundle_id, 'bundle_id', 'beta-bot.yaml'),
    content_mode: rawManifest.content_mode === 'full' ? 'full' : 'text-only',
    book_ids: stringArray(rawManifest.book_ids, 'book_ids', 'beta-bot.yaml'),
  }
  invariant(manifest.format_version === 1, `Unsupported bundle format version ${manifest.format_version}.`)
  const paths = filesBelow(resolve(root, 'books'))
  const repository = options.githubRepository?.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/^\/+|\/+$/g, '')
  const branch = options.githubBranch?.trim() || 'main'
  const library: SourceManuscriptLibrary = {
    manifest,
    books: paths.filter((path) => /\/books\/[^/]+\/book\.yaml$/.test(path)).map((path) => readBook(root, path)),
    parts: paths.filter((path) => /\/parts\/[^/]+\/part\.yaml$/.test(path)).map((path) => readPart(root, path)),
    chapters: paths.filter((path) => /\/chapters\/[^/]+\/chapter\.md$/.test(path)).map((path) => readChapter(root, path)),
    wikiPages: paths.filter((path) => /\/wiki\/[^/]+\.md$/.test(path)).map((path) => readWikiPage(root, path)),
    assets: paths.filter((path) => /\/assets\/[^/]+\/asset\.yaml$/.test(path)).map((path) => readAsset(root, path)),
    contentRoot: root,
    githubEditBaseUrl: repository ? `https://github.com/${repository}/edit/${encodeURIComponent(branch)}/` : null,
  }
  validateRelations(library)
  library.books.sort((left, right) => manifest.book_ids.indexOf(left.id) - manifest.book_ids.indexOf(right.id))
  return library
}
