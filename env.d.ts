/// <reference types="vite/client" />

declare module 'virtual:manuscript-library' {
  const library: import('./src/content/types.ts').ManuscriptLibrary
  export default library
}
