import MarkdownComponent from '@/components/docs/MarkdownComponent.vue'
import { defineAsyncComponent } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'

const docs = [
  {
    path: '/docs/embedded/',
    name: 'embedded',
    redirect: () => ({
      name: 'page',
      params: {
        section: 'embedded',
        chapter: 'essential',
        page: 'cortex-mx-overview',
      },
    }),
  },
  {
    path: '/docs/linux-kernel/',
    name: 'linux',
    redirect: () => ({
      name: 'page',
      params: {
        section: 'linux-kernel',
        chapter: 'get-started',
        page: 'vim-editor',
      },
    }),
  },
  {
    path: '/docs/:section/:chapter/:page',
    name: 'page',
    component: MarkdownComponent,
    meta: {
      layout: defineAsyncComponent(() => import('@/layouts/DocumentLayout.vue'))
    },
  },
]

const routes = [
  {
    path: '/',
    name: 'home',
    meta: {
      layout: defineAsyncComponent(() => import('@/layouts/MainLayout.vue'))
    },
  },
  {
    path: '/docs',
    children: docs,
  }
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition

    // Handle hash anchors on route change (e.g., direct navigation to URL with anchor)
    // The double-hash format is: #/docs/.../...#heading-id
    return new Promise((resolve) => {
      setTimeout(() => {
        const hash = window.location.hash
        const hashMatch = hash.match(/#([^#]+)$/)
        if (hashMatch) {
          const targetId = hashMatch[1]
          const el = document.getElementById(targetId)
          if (el) {
            // Get header height from CSS variable (default: 50px)
            const headerHeight = parseInt(
              getComputedStyle(document.documentElement)
                .getPropertyValue('--md-nav-height') || '50'
            )
            const offset = headerHeight + 12 // Add some extra spacing

            const elementPosition = el.getBoundingClientRect().top
            const offsetPosition = elementPosition + window.pageYOffset - offset

            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth',
            })

            resolve({ left: 0, top: offsetPosition })
            return
          }
        }
        resolve({ left: 0, top: 0 })
      }, 100)
    })
  },
})

export default router
