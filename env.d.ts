/// <reference types="vite/client" />

declare module 'virtual:manuscript-library' {
  const library: import('./src/content/types.ts').ManuscriptLibrary
  export function loadChapterBody(chapterId: string): Promise<string>
  export function loadWikiBody(wikiPageId: string): Promise<string>
  export function loadSearchIndex(bookId: string): Promise<import('./src/content/types.ts').ManuscriptSearchRecord[]>
  export function loadAssetUrl(assetId: string): Promise<string>
  export default library
}
