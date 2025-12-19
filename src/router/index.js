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
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { left: 0, top: 0 }
  },
})

export default router
