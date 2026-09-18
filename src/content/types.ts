export interface LibraryManifest {
  format: 'beta-bot-library'
  format_version: number
  bundle_id: string
  content_mode: 'full' | 'text-only'
  book_ids: string[]
}

export interface ManuscriptBook {
  id: string
  title: string
  chapter_order: string[]
  part_order: string[]
  cover_image_id: string | null
  sourcePath: string
}

export interface ManuscriptPart {
  id: string
  book_id: string
  name: string
  cover_image_id: string | null
  sourcePath: string
}

export interface WikiMention {
  id: string
  wiki_page_id: string
  source: 'ai_summary' | 'manual' | null
}

export interface ManuscriptChapter {
  id: string
  book_id: string
  part_id: string | null
  title: string | null
  word_count: number
  cover_image_id: string | null
  wiki_mentions: WikiMention[]
  created_at: string
  updated_at: string
  sourcePath: string
}

export interface SourceManuscriptChapter extends ManuscriptChapter {
  body: string
}

export interface ManuscriptWikiPage {
  id: string
  book_id: string
  page_name: string
  page_type: string
  body: string
  summary: string
  aliases: string[]
  sourcePath: string
}

export interface ManuscriptLibrary {
  manifest: LibraryManifest
  books: ManuscriptBook[]
  parts: ManuscriptPart[]
  chapters: ManuscriptChapter[]
  wikiPages: ManuscriptWikiPage[]
  contentRoot: string
  githubEditBaseUrl: string | null
}

export interface SourceManuscriptLibrary extends Omit<ManuscriptLibrary, 'chapters'> {
  chapters: SourceManuscriptChapter[]
}
