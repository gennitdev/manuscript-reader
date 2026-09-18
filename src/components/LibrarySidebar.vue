<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { loadSearchIndex } from 'virtual:manuscript-library'
import { orderedChapters } from '@/composables/useLibrary'
import type { ManuscriptSearchRecord } from '@/content/types'
import library from 'virtual:manuscript-library'

const props = defineProps<{ open: boolean; activeBookId: string | null }>()
const emit = defineEmits<{ close: [] }>()
const route = useRoute()
const query = ref('')
const choosingBook = ref(false)
const searching = ref(false)
const searchError = ref('')
const searchResults = ref<(ManuscriptSearchRecord & { excerpt: string })[]>([])
const indexes = new Map<string, Promise<ManuscriptSearchRecord[]>>()

const activeBook = computed(() => library.books.find((book) => book.id === props.activeBookId) ?? library.books[0] ?? null)
const wikiCount = computed(() => library.wikiPages.filter((page) => page.book_id === activeBook.value?.id).length)

const groups = computed(() => {
  const book = activeBook.value
  if (!book) return []
  const parts = new Map(library.parts.filter((part) => part.book_id === book.id).map((part) => [part.id, part]))
  const grouped = new Map<string, { id: string; name: string; chapters: ReturnType<typeof orderedChapters> }>()
  for (const chapter of orderedChapters(book.id)) {
    const part = chapter.part_id ? parts.get(chapter.part_id) : undefined
    const key = part?.id || chapter.part_id || 'unassigned'
    const fallbackName = chapter.part_id ? 'Missing part metadata' : 'Unassigned'
    const group = grouped.get(key) || { id: key, name: part?.name || fallbackName, chapters: [] }
    group.chapters.push(chapter)
    grouped.set(key, group)
  }
  return [...grouped.values()]
})

function plainText(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_>#~|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function excerpt(body: string, needle: string): string {
  const text = plainText(body)
  const position = text.toLocaleLowerCase().indexOf(needle)
  const start = Math.max(0, position < 0 ? 0 : position - 72)
  const end = Math.min(text.length, start + 190)
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`
}

watch([query, () => activeBook.value?.id], ([value, bookId], _old, onCleanup) => {
  const needle = value.trim().toLocaleLowerCase()
  let cancelled = false
  let timer: ReturnType<typeof setTimeout> | undefined
  onCleanup(() => { cancelled = true; if (timer) clearTimeout(timer) })
  searchResults.value = []
  searchError.value = ''
  if (!bookId || needle.length < 2) {
    searching.value = false
    return
  }
  searching.value = true
  timer = setTimeout(async () => {
    try {
      const promise = indexes.get(bookId) || loadSearchIndex(bookId)
      indexes.set(bookId, promise)
      const records = await promise
      if (cancelled) return
      searchResults.value = records
        .map((record) => {
          const title = record.title.toLocaleLowerCase()
          const body = record.body.toLocaleLowerCase()
          const titlePosition = title.indexOf(needle)
          const bodyPosition = body.indexOf(needle)
          const score = title === needle ? 0 : titlePosition === 0 ? 1 : titlePosition > -1 ? 2 : bodyPosition > -1 ? 3 : 99
          return { ...record, score, excerpt: excerpt(record.body, needle) }
        })
        .filter((record) => record.score < 99)
        .sort((left, right) => left.score - right.score || left.title.localeCompare(right.title))
        .slice(0, 40)
    } catch (error) {
      if (!cancelled) searchError.value = error instanceof Error ? error.message : 'Search could not be loaded.'
    } finally {
      if (!cancelled) searching.value = false
    }
  }, 180)
})

function destination(record: ManuscriptSearchRecord): string {
  return record.kind === 'chapter'
    ? `/books/${activeBook.value?.id}/chapters/${record.id}`
    : `/books/${activeBook.value?.id}/wiki/${record.id}`
}

function closeAndClear() {
  query.value = ''
  emit('close')
}

function selectBook() {
  choosingBook.value = false
  closeAndClear()
}
</script>

<template>
  <aside class="sidebar" :class="{ open }">
    <div class="sidebar-heading">
      <button class="book-switcher-trigger" type="button" aria-label="Switch manuscript" @click="choosingBook = true">☰</button>
      <RouterLink :to="activeBook ? `/books/${activeBook.id}` : '/'" class="brand" @click="emit('close')">
        <span class="brand-mark">MR</span>
        <span><strong>Manuscript</strong><small>reader</small></span>
      </RouterLink>
      <button class="sidebar-close" type="button" aria-label="Close contents" @click="emit('close')">×</button>
    </div>
    <div v-if="choosingBook" class="book-switcher">
      <div class="book-switcher-heading">
        <div><small>Library</small><h2>Choose a manuscript</h2></div>
        <button type="button" aria-label="Close manuscript switcher" @click="choosingBook = false">×</button>
      </div>
      <nav aria-label="Choose a manuscript">
        <RouterLink v-for="book in library.books" :key="book.id" :to="`/books/${book.id}`" :class="{ active: book.id === activeBook?.id }" @click="selectBook">
          <strong>{{ book.title }}</strong><span>{{ orderedChapters(book.id).length }} chapters</span>
        </RouterLink>
      </nav>
    </div>
    <label class="search">
      <span class="sr-only">Search manuscript and world guide</span>
      <span aria-hidden="true" class="search-icon">⌕</span>
      <input v-model="query" type="search" placeholder="Search this manuscript…" />
      <button v-if="query" type="button" aria-label="Clear search" @click="query = ''">×</button>
    </label>
    <div v-if="query" class="search-results" aria-live="polite">
      <p v-if="query.trim().length < 2" class="search-guidance">Type at least two characters.</p>
      <p v-else-if="searching" class="search-guidance">Searching the manuscript…</p>
      <p v-else-if="searchError" class="search-guidance search-error">{{ searchError }}</p>
      <p v-else-if="!searchResults.length" class="search-guidance">No matches for “{{ query }}”.</p>
      <nav v-else aria-label="Search results">
        <RouterLink v-for="result in searchResults" :key="`${result.kind}:${result.id}`" :to="destination(result)" @click="closeAndClear">
          <span>{{ result.kind === 'wiki' ? result.subtitle : 'Chapter' }}</span>
          <strong>{{ result.title }}</strong>
          <small>{{ result.excerpt }}</small>
        </RouterLink>
      </nav>
    </div>
    <nav v-else class="contents" aria-label="Manuscript contents">
      <section v-if="activeBook" class="book-group">
        <RouterLink :to="`/books/${activeBook.id}`" class="book-title" @click="emit('close')">{{ activeBook.title }}</RouterLink>
        <RouterLink :to="`/books/${activeBook.id}/wiki`" class="world-guide-link" @click="emit('close')"><span>World guide</span><small>{{ wikiCount }} entries</small></RouterLink>
        <details v-for="group in groups" :key="group.id" :open="group.chapters.some((chapter) => chapter.id === route.params.chapterId)">
          <summary>{{ group.name }} <span>{{ group.chapters.length }}</span></summary>
          <RouterLink v-for="chapter in group.chapters" :key="chapter.id" :to="`/books/${activeBook.id}/chapters/${chapter.id}`" class="chapter-link" @click="emit('close')">{{ chapter.title || 'Untitled' }}</RouterLink>
        </details>
      </section>
    </nav>
  </aside>
  <button v-if="open" class="scrim" type="button" aria-label="Close contents" @click="emit('close')"></button>
</template>
