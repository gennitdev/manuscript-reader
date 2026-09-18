<script setup lang="ts">
import { ref } from 'vue'
import ImageLightbox from '@/components/ImageLightbox.vue'
import LibraryImage from '@/components/LibraryImage.vue'
import type { ManuscriptAsset } from '@/content/types'

withDefaults(defineProps<{ images: ManuscriptAsset[]; title?: string }>(), { title: 'Image album' })
const open = ref(false)
const activeIndex = ref(0)

function show(index: number, hasBytes: boolean) {
  if (!hasBytes) return
  activeIndex.value = index
  open.value = true
}
</script>

<template>
  <section v-if="images.length" class="image-gallery" aria-labelledby="gallery-title">
    <div class="section-heading">
      <div><p class="eyebrow">Illustrations</p><h2 id="gallery-title">{{ title }}</h2></div>
      <span>{{ images.length }} {{ images.length === 1 ? 'image' : 'images' }}</span>
    </div>
    <div class="image-gallery-grid">
      <button
        v-for="(image, imageIndex) in images"
        :key="image.id"
        type="button"
        :disabled="!image.has_bytes"
        :aria-label="image.has_bytes ? `Open ${image.notes || image.file_name}` : `${image.file_name} is unavailable in this export`"
        @click="show(imageIndex, image.has_bytes)"
      >
        <LibraryImage :asset="image" :alt="image.notes || image.file_name" />
        <span class="gallery-caption">{{ image.notes || image.file_name }}</span>
      </button>
    </div>
    <ImageLightbox v-model:index="activeIndex" :images="images" :open="open" @close="open = false" />
  </section>
</template>
