<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterView } from 'vue-router'
import { useRoute } from 'vue-router'
import LibrarySidebar from '@/components/LibrarySidebar.vue'
import library from 'virtual:manuscript-library'

const sidebarOpen = ref(false)
const route = useRoute()
const activeBook = computed(() => library.books.find((book) => book.id === route.params.bookId) ?? library.books[0] ?? null)
</script>

<template>
  <div class="app-shell">
    <LibrarySidebar :open="sidebarOpen" :active-book-id="activeBook?.id || null" @close="sidebarOpen = false" />
    <main class="main-shell">
      <button class="mobile-menu" type="button" @click="sidebarOpen = true">
        <span aria-hidden="true">☰</span>
        <span>{{ activeBook?.title || 'Manuscripts' }}</span>
      </button>
      <RouterView />
    </main>
  </div>
</template>
