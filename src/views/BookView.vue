<script setup lang="ts">
import { computed } from 'vue'
import { useCurrentLibrary } from '@/composables/useLibrary'

const { book, parts, chapters } = useCurrentLibrary()
const firstChapter = computed(() => chapters.value[0])
const resumeChapter = computed(() => {
  if (!book.value) return firstChapter.value
  const id = localStorage.getItem(`manuscript-reader:last:${book.value.id}`)
  return chapters.value.find((chapter) => chapter.id === id) || firstChapter.value
})
const wordCount = computed(() => chapters.value.reduce((total, chapter) => total + chapter.word_count, 0))
</script>

<template>
  <section v-if="book" class="book-landing">
    <p class="eyebrow">Private manuscript</p>
    <h1>{{ book.title }}</h1>
    <p class="book-stats">{{ parts.length }} parts · {{ chapters.length }} chapters · {{ wordCount.toLocaleString() }} words</p>
    <p class="book-intro">A quiet reading copy built directly from the Beta Bot library workspace.</p>
    <RouterLink v-if="resumeChapter" class="primary-action" :to="`/books/${book.id}/chapters/${resumeChapter.id}`">
      {{ resumeChapter.id === firstChapter?.id ? 'Begin reading' : 'Continue reading' }}
      <span>→</span>
    </RouterLink>
    <div class="part-grid">
      <article v-for="part in parts" :key="part.id">
        <p>{{ chapters.filter((chapter) => chapter.part_id === part.id).length }} chapters</p>
        <h2>{{ part.name }}</h2>
        <RouterLink
          v-if="chapters.find((chapter) => chapter.part_id === part.id)"
          :to="`/books/${book.id}/chapters/${chapters.find((chapter) => chapter.part_id === part.id)?.id}`"
        >Read part →</RouterLink>
      </article>
    </div>
  </section>
  <section v-else class="empty-state"><h1>Book not found</h1><RouterLink to="/">Return to the library</RouterLink></section>
</template>
