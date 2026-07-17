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
  <Transition name="toc-dropdown">
    <section
      v-if="isMobile && tocOpen"
      id="mobile-page-toc"
      class="mobile-toc-dropdown"
      :class="{ 'header-hidden': isHeaderHidden }"
      aria-label="On this page"
    >
      <header class="mobile-toc-header">
        <div class="mobile-toc-heading">
          <strong>On this page</strong>
          <span>{{ toc.length }} {{ toc.length === 1 ? 'section' : 'sections' }}</span>
        </div>
        <a href="#" class="mobile-toc-top" @click.prevent="scrollToTop">
          Back to top
        </a>
      </header>

      <nav class="mobile-toc-list" aria-label="Page sections">
        <a
          v-for="item in toc"
          :key="item.id"
          :href="`#${item.id}`"
          class="mobile-toc-link"
          :class="[`level-${item.level}`, { active: tocActive === item.id }]"
          :style="{ '--toc-indent': `${Math.max(item.level - 2, 0) * 14}px` }"
          @click="closeTocOnMobile"
        >
          {{ item.text }}
        </a>
      </nav>
    </section>
  </Transition>

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
  width: 100%;
  min-width: 0;
  max-width: 100%;
  padding-top: 48px;
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

@media (min-width: 960px) {
  .docs-content {
    width: auto;
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
  width: 100%;
  min-width: 0;
  max-width: 100%;
  padding: 28px 0 0;
  background: var(--md-c-bg);
}

@media (min-width: 960px) {
  .content-wrapper {
    padding-top: 56px;
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
  top: calc(var(--md-nav-height) + 56px);
  right: 16px;
  left: 16px;
  z-index: 799;
  display: flex;
  flex-direction: column;
  max-height: min(62dvh, 480px);
  background: color-mix(in srgb, var(--md-c-bg) 97%, var(--md-c-bg-soft));
  border: 1px solid var(--md-c-divider-light);
  border-radius: 12px;
  box-shadow: var(--md-shadow-3);
  overflow-x: hidden;
  overflow-y: hidden;
  overscroll-behavior: contain;
}

.mobile-toc-dropdown.header-hidden {
  top: calc(var(--md-nav-height) + 56px);
}

.mobile-toc-header {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 14px 13px 16px;
  border-bottom: 1px solid var(--md-c-divider-light);
  background: color-mix(in srgb, var(--md-c-bg) 92%, transparent);
}

.mobile-toc-heading {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.mobile-toc-heading strong {
  color: var(--md-c-text-1);
  font-size: 14px;
  font-weight: 680;
  line-height: 1.3;
}

.mobile-toc-heading span {
  color: var(--md-c-text-2);
  font-size: 11px;
  line-height: 1.35;
}

.mobile-toc-top {
  flex: 0 0 auto;
  padding: 7px 10px;
  color: var(--md-c-brand);
  background: var(--md-c-brand-soft);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 620;
  line-height: 1.4;
  text-decoration: none;
  transition:
    color 0.2s,
    background-color 0.2s;
}

.mobile-toc-top:hover,
.mobile-toc-top:active {
  color: var(--md-c-brand-dark);
  background: color-mix(in srgb, var(--md-c-brand-soft) 78%, var(--md-c-bg-mute));
}

.mobile-toc-list {
  min-height: 0;
  padding: 8px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--md-c-divider) transparent;
}

.mobile-toc-link {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 40px;
  padding: 9px 12px 9px calc(12px + var(--toc-indent, 0px));
  border-radius: 7px;
  font-size: 14px;
  color: var(--md-c-text-2);
  line-height: 1.4;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  transition:
    color 0.2s,
    background-color 0.2s;
}

.mobile-toc-link.level-2 {
  color: var(--md-c-text-1);
  font-weight: 620;
}

.mobile-toc-link.level-3 {
  color: var(--md-c-text-2);
  font-size: 14px;
}

.mobile-toc-link.level-4,
.mobile-toc-link.level-5,
.mobile-toc-link.level-6 {
  font-size: 13px;
  color: var(--md-c-text-3);
}

.mobile-toc-link:hover {
  color: var(--md-c-text-1);
  background: var(--md-c-bg-soft);
}

.mobile-toc-link.active {
  color: var(--md-c-brand);
  background: var(--md-c-brand-soft);
  font-weight: 620;
}

.mobile-toc-link.active::before {
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: 4px;
  width: 2px;
  content: '';
  background: var(--md-c-brand);
  border-radius: 2px;
}

.toc-dropdown-enter-active,
.toc-dropdown-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.22s ease;
}

.toc-dropdown-enter-from,
.toc-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 480px) {
  .mobile-toc-dropdown {
    right: 8px;
    left: 8px;
    max-height: calc(100dvh - var(--md-nav-height) - 120px);
  }

  .mobile-toc-header {
    padding-right: 12px;
    padding-left: 14px;
  }
}
</style>
