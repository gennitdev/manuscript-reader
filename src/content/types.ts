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
  summary: string
  aliases: string[]
  tags: string[]
  cover_image_id: string | null
  sourcePath: string
}

export interface SourceManuscriptWikiPage extends ManuscriptWikiPage {
  body: string
}

export type ManuscriptAssetType = 'cover' | 'chapter' | 'part_cover' | 'wiki'

export interface ManuscriptAsset {
  id: string
  book_id: string
  chapter_id: string | null
  asset_type: ManuscriptAssetType
  file_name: string
  mime_type: string | null
  notes: string
  wiki_page_ids: string[]
  created_at: string
  updated_at: string
  sha256: string
  byte_length: number
  has_bytes: boolean
  sourcePath: string
  binarySourcePath: string | null
}

export interface ManuscriptSearchRecord {
  kind: 'chapter' | 'wiki'
  id: string
  title: string
  subtitle: string
  body: string
}

export interface ManuscriptLibrary {
  manifest: LibraryManifest
  books: ManuscriptBook[]
  parts: ManuscriptPart[]
  chapters: ManuscriptChapter[]
  wikiPages: ManuscriptWikiPage[]
  assets: ManuscriptAsset[]
  contentRoot: string
  githubEditBaseUrl: string | null
}

export interface SourceManuscriptLibrary extends Omit<ManuscriptLibrary, 'chapters' | 'wikiPages'> {
  chapters: SourceManuscriptChapter[]
  wikiPages: SourceManuscriptWikiPage[]
}
