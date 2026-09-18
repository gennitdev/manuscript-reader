import { createRouter, createWebHistory } from 'vue-router'
import library from 'virtual:manuscript-library'

const defaultBook = library.books.reduce<(typeof library.books)[number] | undefined>((largest, book) => {
  const count = library.chapters.filter((chapter) => chapter.book_id === book.id).length
  const largestCount = largest ? library.chapters.filter((chapter) => chapter.book_id === largest.id).length : -1
  return count > largestCount ? book : largest
}, undefined)

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: defaultBook ? `/books/${defaultBook.id}` : '/empty' },
    { path: '/empty', component: () => import('./views/EmptyView.vue') },
    { path: '/books/:bookId', component: () => import('./views/BookView.vue') },
    { path: '/books/:bookId/chapters/:chapterId', component: () => import('./views/ChapterView.vue') },
    { path: '/books/:bookId/wiki', component: () => import('./views/WikiIndexView.vue') },
    { path: '/books/:bookId/wiki/:wikiPageId', component: () => import('./views/WikiPageView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.fullPath !== from.fullPath) return { top: 0 }
    return false
  },
})

router.afterEach((to) => {
  const book = library.books.find((value) => value.id === to.params.bookId)
  const chapter = library.chapters.find((value) => value.id === to.params.chapterId)
  const wikiPage = library.wikiPages.find((value) => value.id === to.params.wikiPageId)
  document.title = chapter
    ? `${chapter.title || 'Untitled'} · ${book?.title || 'Manuscript'}`
    : wikiPage
      ? `${wikiPage.page_name} · ${book?.title || 'World guide'}`
      : book?.title || 'Manuscript Reader'
  if (chapter) localStorage.setItem(`manuscript-reader:last:${chapter.book_id}`, chapter.id)
})

export default router
