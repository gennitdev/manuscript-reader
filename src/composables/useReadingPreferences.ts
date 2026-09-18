import { ref, watch } from 'vue'

export type ReadingSize = 'small' | 'medium' | 'large' | 'extra-large'
export type ReadingFont = 'literata' | 'atkinson' | 'system'

const storedSize = localStorage.getItem('manuscript-reader:size') as ReadingSize | null
const storedFont = localStorage.getItem('manuscript-reader:font') as ReadingFont | null
const size = ref<ReadingSize>(storedSize || 'medium')
const font = ref<ReadingFont>(storedFont || 'literata')

watch(size, (value) => localStorage.setItem('manuscript-reader:size', value))
watch(font, (value) => localStorage.setItem('manuscript-reader:font', value))

export function useReadingPreferences() {
  return { size, font }
}
