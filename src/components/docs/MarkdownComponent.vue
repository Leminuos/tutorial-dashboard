<script setup>
import HeaderDocument from '@/components/docs/HeaderDocument.vue'
import FooterDocument from '@/components/docs/FooterDocument.vue'
import SidebarDocument from '@/components/docs/SidebarDocument.vue'
import MarkdownRender from '@/components/docs/MarkdownRender.vue'
import { useRoute } from 'vue-router'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useDocsStore } from '@/stores/useDocsTree'

const route = useRoute()
const docs = useDocsStore()

const markdownSrc = computed(() => {
  const tree = docs.tree
  if (!tree?.docs?.length) return null
  const section = tree.docs.find((d) => String(d.id) === String(route.params.section))
  if (!section) return null

  const chapter = (section.chapters).find((c) => String(c.id) === String(route.params.chapter))
  if (!chapter) return null

  const page = (chapter.pages).find((p) => String(p.id) === String(route.params.page))
  if (!page) return null

  const path = page.path.split('/').map(seg => encodeURIComponent(seg)).join('/')
  return `${import.meta.env.BASE_URL}/docs/${path}`
})

const tocOpen = ref(false)
const isMobile = ref(false)
const sidebarOpen = ref(false)

const onToggleSidebar = () => {
  if (!isMobile.value) return
  sidebarOpen.value = !sidebarOpen.value
}

const closeSidebarOnMobile = () => {
  if (!isMobile.value) return
  sidebarOpen.value = false
  tocOpen.value = false
}

const onToc = () => {
  if (!isMobile.value) return
  tocOpen.value = !tocOpen.value
}

const clockTocOnMobile = () => {
  if (!isMobile.value) return
  tocOpen.value = false
}

function updateViewport() {
  isMobile.value = window.innerWidth < 960
}

onMounted(() => {
  updateViewport()
  window.addEventListener('resize', updateViewport)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateViewport)
})

</script>

<template>
  <!-- header -->
  <header-document @toggle-sidebar="onToggleSidebar" @this-page="onToc"/>

  <!-- sidebar -->
  <div
    v-if="isMobile && sidebarOpen"
    class="sidebar-overlay"
    @click="closeSidebarOnMobile"
  />

  <sidebar-document
    :toggle-sidebar="sidebarOpen"
    @select="closeSidebarOnMobile"
  />

  <!-- Content -->
  <div class="docs-content">

    <markdown-render
      :src="markdownSrc"
      :toc-active="tocOpen"
      :mobile="isMobile"
      @select-toc="clockTocOnMobile"
    />

    <footer-document />

  </div>
</template>

<style scoped>

@media (max-width: 960px) {
  .sidebar-overlay {
    position: fixed;
    inset: 0;
    z-index: 999;
    background: var(--md-c-transparent);
  }
}

@media (min-width: 960px) {
  .docs-content {
    margin-top: 36px;
    margin-left: calc(var(--md-sidebar-expand) + 8px);
    padding-right: 8px;
  }
}

@media (min-width: 1280px) {
  .docs-content {
    margin-left: calc(var(--md-sidebar-expand) + 32px);
    padding-right: 32px;
  }
}

@media (min-width: 1440px) {
  .docs-content {
    margin-left: calc(var(--md-sidebar-expand) + 100px);
    padding-right: 100px;
  }
}

@media (min-width: 1600px) {
  .docs-content {
    margin-left: calc(var(--md-sidebar-expand) + 150px);
    padding-right: 150px;
  }
}

@media (min-width: 1920px) {
  .docs-content {
    margin-left: calc(var(--md-sidebar-expand) + 200px);
    padding-right: 200px;
  }
}
</style>
