import { describe, expect, it } from 'vitest'
import { filterWikiPages, selectWikiImage, wikiPageTypes, wikiTypeFilterLabel, wikiTypeLabel } from '../src/content/wikiPresentation.ts'
import type { ManuscriptAsset, ManuscriptWikiPage } from '../src/content/types.ts'

function page(id: string, pageType: string, name: string, options: Partial<ManuscriptWikiPage> = {}): ManuscriptWikiPage {
  return {
    id,
    book_id: 'book-1',
    page_name: name,
    page_type: pageType,
    summary: '',
    aliases: [],
    tags: [],
    is_pinned: false,
    cover_image_id: null,
    sourcePath: `wiki/${id}.md`,
    ...options,
  }
}

function asset(id: string, options: Partial<ManuscriptAsset> = {}): ManuscriptAsset {
  return {
    id,
    book_id: 'book-1',
    chapter_id: null,
    asset_type: 'wiki',
    file_name: `${id}.png`,
    mime_type: 'image/png',
    notes: '',
    wiki_page_ids: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    sha256: id,
    byte_length: 1,
    has_bytes: true,
    sourcePath: `assets/${id}/asset.yaml`,
    binarySourcePath: `assets/${id}/${id}.png`,
    ...options,
  }
}

describe('wiki presentation helpers', () => {
  it('orders known page types first and counts each type', () => {
    const pages = [page('1', 'concept', 'One'), page('2', 'character', 'Two'), page('3', 'location', 'Three'), page('4', 'character', 'Four'), page('5', 'species', 'Five')]
    expect(wikiPageTypes(pages)).toEqual([
      { type: 'character', count: 2 },
      { type: 'location', count: 1 },
      { type: 'concept', count: 1 },
      { type: 'species', count: 1 },
    ])
  })

  it('filters by type and searches names, summaries, aliases, and tags', () => {
    const pages = [
      page('1', 'character', 'Vee', { aliases: ['Verity'] }),
      page('2', 'location', 'Avelora', { summary: 'A border kingdom' }),
      page('3', 'concept', 'Deepdream', { tags: ['underworld'] }),
    ]
    expect(filterWikiPages(pages, 'character', '')).toEqual([pages[0]])
    expect(filterWikiPages(pages, 'all', 'border')).toEqual([pages[1]])
    expect(filterWikiPages(pages, 'all', 'verity')).toEqual([pages[0]])
    expect(filterWikiPages(pages, 'all', 'underworld')).toEqual([pages[2]])
  })

  it('places pinned matches first and alphabetizes within each group', () => {
    const pages = [
      page('1', 'character', 'Vee'),
      page('2', 'character', 'Anisai', { is_pinned: true }),
      page('3', 'character', 'Tessela', { is_pinned: true }),
      page('4', 'character', 'Alarai'),
    ]
    expect(filterWikiPages(pages, 'all', '').map((entry) => entry.page_name)).toEqual(['Anisai', 'Tessela', 'Alarai', 'Vee'])
  })

  it('prefers an available cover, then an available tagged image', () => {
    const cover = asset('cover')
    const tagged = asset('tagged', { wiki_page_ids: ['vee'] })
    expect(selectWikiImage(page('vee', 'character', 'Vee', { cover_image_id: 'cover' }), [tagged, cover])).toBe(cover)

    const missingCover = asset('missing-cover', { has_bytes: false, binarySourcePath: null })
    expect(selectWikiImage(page('vee', 'character', 'Vee', { cover_image_id: 'missing-cover' }), [missingCover, tagged])).toBe(tagged)
    expect(selectWikiImage(page('empty', 'concept', 'Empty'), [tagged])).toBeNull()
  })

  it('turns stored wiki types into readable labels', () => {
    expect(wikiTypeLabel('historical_location')).toBe('Historical Location')
    expect(wikiTypeFilterLabel('historical_location')).toBe('Historical Locations')
    expect(wikiTypeFilterLabel('species')).toBe('Species')
  })
})
