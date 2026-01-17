import { defineAsyncComponent } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { useDocsStore } from '@/stores/docstree'

// Lazy load views
const HomeView = defineAsyncComponent(() =>
  import('@/views/HomeView.vue')
)
const TutorialDocsView = defineAsyncComponent(() =>
  import('@/views/TutorialDocsView.vue')
)
const FolderDocsView = defineAsyncComponent(() =>
  import('@/views/FolderDocsView.vue')
)

// Layouts
const DocumentLayout = defineAsyncComponent(() =>
  import('@/layouts/DocumentLayout.vue')
)
const MainLayout = defineAsyncComponent(() =>
  import('@/layouts/MainLayout.vue')
)

/**
 * Check if section uses tutorial layout
 */
function isTutorialDoc(sectionId) {
  const docs = useDocsStore()
  const doc = docs.getDocById(sectionId)
  return doc?.layout === 'tutorial'
}

/**
 * Get default page for tutorial docs
 */
function getDefaultTutorialPage(sectionId) {
  const docs = useDocsStore()
  const doc = docs.getDocById(sectionId)
  if (!doc || doc.layout !== 'tutorial') return null

  const firstChapter = doc.chapters?.[0]
  const firstPage = firstChapter?.pages?.[0]

  if (firstChapter && firstPage) {
    return {
      section: sectionId,
      chapter: firstChapter.id,
      page: firstPage.id
    }
  }
  return null
}

const routes = [
  // Home
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: {
      layout: MainLayout
    }
  },

  // Docs section redirect
  {
    path: '/docs/:section',
    name: 'docs-section',
    redirect: (to) => {
      const sectionId = to.params.section

      // Check if tutorial doc - redirect to first page
      if (isTutorialDoc(sectionId)) {
        const defaultPage = getDefaultTutorialPage(sectionId)
        if (defaultPage) {
          return {
            name: 'tutorial-page',
            params: defaultPage
          }
        }
      }

      // Folder doc - go to landing page
      return {
        name: 'folder-landing',
        params: { section: sectionId }
      }
    }
  },

  // Folder docs landing: /docs/:section/landing
  {
    path: '/docs/:section/landing',
    name: 'folder-landing',
    component: FolderDocsView,
    meta: {
      layout: DocumentLayout
    }
  },

  // Tutorial docs: /docs/:section/:chapter/:page (must come before catch-all)
  {
    path: '/docs/:section/:chapter/:page',
    name: 'tutorial-page',
    component: TutorialDocsView,
    meta: {
      layout: DocumentLayout
    },
    beforeEnter: (to, from, next) => {
      if (!isTutorialDoc(to.params.section)) {
        // Not a tutorial doc, redirect to folder view with path
        next({
          name: 'folder-path',
          params: {
            section: to.params.section,
            path: `${to.params.chapter}/${to.params.page}`
          }
        })
      } else {
        next()
      }
    }
  },

  // Folder docs with dynamic path (catch-all for 1+ segments after section)
  // This matches paths like /docs/project/smart-farm or /docs/project/smart-farm/yocto
  {
    path: '/docs/:section/:path+',
    name: 'folder-path',
    component: FolderDocsView,
    meta: {
      layout: DocumentLayout
    },
    beforeEnter: (to, from, next) => {
      // If this is a tutorial doc, redirect appropriately
      if (isTutorialDoc(to.params.section)) {
        // Parse path - it could be an array or string depending on Vue Router version
        const pathParts = Array.isArray(to.params.path)
          ? to.params.path
          : to.params.path.split('/').filter(Boolean)

        if (pathParts.length >= 2) {
          // Has chapter and page
          next({
            name: 'tutorial-page',
            params: {
              section: to.params.section,
              chapter: pathParts[0],
              page: pathParts[1]
            }
          })
        } else if (pathParts.length === 1) {
          // Has only chapter, redirect to first page
          const docs = useDocsStore()
          const doc = docs.getDocById(to.params.section)
          const chapter = doc?.chapters?.find(c => c.id === pathParts[0])
          const firstPage = chapter?.pages?.[0]
          if (firstPage) {
            next({
              name: 'tutorial-page',
              params: {
                section: to.params.section,
                chapter: pathParts[0],
                page: firstPage.id
              }
            })
          } else {
            next()
          }
        } else {
          next()
        }
      } else {
        // Folder doc - proceed with file explorer view
        next()
      }
    }
  }
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { left: 0, top: 0 }
  }
})

/**
 * Global guard to ensure docs are loaded
 */
router.beforeEach(async (to) => {
  const docs = useDocsStore()

  // Only wait if navigating to a /docs route
  if (to.path.startsWith('/docs')) {
    if (!docs.tree && !docs.loading) {
      await docs.load()
    } else if (docs.loading) {
      // Small helper to wait for existing loading process
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (!docs.loading) {
            clearInterval(check)
            resolve()
          }
        }, 50)
      })
    }
  }
})

export default router
