<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import FittedLibraryImage from '@/components/FittedLibraryImage.vue'
import { useCurrentLibrary } from '@/composables/useLibrary'
import { filterWikiPages, selectWikiImage, wikiPageTypes, wikiTypeFilterLabel } from '@/content/wikiPresentation'
import type { ManuscriptWikiPage } from '@/content/types'

const { book, library } = useCurrentLibrary()
const query = ref('')
const selectedType = ref('all')
const bookPages = computed(() => library.wikiPages.filter((page) => page.book_id === book.value?.id))
const pageTypes = computed(() => wikiPageTypes(bookPages.value))
const imageByPageId = computed(() => {
  const images = new Map<string, (typeof library.assets)[number]>()
  for (const page of bookPages.value) {
    const image = selectWikiImage(page, library.assets)
    if (image) images.set(page.id, image)
  }
  return images
})
const pages = computed(() => filterWikiPages(bookPages.value, selectedType.value, query.value))

watch(() => book.value?.id, () => {
  query.value = ''
  selectedType.value = 'all'
})

function pageImage(page: ManuscriptWikiPage) {
  return imageByPageId.value.get(page.id) || null
}
</script>

<template>
  <section v-if="book" class="wiki-index-page">
    <header class="reference-header">
      <p class="eyebrow">{{ book.title }}</p>
      <h1>World guide</h1>
      <p>Characters, places, concepts, and continuity notes connected to this manuscript.</p>
      <div class="reference-controls">
        <label class="reference-search">
          <span class="sr-only">Search world guide</span>
          <input v-model="query" type="search" placeholder="Search the world guide…" />
        </label>
        <div class="reference-filters" role="group" aria-label="Filter world guide by type">
          <button type="button" :aria-pressed="selectedType === 'all'" @click="selectedType = 'all'">
            <span>All</span><small>{{ bookPages.length }}</small>
          </button>
          <button
            v-for="entry in pageTypes"
            :key="entry.type"
            type="button"
            :aria-pressed="selectedType === entry.type"
            @click="selectedType = entry.type"
          >
            <span>{{ wikiTypeFilterLabel(entry.type) }}</span><small>{{ entry.count }}</small>
          </button>
        </div>
      </div>
    </header>
    <div class="wiki-card-grid">
      <RouterLink
        v-for="page in pages"
        :key="page.id"
        :to="`/books/${book.id}/wiki/${page.id}`"
        class="wiki-card"
        :class="{ 'has-wiki-card-image': pageImage(page) }"
      >
        <FittedLibraryImage
          v-if="pageImage(page)"
          class="wiki-card-image"
          :asset="pageImage(page)!"
          :alt="pageImage(page)?.notes || page.page_name"
          aspect-ratio="4 / 3"
        />
        <div class="wiki-card-copy">
          <div class="wiki-card-meta">
            <span>{{ page.page_type }}</span>
            <span v-if="page.is_pinned" class="wiki-card-pinned" aria-label="Pinned entry">★ Pinned</span>
          </div>
          <h2>{{ page.page_name }}</h2>
          <p>{{ page.summary || 'Open this entry to read more.' }}</p>
          <small v-if="page.aliases.length">Also known as {{ page.aliases.join(', ') }}</small>
        </div>
      </RouterLink>
    </div>
    <p v-if="!pages.length" class="no-results">
      No {{ selectedType === 'all' ? 'wiki pages' : `${selectedType} pages` }} match{{ query ? ` “${query}”` : '' }}.
    </p>
  </section>
</template>
