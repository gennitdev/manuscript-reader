<script setup lang="ts">
import { computed } from 'vue'
import DOMPurify from 'dompurify'
import MarkdownIt from 'markdown-it'

const props = defineProps<{ text: string }>()
const markdown = new MarkdownIt({ html: false, linkify: true, typographer: true })
const rendered = computed(() => DOMPurify.sanitize(markdown.render(props.text)))
</script>

<template>
  <div class="manuscript-prose" v-html="rendered"></div>
</template>
