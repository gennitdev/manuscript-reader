<script setup lang="ts">
import type { ReadingFont, ReadingSize } from '@/composables/useReadingPreferences'

defineProps<{ size: ReadingSize; font: ReadingFont }>()
const emit = defineEmits<{
  'update:size': [value: ReadingSize]
  'update:font': [value: ReadingFont]
}>()

const sizes: { value: ReadingSize; label: string }[] = [
  { value: 'small', label: 'A' },
  { value: 'medium', label: 'A' },
  { value: 'large', label: 'A' },
  { value: 'extra-large', label: 'A' },
]
</script>

<template>
  <div class="reader-settings" aria-label="Reading preferences">
    <div class="size-options">
      <button
        v-for="(option, index) in sizes"
        :key="option.value"
        type="button"
        :class="{ active: size === option.value }"
        :style="{ fontSize: `${0.72 + index * 0.15}rem` }"
        :aria-pressed="size === option.value"
        :aria-label="`${option.value} text`"
        @click="emit('update:size', option.value)"
      >{{ option.label }}</button>
    </div>
    <select :value="font" aria-label="Reading font" @change="emit('update:font', ($event.target as HTMLSelectElement).value as ReadingFont)">
      <option value="literata">Literata</option>
      <option value="atkinson">Atkinson</option>
      <option value="system">System</option>
    </select>
  </div>
</template>
