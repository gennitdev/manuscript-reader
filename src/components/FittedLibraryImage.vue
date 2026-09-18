<script setup lang="ts">
import LibraryImage from '@/components/LibraryImage.vue'
import type { ManuscriptAsset } from '@/content/types'

withDefaults(defineProps<{
  asset: ManuscriptAsset
  alt: string
  loading?: 'eager' | 'lazy'
  aspectRatio?: string
  fill?: boolean
  framed?: boolean
}>(), {
  loading: 'lazy',
  aspectRatio: undefined,
  fill: false,
  framed: false,
})
</script>

<template>
  <span
    class="fitted-library-image"
    :class="{ 'fitted-library-image-fill': fill, 'fitted-library-image-framed': framed }"
    :style="aspectRatio ? { aspectRatio } : undefined"
  >
    <LibraryImage
      v-if="asset.has_bytes"
      class="fitted-library-image-backdrop"
      :asset="asset"
      alt=""
      :loading="loading"
      aria-hidden="true"
    />
    <span v-if="asset.has_bytes" class="fitted-library-image-shade" aria-hidden="true"></span>
    <LibraryImage class="fitted-library-image-foreground" :asset="asset" :alt="alt" :loading="loading" />
  </span>
</template>

<style scoped>
.fitted-library-image {
  position: relative;
  display: block;
  overflow: hidden;
  width: 100%;
  background: #172019;
  isolation: isolate;
}

.fitted-library-image-fill {
  position: absolute;
  inset: 0;
  height: 100%;
}

.fitted-library-image-framed {
  border-radius: 6px;
  box-shadow: 0 15px 40px rgba(40, 45, 39, .12);
}

.fitted-library-image-backdrop,
.fitted-library-image-foreground {
  display: block;
  width: 100%;
  height: 100%;
}

.fitted-library-image-backdrop {
  position: absolute;
  inset: -8%;
  width: 116%;
  height: 116%;
  object-fit: cover;
  filter: blur(24px) brightness(.48) saturate(.85);
  transform: scale(1.08);
}

.fitted-library-image-shade {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: rgba(7, 12, 9, .2);
}

.fitted-library-image-foreground {
  position: relative;
  z-index: 2;
  object-fit: contain;
}

.fitted-library-image :deep(.image-placeholder) {
  width: 100%;
  height: 100%;
  min-height: 220px;
}

@media (max-width: 680px) {
  .fitted-library-image-backdrop {
    filter: blur(18px) brightness(.48) saturate(.85);
  }
}
</style>
