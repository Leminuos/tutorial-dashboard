<script setup>
import { computed, watch, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useDocsStore, buildRawUrl } from '@/stores/docstree'
import HeaderMain from '@/components/main/HeaderMain.vue'

const route = useRoute()
const docsStore = useDocsStore()

const categoryId = computed(() => {
  const c = route.params.category
  return Array.isArray(c) ? c.join('/') : c
})

const currentPage = ref(1)
const pageSize = 6
const isLoading = ref(true)

// Fetch metadata when category changes
watch(categoryId, async (newId) => {
  if (newId) {
    isLoading.value = true
    await docsStore.fetchCategoryMetadata(newId)
    currentPage.value = 1
    isLoading.value = false
  }
}, { immediate: true })

// Get metadata from store
const metadata = computed(() => docsStore.getPostMetadata(categoryId.value) || {})
const posts = computed(() => metadata.value.posts || [])
const rawPath = computed(() => metadata.value.rawPath || categoryId.value)

// Category info for header
const categoryTitle = computed(() => {
  // Extract title from categoryId (e.g., "blog/tech" -> "Tech")
  const parts = categoryId.value?.split('/') || []
  const lastPart = parts[parts.length - 1] || 'Posts'
  return lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace(/-/g, ' ')
})

const categoryDescription = computed(() => {
  return metadata.value.description || `Danh sách bài viết trong ${categoryTitle.value.toLowerCase()}`
})

// Pagination
const totalPages = computed(() => Math.ceil(posts.value.length / pageSize))
const paginatedPosts = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return posts.value.slice(start, end)
})

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

// Generate link for a post
function getPostLink(post) {
  return `/posts/view/${categoryId.value}/${post.id}`
}

// Resolve image URL
function getImageUrl(post) {
  if (!post.image) return null
  if (post.image.startsWith('http')) return post.image
  return buildRawUrl(`${rawPath.value}/${post.image}`)
}

// Format date
function formatDate(dateStr) {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    const date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
  return dateStr
}

// Reading time estimation (based on description length, assuming ~200 words/min)
function getReadingTime(post) {
  const text = post.description || ''
  // Estimate total content is about 5-10x the description
  const estimatedWords = text.split(/\s+/).length * 8
  const minutes = Math.max(1, Math.ceil(estimatedWords / 200))
  return `${minutes} phút đọc`
}
</script>

<template>
  <!-- Header Main for navigation -->
  <HeaderMain />

  <div class="post-list-view">
    <div class="container">
      <!-- Page Header -->
      <header class="page-header">
        <h1>{{ categoryTitle.toUpperCase() }}</h1>
        <p class="page-description">{{ categoryDescription }}</p>
        <div class="post-count" v-if="!isLoading">
          {{ posts.length }} bài viết
        </div>
      </header>

      <!-- Skeleton Loading -->
      <div v-if="isLoading" class="posts-list">
        <div v-for="n in 3" :key="n" class="post-row skeleton">
          <div class="post-thumbnail skeleton-thumbnail">
            <div class="skeleton-shimmer"></div>
          </div>
          <div class="post-content">
            <div class="skeleton-line skeleton-meta"></div>
            <div class="skeleton-line skeleton-title"></div>
            <div class="skeleton-line skeleton-desc"></div>
            <div class="skeleton-line skeleton-desc-short"></div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!posts.length" class="empty-state">
        <p>Không tìm thấy bài viết nào trong danh mục này.</p>
      </div>

      <!-- Posts List (Horizontal Rows) -->
      <div v-else class="posts-list">
        <router-link
          v-for="post in paginatedPosts"
          :key="post.id"
          :to="getPostLink(post)"
          class="post-row"
        >
          <!-- Thumbnail -->
          <div class="post-thumbnail">
            <img v-if="getImageUrl(post)" :src="getImageUrl(post)" :alt="post.title" loading="lazy">
            <div v-else class="placeholder-img">
              <span>📄</span>
            </div>
          </div>

          <!-- Content -->
          <div class="post-content">
            <div class="post-meta">
              <span class="post-date" v-if="post.date">{{ formatDate(post.date) }}</span>
              <span class="post-reading-time">• {{ getReadingTime(post) }}</span>
              <span class="post-author" v-if="post.author">• {{ post.author }}</span>
            </div>
            <h2 class="post-title">{{ post.title }}</h2>
            <p class="post-description">{{ post.description }}</p>
            <div class="post-tags" v-if="post.tags && post.tags.length">
              <span v-for="tag in post.tags" :key="tag" class="tag">#{{ tag }}</span>
            </div>
          </div>

          <!-- Arrow -->
          <div class="post-arrow">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        </router-link>
      </div>

      <!-- Pagination -->
      <div v-if="!isLoading && totalPages > 1" class="pagination">
        <button
          class="page-btn"
          :disabled="currentPage === 1"
          @click="goToPage(currentPage - 1)"
        >
          ← Prev
        </button>

        <div class="page-numbers">
          <button
            v-for="page in totalPages"
            :key="page"
            class="page-num"
            :class="{ active: currentPage === page }"
            @click="goToPage(page)"
          >
            {{ page }}
          </button>
        </div>

        <button
          class="page-btn"
          :disabled="currentPage === totalPages"
          @click="goToPage(currentPage + 1)"
        >
          Next →
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.post-list-view {
  padding: 40px 20px;
  background-color: var(--md-c-bg);
  min-height: calc(100vh - var(--md-nav-height));
  margin-top: var(--md-nav-height);
}

.container {
  max-width: 900px;
  margin: 0 auto;
}

/* Page Header */
.page-header {
  margin-bottom: 48px;
  text-align: center;
}

.page-header h1 {
  font-size: 36px;
  font-weight: 800;
  margin-bottom: 12px;
  color: var(--md-c-text-1);
}

.page-description {
  font-size: 18px;
  color: var(--md-c-text-2);
  max-width: 600px;
  margin: 0 auto 16px;
}

.post-count {
  display: inline-block;
  background: var(--md-c-brand);
  color: white;
  padding: 6px 16px;
  border-radius: 100px;
  font-size: 14px;
  font-weight: 600;
}

/* Reading Time */
.post-reading-time {
  color: var(--md-c-text-3);
  font-size: 13px;
  margin-left: 8px;
}

/* Skeleton Loading */
.post-row.skeleton {
  pointer-events: none;
}

.skeleton-thumbnail {
  position: relative;
  overflow: hidden;
  background: var(--md-c-bg-mute);
}

.skeleton-shimmer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.1) 50%,
    transparent 100%
  );
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.skeleton-line {
  background: var(--md-c-bg-mute);
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}

.skeleton-line::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.1) 50%,
    transparent 100%
  );
  animation: shimmer 1.5s infinite;
}

.skeleton-meta {
  width: 150px;
  height: 14px;
  margin-bottom: 12px;
}

.skeleton-title {
  width: 80%;
  height: 24px;
  margin-bottom: 10px;
}

.skeleton-desc {
  width: 100%;
  height: 14px;
  margin-bottom: 8px;
}

.skeleton-desc-short {
  width: 60%;
  height: 14px;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--md-c-text-2);
  background: var(--md-c-bg-soft);
  border-radius: 12px;
}

/* Posts List */
.posts-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 48px;
}

.post-row {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 20px;
  background: var(--md-c-bg-soft);
  border: 1px solid var(--md-c-divider-light);
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
}

.post-row:hover {
  border-color: var(--md-c-brand);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateX(4px);
}

/* Thumbnail */
.post-thumbnail {
  width: 160px;
  height: 100px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  background: var(--md-c-bg-mute);
}

.post-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder-img {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: var(--md-c-text-3);
}

/* Content */
.post-content {
  flex: 1;
  min-width: 0;
}

.post-meta {
  font-size: 13px;
  color: var(--md-c-text-2);
  margin-bottom: 8px;
}

.post-date {
  color: var(--md-c-brand);
  font-weight: 600;
}

.post-author {
  margin-left: 8px;
}

.post-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--md-c-text-1);
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.post-row:hover .post-title {
  color: var(--md-c-brand);
}

.post-description {
  font-size: 14px;
  color: var(--md-c-text-2);
  margin: 0 0 8px 0;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  font-size: 12px;
  color: var(--md-c-brand);
  background: rgba(var(--md-c-brand-rgb, 0, 150, 136), 0.1);
  padding: 2px 8px;
  border-radius: 100px;
}

/* Arrow */
.post-arrow {
  color: var(--md-c-text-3);
  transition: all 0.2s;
}

.post-row:hover .post-arrow {
  color: var(--md-c-brand);
  transform: translateX(4px);
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 24px 0;
}

.page-btn {
  padding: 10px 20px;
  background: var(--md-c-brand);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s;
}

.page-btn:disabled {
  background: var(--md-c-bg-mute);
  color: var(--md-c-text-3);
  cursor: not-allowed;
}

.page-btn:not(:disabled):hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.page-numbers {
  display: flex;
  gap: 8px;
}

.page-num {
  width: 40px;
  height: 40px;
  border: 1px solid var(--md-c-divider-light);
  background: var(--md-c-bg);
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  color: var(--md-c-text-2);
  transition: all 0.2s;
}

.page-num:hover {
  border-color: var(--md-c-brand);
  color: var(--md-c-brand);
}

.page-num.active {
  background: var(--md-c-brand);
  color: white;
  border-color: var(--md-c-brand);
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .post-list-view {
    padding: 24px 16px;
  }

  .page-header h1 {
    font-size: 28px;
  }

  .post-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .post-thumbnail {
    width: 100%;
    height: 180px;
  }

  .post-arrow {
    display: none;
  }

  .pagination {
    flex-wrap: wrap;
  }

  .page-numbers {
    order: 3;
    width: 100%;
    justify-content: center;
    margin-top: 12px;
  }
}
</style>
