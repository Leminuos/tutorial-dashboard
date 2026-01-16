import { defineAsyncComponent } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { useDocsStore } from '@/stores/docstree'

// Lazy load views
const HomeView = defineAsyncComponent(() =>
  import('@/views/HomeView.vue')
)
const SidebarDocsView = defineAsyncComponent(() =>
  import('@/views/SidebarDocsView.vue')
)
const DropdownDocsView = defineAsyncComponent(() =>
  import('@/views/DropdownDocsView.vue')
)

// Layouts
const DocumentLayout = defineAsyncComponent(() =>
  import('@/layouts/DocumentLayout.vue')
)
const MainLayout = defineAsyncComponent(() =>
  import('@/layouts/MainLayout.vue')
)

/**
 * Check if section uses sidebar layout
 */
function isSidebarDoc(sectionId) {
  const docs = useDocsStore()
  const doc = docs.getDocById(sectionId)
  return doc?.layout === 'sidebar'
}

/**
 * Get default page for sidebar docs
 */
function getDefaultSidebarPage(sectionId) {
  const docs = useDocsStore()
  const doc = docs.getDocById(sectionId)
  if (!doc || doc.layout !== 'sidebar') return null

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

      // Check if sidebar doc - redirect to first page
      if (isSidebarDoc(sectionId)) {
        const defaultPage = getDefaultSidebarPage(sectionId)
        if (defaultPage) {
          return {
            name: 'sidebar-page',
            params: defaultPage
          }
        }
      }

      // Dropdown doc - go to landing page
      return {
        name: 'dropdown-landing',
        params: { section: sectionId }
      }
    }
  },

  // Sidebar docs: /docs/:section/:chapter/:page
  {
    path: '/docs/:section/:chapter/:page',
    name: 'sidebar-page',
    component: SidebarDocsView,
    meta: {
      layout: DocumentLayout
    },
    beforeEnter: (to, from, next) => {
      if (!isSidebarDoc(to.params.section)) {
        // Not a sidebar doc, redirect to dropdown view
        next({
          name: 'dropdown-page',
          params: {
            section: to.params.section,
            category: to.params.chapter,
            subcategory: to.params.page
          }
        })
      } else {
        next()
      }
    }
  },

  // Dropdown docs landing: /docs/:section/landing
  {
    path: '/docs/:section/landing',
    name: 'dropdown-landing',
    component: DropdownDocsView,
    meta: {
      layout: DocumentLayout
    }
  },

  // Dropdown docs with category only: /docs/:section/:category
  {
    path: '/docs/:section/:category',
    name: 'dropdown-category',
    component: DropdownDocsView,
    meta: {
      layout: DocumentLayout
    },
    beforeEnter: (to, from, next) => {
      // If this is a sidebar doc, category is actually a chapter
      // We need to redirect to first page of that chapter
      if (isSidebarDoc(to.params.section)) {
        const docs = useDocsStore()
        const doc = docs.getDocById(to.params.section)
        const chapter = doc?.chapters?.find(c => c.id === to.params.category)
        const firstPage = chapter?.pages?.[0]
        if (firstPage) {
          next({
            name: 'sidebar-page',
            params: {
              section: to.params.section,
              chapter: to.params.category,
              page: firstPage.id
            }
          })
        } else {
          next()
        }
      } else {
        // Dropdown doc - show category page
        next()
      }
    }
  },

  // Dropdown docs with subcategory: /docs/:section/:category/:subcategory
  {
    path: '/docs/:section/:category/:subcategory',
    name: 'dropdown-page',
    component: DropdownDocsView,
    meta: {
      layout: DocumentLayout
    },
    beforeEnter: (to, from, next) => {
      if (isSidebarDoc(to.params.section)) {
        // Redirect to sidebar page view
        next({
          name: 'sidebar-page',
          params: {
            section: to.params.section,
            chapter: to.params.category,
            page: to.params.subcategory
          }
        })
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
