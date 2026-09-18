<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { loadWikiBody } from 'virtual:manuscript-library'
import ImageGallery from '@/components/ImageGallery.vue'
import LibraryImage from '@/components/LibraryImage.vue'
import MarkdownContent from '@/components/MarkdownContent.vue'
import { editUrl, useCurrentLibrary } from '@/composables/useLibrary'

const route = useRoute()
const { book, library } = useCurrentLibrary()
const page = computed(() => library.wikiPages.find((value) => value.id === route.params.wikiPageId && value.book_id === book.value?.id) ?? null)
const cover = computed(() => library.assets.find((asset) => asset.id === page.value?.cover_image_id) ?? null)
const images = computed(() => library.assets.filter((asset) => asset.book_id === book.value?.id && asset.wiki_page_ids.includes(page.value?.id || '') && asset.id !== cover.value?.id))
const chapters = computed(() => library.chapters.filter((chapter) => chapter.book_id === book.value?.id && chapter.wiki_mentions.some((mention) => mention.wiki_page_id === page.value?.id)))
const githubUrl = computed(() => page.value ? editUrl(page.value.sourcePath) : null)
const body = ref('')
const loading = ref(false)
const error = ref('')
let requestNumber = 0

async function loadBody() {
  const id = page.value?.id
  const request = ++requestNumber
  body.value = ''
  error.value = ''
  if (!id) return
  loading.value = true
  try {
    const value = await loadWikiBody(id)
    if (request === requestNumber) body.value = value
  } catch (reason) {
    if (request === requestNumber) error.value = reason instanceof Error ? reason.message : 'The wiki page could not be loaded.'
  } finally {
    if (request === requestNumber) loading.value = false
  }
}

watch(() => page.value?.id, loadBody, { immediate: true })
</script>

<template>
  <article v-if="book && page" class="wiki-page">
    <header class="wiki-hero" :class="{ 'has-cover': cover }">
      <div>
        <RouterLink :to="`/books/${book.id}/wiki`" class="reference-back">← World guide</RouterLink>
        <p class="eyebrow">{{ page.page_type }}</p>
        <h1>{{ page.page_name }}</h1>
        <p class="wiki-summary">{{ page.summary }}</p>
        <p v-if="page.aliases.length" class="wiki-aliases">Also known as {{ page.aliases.join(', ') }}</p>
      </div>
      <LibraryImage v-if="cover" :asset="cover" :alt="cover.notes || page.page_name" loading="eager" />
    </header>
    <div class="wiki-layout">
      <main class="wiki-paper">
        <div v-if="loading" class="chapter-load-state" role="status">Opening entry…</div>
        <div v-else-if="error" class="chapter-load-state chapter-load-error" role="alert"><p>{{ error }}</p><button type="button" @click="loadBody">Try again</button></div>
        <MarkdownContent v-else :text="body" />
        <ImageGallery :images="images" :title="`${page.page_name} gallery`" />
        <footer class="chapter-footer">
          <span>{{ page.tags.join(' · ') || 'World guide entry' }}</span>
          <a v-if="githubUrl" :href="githubUrl" target="_blank" rel="noreferrer">Edit this page on GitHub ↗</a>
        </footer>
      </main>
      <aside v-if="chapters.length" class="wiki-chapter-links">
        <p class="eyebrow">Appears in</p>
        <RouterLink v-for="chapter in chapters" :key="chapter.id" :to="`/books/${book.id}/chapters/${chapter.id}`">{{ chapter.title || 'Untitled' }} <span>→</span></RouterLink>
      </aside>
    </div>
  </article>
  <section v-else class="empty-state"><h1>Wiki page not found</h1><RouterLink to="/">Return to the library</RouterLink></section>
</template>
