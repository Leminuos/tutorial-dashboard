<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDocsStore, buildRawUrl } from '@/stores/docstree'
import HeaderMain from '@/components/main/HeaderMain.vue'
import MarkdownViewer from '@/components/viewers/MarkdownViewer.vue'
import FileViewer from '@/components/viewers/FileViewer.vue'
import PostTocList from '@/components/posts/PostTocList.vue'

const route = useRoute()
const router = useRouter()
const docs = useDocsStore()

function goBack() {
  router.back()
}

// Parse path segments
const pathSegments = computed(() => {
  const path = route.params.path
  if (!path) return []
  if (Array.isArray(path)) return path.filter(Boolean)
  return path.split('/').filter(Boolean)
})

const sectionId = computed(() => route.params.section)

// Resolve the node (the post folder or file)
const currentNode = computed(() => {
  return docs.getFolderNode(sectionId.value, pathSegments.value)
})

// Resolve the actual file to display
const displayFile = computed(() => {
  const node = currentNode.value
  if (!node) return null

  if (node.type === 'file') return node

  if (node.type === 'folder') {
    // Look for README.md
    return node.children?.find(c => c.name.toLowerCase() === 'readme.md') || null
  }

  return null
})

// Construct full categoryId for metadata lookup
const categoryId = computed(() => {
  if (pathSegments.value.length <= 1) return sectionId.value
  const parentPath = pathSegments.value.slice(0, -1).join('/')
  return `${sectionId.value}/${parentPath}`
})

// Post Metadata
const postMetadata = computed(() => {
  const catId = categoryId.value
  if (catId) {
    const meta = docs.getPostMetadata(catId)
    if (meta && meta.posts) {
      const slug = pathSegments.value[pathSegments.value.length - 1]
      return meta.posts.find(p => p.id === slug)
    }
  }
  return null
})

// All posts in the same category
const categoryPosts = computed(() => {
  const catId = categoryId.value
  if (catId) {
    const meta = docs.getPostMetadata(catId)
    return meta?.posts || []
  }
  return []
})

// Current post index in category
const currentPostIndex = computed(() => {
  const slug = pathSegments.value[pathSegments.value.length - 1]
  return categoryPosts.value.findIndex(p => p.id === slug)
})

// Previous post
const prevPost = computed(() => {
  if (currentPostIndex.value > 0) {
    return categoryPosts.value[currentPostIndex.value - 1]
  }
  return null
})

// Next post
const nextPost = computed(() => {
  if (currentPostIndex.value >= 0 && currentPostIndex.value < categoryPosts.value.length - 1) {
    return categoryPosts.value[currentPostIndex.value + 1]
  }
  return null
})

// Get post link
function getPostLink(post) {
  return `/posts/view/${categoryId.value}/${post.id}`
}

// Related posts (same tags, excluding current)
const relatedPosts = computed(() => {
  const currentTags = postMetadata.value?.tags || []
  if (!currentTags.length) return []

  const currentSlug = pathSegments.value[pathSegments.value.length - 1]

  return categoryPosts.value
    .filter(p => {
      if (p.id === currentSlug) return false
      const postTags = p.tags || []
      return postTags.some(tag => currentTags.includes(tag))
    })
})

// Get raw path for images
const rawPath = computed(() => {
  const catId = categoryId.value
  if (catId) {
    const meta = docs.getPostMetadata(catId)
    return meta?.rawPath || catId
  }
  return categoryId.value
})

// Resolve image URL for related posts
function getImageUrl(post) {
  if (!post.image) return null
  if (post.image.startsWith('http')) return post.image
  return buildRawUrl(`${rawPath.value}/${post.image}`)
}

// Load metadata on mount or change
watch(categoryId, (id) => {
  if (id) {
    docs.fetchCategoryMetadata(id)
  }
}, { immediate: true })

// ===== Table of contents =====
const TOC_MOBILE_BREAKPOINT = 768

const toc = ref([])
const tocActive = ref('')
const isMobile = ref(false)
// Desktop: the sidebar block can be folded away
const tocOpen = ref(true)
// Mobile: the outline lives in a sheet opened from a floating button, so it
// stays reachable anywhere in the post instead of only at the top.
const tocSheetOpen = ref(false)

const onTocUpdate = (items) => {
  toc.value = items
}

const onTocActive = (id) => {
  tocActive.value = id
}

function openTocSheet() {
  tocSheetOpen.value = true
  document.body.style.overflow = 'hidden'
}

function closeTocSheet() {
  tocSheetOpen.value = false
  document.body.style.overflow = ''
}

function updateViewport() {
  const mobile = window.innerWidth <= TOC_MOBILE_BREAKPOINT
  if (mobile === isMobile.value) return
  isMobile.value = mobile
  if (!mobile) closeTocSheet()
}

function onKeydown(e) {
  if (e.key === 'Escape' && tocSheetOpen.value) closeTocSheet()
}

function onSelectHeading(targetId) {
  if (!targetId) return
  closeTocSheet()

  nextTick(() => {
    const el = document.getElementById(targetId)
    if (!el) return

    const headerHeight = parseInt(
      getComputedStyle(document.documentElement)
        .getPropertyValue('--md-nav-height') || '50'
    )
    const offset = headerHeight + 12

    window.scrollTo({
      top: el.getBoundingClientRect().top + window.pageYOffset - offset,
      behavior: 'smooth',
    })

    // Hash routing: the anchor is appended to the route hash, same shape the
    // in-content anchor links produce (#/posts/view/.../#heading-id)
    const routeHash = window.location.hash.replace(/\/#[^/]*$/, '')
    window.history.replaceState(null, '', `${routeHash}/#${targetId}`)
  })
}

// A different post means a different outline
watch(displayFile, () => {
  toc.value = []
  tocActive.value = ''
  closeTocSheet()
})

onMounted(() => {
  updateViewport()
  window.addEventListener('resize', updateViewport)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateViewport)
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})

function formatDate(dateStr) {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
  return dateStr
}
</script>

<template>
  <!-- Header Main for navigation -->
  <HeaderMain />

  <div class="post-detail-view">
    <div class="post-layout">
      <!-- Main Content Column -->
      <div class="main-content">
        <div class="container">
          <!-- Back Button -->
          <button class="back-btn" @click="goBack">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Quay lại
          </button>

          <!-- Post Header -->
          <header class="post-header" v-if="postMetadata || currentNode">
            <div class="post-meta" v-if="postMetadata">
              <span class="post-date" v-if="postMetadata.date">{{ formatDate(postMetadata.date) }}</span>
              <span class="post-author" v-if="postMetadata.author">• {{ postMetadata.author }}</span>
            </div>

            <h1 class="post-title">
              {{ postMetadata?.title || currentNode?.title || displayFile?.name }}
            </h1>

            <div class="post-tags" v-if="postMetadata?.tags && postMetadata.tags.length">
              <span v-for="tag in postMetadata.tags" :key="tag" class="tag">#{{ tag }}</span>
            </div>
          </header>

          <!-- Content Viewer -->
          <div class="post-content">
            <div v-if="!displayFile" class="empty-state">
               <p>Nội dung bài viết không tìm thấy (thiếu README.md).</p>
            </div>

            <div v-else class="viewer-wrapper">
               <markdown-viewer
                  v-if="displayFile.fileType === 'markdown'"
                  :src="buildRawUrl(displayFile.path)"
                  max-width="100%"
                  class="markdown-body"
                  @toc-update="onTocUpdate"
                  @toc-active="onTocActive"
                />
                <file-viewer
                  v-else
                  :path="displayFile.path"
                  :file-name="displayFile.name"
                />
            </div>
          </div>

          <!-- Navigation Footer (same style as TutorialDocsView) -->
          <nav class="post-navfooter">
            <div class="navbar">
              <div class="nav-left">
                <router-link v-if="prevPost" :to="getPostLink(prevPost)" class="nav-link">
                  <div class="hint">Previous</div>
                  <div class="title">{{ prevPost.title }}</div>
                </router-link>
              </div>

              <div class="nav-right">
                <router-link v-if="nextPost" :to="getPostLink(nextPost)" class="nav-link">
                  <div class="hint">Next</div>
                  <div class="title">{{ nextPost.title }}</div>
                </router-link>
              </div>
            </div>
          </nav>
        </div>
      </div>

      <!-- Sidebar: table of contents + related posts. On mobile the outline
           moves into a floating sheet and only related posts stay in the flow. -->
      <div class="post-sidebar" v-if="toc.length || relatedPosts.length">
        <!-- Table of Contents -->
        <section class="post-toc" v-if="toc.length">
          <button
            class="toc-toggle"
            type="button"
            :aria-expanded="tocOpen"
            aria-controls="post-toc-list"
            @click="tocOpen = !tocOpen"
          >
            <span class="sidebar-title">Mục lục</span>
            <svg
              class="toc-chevron"
              :class="{ open: tocOpen }"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          <post-toc-list
            v-show="tocOpen"
            id="post-toc-list"
            :items="toc"
            :active-id="tocActive"
            @select="onSelectHeading"
          />
        </section>

        <!-- Related Posts -->
        <aside class="related-sidebar" v-if="relatedPosts.length">
          <h3 class="sidebar-title">Bài viết liên quan</h3>
          <div class="related-list">
            <router-link
              v-for="post in relatedPosts"
              :key="post.id"
              :to="getPostLink(post)"
              class="related-item"
            >
              <div class="related-thumbnail" v-if="getImageUrl(post)">
                <img :src="getImageUrl(post)" :alt="post.title" loading="lazy">
              </div>
              <div class="related-info">
                <div class="related-item-title">{{ post.title }}</div>
              </div>
            </router-link>
          </div>
        </aside>
      </div>
    </div>
  </div>

  <!-- Mobile: outline stays one tap away while reading -->
  <Teleport to="body">
    <Transition name="toc-fab">
      <button
        v-if="isMobile && toc.length && !tocSheetOpen"
        class="toc-fab"
        type="button"
        aria-label="Mở mục lục"
        @click="openTocSheet"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="9" y1="6" x2="20" y2="6"></line>
          <line x1="9" y1="12" x2="20" y2="12"></line>
          <line x1="9" y1="18" x2="20" y2="18"></line>
          <circle cx="4.5" cy="6" r="1.4" fill="currentColor" stroke="none"></circle>
          <circle cx="4.5" cy="12" r="1.4" fill="currentColor" stroke="none"></circle>
          <circle cx="4.5" cy="18" r="1.4" fill="currentColor" stroke="none"></circle>
        </svg>
      </button>
    </Transition>

    <Transition name="toc-sheet">
      <div
        v-if="isMobile && tocSheetOpen"
        class="toc-sheet-overlay"
        @click.self="closeTocSheet"
      >
        <section class="toc-sheet" role="dialog" aria-modal="true" aria-label="Mục lục">
          <header class="toc-sheet-header">
            <div class="toc-sheet-heading">
              <strong>Mục lục</strong>
              <span>{{ toc.length }} mục</span>
            </div>
            <button class="toc-sheet-close" type="button" aria-label="Đóng mục lục" @click="closeTocSheet">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </header>

          <post-toc-list
            class="toc-sheet-list"
            :items="toc"
            :active-id="tocActive"
            @select="onSelectHeading"
          />
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.post-detail-view {
  width: 100%;
  max-width: 100%;
  min-height: calc(100vh - var(--md-nav-height));
  background-color: var(--md-c-bg);
  padding: 48px 24px 64px;
  margin-top: var(--md-nav-height);
  overflow-x: hidden;
  overflow-x: clip;
}

/* Two-column layout */
.post-layout {
  width: 100%;
  min-width: 0;
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: clamp(40px, 5vw, 72px);
}

.main-content {
  min-width: 0;
}

.container {
  width: 100%;
  min-width: 0;
  max-width: 828px;
}

/* Back Button */
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--md-c-text-2);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  padding: 8px 0;
  margin-bottom: 32px;
  transition: color 0.2s;
}

.back-btn:hover {
  color: var(--md-c-brand);
}

.back-btn svg {
  transition: transform 0.2s;
}

.back-btn:hover svg {
  transform: translateX(-3px);
}

/* Post Header */
.post-header {
  max-width: 780px;
  margin: 0 auto 48px;
  padding: 0 24px 32px;
  border-bottom: 1px solid var(--md-c-divider-light);
  text-align: left;
}

.post-meta {
  display: flex;
  justify-content: flex-start;
  gap: 8px;
  color: var(--md-c-text-2);
  font-size: 14px;
  margin-bottom: 14px;
}

.post-date {
  color: var(--md-c-brand);
  font-weight: 600;
}

.post-title {
  max-width: 20ch;
  font-size: clamp(32px, 4vw, 44px);
  font-weight: 760;
  line-height: 1.16;
  letter-spacing: -0.038em;
  color: var(--md-c-text-1);
  margin: 0 0 20px 0;
}

.post-tags {
  display: flex;
  justify-content: flex-start;
  gap: 6px;
  flex-wrap: wrap;
}

.tag {
  background: var(--md-c-bg-soft);
  padding: 4px 10px;
  border-radius: 100px;
  font-size: 13px;
  color: var(--md-c-brand);
}

/* Post Content */
.post-content {
  min-width: 0;
  max-width: 100%;
  color: var(--md-c-text-1);
}

.empty-state {
  text-align: center;
  padding: 60px 40px;
  color: var(--md-c-text-2);
  background: var(--md-c-bg-soft);
  border-radius: 12px;
}

.viewer-wrapper {
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

/* Navigation Footer - same style as FooterDocument */
.post-navfooter {
  max-width: 780px;
  margin: 64px auto 0;
  padding: 0 24px;
}

.navbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding-top: 12px;
  padding-bottom: 48px;
  border-top: 1px solid var(--md-c-divider-light);
  margin-top: 24px;
}

.nav-left, .nav-right {
  flex: 1;
  min-width: 0;
}

.nav-link {
  text-decoration: none;
  color: inherit;
  display: inline-block;
  max-width: 100%;
  overflow-wrap: anywhere;
  padding: 10px 12px;
  border-radius: 8px;
  transition: background 0.2s;
}

.nav-link:hover {
  background: var(--md-c-bg-mute);
}

.hint {
  font-size: 12px;
  color: var(--md-c-text-2);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.navbar .title {
  font-size: 14px;
  font-weight: 600;
  color: var(--md-c-brand);
  padding-top: 8px;
}

.nav-right {
  display: flex;
  justify-content: flex-end;
  text-align: right;
}

/* Sidebar column: table of contents + related posts */
.post-sidebar {
  position: sticky;
  top: calc(var(--md-nav-height) + 40px);
  display: flex;
  flex-direction: column;
  gap: 32px;
  height: fit-content;
  max-height: calc(100vh - var(--md-nav-height) - 72px);
  min-width: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--md-c-divider) transparent;
}

/* Table of Contents: takes the leftover sidebar height before related posts do */
.post-toc {
  display: flex;
  flex: 1 1 auto;
  min-height: 260px;
  flex-direction: column;
}

.toc-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex: 0 0 auto;
  width: 100%;
  margin-bottom: 10px;
  padding: 0 0 12px;
  background: none;
  border: none;
  border-bottom: 1px solid var(--md-c-divider-light);
  color: inherit;
  font-family: inherit;
  cursor: pointer;
}

.toc-toggle:hover .sidebar-title {
  color: var(--md-c-brand);
}

.toc-toggle .sidebar-title {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
  transition: color 0.2s;
}

.toc-chevron {
  flex: 0 0 auto;
  color: var(--md-c-text-3);
  transition: transform 0.25s;
}

.toc-chevron.open {
  transform: rotate(180deg);
}

/* Sizing of the list box inside the sidebar; the list itself styles its rows */
.post-toc .toc-list {
  flex: 1 1 auto;
  min-height: 160px;
}

/* Related Posts Sidebar: yields height to the outline when both are long */
.related-sidebar {
  display: flex;
  flex: 0 1 auto;
  min-height: 0;
  flex-direction: column;
}

.sidebar-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--md-c-text-1);
  margin: 0 0 16px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--md-c-divider-light);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.related-list {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 12px;
  min-height: 120px;
  max-height: 280px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}

.related-item {
  display: flex;
  flex: 0 0 auto;
  gap: 12px;
  padding: 10px;
  background: var(--md-c-bg-soft);
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.related-item:hover {
  border-color: var(--md-c-brand);
  transform: translateX(4px);
}

.related-thumbnail {
  width: 60px;
  height: 45px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  background: var(--md-c-bg-mute);
}

.related-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.related-info {
  flex: 1;
  min-width: 0;
}

.related-item-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--md-c-text-1);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.related-item:hover .related-item-title {
  color: var(--md-c-brand);
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .post-detail-view {
    padding: 24px 0 48px;
  }

  .post-layout {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .back-btn {
    margin-left: 16px;
    margin-bottom: 24px;
  }

  .post-header {
    margin-bottom: 32px;
    padding: 0 16px 24px;
  }

  .post-navfooter {
    margin-top: 48px;
    padding: 0 16px;
  }

  /* Unwrap the column so related posts can take their own place in the grid */
  .post-sidebar {
    display: contents;
  }

  /* The outline moves into the floating sheet */
  .post-toc {
    display: none;
  }

  /* Related posts move to the bottom on mobile */
  .related-sidebar {
    position: static;
    order: 1;
    padding: 32px 16px 0;
    border-top: 1px solid var(--md-c-divider-light);
  }

  .related-item:hover {
    transform: none;
  }
}
/* ===== Mobile floating outline ===== */
.toc-fab {
  position: fixed;
  right: 16px;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  z-index: 1400;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--md-c-brand);
  color: #fff;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.28);
  cursor: pointer;
}

.toc-fab:active {
  transform: scale(0.94);
}

.toc-sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 1500;
  display: flex;
  align-items: flex-end;
  background: rgba(0, 0, 0, 0.45);
}

.toc-sheet {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 76dvh;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: var(--md-c-bg);
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.28);
}

.toc-sheet-header {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 12px 12px 20px;
  border-bottom: 1px solid var(--md-c-divider-light);
}

.toc-sheet-heading {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.toc-sheet-heading strong {
  color: var(--md-c-text-1);
  font-size: 15px;
  font-weight: 700;
}

.toc-sheet-heading span {
  color: var(--md-c-text-3);
  font-size: 12px;
}

.toc-sheet-close {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--md-c-bg-soft);
  color: var(--md-c-text-2);
  cursor: pointer;
}

.toc-sheet-close:active {
  background: var(--md-c-bg-mute);
}

.toc-sheet-list {
  flex: 1 1 auto;
  min-height: 0;
  margin: 10px 16px 16px;
}

.toc-fab-enter-active,
.toc-fab-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.toc-fab-enter-from,
.toc-fab-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

.toc-sheet-enter-active,
.toc-sheet-leave-active {
  transition: opacity 0.22s ease;
}

.toc-sheet-enter-active .toc-sheet,
.toc-sheet-leave-active .toc-sheet {
  transition: transform 0.26s cubic-bezier(0.32, 0.72, 0, 1);
}

.toc-sheet-enter-from,
.toc-sheet-leave-to {
  opacity: 0;
}

.toc-sheet-enter-from .toc-sheet,
.toc-sheet-leave-to .toc-sheet {
  transform: translateY(100%);
}
</style>
