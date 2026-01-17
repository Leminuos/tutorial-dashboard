<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useDocsStore, buildRawUrl } from '@/stores/docstree'
import HeaderMain from '@/components/main/HeaderMain.vue'
import MarkdownViewer from '@/components/viewers/MarkdownViewer.vue'
import FileViewer from '@/components/viewers/FileViewer.vue'

const route = useRoute()
const docs = useDocsStore()

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
    <div class="container">

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

.container {
  max-width: 900px;
  margin: 0 auto;
}

.back-btn {
  background: none;
  border: none;
  color: var(--md-c-brand);
  cursor: pointer;
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: opacity 0.2s;
}

.back-btn:hover {
  opacity: 0.8;
  text-decoration: underline;
}

.post-header {
  margin-bottom: 48px;
  text-align: center;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--md-c-divider-light);
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

:deep(.markdown-body) {
  background-color: transparent !important;
}

:deep(.markdown-body img) {
  max-width: 100%;
  border-radius: 8px;
  margin: 24px 0;
}

:deep(.markdown-body h1),
:deep(.markdown-body h2),
:deep(.markdown-body h3) {
  margin-top: 32px;
  margin-bottom: 16px;
}

:deep(.markdown-body p) {
  margin-bottom: 16px;
}

:deep(.markdown-body pre) {
  border-radius: 8px;
  margin: 24px 0;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .post-detail-view {
    padding: 24px 16px;
  }

  .post-title {
    font-size: 28px;
  }

  .post-header {
    margin-bottom: 32px;
  }
}
</style>
