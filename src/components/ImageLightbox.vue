<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import LibraryImage from '@/components/LibraryImage.vue'
import type { ManuscriptAsset } from '@/content/types'

const props = defineProps<{ images: ManuscriptAsset[]; index: number; open: boolean }>()
const emit = defineEmits<{ close: []; 'update:index': [value: number] }>()

function move(offset: number) {
  if (!props.images.length) return
  emit('update:index', (props.index + offset + props.images.length) % props.images.length)
}

function handleKeydown(event: KeyboardEvent) {
  if (!props.open) return
  if (event.key === 'Escape') emit('close')
  if (event.key === 'ArrowLeft') move(-1)
  if (event.key === 'ArrowRight') move(1)
}

watch(() => props.open, (open) => {
  document.body.classList.toggle('lightbox-open', open)
  if (open) window.addEventListener('keydown', handleKeydown)
  else window.removeEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.body.classList.remove('lightbox-open')
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open && images[index]" class="lightbox" role="dialog" aria-modal="true" aria-label="Image viewer" @click.self="emit('close')">
      <button class="lightbox-close" type="button" aria-label="Close image viewer" @click="emit('close')">×</button>
      <button v-if="images.length > 1" class="lightbox-arrow lightbox-previous" type="button" aria-label="Previous image" @click="move(-1)">←</button>
      <figure>
        <LibraryImage :asset="images[index]" :alt="images[index]?.notes || images[index]?.file_name || 'Manuscript image'" loading="eager" />
        <figcaption>
          <p>{{ images[index]?.notes || images[index]?.file_name }}</p>
          <small v-if="images.length > 1">{{ index + 1 }} of {{ images.length }}</small>
        </figcaption>
      </figure>
      <button v-if="images.length > 1" class="lightbox-arrow lightbox-next" type="button" aria-label="Next image" @click="move(1)">→</button>
    </div>
  </Teleport>
</template>
