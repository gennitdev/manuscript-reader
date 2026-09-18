<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { orderedChapters } from '@/composables/useLibrary'
import library from 'virtual:manuscript-library'

const props = defineProps<{ open: boolean; activeBookId: string | null }>()
const emit = defineEmits<{ close: [] }>()
const route = useRoute()
const query = ref('')
const choosingBook = ref(false)

const activeBook = computed(() => library.books.find((book) => book.id === props.activeBookId) ?? library.books[0] ?? null)

const groups = computed(() => {
  const book = activeBook.value
  if (!book) return []
  const needle = query.value.trim().toLocaleLowerCase()
  const parts = new Map(library.parts.filter((part) => part.book_id === book.id).map((part) => [part.id, part]))
  const grouped = new Map<string, { id: string; name: string; chapters: ReturnType<typeof orderedChapters> }>()
  for (const chapter of orderedChapters(book.id)) {
    if (needle && !(chapter.title || 'Untitled').toLocaleLowerCase().includes(needle)) continue
    const part = chapter.part_id ? parts.get(chapter.part_id) : undefined
    const key = part?.id || chapter.part_id || 'unassigned'
    const fallbackName = chapter.part_id ? 'Missing part metadata' : 'Unassigned'
    const group = grouped.get(key) || { id: key, name: part?.name || fallbackName, chapters: [] }
    group.chapters.push(chapter)
    grouped.set(key, group)
  }
  return [...grouped.values()]
})

function selectBook() {
  choosingBook.value = false
  query.value = ''
  emit('close')
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
        <RouterLink
          v-for="book in library.books"
          :key="book.id"
          :to="`/books/${book.id}`"
          :class="{ active: book.id === activeBook?.id }"
          @click="selectBook"
        >
          <strong>{{ book.title }}</strong>
          <span>{{ orderedChapters(book.id).length }} chapters</span>
        </RouterLink>
      </nav>
    </div>
    <label class="search">
      <span class="sr-only">Filter chapters</span>
      <input v-model="query" type="search" placeholder="Find a chapter…" />
    </label>
    <nav class="contents" aria-label="Manuscript contents">
      <section v-if="activeBook" class="book-group">
        <RouterLink :to="`/books/${activeBook.id}`" class="book-title" @click="emit('close')">{{ activeBook.title }}</RouterLink>
        <details v-for="group in groups" :key="group.id" :open="Boolean(query) || group.chapters.some((chapter) => chapter.id === route.params.chapterId)">
          <summary>{{ group.name }} <span>{{ group.chapters.length }}</span></summary>
          <RouterLink
            v-for="chapter in group.chapters"
            :key="chapter.id"
            :to="`/books/${activeBook.id}/chapters/${chapter.id}`"
            class="chapter-link"
            @click="emit('close')"
          >{{ chapter.title || 'Untitled' }}</RouterLink>
        </details>
      </section>
    </nav>
  </aside>
  <button v-if="open" class="scrim" type="button" aria-label="Close contents" @click="emit('close')"></button>
</template>
