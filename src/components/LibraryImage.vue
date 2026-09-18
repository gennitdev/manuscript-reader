<script setup lang="ts">
import { ref, watch } from 'vue'
import { loadAssetUrl } from 'virtual:manuscript-library'
import type { ManuscriptAsset } from '@/content/types'

const props = withDefaults(defineProps<{
  asset: ManuscriptAsset | null | undefined
  alt: string
  loading?: 'eager' | 'lazy'
  unavailableLabel?: string
}>(), {
  loading: 'lazy',
  unavailableLabel: 'Image available in a full export',
})

const url = ref('')
const failed = ref(false)
let requestNumber = 0

watch(() => props.asset?.id, async () => {
  const asset = props.asset
  const request = ++requestNumber
  url.value = ''
  failed.value = false
  if (!asset?.has_bytes) return
  try {
    const value = await loadAssetUrl(asset.id)
    if (request === requestNumber) url.value = value
  } catch {
    if (request === requestNumber) failed.value = true
  }
}, { immediate: true })
</script>

<template>
  <img v-if="url" :src="url" :alt="alt" :loading="loading" @error="failed = true; url = ''" />
  <span v-else class="image-placeholder" :class="{ 'image-placeholder-error': failed }" role="img" :aria-label="alt">
    <span aria-hidden="true">◇</span>
    <small>{{ failed ? 'Image could not be loaded' : unavailableLabel }}</small>
  </span>
</template>
