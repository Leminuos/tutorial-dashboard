<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useDocsStore, buildRawUrl } from '@/stores/docstree'

import HeaderDocument from '@/components/docs/HeaderDocument.vue'
import SidebarDocument from '@/components/docs/SidebarDocument.vue'
import RightPanel from '@/components/docs/RightPanel.vue'
import MarkdownViewer from '@/components/viewers/MarkdownViewer.vue'
import FileViewer from '@/components/viewers/FileViewer.vue'

const route = useRoute()
const docs = useDocsStore()

// Current page data
const currentPage = computed(() => {
  const { section, chapter, page } = route.params
  return docs.getTutorialPage(section, chapter, page)
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

// Scroll to a heading picked from the sidebar navigation
function onSelectHeading(targetId) {
  if (!targetId) return

  closeSidebarOnMobile()

  // Wait for next tick to ensure DOM is ready
  nextTick(() => {
    const el = document.getElementById(targetId)
    if (!el) return

    // Get header height from CSS variable
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

    // Hash routing: the anchor is appended to the route hash, same shape the
    // in-content anchor links produce (#/docs/.../#heading-id)
    const routeHash = window.location.hash.replace(/\/#[^/]*$/, '')
    window.history.replaceState(null, '', `${routeHash}/#${targetId}`)
  })
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
  <header-document @toggle-sidebar="onToggleSidebar" />

  <!-- Sidebar overlay -->
  <div
    v-if="isMobile && sidebarOpen"
    class="sidebar-overlay"
    @click="closeSidebarOnMobile"
  />

  <!-- Sidebar navigation -->
  <sidebar-document
    :toggle-sidebar="sidebarOpen"
    :toc="toc"
    :toc-active="tocActive"
    @select="closeSidebarOnMobile"
    @select-heading="onSelectHeading"
  />

  <!-- Main content -->
  <div class="docs-content">
    <div class="content-wrapper">
      <markdown-viewer
        v-if="markdownSrc"
        :src="markdownSrc"
        max-width="820px"
        @toc-active="onTocActive"
        @toc-update="onTocUpdate"
      />

      <div v-else class="loading">
        Loading content...
      </div>

      <!-- Right panel (Examples + Attachments) - Desktop only -->
      <right-panel @select-example="onSelectExample" />
    </div>
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
          @close="closeFileViewer"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Mobile: Add padding for fixed navbar */
.docs-content {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  padding-top: 48px;
  padding-bottom: 64px;
  min-height: 100vh;
  background: var(--md-c-bg);
  overflow-x: hidden;
  overflow-x: clip;
}

@media (max-width: 960px) {
  .sidebar-overlay {
    position: fixed;
    inset: 0;
    z-index: 999;
    background: var(--md-c-transparent);
  }
}

/* Starts where the sidebar ends and stops on the navbar gutter, so the right
   panel lines up with the right edge of the navbar container. */
@media (min-width: 960px) {
  .docs-content {
    width: auto;
    padding-top: 0;
    margin-top: 36px;
    margin-left: calc(var(--md-sidebar-expand) + var(--md-page-gutter));
    padding-left: 32px;
    padding-right: var(--md-page-gutter);
  }
}

@media (min-width: 1280px) {
  .docs-content {
    padding-left: 48px;
  }
}

.content-wrapper {
  display: flex;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  padding: 28px 0 0;
  background: var(--md-c-bg);
}

@media (min-width: 960px) {
  .content-wrapper {
    gap: 32px;
    padding-top: 56px;
  }

  /* The example column is always reserved (RightPanel renders even when empty),
     so centering the article here gives the same position on every page,
     with or without examples. */
  .content-wrapper .md-content {
    margin-inline: auto;
  }
}

@media (min-width: 1280px) {
  .content-wrapper {
    gap: 48px;
  }
}

.loading {
  padding: 48px;
  text-align: center;
  color: var(--md-c-text-2);
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
  background: var(--md-c-bg);
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
  background: var(--md-c-bg-soft);
  border-bottom: 1px solid var(--md-c-divider-light);
}

.file-modal-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--md-c-text-1);
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 24px;
  color: var(--md-c-text-2);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--md-c-divider);
  color: var(--md-c-text-1);
}

.file-modal-content {
  flex: 1;
  overflow: auto;
  padding: 16px;
}
</style>
