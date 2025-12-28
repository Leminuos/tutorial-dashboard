<script setup>
import HeaderDocument from '@/components/docs/HeaderDocument.vue'
import FooterDocument from '@/components/docs/FooterDocument.vue'
import SidebarDocument from '@/components/docs/SidebarDocument.vue'
import MarkdownRender from '@/components/docs/MarkdownRender.vue'
import { ref } from 'vue'
import { useMobile } from '@/composables/useMobile'
import { useDocNavigation } from '@/composables/docs/useDocNavigation'

const { markdownSrc } = useDocNavigation()
const { isMobile } = useMobile()

const tocOpen = ref(false)
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

const closeTocOnMobile = () => {
  if (!isMobile.value) return
  tocOpen.value = false
}

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
      @select-toc="closeTocOnMobile"
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
