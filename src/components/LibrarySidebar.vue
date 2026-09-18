<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { orderedChapters } from '@/composables/useLibrary'
import library from 'virtual:manuscript-library'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()
const route = useRoute()
const query = ref('')

const rows = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase()
  const books = library.books.map((book) => {
    const parts = new Map(library.parts.filter((part) => part.book_id === book.id).map((part) => [part.id, part]))
    const groups = new Map<string, { id: string; name: string; chapters: ReturnType<typeof orderedChapters> }>()
    for (const chapter of orderedChapters(book.id)) {
      if (needle && !(chapter.title || 'Untitled').toLocaleLowerCase().includes(needle)) continue
      const part = chapter.part_id ? parts.get(chapter.part_id) : undefined
      const key = part?.id || chapter.part_id || 'unassigned'
      const fallbackName = chapter.part_id ? 'Missing part metadata' : 'Unassigned'
      const group = groups.get(key) || { id: key, name: part?.name || fallbackName, chapters: [] }
      group.chapters.push(chapter)
      groups.set(key, group)
    }
    return { book, groups: [...groups.values()] }
  })
  return books.filter(({ groups }) => groups.some(({ chapters }) => chapters.length))
})
</script>

<template>
  <aside class="sidebar" :class="{ open }">
    <div class="sidebar-heading">
      <RouterLink to="/" class="brand" @click="emit('close')">
        <span class="brand-mark">MR</span>
        <span><strong>Manuscript</strong><small>reader</small></span>
      </RouterLink>
      <button class="sidebar-close" type="button" aria-label="Close contents" @click="emit('close')">×</button>
    </div>
    <label class="search">
      <span class="sr-only">Filter chapters</span>
      <input v-model="query" type="search" placeholder="Find a chapter…" />
    </label>
    <nav class="contents" aria-label="Manuscript contents">
      <section v-for="entry in rows" :key="entry.book.id" class="book-group">
        <RouterLink :to="`/books/${entry.book.id}`" class="book-title" @click="emit('close')">{{ entry.book.title }}</RouterLink>
        <details v-for="group in entry.groups" :key="group.id" :open="Boolean(query) || group.chapters.some((chapter) => chapter.id === route.params.chapterId)">
          <summary>{{ group.name }} <span>{{ group.chapters.length }}</span></summary>
          <RouterLink
            v-for="chapter in group.chapters"
            :key="chapter.id"
            :to="`/books/${entry.book.id}/chapters/${chapter.id}`"
            class="chapter-link"
            @click="emit('close')"
          >{{ chapter.title || 'Untitled' }}</RouterLink>
        </details>
      </section>
    </nav>
  </aside>
  <button v-if="open" class="scrim" type="button" aria-label="Close contents" @click="emit('close')"></button>
</template>
