import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useDocsStore } from '@/stores/useDocsTree'

/**
 * Composable for navigating and finding current doc/chapter/page from route params
 * @returns {{
 *   currentDoc: import('vue').ComputedRef<any>,
 *   currentChapter: import('vue').ComputedRef<any>,
 *   currentPage: import('vue').ComputedRef<any>,
 *   markdownSrc: import('vue').ComputedRef<string | null>
 * }}
 */
export function useDocNavigation() {
  const route = useRoute()
  const docsStore = useDocsStore()

  const currentDoc = computed(() => {
    const tree = docsStore.tree
    if (!tree?.docs?.length) return null
    return tree.docs.find((d) => String(d.id) === String(route.params.section)) ?? null
  })

  const currentChapter = computed(() => {
    if (!currentDoc.value) return null
    return (
      currentDoc.value.chapters?.find(
        (c) => String(c.id) === String(route.params.chapter)
      ) ?? null
    )
  })

  const currentPage = computed(() => {
    if (!currentChapter.value) return null
    return (
      currentChapter.value.pages?.find(
        (p) => String(p.id) === String(route.params.page)
      ) ?? null
    )
  })

  const markdownSrc = computed(() => {
    if (!currentPage.value) return null
    const path = currentPage.value.path
      .split('/')
      .map((seg) => encodeURIComponent(seg))
      .join('/')
    return `${import.meta.env.BASE_URL}/docs/${path}`
  })

  return {
    currentDoc,
    currentChapter,
    currentPage,
    markdownSrc,
  }
}

