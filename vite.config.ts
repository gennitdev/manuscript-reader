import { isAbsolute, resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { loadLibrary, splitLibraryContent } from './src/content/loadLibrary.ts'
import type { ManuscriptAsset, ManuscriptSearchRecord } from './src/content/types.ts'

const VIRTUAL_ID = 'virtual:manuscript-library'
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_ID}`
const CHAPTER_PREFIX = 'virtual:manuscript-chapter/'
const WIKI_PREFIX = 'virtual:manuscript-wiki/'
const SEARCH_PREFIX = 'virtual:manuscript-search/'
const ASSET_PREFIX = 'virtual:manuscript-asset/'
const prefixes = [CHAPTER_PREFIX, WIKI_PREFIX, SEARCH_PREFIX, ASSET_PREFIX]

function resolved(prefix: string): string {
  return `\0${prefix}`
}

function loaderEntries(ids: string[], prefix: string): string {
  return ids.map((id) =>
    `${JSON.stringify(id)}: () => import(${JSON.stringify(`${prefix}${encodeURIComponent(id)}`)}).then((module) => module.default)`,
  ).join(',\n')
}

function manuscriptLibraryPlugin(environment: Record<string, string>): Plugin {
  let contentRoot = ''
  let chapterBodies = new Map<string, string>()
  let wikiBodies = new Map<string, string>()
  let searchIndexes = new Map<string, ManuscriptSearchRecord[]>()
  let assets = new Map<string, ManuscriptAsset>()

  return {
    name: 'manuscript-library',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID
      if (prefixes.some((prefix) => id.startsWith(prefix))) return `\0${id}`
      return undefined
    },
    load(id) {
      if (id.startsWith(resolved(CHAPTER_PREFIX))) {
        const entityId = decodeURIComponent(id.slice(resolved(CHAPTER_PREFIX).length))
        const body = chapterBodies.get(entityId)
        if (body === undefined) throw new Error(`[manuscript-reader] Unknown chapter body ${entityId}.`)
        return `export default ${JSON.stringify(body)}`
      }
      if (id.startsWith(resolved(WIKI_PREFIX))) {
        const entityId = decodeURIComponent(id.slice(resolved(WIKI_PREFIX).length))
        const body = wikiBodies.get(entityId)
        if (body === undefined) throw new Error(`[manuscript-reader] Unknown wiki body ${entityId}.`)
        return `export default ${JSON.stringify(body)}`
      }
      if (id.startsWith(resolved(SEARCH_PREFIX))) {
        const bookId = decodeURIComponent(id.slice(resolved(SEARCH_PREFIX).length))
        const records = searchIndexes.get(bookId)
        if (!records) throw new Error(`[manuscript-reader] Unknown search index ${bookId}.`)
        return `export default ${JSON.stringify(records)}`
      }
      if (id.startsWith(resolved(ASSET_PREFIX))) {
        const assetId = decodeURIComponent(id.slice(resolved(ASSET_PREFIX).length))
        const asset = assets.get(assetId)
        if (!asset?.binarySourcePath) throw new Error(`[manuscript-reader] Image bytes are unavailable for ${assetId}.`)
        const absolutePath = resolve(contentRoot, asset.binarySourcePath)
        return `import imageUrl from ${JSON.stringify(`${absolutePath}?url`)}; export default imageUrl`
      }
      if (id !== RESOLVED_VIRTUAL_ID) return undefined

      const sourceLibrary = loadLibrary({
        projectRoot: process.cwd(),
        contentRoot: environment.MANUSCRIPT_CONTENT_ROOT,
        githubRepository: environment.MANUSCRIPT_GITHUB_REPOSITORY,
        githubBranch: environment.MANUSCRIPT_GITHUB_BRANCH,
      })
      const split = splitLibraryContent(sourceLibrary)
      const library = split.library
      chapterBodies = split.chapterBodies
      wikiBodies = split.wikiBodies
      searchIndexes = split.searchIndexes
      assets = new Map(library.assets.map((asset) => [asset.id, asset]))
      contentRoot = library.contentRoot

      this.addWatchFile(resolve(contentRoot, 'beta-bot.yaml'))
      for (const entity of [...library.books, ...library.parts, ...library.chapters, ...library.wikiPages, ...library.assets]) {
        this.addWatchFile(resolve(contentRoot, entity.sourcePath))
      }
      for (const asset of library.assets) {
        if (asset.binarySourcePath) this.addWatchFile(resolve(contentRoot, asset.binarySourcePath))
      }

      return `
        export default ${JSON.stringify(library)}
        const chapterLoaders = {${loaderEntries(library.chapters.map((chapter) => chapter.id), CHAPTER_PREFIX)}}
        const wikiLoaders = {${loaderEntries(library.wikiPages.map((page) => page.id), WIKI_PREFIX)}}
        const searchLoaders = {${loaderEntries(library.books.map((book) => book.id), SEARCH_PREFIX)}}
        const assetLoaders = {${loaderEntries(library.assets.filter((asset) => asset.has_bytes).map((asset) => asset.id), ASSET_PREFIX)}}
        function load(loaders, id, kind) {
          const loader = loaders[id]
          if (!loader) return Promise.reject(new Error(\`\${kind} is unavailable for \${id}.\`))
          return loader()
        }
        export const loadChapterBody = (id) => load(chapterLoaders, id, 'Chapter body')
        export const loadWikiBody = (id) => load(wikiLoaders, id, 'Wiki body')
        export const loadSearchIndex = (id) => load(searchLoaders, id, 'Search index')
        export const loadAssetUrl = (id) => load(assetLoaders, id, 'Image bytes')
      `
    },
    handleHotUpdate(context) {
      if (contentRoot && context.file.startsWith(contentRoot)) {
        const ids = [
          RESOLVED_VIRTUAL_ID,
          ...[...chapterBodies.keys()].map((id) => `${resolved(CHAPTER_PREFIX)}${encodeURIComponent(id)}`),
          ...[...wikiBodies.keys()].map((id) => `${resolved(WIKI_PREFIX)}${encodeURIComponent(id)}`),
          ...[...searchIndexes.keys()].map((id) => `${resolved(SEARCH_PREFIX)}${encodeURIComponent(id)}`),
          ...[...assets.keys()].map((id) => `${resolved(ASSET_PREFIX)}${encodeURIComponent(id)}`),
        ]
        for (const id of ids) {
          const module = context.server.moduleGraph.getModuleById(id)
          if (module) context.server.moduleGraph.invalidateModule(module)
        }
        context.server.ws.send({ type: 'full-reload' })
        return []
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '')
  const requestedRoot = environment.MANUSCRIPT_CONTENT_ROOT || '../beta-bot-text-workspace-2026-09-04'
  const contentRoot = isAbsolute(requestedRoot) ? requestedRoot : resolve(process.cwd(), requestedRoot)
  return {
    plugins: [manuscriptLibraryPlugin(environment), vue()],
    resolve: { alias: { '@': resolve(import.meta.dirname, 'src') } },
    server: { fs: { allow: [process.cwd(), contentRoot] } },
    build: { sourcemap: false },
  }
})
