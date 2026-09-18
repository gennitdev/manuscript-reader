import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { loadLibrary, splitChapterBodies } from './src/content/loadLibrary.ts'

const VIRTUAL_ID = 'virtual:manuscript-library'
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_ID}`
const CHAPTER_VIRTUAL_PREFIX = 'virtual:manuscript-chapter/'
const RESOLVED_CHAPTER_PREFIX = `\0${CHAPTER_VIRTUAL_PREFIX}`

function manuscriptLibraryPlugin(environment: Record<string, string>): Plugin {
  let contentRoot = ''
  let chapterBodies = new Map<string, string>()
  return {
    name: 'manuscript-library',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID
      if (id.startsWith(CHAPTER_VIRTUAL_PREFIX)) return `\0${id}`
      return undefined
    },
    load(id) {
      if (id.startsWith(RESOLVED_CHAPTER_PREFIX)) {
        const chapterId = decodeURIComponent(id.slice(RESOLVED_CHAPTER_PREFIX.length))
        const body = chapterBodies.get(chapterId)
        if (body === undefined) throw new Error(`[manuscript-reader] Unknown chapter body ${chapterId}.`)
        return `export default ${JSON.stringify(body)}`
      }
      if (id !== RESOLVED_VIRTUAL_ID) return undefined
      const sourceLibrary = loadLibrary({
        projectRoot: process.cwd(),
        contentRoot: environment.MANUSCRIPT_CONTENT_ROOT,
        githubRepository: environment.MANUSCRIPT_GITHUB_REPOSITORY,
        githubBranch: environment.MANUSCRIPT_GITHUB_BRANCH,
      })
      const split = splitChapterBodies(sourceLibrary)
      const library = split.library
      chapterBodies = split.chapterBodies
      contentRoot = library.contentRoot
      this.addWatchFile(resolve(contentRoot, 'beta-bot.yaml'))
      for (const entity of [...library.books, ...library.parts, ...library.chapters, ...library.wikiPages]) {
        this.addWatchFile(resolve(contentRoot, entity.sourcePath))
      }
      const loaders = library.chapters.map((chapter) =>
        `${JSON.stringify(chapter.id)}: () => import(${JSON.stringify(`${CHAPTER_VIRTUAL_PREFIX}${encodeURIComponent(chapter.id)}`)}).then((module) => module.default)`,
      ).join(',\n')
      return `
        export default ${JSON.stringify(library)}
        const chapterLoaders = {${loaders}}
        export function loadChapterBody(chapterId) {
          const loader = chapterLoaders[chapterId]
          if (!loader) return Promise.reject(new Error(\`Unknown chapter body \${chapterId}.\`))
          return loader()
        }
      `
    },
    handleHotUpdate(context) {
      if (contentRoot && context.file.startsWith(contentRoot)) {
        const virtualModules = [
          context.server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID),
          ...[...chapterBodies.keys()].map((chapterId) =>
            context.server.moduleGraph.getModuleById(`${RESOLVED_CHAPTER_PREFIX}${encodeURIComponent(chapterId)}`),
          ),
        ]
        for (const module of virtualModules) {
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
  return {
    plugins: [manuscriptLibraryPlugin(environment), vue()],
    resolve: { alias: { '@': resolve(import.meta.dirname, 'src') } },
    build: { sourcemap: false },
  }
})
