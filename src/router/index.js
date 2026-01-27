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
const NotFoundView = defineAsyncComponent(() =>
  import('@/views/NotFoundView.vue')
)

// Layouts
const DocumentLayout = defineAsyncComponent(() =>
  import('@/layouts/DocumentLayout.vue')
)
const MainLayout = defineAsyncComponent(() =>
  import('@/layouts/MainLayout.vue')
)

/**
 * Check if section uses a specific layout
 */
function checkLayout(sectionId, expectedLayout) {
  const docs = useDocsStore()
  const doc = docs.getDocById(sectionId)
  return doc?.layout === expectedLayout
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

    // Post Layout Routes
    // List View (e.g. /posts/vi-dieu-khien/esp32)
    {
      path: '/posts/:category(.*)',
      name: 'post-list',
      component: () => import('../views/PostListView.vue'),
      beforeEnter: async (to, from, next) => {
        const docs = useDocsStore()
        const categoryPath = to.params.category
        const sectionId = categoryPath.split('/')[0]

        // 1. Check layout
        if (!checkLayout(sectionId, 'posts')) {
          next({ name: 'not-found', params: { pathMatch: to.path.substring(1).split('/') } })
          return
        }

        // 2. Check if category exists
        // categoryPath might be "embedded/multicore"
        // sectionId is "embedded"
        await docs.fetchCategoryMetadata(categoryPath)
        const meta = docs.getPostMetadata(categoryPath)

        // If meta.posts is empty and it's not the root section (which might just have subcats)
        // or if it's invalid
        if (!meta || (categoryPath.includes('/') && (!meta.posts || meta.posts.length === 0))) {
          // Double check if it's a folder in the tree
          const pathSegments = categoryPath.split('/').slice(1)
          const node = docs.getFolderNode(sectionId, pathSegments)
          if (!node) {
            next({ name: 'not-found', params: { pathMatch: to.path.substring(1).split('/') } })
            return
          }
        }
        next()
      }
    },
    // Detail View (e.g. /posts/view/vi-dieu-khien/esp32/overview)
    {
      path: '/posts/view/:section/:path+',
      name: 'post-detail',
      component: () => import('../views/PostDetailView.vue'),
      beforeEnter: async (to, from, next) => {
        const docs = useDocsStore()
        const { section, path } = to.params

        // 1. Check layout
        if (!checkLayout(section, 'posts')) {
          next({ name: 'not-found', params: { pathMatch: to.path.substring(1).split('/') } })
          return
        }

        // 2. Check if post exists
        const pathSegments = Array.isArray(path) ? path : path.split('/')
        if (pathSegments.length === 0) {
          next({ name: 'not-found', params: { pathMatch: to.path.substring(1).split('/') } })
          return
        }

        const categoryId = pathSegments.length > 1
          ? `${section}/${pathSegments.slice(0, -1).join('/')}`
          : section

        const postSlug = pathSegments[pathSegments.length - 1]

        await docs.fetchCategoryMetadata(categoryId)
        const meta = docs.getPostMetadata(categoryId)
        const post = meta?.posts?.find(p => p.id === postSlug)

        if (!post) {
          next({ name: 'not-found', params: { pathMatch: to.path.substring(1).split('/') } })
          return
        }
        next()
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
      const docs = useDocsStore()
      const { section, chapter, page } = to.params

      // 1. Check layout
      if (!checkLayout(section, 'tutorial')) {
        next({ name: 'not-found', params: { pathMatch: to.path.substring(1).split('/') } })
        return
      }

      // 2. Check path existence
      const tutorialPage = docs.getTutorialPage(section, chapter, page)
      if (!tutorialPage) {
        next({ name: 'not-found', params: { pathMatch: to.path.substring(1).split('/') } })
        return
      }
      next()
    }
  },

  // Tutorial Doc Redirect: /docs/:section -> Redirect to first page if tutorial
  {
    path: '/docs/:section',
    name: 'docs-section',
    beforeEnter: (to, from, next) => {
      const sectionId = to.params.section

      if (checkLayout(sectionId, 'tutorial')) {
        const defaultPage = getDefaultTutorialPage(sectionId)
        if (defaultPage) {
          next({
            name: 'tutorial-page',
            params: defaultPage
          })
          return
        }
      }

      // If not tutorial layout, show 404
      next({ name: 'not-found', params: { pathMatch: to.path.substring(1).split('/') } })
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

      if (!doc || doc.layout !== 'folder') {
        // Section doesn't exist OR layout is not folder, redirect to 404
        next({ name: 'not-found', params: { pathMatch: to.path.substring(1).split('/') } })
        return
      }

      next()
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

       if (!doc || doc.layout !== 'folder') {
         // Section doesn't exist OR layout is not folder, redirect to 404
         next({ name: 'not-found', params: { pathMatch: to.path.substring(1).split('/') } })
         return
       }

       // Check if path exists in tree
       const pathSegments = Array.isArray(to.params.path) ? to.params.path : to.params.path.split('/')
       const node = docs.getFolderNode(to.params.section, pathSegments)

       if (!node) {
         next({ name: 'not-found', params: { pathMatch: to.path.substring(1).split('/') } })
         return
       }

       next()
    }
  },

  // 404 Catch-all route - must be last
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundView,
    meta: {
      layout: MainLayout
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

  // Wait for docs to load for all content routes
  // This prevents 404s or empty states when reloading on deep links
  if (to.path.startsWith('/docs') || to.path.startsWith('/posts') || to.name === 'folder-root' || to.name === 'folder-path') {
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
