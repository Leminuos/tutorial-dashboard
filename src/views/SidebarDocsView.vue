<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useDocsStore, buildRawUrl } from '@/stores/docstree'

import HeaderDocument from '@/components/docs/HeaderDocument.vue'
import FooterDocument from '@/components/docs/FooterDocument.vue'
import SidebarDocument from '@/components/docs/SidebarDocument.vue'
import RightPanel from '@/components/docs/RightPanel.vue'
import MarkdownViewer from '@/components/viewers/MarkdownViewer.vue'
import FileViewer from '@/components/viewers/FileViewer.vue'

const route = useRoute()
const docs = useDocsStore()

// Current page data
const currentPage = computed(() => {
  const { section, chapter, page } = route.params
  return docs.getSidebarPage(section, chapter, page)
})

// Markdown source URL
const markdownSrc = computed(() => {
  if (!currentPage.value?.path) return null
  return buildRawUrl(currentPage.value.path)
})

// TOC from markdown
const toc = ref([])

// Selected file for viewing
const selectedFile = ref(null)

// UI state
const tocActive = ref('')
const tocOpen = ref(false)
const isMobile = ref(false)
const sidebarOpen = ref(false)

// Event handlers
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

const onSelectExample = ({ file }) => {
  selectedFile.value = file
}

const closeFileViewer = () => {
  selectedFile.value = null
}

// Handle TOC update from MarkdownVi
const onTocUpdate = (items) => {
  toc.value = items
}

const onTocActive = (id) => {
  tocActive.value = id
}

// Viewport handling
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

// Close file viewer when route changes
watch(() => route.params, () => {
  selectedFile.value = null
})
</script>

<template>
  <!-- Header -->
  <header-document
    @toggle-sidebar="onToggleSidebar"
    @this-page="onToc"
  />

  <!-- Sidebar overlay -->
  <div
    v-if="isMobile && sidebarOpen"
    class="sidebar-overlay"
    @click="closeSidebarOnMobile"
  />

  <!-- Sidebar navigation -->
  <sidebar-document
    :toggle-sidebar="sidebarOpen"
    @select="closeSidebarOnMobile"
  />

  <!-- Main content -->
  <div class="docs-content">
    <div class="content-wrapper">
      <markdown-viewer
        v-if="markdownSrc"
        :src="markdownSrc"
        @toc-active="onTocActive"
        @toc-update="onTocUpdate"
      />

      <div v-else class="loading">
        Loading content...
      </div>

      <!-- Right panel (TOC + Examples) -->
      <right-panel
        :toc="toc"
        :toc-open="tocOpen"
        :toc-active="tocActive"
        @select-toc="closeTocOnMobile"
        @select-example="onSelectExample"
      />
    </div>

    <!-- Footer aligned with content -->
    <footer-document />
  </div>

  <!-- File viewer modal -->
  <div v-if="selectedFile" class="file-modal-overlay" @click.self="closeFileViewer">
    <div class="file-modal">
      <div class="file-modal-header">
        <span class="file-modal-title">{{ selectedFile.name }}</span>
        <button class="close-btn" @click="closeFileViewer">×</button>
      </div>
      <div class="file-modal-content">
        <file-viewer
          :path="selectedFile.path"
          :file-name="selectedFile.name"
        />
      </div>
    </div>
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

.content-wrapper {
  display: flex;
  padding-top: 24px;
}

@media (min-width: 960px) {
  .content-wrapper {
    padding-top: 48px;
  }
}

.loading {
  padding: 48px;
  text-align: center;
  color: var(--md-c-text-light-2);
}

/* File modal */
.file-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.file-modal {
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  background: var(--md-c-white);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.file-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--md-c-white-soft);
  border-bottom: 1px solid var(--md-c-divider-light-2);
}

.file-modal-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--md-c-text-light-1);
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 24px;
  color: var(--md-c-text-light-2);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--md-c-divider-light-1);
  color: var(--md-c-text-light-1);
}

.file-modal-content {
  flex: 1;
  overflow: auto;
  padding: 16px;
}
</style>
