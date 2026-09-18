<script setup lang="ts">
import { computed } from 'vue'
import LibraryImage from '@/components/LibraryImage.vue'
import { useCurrentLibrary } from '@/composables/useLibrary'
import type { ManuscriptPart } from '@/content/types'

const { book, parts, chapters, library } = useCurrentLibrary()
const firstChapter = computed(() => chapters.value[0])
const resumeChapter = computed(() => {
  if (!book.value) return firstChapter.value
  const id = localStorage.getItem(`manuscript-reader:last:${book.value.id}`)
  return chapters.value.find((chapter) => chapter.id === id) || firstChapter.value
})
const wordCount = computed(() => chapters.value.reduce((total, chapter) => total + chapter.word_count, 0))
const cover = computed(() => library.assets.find((asset) => asset.id === book.value?.cover_image_id) ?? null)
const wikiCount = computed(() => library.wikiPages.filter((page) => page.book_id === book.value?.id).length)

function partCover(part: ManuscriptPart) {
  return library.assets.find((asset) => asset.id === part.cover_image_id) ?? null
}
</script>

<template>
  <section v-if="book" class="book-landing" :class="{ 'book-with-cover': cover }">
    <div class="book-landing-copy">
      <p class="eyebrow">Private manuscript</p>
      <h1>{{ book.title }}</h1>
      <p class="book-stats">{{ parts.length }} parts · {{ chapters.length }} chapters · {{ wordCount.toLocaleString() }} words</p>
      <p class="book-intro">A quiet reading copy built directly from the Beta Bot library workspace.</p>
      <div class="book-actions">
        <RouterLink v-if="resumeChapter" class="primary-action" :to="`/books/${book.id}/chapters/${resumeChapter.id}`">
          {{ resumeChapter.id === firstChapter?.id ? 'Begin reading' : 'Continue reading' }} <span>→</span>
        </RouterLink>
        <RouterLink class="secondary-action" :to="`/books/${book.id}/wiki`">Browse {{ wikiCount }} world guide entries</RouterLink>
      </div>
    </div>
    <div v-if="cover" class="book-cover">
      <LibraryImage :asset="cover" :alt="cover.notes || `${book.title} cover`" loading="eager" />
      <small>Cover illustration</small>
    </div>
    <div class="part-grid">
      <article v-for="part in parts" :key="part.id" :class="{ 'has-part-cover': partCover(part) }">
        <LibraryImage v-if="partCover(part)" :asset="partCover(part)" :alt="partCover(part)?.notes || `${part.name} cover`" />
        <div>
          <p>{{ chapters.filter((chapter) => chapter.part_id === part.id).length }} chapters</p>
          <h2>{{ part.name }}</h2>
          <RouterLink v-if="chapters.find((chapter) => chapter.part_id === part.id)" :to="`/books/${book.id}/chapters/${chapters.find((chapter) => chapter.part_id === part.id)?.id}`">Read part →</RouterLink>
        </div>
      </article>
    </div>
  </section>
  <section v-else class="empty-state"><h1>Book not found</h1><RouterLink to="/">Return to the library</RouterLink></section>
</template>
