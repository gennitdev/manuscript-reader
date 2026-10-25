import type { ManuscriptAsset, ManuscriptWikiPage } from './types.ts'

const preferredTypeOrder = ['character', 'location', 'concept']

export function wikiTypeLabel(type: string): string {
  return type.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toLocaleUpperCase())
}

export function wikiTypeFilterLabel(type: string): string {
  const label = wikiTypeLabel(type)
  return label.endsWith('s') ? label : `${label}s`
}

export function wikiPageTypes(pages: ManuscriptWikiPage[]): { type: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const page of pages) counts.set(page.page_type, (counts.get(page.page_type) || 0) + 1)
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((left, right) => {
      const leftIndex = preferredTypeOrder.indexOf(left.type)
      const rightIndex = preferredTypeOrder.indexOf(right.type)
      const leftOrder = leftIndex < 0 ? preferredTypeOrder.length : leftIndex
      const rightOrder = rightIndex < 0 ? preferredTypeOrder.length : rightIndex
      return leftOrder - rightOrder || left.type.localeCompare(right.type)
    })
}

export function filterWikiPages(pages: ManuscriptWikiPage[], selectedType: string, query: string): ManuscriptWikiPage[] {
  const needle = query.trim().toLocaleLowerCase()
  return pages
    .filter((page) => selectedType === 'all' || page.page_type === selectedType)
    .filter((page) => !needle || `${page.page_name} ${page.summary} ${page.aliases.join(' ')} ${page.tags.join(' ')}`.toLocaleLowerCase().includes(needle))
    .sort((left, right) => left.page_name.localeCompare(right.page_name))
}

export function selectWikiImage(page: ManuscriptWikiPage, assets: ManuscriptAsset[]): ManuscriptAsset | null {
  const cover = page.cover_image_id ? assets.find((asset) => asset.id === page.cover_image_id) : undefined
  const associated = assets.filter((asset) => asset.book_id === page.book_id && asset.wiki_page_ids.includes(page.id))
  return (cover?.has_bytes ? cover : undefined)
    || associated.find((asset) => asset.has_bytes)
    || cover
    || associated[0]
    || null
}
