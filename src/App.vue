<script setup lang="ts">
import { ref } from 'vue'
import { RouterView } from 'vue-router'
import LibrarySidebar from '@/components/LibrarySidebar.vue'

const sidebarOpen = ref(false)
</script>

<template>
  <div class="app-shell">
    <LibrarySidebar :open="sidebarOpen" @close="sidebarOpen = false" />
    <main class="main-shell">
      <button class="mobile-menu" type="button" @click="sidebarOpen = true"><span>☰</span> Contents</button>
      <RouterView />
    </main>
  </div>
</template>
