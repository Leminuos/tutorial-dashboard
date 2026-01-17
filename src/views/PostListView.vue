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

// Fetch metadata when category changes
watch(categoryId, (newId) => {
  if (newId) {
    docsStore.fetchCategoryMetadata(newId)
    currentPage.value = 1
  }
}, { immediate: true })

// Get metadata from store
const metadata = computed(() => docsStore.getPostMetadata(categoryId.value) || {})
const posts = computed(() => metadata.value.posts || [])
const rawPath = computed(() => metadata.value.rawPath || categoryId.value)

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
</script>

<template>
  <!-- Header Main for navigation -->
  <HeaderMain />

  <div class="post-list-view">
    <div class="container">
      <!-- Page Header -->
      <!-- <header class="page-header">
        <h1>{{}}</h1>
      </header> -->

      <!-- Empty State -->
      <div v-if="!posts.length" class="empty-state">
        <p>No posts found in this category.</p>
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
      <div v-if="totalPages > 1" class="pagination">
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
  margin: 0 auto;
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
