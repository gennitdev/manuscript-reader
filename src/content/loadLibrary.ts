import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { parse } from 'yaml'
import type {
  LibraryManifest,
  ManuscriptBook,
  ManuscriptChapter,
  ManuscriptLibrary,
  ManuscriptPart,
  ManuscriptWikiPage,
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

function readChapter(root: string, path: string): ManuscriptChapter {
  const relativePath = sourcePath(root, path)
  const { frontmatter, body } = parseMarkdownDocument(readFileSync(path, 'utf8'), relativePath)
  const mentions = frontmatter.wiki_mentions
  invariant(Array.isArray(mentions), `${relativePath}: wiki_mentions must be an array.`)
  return {
    id: string(frontmatter.id, 'id', relativePath),
    book_id: string(frontmatter.book_id, 'book_id', relativePath),
    part_id: nullableString(frontmatter.part_id, 'part_id', relativePath),
    title: nullableString(frontmatter.title, 'title', relativePath),
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

function readWikiPage(root: string, path: string): ManuscriptWikiPage {
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
    sourcePath: relativePath,
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

function validateRelations(library: ManuscriptLibrary): void {
  assertUnique(library.books, 'book')
  assertUnique(library.parts, 'part')
  assertUnique(library.chapters, 'chapter')
  assertUnique(library.wikiPages, 'wiki page')
  const chapters = new Map(library.chapters.map((chapter) => [chapter.id, chapter]))
  for (const book of library.books) {
    const owned = library.chapters.filter((chapter) => chapter.book_id === book.id)
    invariant(new Set(book.chapter_order).size === book.chapter_order.length, `${book.sourcePath}: chapter_order contains duplicates.`)
    for (const id of book.chapter_order) invariant(chapters.get(id)?.book_id === book.id, `${book.sourcePath}: chapter_order refers to unknown chapter ${id}.`)
    for (const chapter of owned) invariant(book.chapter_order.includes(chapter.id), `${book.sourcePath}: chapter_order omits ${chapter.id}.`)
  }
}

export function loadLibrary(options: LoadLibraryOptions): ManuscriptLibrary {
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
  const library: ManuscriptLibrary = {
    manifest,
    books: paths.filter((path) => /\/books\/[^/]+\/book\.yaml$/.test(path)).map((path) => readBook(root, path)),
    parts: paths.filter((path) => /\/parts\/[^/]+\/part\.yaml$/.test(path)).map((path) => readPart(root, path)),
    chapters: paths.filter((path) => /\/chapters\/[^/]+\/chapter\.md$/.test(path)).map((path) => readChapter(root, path)),
    wikiPages: paths.filter((path) => /\/wiki\/[^/]+\.md$/.test(path)).map((path) => readWikiPage(root, path)),
    contentRoot: root,
    githubEditBaseUrl: repository ? `https://github.com/${repository}/edit/${encodeURIComponent(branch)}/` : null,
  }
  validateRelations(library)
  library.books.sort((left, right) => manifest.book_ids.indexOf(left.id) - manifest.book_ids.indexOf(right.id))
  return library
}
