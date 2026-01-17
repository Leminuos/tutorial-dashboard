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
const FileExplorerLanding = defineAsyncComponent(() =>
  import('@/views/FileExplorerLanding.vue')
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

  // File Explorer Landing
  {
    path: '/explorer',
    name: 'file-explorer',
    component: FileExplorerLanding,
    meta: {
      layout: MainLayout
    }
  },

  // Tutorial docs: /docs/:section/:chapter/:page
  {
    path: '/docs/:section/:chapter/:page',
    name: 'tutorial-page',
    component: TutorialDocsView,
    meta: {
      layout: DocumentLayout
    },
    beforeEnter: (to, from, next) => {
      // Ensure it is a tutorial doc
      if (!isTutorialDoc(to.params.section)) {
        // Redirect to folder view (root path) logic if accidentally hit
        next(`/${to.params.section}`)
      } else {
        next()
      }
    }
  },

  // Tutorial Doc Redirect: /docs/:section -> Redirect to first page if tutorial
  {
    path: '/docs/:section',
    name: 'docs-section',
    beforeEnter: (to, from, next) => {
      const sectionId = to.params.section

      if (isTutorialDoc(sectionId)) {
        const defaultPage = getDefaultTutorialPage(sectionId)
        if (defaultPage) {
          next({
            name: 'tutorial-page',
            params: defaultPage
          })
          return
        }
      }

      // If not tutorial, maybe it's a folder doc accessed via old link?
      // Redirect to new root path
      next(`/${sectionId}`)
    }
  },

  // Folder Doc Landing: /:section
  // Must be after other root routes
  {
    path: '/:section',
    name: 'folder-root',
    component: FolderDocsView,
    meta: {
      layout: DocumentLayout
    },
    beforeEnter: (to, from, next) => {
      // Check if this is a valid doc section
      const docs = useDocsStore()
      const doc = docs.getDocById(to.params.section)

      if (!doc) {
        next()
        return
      }

      if (doc.layout === 'tutorial') {
        next({
          name: 'docs-section',
          params: { section: to.params.section }
        })
      } else {
        next()
      }
    }
  },

  // Folder Doc Deep Link: /:section/:path+
  {
    path: '/:section/:path+',
    name: 'folder-path',
    component: FolderDocsView,
    meta: {
      layout: DocumentLayout
    },
    beforeEnter: (to, from, next) => {
       const docs = useDocsStore()
       const doc = docs.getDocById(to.params.section)

       if (doc && doc.layout === 'tutorial') {
         const path = Array.isArray(to.params.path) ? to.params.path.join('/') : to.params.path
         next(`/docs/${to.params.section}/${path}`)
       } else {
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
