/// <reference types="vite/client" />

declare module 'virtual:manuscript-library' {
  const library: import('./src/content/types.ts').ManuscriptLibrary
  export function loadChapterBody(chapterId: string): Promise<string>
  export default library
}
