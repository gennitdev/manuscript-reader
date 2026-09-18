import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { loadLibrary, parseMarkdownDocument, splitLibraryContent } from '../src/content/loadLibrary.ts'

const roots: string[] = []

function fixture(): string {
  const root = join('/private/tmp', `manuscript-reader-test-${crypto.randomUUID()}`)
  roots.push(root)
  mkdirSync(join(root, 'books', 'story', 'parts', 'one'), { recursive: true })
  mkdirSync(join(root, 'books', 'story', 'chapters', 'hello'), { recursive: true })
  mkdirSync(join(root, 'books', 'story', 'wiki'), { recursive: true })
  mkdirSync(join(root, 'books', 'story', 'assets', 'image-one'), { recursive: true })
  writeFileSync(join(root, 'beta-bot.yaml'), 'format: beta-bot-library\nformat_version: 1\nbundle_id: bundle:test\ncontent_mode: full\nbook_ids: [book-1]\n')
  writeFileSync(join(root, 'books', 'story', 'book.yaml'), 'id: book-1\ntitle: Story\nchapter_order: [chapter-1]\npart_order: [part-1]\ncover_image_id: image-1\n')
  writeFileSync(join(root, 'books', 'story', 'parts', 'one', 'part.yaml'), 'id: part-1\nbook_id: book-1\nname: Part One\ncover_image_id: null\n')
  writeFileSync(join(root, 'books', 'story', 'chapters', 'hello', 'chapter.md'), '---\nid: chapter-1\nbook_id: book-1\npart_id: part-1\ntitle: Hello\ncover_image_id: image-1\ncreated_at: 2026-01-01T00:00:00.000Z\nupdated_at: 2026-01-01T00:00:00.000Z\nwiki_mentions:\n  - id: mention-1\n    wiki_page_id: hero\n    source: manual\n---\nOnce upon a time.\n')
  writeFileSync(join(root, 'books', 'story', 'wiki', 'hero.md'), '---\nid: hero\nbook_id: book-1\npage_name: Hero\npage_type: character\nsummary: A hero\naliases: []\ntags: [protagonist]\ncover_image_id: image-1\n---\nBrave.\n')
  writeFileSync(join(root, 'books', 'story', 'assets', 'image-one', 'asset.yaml'), 'id: image-1\nbook_id: book-1\nchapter_id: chapter-1\nasset_type: chapter\nfile_name: scene.png\nmime_type: image/png\nnotes: A scene\nwiki_page_ids: [hero]\ncreated_at: 2026-01-01T00:00:00.000Z\nupdated_at: 2026-01-01T00:00:00.000Z\nsha256: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\nbyte_length: 3\n')
  writeFileSync(join(root, 'books', 'story', 'assets', 'image-one', 'scene.png'), new Uint8Array([1, 2, 3]))
  return root
}

afterEach(async () => {
  const { rm } = await import('node:fs/promises')
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('parseMarkdownDocument', () => {
  it('preserves the Markdown body after parsing frontmatter', () => {
    expect(parseMarkdownDocument('---\nid: one\n---\nLine one.\n\nLine two.\n')).toEqual({
      frontmatter: { id: 'one' }, body: 'Line one.\n\nLine two.\n',
    })
  })

  it('rejects a document without frontmatter', () => {
    expect(() => parseMarkdownDocument('Just text.')).toThrow('missing YAML frontmatter')
  })
})

describe('loadLibrary', () => {
  it('loads canonical books, relationships, wiki metadata, and image assets', () => {
    const root = fixture()
    const library = loadLibrary({ projectRoot: '/', contentRoot: root, githubRepository: 'owner/repo', githubBranch: 'draft' })
    expect(library.books[0]?.title).toBe('Story')
    expect(library.chapters[0]).toMatchObject({ id: 'chapter-1', body: 'Once upon a time.\n', word_count: 4 })
    expect(library.chapters[0]?.wiki_mentions[0]?.wiki_page_id).toBe('hero')
    expect(library.wikiPages[0]).toMatchObject({ page_name: 'Hero', tags: ['protagonist'], cover_image_id: 'image-1' })
    expect(library.assets[0]).toMatchObject({ id: 'image-1', has_bytes: true, binarySourcePath: 'books/story/assets/image-one/scene.png' })
    expect(library.githubEditBaseUrl).toBe('https://github.com/owner/repo/edit/draft/')
  })

  it('separates large bodies and search indexes from runtime metadata', () => {
    const source = loadLibrary({ projectRoot: '/', contentRoot: fixture() })
    const { library, chapterBodies, wikiBodies, searchIndexes } = splitLibraryContent(source)
    expect(library.chapters[0]).not.toHaveProperty('body')
    expect(library.wikiPages[0]).not.toHaveProperty('body')
    expect(chapterBodies.get('chapter-1')).toBe('Once upon a time.\n')
    expect(wikiBodies.get('hero')).toBe('Brave.\n')
    expect(searchIndexes.get('book-1')).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'chapter', id: 'chapter-1' }),
      expect.objectContaining({ kind: 'wiki', id: 'hero' }),
    ]))
  })

  it('marks image metadata when a text-only workspace omits bytes', () => {
    const root = fixture()
    rmSync(join(root, 'books', 'story', 'assets', 'image-one', 'scene.png'))
    expect(loadLibrary({ projectRoot: '/', contentRoot: root }).assets[0]?.has_bytes).toBe(false)
  })

  it('rejects an invalid chapter order', () => {
    const root = fixture()
    writeFileSync(join(root, 'books', 'story', 'book.yaml'), 'id: book-1\ntitle: Story\nchapter_order: [missing]\npart_order: [part-1]\ncover_image_id: null\n')
    expect(() => loadLibrary({ projectRoot: '/', contentRoot: root })).toThrow('unknown chapter missing')
  })

  it('rejects duplicate entity IDs', () => {
    const root = fixture()
    mkdirSync(join(root, 'books', 'story', 'chapters', 'duplicate'))
    writeFileSync(join(root, 'books', 'story', 'chapters', 'duplicate', 'chapter.md'), '---\nid: chapter-1\nbook_id: book-1\npart_id: null\ntitle: Duplicate\ncover_image_id: null\ncreated_at: 2026-01-01T00:00:00.000Z\nupdated_at: 2026-01-01T00:00:00.000Z\nwiki_mentions: []\n---\nDuplicate.\n')
    expect(() => loadLibrary({ projectRoot: '/', contentRoot: root })).toThrow('Duplicate chapter ID')
  })
})
