import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useDocsStore } from './docstree'

export const useSearchStore = defineStore('search', () => {
  // State
  const isOpen = ref(false)
  const query = ref('')
  const results = ref([])
  const loading = ref(false)
  const searchIndex = ref([])
  const selectedIndex = ref(0)

  // Build search index from documentation data
  async function buildIndex() {
    const docs = useDocsStore()

    // Wait for docs to load if not already
    if (!docs.tree && !docs.loading) {
      await docs.load()
    }

    const index = []

    // Index tutorial docs
    for (const doc of docs.tutorialDocs) {
      for (const chapter of doc.chapters || []) {
        for (const page of chapter.pages || []) {
          if (page.path) {
            index.push({
              id: `${doc.id}-${chapter.id}-${page.id}`,
              title: page.title,
              section: doc.title,
              chapter: chapter.title,
              path: `/docs/${doc.id}/${chapter.id}/${page.id}`,
              type: 'tutorial',
              rawPath: page.path
            })
          }
        }
      }
    }

    // Index folder docs
    for (const doc of docs.folderDocs) {
      for (const category of doc.categories || []) {
        // Add category as searchable
        index.push({
          id: `${doc.id}-${category.id}`,
          title: category.title,
          section: doc.title,
          chapter: null,
          path: `/docs/${doc.id}/${category.id}`,
          type: 'folder-category'
        })

        for (const sub of category.subcategories || []) {
          index.push({
            id: `${doc.id}-${category.id}-${sub.id}`,
            title: sub.title,
            section: doc.title,
            chapter: category.title,
            path: `/docs/${doc.id}/${category.id}/${sub.id}`,
            type: 'folder-subcategory'
          })
        }
      }
    }

    searchIndex.value = index
  }

  // Perform search
  function search(searchQuery) {
    query.value = searchQuery
    selectedIndex.value = 0

    if (!searchQuery || searchQuery.length < 2) {
      results.value = []
      return
    }

    const q = searchQuery.toLowerCase().trim()
    const words = q.split(/\s+/)

    // Score and filter results
    const scored = searchIndex.value
      .map(item => {
        let score = 0
        const titleLower = item.title.toLowerCase()
        const sectionLower = item.section.toLowerCase()
        const chapterLower = (item.chapter || '').toLowerCase()

        // Exact title match gets highest score
        if (titleLower === q) {
          score += 100
        } else if (titleLower.startsWith(q)) {
          score += 50
        } else if (titleLower.includes(q)) {
          score += 30
        }

        // Word matching
        for (const word of words) {
          if (titleLower.includes(word)) score += 20
          if (sectionLower.includes(word)) score += 5
          if (chapterLower.includes(word)) score += 10
        }

        return { ...item, score }
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 15)

    results.value = scored
  }

  // Navigation
  function selectNext() {
    if (selectedIndex.value < results.value.length - 1) {
      selectedIndex.value++
    }
  }

  function selectPrev() {
    if (selectedIndex.value > 0) {
      selectedIndex.value--
    }
  }

  function getSelectedResult() {
    return results.value[selectedIndex.value] || null
  }

  // Modal control
  function open() {
    isOpen.value = true
    query.value = ''
    results.value = []
    selectedIndex.value = 0

    // Build index if not already built
    if (searchIndex.value.length === 0) {
      buildIndex()
    }
  }

  function close() {
    isOpen.value = false
    query.value = ''
    results.value = []
  }

  // Computed
  const hasResults = computed(() => results.value.length > 0)
  const showNoResults = computed(() => query.value.length >= 2 && !hasResults.value)

  return {
    // State
    isOpen,
    query,
    results,
    loading,
    selectedIndex,

    // Computed
    hasResults,
    showNoResults,

    // Actions
    buildIndex,
    search,
    selectNext,
    selectPrev,
    getSelectedResult,
    open,
    close
  }
})
