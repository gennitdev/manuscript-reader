<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { loadChapterBody } from 'virtual:manuscript-library'
import MarkdownContent from '@/components/MarkdownContent.vue'
import ReaderSettings from '@/components/ReaderSettings.vue'
import { editUrl, useCurrentLibrary } from '@/composables/useLibrary'
import { useReadingPreferences } from '@/composables/useReadingPreferences'

const { book, chapter, parts, chapters } = useCurrentLibrary()
const { size, font } = useReadingPreferences()
const index = computed(() => chapters.value.findIndex((value) => value.id === chapter.value?.id))
const previous = computed(() => index.value > 0 ? chapters.value[index.value - 1] : undefined)
const next = computed(() => index.value >= 0 ? chapters.value[index.value + 1] : undefined)
const part = computed(() => parts.value.find((value) => value.id === chapter.value?.part_id))
const words = computed(() => chapter.value?.word_count || 0)
const githubUrl = computed(() => chapter.value ? editUrl(chapter.value.sourcePath) : null)
const chapterBody = ref('')
const loadingBody = ref(false)
const bodyError = ref('')
let requestNumber = 0

async function loadBody() {
  const chapterId = chapter.value?.id
  const request = ++requestNumber
  chapterBody.value = ''
  bodyError.value = ''
  if (!chapterId) return
  loadingBody.value = true
  try {
    const body = await loadChapterBody(chapterId)
    if (request === requestNumber) chapterBody.value = body
  } catch (error) {
    if (request === requestNumber) bodyError.value = error instanceof Error ? error.message : 'The chapter could not be loaded.'
  } finally {
    if (request === requestNumber) loadingBody.value = false
  }
}

watch(() => chapter.value?.id, loadBody, { immediate: true })
</script>

<template>
  <article v-if="book && chapter" class="chapter-page" :class="[`text-${size}`, `font-${font}`]">
    <header class="reader-mobile-toolbar">
      <RouterLink :to="`/books/${book.id}`" class="book-back">← {{ book.title }}</RouterLink>
      <ReaderSettings v-model:size="size" v-model:font="font" />
    </header>
    <aside class="reader-desktop-rail" aria-label="Reader controls">
      <RouterLink :to="`/books/${book.id}`" class="rail-book-link"><span>←</span> Book overview</RouterLink>
      <ReaderSettings v-model:size="size" v-model:font="font" />
      <div class="rail-progress"><span>{{ index + 1 }}</span><small>of {{ chapters.length }}</small></div>
    </aside>
    <div class="chapter-paper">
      <header class="chapter-header">
        <p class="eyebrow">{{ part?.name || 'Unassigned' }} · Chapter {{ index + 1 }} of {{ chapters.length }}</p>
        <h1>{{ chapter.title || 'Untitled' }}</h1>
        <p class="chapter-meta">{{ words.toLocaleString() }} words · approximately {{ Math.max(1, Math.ceil(words / 240)) }} min read</p>
      </header>
      <div v-if="loadingBody" class="chapter-load-state" role="status">Opening chapter…</div>
      <div v-else-if="bodyError" class="chapter-load-state chapter-load-error" role="alert">
        <p>{{ bodyError }}</p>
        <button type="button" @click="loadBody">Try again</button>
      </div>
      <MarkdownContent v-else :text="chapterBody" />
      <footer class="chapter-footer">
        <p>Last updated {{ new Date(chapter.updated_at).toLocaleDateString(undefined, { dateStyle: 'long' }) }}</p>
        <a v-if="githubUrl" :href="githubUrl" target="_blank" rel="noreferrer">Edit this chapter on GitHub ↗</a>
        <span v-else :title="chapter.sourcePath">GitHub editing is not configured</span>
      </footer>
    </div>
    <nav class="chapter-navigation" aria-label="Chapter navigation">
      <RouterLink v-if="previous" :to="`/books/${book.id}/chapters/${previous.id}`" class="previous"><small>Previous</small><strong>← {{ previous.title || 'Untitled' }}</strong></RouterLink>
      <span v-else></span>
      <RouterLink v-if="next" :to="`/books/${book.id}/chapters/${next.id}`" class="next"><small>Next</small><strong>{{ next.title || 'Untitled' }} →</strong></RouterLink>
    </nav>
  </article>
  <section v-else class="empty-state"><h1>Chapter not found</h1><RouterLink to="/">Return to the library</RouterLink></section>
</template>
