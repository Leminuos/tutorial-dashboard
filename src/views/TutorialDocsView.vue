<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
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

const closeTocOnMobile = (e) => {
  if (!isMobile.value) return
  tocOpen.value = false
  onTocClick(e)
}

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
  closeTocOnMobile()
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
const isHeaderHidden = ref(false)

function updateViewport() {
  isMobile.value = window.innerWidth < 960
}

function handleScroll() {
  // Get the nav height from CSS variable
  const navHeight = parseInt(
    getComputedStyle(document.documentElement)
      .getPropertyValue('--md-nav-height') || '50'
  )
  isHeaderHidden.value = window.scrollY > navHeight
}

function onTocClick(e) {
  const link = e.target.closest('.mobile-toc-link')
  if (!link) return

  e.preventDefault()

  const href = link.getAttribute('href')
  if (!href) return

  // Extract the heading ID from href (format: #/docs/.../...#heading-id)
  // The last part after the second # is the heading ID
  const hashMatch = href.match(/#([^#]+)$/)
  if (!hashMatch) return

  const targetId = hashMatch[1]

  // Wait for next tick to ensure DOM is ready
  nextTick(() => {
    const el = document.getElementById(targetId)
    if (el) {
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

      // Update URL hash for proper navigation state
      // Vue Router hash mode: the full route + anchor becomes #/route#anchor
      const newHash = `#/docs/${route.params.section}/${route.params.chapter}/${route.params.page}#${targetId}`
      window.history.replaceState(null, '', newHash)
    }
  })
}

onMounted(() => {
  updateViewport()
  handleScroll()
  window.addEventListener('resize', updateViewport)
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('resize', updateViewport)
  window.removeEventListener('scroll', handleScroll)
})

// Close file viewer when route changes
watch(() => route.params, () => {
  selectedFile.value = null
})
</script>

<template>
  <!-- Header -->
  <header-document
    :toc-open="tocOpen"
    @toggle-sidebar="onToggleSidebar"
    @toggle-toc="onToc"
  />

  <!-- Mobile TOC dropdown -->
  <div v-if="isMobile && tocOpen" class="mobile-toc-dropdown" :class="{ 'header-hidden': isHeaderHidden }">
    <a
      href="#"
      class="mobile-toc-top"
      @click.prevent="scrollToTop"
    >
      Return to top
    </a>
    <a
      v-for="item in toc"
      :key="item.id"
      :href="`#${item.id}`"
      class="mobile-toc-link"
      :class="{ active: tocActive === item.id }"
      @click="closeTocOnMobile"
    >
      {{ item.text }}
    </a>
  </div>

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

      <!-- Right panel (TOC + Examples) - Desktop only -->
      <right-panel
        :toc="toc"
        :toc-active="tocActive"
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
          @close="closeFileViewer"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Mobile: Add padding for fixed navbar */
.docs-content {
  padding-top: 48px;
}

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
    padding-top: 0;
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

/* Mobile TOC dropdown */
.mobile-toc-dropdown {
  position: fixed;
  top: calc(var(--md-nav-height) + 48px);
  left: 0;
  right: 0;
  z-index: 799;
  background: var(--md-c-bg);
  border-bottom: 1px solid var(--md-c-divider-light);
  padding: 12px 24px;
  max-height: 50vh;
  overflow-y: auto;
}

.mobile-toc-dropdown.header-hidden {
  top: 48px;
}

.mobile-toc-top {
  display: block;
  padding: 8px 12px;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--md-c-brand);
  text-decoration: none;
  border-bottom: 1px solid var(--md-c-divider-light);
  transition: color 0.2s;
}

.mobile-toc-top:hover {
  color: var(--md-c-brand-light);
}

.mobile-toc-link {
  display: block;
  padding: 8px 12px;
  font-size: 14px;
  color: var(--md-c-text-2);
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.2s;
  border-left: 2px solid transparent;
}

.mobile-toc-link:hover,
.mobile-toc-link.active {
  color: var(--md-c-text-1);
  font-weight: 600;
}

.mobile-toc-link.active {
  border-left-color: var(--md-c-brand);
}
</style>
