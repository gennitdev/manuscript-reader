import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { loadLibrary } from './src/content/loadLibrary.ts'

const VIRTUAL_ID = 'virtual:manuscript-library'
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_ID}`

function manuscriptLibraryPlugin(environment: Record<string, string>): Plugin {
  let contentRoot = ''
  return {
    name: 'manuscript-library',
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_VIRTUAL_ID : undefined
    },
    load(id) {
      if (id !== RESOLVED_VIRTUAL_ID) return undefined
      const library = loadLibrary({
        projectRoot: process.cwd(),
        contentRoot: environment.MANUSCRIPT_CONTENT_ROOT,
        githubRepository: environment.MANUSCRIPT_GITHUB_REPOSITORY,
        githubBranch: environment.MANUSCRIPT_GITHUB_BRANCH,
      })
      contentRoot = library.contentRoot
      this.addWatchFile(resolve(contentRoot, 'beta-bot.yaml'))
      for (const entity of [...library.books, ...library.parts, ...library.chapters, ...library.wikiPages]) {
        this.addWatchFile(resolve(contentRoot, entity.sourcePath))
      }
      return `export default ${JSON.stringify(library)}`
    },
    handleHotUpdate(context) {
      if (contentRoot && context.file.startsWith(contentRoot)) {
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
