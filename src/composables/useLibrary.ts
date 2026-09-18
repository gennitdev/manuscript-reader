import { computed } from 'vue'
import { useRoute } from 'vue-router'
import library from 'virtual:manuscript-library'

export function orderedChapters(bookId: string) {
  const book = library.books.find((value) => value.id === bookId)
  if (!book) return []
  const byId = new Map(library.chapters.map((chapter) => [chapter.id, chapter]))
  return book.chapter_order.flatMap((id) => {
    const chapter = byId.get(id)
    return chapter ? [chapter] : []
  })
}

export function editUrl(sourcePath: string): string | null {
  return library.githubEditBaseUrl ? `${library.githubEditBaseUrl}${sourcePath.split('/').map(encodeURIComponent).join('/')}` : null
}

export function useCurrentLibrary() {
  const route = useRoute()
  const book = computed(() => library.books.find((value) => value.id === route.params.bookId) ?? null)
  const chapter = computed(() => library.chapters.find((value) => value.id === route.params.chapterId && value.book_id === book.value?.id) ?? null)
  const parts = computed(() => {
    if (!book.value) return []
    const order = new Map(book.value.part_order.map((id, index) => [id, index]))
    return library.parts
      .filter((value) => value.book_id === book.value?.id)
      .sort((left, right) => (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(right.id) ?? Number.MAX_SAFE_INTEGER))
  })
  const chapters = computed(() => book.value ? orderedChapters(book.value.id) : [])
  return { library, book, chapter, parts, chapters }
}
