<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
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

  parts.push({
    text: 'Root',
    to: '/explorer'
  })

  if (currentDoc.value) {
    parts.push({
      text: currentDoc.value.title,
      to: `/${currentDoc.value.id}`
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
        to: `/${currentDoc.value?.id}/${currentPath}`
      })
    }
  }

  // Last item should not be a link
  if (parts.length > 0) {
    parts[parts.length - 1].to = null
  }

  return parts
})

// Selected file for viewing (modal)
const selectedFile = ref(null)
const showModal = ref(false)

// Check if file type needs large modal (80% screen)
const isLargeFile = computed(() => {
  const largeTypes = ['powerpoint', 'excel', 'pdf', 'word']
  return largeTypes.includes(selectedFile.value?.fileType)
})

function getFileIcon(type) {
  const icons = {
    markdown: '📄',
    pdf: '📕',
    excel: '📊',
    powerpoint: '📽️',
    word: '📝',
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
    word: '#2b579a',
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
  return `/${route.params.section}/${newPath}`
}

function selectFile(file) {
  selectedFile.value = file
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  selectedFile.value = null
}

function handleBackdropClick(e) {
  if (e.target === e.currentTarget) {
    closeModal()
  }
}

function handleKeydown(e) {
  if (e.key === 'Escape' && showModal.value) {
    closeModal()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})

// Get child count for a folder
function getChildCount(folder) {
  const folderCount = folder.children?.filter(c => c.type === 'folder').length || 0
  const fileCount = folder.children?.filter(c => c.type === 'file').length || 0
  const parts = []
  if (folderCount > 0) parts.push(`${folderCount} folders`)
  if (fileCount > 0) parts.push(`${fileCount} files`)
  return parts.join(', ') || 'Empty'
}
</script>

<template>
  <div class="folder-docs">
    <!-- Content wrapper with border -->
    <div class="content-border">
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

    <!-- File Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showModal && selectedFile"
          class="modal-overlay"
          @click="handleBackdropClick"
        >
          <div
            class="modal-container"
            :class="{ 'modal-large': isLargeFile }"
          >
            <div class="modal-header">
              <span class="modal-title">{{ selectedFile.name }}</span>
              <button class="modal-close" @click="closeModal">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div class="modal-content">
              <!-- Markdown gets special treatment -->
              <markdown-viewer
                v-if="selectedFile.fileType === 'markdown'"
                :src="buildRawUrl(selectedFile.path)"
                max-width="100%"
              />
              <file-viewer
                v-else
                :path="selectedFile.path"
                :file-name="selectedFile.name"
                @close="closeModal"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
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

/* Modal styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.modal-container {
  background: var(--md-c-bg);
  border-radius: 16px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Large modal for powerpoint, excel, pdf */
.modal-large {
  max-width: 90vw;
  max-height: 90vh;
  width: 90vw;
  height: 85vh;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--md-c-divider-light);
  background: var(--md-c-bg-soft);
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--md-c-text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 16px;
}

.modal-close {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--md-c-text-2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.modal-close:hover {
  background: var(--md-c-divider-light);
  color: var(--md-c-text-1);
}

.modal-content {
  flex: 1;
  overflow: auto;
  padding: 20px;
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95);
}

@media (max-width: 768px) {
  .modal-container {
    max-width: 95%;
    max-height: 85vh;
    border-radius: 12px;
    margin: auto;
  }

  .modal-large {
    max-width: 95%;
    width: 95%;
    height: 90vh;
    max-height: 90vh;
    border-radius: 12px;
  }

  .modal-overlay {
    padding: 10px;
    align-items: center;
  }
}
</style>
