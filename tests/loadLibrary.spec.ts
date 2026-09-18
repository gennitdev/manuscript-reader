import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { loadLibrary, parseMarkdownDocument, splitChapterBodies } from '../src/content/loadLibrary.ts'

const roots: string[] = []

function fixture(): string {
  const root = join('/private/tmp', `manuscript-reader-test-${crypto.randomUUID()}`)
  roots.push(root)
  mkdirSync(join(root, 'books', 'story', 'parts', 'one'), { recursive: true })
  mkdirSync(join(root, 'books', 'story', 'chapters', 'hello'), { recursive: true })
  mkdirSync(join(root, 'books', 'story', 'wiki'), { recursive: true })
  writeFileSync(join(root, 'beta-bot.yaml'), 'format: beta-bot-library\nformat_version: 1\nbundle_id: bundle:test\ncontent_mode: text-only\nbook_ids: [book-1]\n')
  writeFileSync(join(root, 'books', 'story', 'book.yaml'), 'id: book-1\ntitle: Story\nchapter_order: [chapter-1]\npart_order: [part-1]\ncover_image_id: null\n')
  writeFileSync(join(root, 'books', 'story', 'parts', 'one', 'part.yaml'), 'id: part-1\nbook_id: book-1\nname: Part One\ncover_image_id: null\n')
  writeFileSync(join(root, 'books', 'story', 'chapters', 'hello', 'chapter.md'), '---\nid: chapter-1\nbook_id: book-1\npart_id: part-1\ntitle: Hello\ncover_image_id: null\ncreated_at: 2026-01-01T00:00:00.000Z\nupdated_at: 2026-01-01T00:00:00.000Z\nwiki_mentions: []\n---\nOnce upon a time.\n')
  writeFileSync(join(root, 'books', 'story', 'wiki', 'hero.md'), '---\nid: hero\nbook_id: book-1\npage_name: Hero\npage_type: character\nsummary: A hero\naliases: []\n---\nBrave.\n')
  return root
}

afterEach(async () => {
  const { rm } = await import('node:fs/promises')
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('parseMarkdownDocument', () => {
  it('preserves the Markdown body after parsing frontmatter', () => {
    expect(parseMarkdownDocument('---\nid: one\n---\nLine one.\n\nLine two.\n')).toEqual({
      frontmatter: { id: 'one' },
      body: 'Line one.\n\nLine two.\n',
    })
  })

  it('rejects a document without frontmatter', () => {
    expect(() => parseMarkdownDocument('Just text.')).toThrow('missing YAML frontmatter')
  })
})

describe('loadLibrary', () => {
  it('loads and connects a canonical Beta Bot workspace', () => {
    const root = fixture()
    const library = loadLibrary({ projectRoot: '/', contentRoot: root, githubRepository: 'owner/repo', githubBranch: 'draft' })
    expect(library.books[0]?.title).toBe('Story')
    expect(library.chapters[0]).toMatchObject({ id: 'chapter-1', body: 'Once upon a time.\n', word_count: 4 })
    expect(library.parts[0]?.name).toBe('Part One')
    expect(library.wikiPages[0]?.page_name).toBe('Hero')
    expect(library.githubEditBaseUrl).toBe('https://github.com/owner/repo/edit/draft/')
  })

  it('separates chapter bodies from the runtime library index', () => {
    const source = loadLibrary({ projectRoot: '/', contentRoot: fixture() })
    const { library, chapterBodies } = splitChapterBodies(source)
    expect(library.chapters[0]).toMatchObject({ id: 'chapter-1', word_count: 4 })
    expect(library.chapters[0]).not.toHaveProperty('body')
    expect(chapterBodies.get('chapter-1')).toBe('Once upon a time.\n')
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
