<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useDocsStore, buildRawUrl } from '@/stores/docstree'

import FileViewer from '@/components/viewers/FileViewer.vue'
import MarkdownViewer from '@/components/viewers/MarkdownViewer.vue'

const route = useRoute()
const docs = useDocsStore()

// Parse path segments from route
// With :path+ pattern, route.params.path is an array
const pathSegments = computed(() => {
  const path = route.params.path
  if (!path) return []
  // Handle both array and string formats
  if (Array.isArray(path)) {
    return path.filter(Boolean)
  }
  return path.split('/').filter(Boolean)
})

// Current doc data
const currentDoc = computed(() => {
  return docs.getDocById(route.params.section)
})

// Current folder node (navigated position in tree)
const currentNode = computed(() => {
  if (!currentDoc.value) return null
  if (pathSegments.value.length === 0) {
    return currentDoc.value // Root level
  }
  return docs.getFolderNode(route.params.section, pathSegments.value)
})

// Items at current level (folders + files)
const currentItems = computed(() => {
  return currentNode.value?.children || []
})

// Separate folders and files
const folders = computed(() => currentItems.value.filter(item => item.type === 'folder'))
const files = computed(() => currentItems.value.filter(item => item.type === 'file'))

// Breadcrumb
const breadcrumb = computed(() => {
  const parts = []
  if (currentDoc.value) {
    parts.push({
      text: currentDoc.value.title,
      to: `/docs/${currentDoc.value.id}/landing`
    })
  }

  // Add path segments
  let currentPath = ''
  for (const segment of pathSegments.value) {
    currentPath += (currentPath ? '/' : '') + segment
    const node = docs.getFolderNode(route.params.section, currentPath.split('/'))
    if (node) {
      parts.push({
        text: node.title || node.name,
        to: `/docs/${currentDoc.value?.id}/${currentPath}`
      })
    }
  }

  // Last item should not be a link
  if (parts.length > 0) {
    parts[parts.length - 1].to = null
  }

  return parts
})

// Selected file for viewing
const selectedFile = ref(null)

function getFileIcon(type) {
  const icons = {
    markdown: '📄',
    pdf: '📕',
    excel: '📊',
    powerpoint: '📽️',
    code: '💻',
    image: '🖼️'
  }
  return icons[type] || '📄'
}

function getFileColor(type) {
  const colors = {
    markdown: '#42b883',
    pdf: '#e53935',
    excel: '#2e7d32',
    powerpoint: '#ff6d00',
    code: '#1976d2',
    image: '#9c27b0'
  }
  return colors[type] || '#757575'
}

// Get folder link for router-link
function getFolderLink(folder) {
  // Handle both array and string path formats
  const currentPath = route.params.path
  let pathString = ''
  if (Array.isArray(currentPath)) {
    pathString = currentPath.join('/')
  } else {
    pathString = currentPath || ''
  }
  const newPath = pathString ? `${pathString}/${folder.id}` : folder.id
  return `/docs/${route.params.section}/${newPath}`
}

function selectFile(file) {
  selectedFile.value = file
}

function closeViewer() {
  selectedFile.value = null
}

// Get child count for a folder
function getChildCount(folder) {
  const folderCount = folder.children?.filter(c => c.type === 'folder').length || 0
  const fileCount = folder.children?.filter(c => c.type === 'file').length || 0
  const parts = []
  if (folderCount > 0) parts.push(`${folderCount} folders`)
  if (fileCount > 0) parts.push(`${fileCount} files`)
  return parts.join(', ') || 'Empty'
}

// Close viewer on route change
watch(() => route.params, () => {
  selectedFile.value = null
})
</script>

<template>
  <div class="folder-docs">
    <!-- Content wrapper with border -->
    <div v-if="!selectedFile" class="content-border">
      <!-- Breadcrumb -->
      <div class="breadcrumb" v-if="breadcrumb.length">
        <template v-for="(part, index) in breadcrumb" :key="index">
          <span v-if="index > 0" class="separator">›</span>
          <router-link v-if="part.to" :to="part.to" class="breadcrumb-link">
            {{ part.text }}
          </router-link>
          <span v-else class="breadcrumb-current">{{ part.text }}</span>
        </template>
      </div>

      <!-- Page title -->
      <h1 class="page-title">{{ currentNode?.title || currentDoc?.title }}</h1>

      <!-- Combined items grid (folders + files) -->
      <div class="items-grid">
        <!-- Folders -->
        <router-link
          v-for="folder in folders"
          :key="'folder-' + folder.id"
          :to="getFolderLink(folder)"
          class="item-card folder-card"
        >
          <span class="item-icon folder-icon">📁</span>
          <div class="item-info">
            <span class="item-name">{{ folder.title }}</span>
            <span class="item-meta">{{ getChildCount(folder) }}</span>
          </div>
          <span class="item-arrow">→</span>
        </router-link>

        <!-- Files -->
        <button
          v-for="file in files"
          :key="'file-' + file.path"
          class="item-card file-card"
          @click="selectFile(file)"
        >
          <div class="item-icon file-icon-wrapper" :style="{ background: getFileColor(file.fileType) }">
            <span>{{ getFileIcon(file.fileType) }}</span>
          </div>
          <div class="item-info">
            <span class="item-name">{{ file.name }}</span>
            <span class="item-meta">{{ file.fileType?.toUpperCase() }}</span>
          </div>
        </button>
      </div>

      <!-- Empty state -->
      <div v-if="!currentItems.length" class="empty">
        This folder is empty
      </div>
    </div>

    <!-- Selected file viewer -->
    <div v-else class="file-viewer-container">
      <div class="viewer-header">
        <button class="back-btn" @click="closeViewer">
          ← Back to files
        </button>
        <span class="viewer-title">{{ selectedFile.name }}</span>
      </div>

      <div class="viewer-content">
        <!-- Markdown gets special treatment -->
        <markdown-viewer
          v-if="selectedFile.fileType === 'markdown'"
          :src="buildRawUrl(selectedFile.path)"
        />
        <file-viewer
          v-else
          :path="selectedFile.path"
          :file-name="selectedFile.name"
        />
      </div>
    </div>

  </div>
</template>

<style scoped>
.folder-docs {
  padding: 24px;
  min-height: calc(100vh - var(--md-nav-height));
}

@media (min-width: 960px) {
  .folder-docs {
    padding: 48px 100px;
  }
}

@media (min-width: 1280px) {
  .folder-docs {
    padding: 48px 150px;
  }
}

@media (min-width: 1600px) {
  .folder-docs {
    padding: 48px 200px;
  }
}

/* Content border wrapper */
.content-border {
  border: 1px solid var(--md-c-divider-light);
  border-radius: 12px;
  padding: 24px;
  margin: 24px 0;
  background: var(--md-c-bg);
}

@media (min-width: 960px) {
  .content-border {
    padding: 32px;
    margin: 32px 0;
  }
}

/* Breadcrumb */
.breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
  font-size: 14px;
  color: var(--md-c-text-2);
}

.breadcrumb-link {
  color: var(--md-c-text-2);
  text-decoration: none;
  transition: color 0.2s;
}

.breadcrumb-link:hover {
  color: var(--md-c-brand);
}

.breadcrumb-current {
  color: var(--md-c-text-1);
  font-weight: 500;
}

.separator {
  color: var(--md-c-divider-light);
}

/* Page title */
.page-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--md-c-text-1);
  margin-bottom: 24px;
}

/* Items grid (folders + files combined) */
.items-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
}

.item-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--md-c-bg-soft);
  border: 1px solid var(--md-c-divider-light);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  text-align: left;
}

.item-card:hover {
  border-color: var(--md-c-brand);
  background: var(--md-c-brand);
  color: white;
}

.item-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.folder-icon {
  font-size: 24px;
}

.file-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--md-c-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-card:hover .item-name {
  color: white;
}

.item-meta {
  font-size: 12px;
  color: var(--md-c-text-2);
  transition: color 0.2s;
}

.item-card:hover .item-meta {
  color: rgba(255, 255, 255, 0.8);
}

.item-arrow {
  font-size: 16px;
  color: var(--md-c-text-2);
  transition: all 0.2s;
}

.item-card:hover .item-arrow {
  color: white;
  transform: translateX(4px);
}

/* File card specific */
.file-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.empty {
  padding: 48px;
  text-align: center;
  color: var(--md-c-text-2);
}

/* File viewer */
.file-viewer-container {
  position: fixed;
  inset: 0;
  top: var(--md-nav-height);
  padding: 0 15px;
  z-index: 100;
  background: var(--md-c-bg);
  display: flex;
  flex-direction: column;
}

@media (min-width: 1280px) {
  .file-viewer-container {
    padding: 0 32px;
  }
}

@media (min-width: 1440px) {
  .file-viewer-container {
    padding: 0 100px;
  }
}

@media (min-width: 1600px) {
  .file-viewer-container {
    padding: 0 150px;
  }
}

@media (min-width: 1920px) {
  .file-viewer-container {
    padding: 0 200px;
  }
}

.viewer-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  margin: 24px 0;
  background: var(--md-c-bg-soft);
  border-radius: 6px;
  border: 1px solid var(--md-c-divider-light);
}

@media (min-width: 960px) {
  .viewer-header {
    padding: 16px 24px;
    margin: 24px 0;
    border-radius: 12px;
  }
}

.back-btn {
  padding: 8px 16px;
  background: var(--md-c-bg);
  border: 1px solid var(--md-c-divider-light);
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.back-btn:hover {
  background: var(--md-c-brand);
  color: white;
  border-color: var(--md-c-brand);
}

.viewer-title {
  flex: 1;
  min-width: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--md-c-text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.viewer-content {
  flex: 1;
  overflow: auto;
  margin-bottom: 24px;
}
</style>
