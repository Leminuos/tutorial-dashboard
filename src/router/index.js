import MarkdownDocument from '@/components/docs/MarkdownDocument.vue'
import { defineAsyncComponent } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

const docs = [
  {
    path: '/docs/:section/:chapter/:page',
    name: 'docs',
    meta: {
      layout: defineAsyncComponent(() => import('@/layouts/DocumentLayout.vue'))
    },
  },
]

const routes = [
  {
    path: '/',
    redirect: () => {
      return {
        path: "docs/linux-kernel/get-started/vim-editor",
      }
    }
  },
  {
    path: '/docs',
    children: docs,
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { left: 0, top: 0 }
  },
})

export default router
