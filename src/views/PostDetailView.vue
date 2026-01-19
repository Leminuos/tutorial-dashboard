<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDocsStore, buildRawUrl } from '@/stores/docstree'
import HeaderMain from '@/components/main/HeaderMain.vue'
import MarkdownViewer from '@/components/viewers/MarkdownViewer.vue'
import FileViewer from '@/components/viewers/FileViewer.vue'

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

      <!-- Related Posts Sidebar -->
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
</template>

<style scoped>
.post-detail-view {
  min-height: calc(100vh - var(--md-nav-height));
  background-color: var(--md-c-bg);
  padding: 40px 20px;
  margin-top: var(--md-nav-height);
}

/* Two-column layout */
.post-layout {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 40px;
}

.main-content {
  min-width: 0;
}

.container {
  max-width: 800px;
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
  margin-bottom: 24px;
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
  margin-bottom: 48px;
  text-align: center;
}

.post-meta {
  display: flex;
  justify-content: center;
  gap: 8px;
  color: var(--md-c-text-2);
  font-size: 14px;
  margin-bottom: 16px;
}

.post-date {
  color: var(--md-c-brand);
  font-weight: 600;
}

.post-title {
  font-size: 36px;
  font-weight: 800;
  line-height: 1.3;
  color: var(--md-c-text-1);
  margin: 0 0 20px 0;
}

.post-tags {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.tag {
  background: var(--md-c-bg-soft);
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 13px;
  color: var(--md-c-brand);
}

/* Post Content */
.post-content {
  font-size: 16px;
  line-height: 1.8;
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
}

/* Navigation Footer - same style as FooterDocument */
.post-navfooter {
  margin-top: 48px;
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
}

.nav-link {
  text-decoration: none;
  color: inherit;
  display: inline-block;
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

/* Related Posts Sidebar */
.related-sidebar {
  position: sticky;
  top: calc(var(--md-nav-height) + 40px);
  height: fit-content;
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
  flex-direction: column;
  gap: 12px;
  max-height: 350px;
  overflow-y: auto;
  padding-right: 4px;
}

.related-item {
  display: flex;
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
    padding: 24px 16px;
  }

  .post-layout {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .post-title {
    font-size: 28px;
  }

  .post-header {
    margin-bottom: 32px;
  }

  /* Sidebar moves to bottom on mobile */
  .related-sidebar {
    position: static;
    order: 1;
    border-top: 1px solid var(--md-c-divider-light);
    padding-top: 32px;
  }
}
</style>
