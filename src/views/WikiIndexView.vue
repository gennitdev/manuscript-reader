<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCurrentLibrary } from '@/composables/useLibrary'

const { book, library } = useCurrentLibrary()
const query = ref('')
const pages = computed(() => {
  if (!book.value) return []
  const needle = query.value.trim().toLocaleLowerCase()
  return library.wikiPages
    .filter((page) => page.book_id === book.value?.id)
    .filter((page) => !needle || `${page.page_name} ${page.summary} ${page.aliases.join(' ')} ${page.tags.join(' ')}`.toLocaleLowerCase().includes(needle))
    .sort((left, right) => left.page_name.localeCompare(right.page_name))
})
</script>

<template>
  <section v-if="book" class="wiki-index-page">
    <header class="reference-header">
      <p class="eyebrow">{{ book.title }}</p>
      <h1>World guide</h1>
      <p>Characters, places, concepts, and continuity notes connected to this manuscript.</p>
      <label class="reference-search">
        <span class="sr-only">Filter world guide</span>
        <input v-model="query" type="search" placeholder="Filter the world guide…" />
      </label>
    </header>
    <div class="wiki-card-grid">
      <RouterLink v-for="page in pages" :key="page.id" :to="`/books/${book.id}/wiki/${page.id}`" class="wiki-card">
        <span>{{ page.page_type }}</span>
        <h2>{{ page.page_name }}</h2>
        <p>{{ page.summary || 'Open this entry to read more.' }}</p>
        <small v-if="page.aliases.length">Also known as {{ page.aliases.join(', ') }}</small>
      </RouterLink>
    </div>
    <p v-if="!pages.length" class="no-results">No wiki pages match “{{ query }}”.</p>
  </section>
</template>
