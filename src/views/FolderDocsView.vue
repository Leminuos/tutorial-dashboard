<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useDocsStore, buildRawUrl } from '@/stores/docstree'

import FileViewer from '@/components/viewers/FileViewer.vue'
import MarkdownViewer from '@/components/viewers/MarkdownViewer.vue'

const route = useRoute()
const docs = useDocsStore()

// Current doc data
const currentDoc = computed(() => {
  return docs.getDocById(route.params.section)
})

// Current category
const currentCategory = computed(() => {
  const categoryId = route.params.category
  if (!categoryId || !currentDoc.value) return null
  return currentDoc.value.categories?.find(c => c.id === categoryId)
})

// Current subcategory
const currentSubcategory = computed(() => {
  const subcategoryId = route.params.subcategory
  if (!subcategoryId || !currentCategory.value) return null
  return currentCategory.value.subcategories?.find(s => s.id === subcategoryId)
})

// Files in current subcategory
const files = computed(() => {
  return currentSubcategory.value?.files || []
})

// Navigation level
const navLevel = computed(() => {
  if (route.params.subcategory) return 'subcategory'
  if (route.params.category) return 'category'
  return 'landing'
})

// Breadcrumb
const breadcrumb = computed(() => {
  const parts = []
  if (currentDoc.value) {
    parts.push({ text: currentDoc.value.title, to: `/docs/${currentDoc.value.id}/landing` })
  }
  if (currentCategory.value) {
    parts.push({ text: currentCategory.value.title, to: `/docs/${currentDoc.value.id}/${currentCategory.value.id}` })
  }
  if (currentSubcategory.value) {
    parts.push({ text: currentSubcategory.value.title, to: null })
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

function selectFile(file) {
  selectedFile.value = file
}

function closeViewer() {
  selectedFile.value = null
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

      <!-- Landing page - show all categories -->
      <div v-if="navLevel === 'landing'" class="landing">
        <h1 class="landing-title">{{ currentDoc?.title }}</h1>

        <div class="categories-grid">
          <router-link
            v-for="cat in currentDoc?.categories"
            :key="cat.id"
            :to="`/docs/${currentDoc?.id}/${cat.id}`"
            class="category-card"
          >
            <span class="category-icon">📁</span>
            <span class="category-name">{{ cat.title }}</span>
            <span class="subcategory-count">{{ cat.subcategories?.length }} folders</span>
          </router-link>
        </div>
      </div>

      <!-- Category page - show subcategories -->
      <div v-else-if="navLevel === 'category'" class="category-content">
        <h1 class="page-title">{{ currentCategory?.title }}</h1>

        <div class="subcategories-grid">
          <router-link
            v-for="sub in currentCategory?.subcategories"
            :key="sub.id"
            :to="`/docs/${currentDoc?.id}/${currentCategory?.id}/${sub.id}`"
            class="subcategory-card"
          >
            <span class="folder-icon">📁</span>
            <div class="subcategory-info">
              <span class="subcategory-name">{{ sub.title }}</span>
              <span class="file-count">{{ sub.files?.length }} files</span>
            </div>
          </router-link>
        </div>
      </div>

      <!-- Subcategory page - show files -->
      <div v-else class="subcategory-content">
        <h1 class="page-title">{{ currentSubcategory?.title }}</h1>

        <!-- Files grid -->
        <div class="files-grid">
          <button
            v-for="file in files"
            :key="file.path"
            class="file-card"
            @click="selectFile(file)"
          >
            <div class="file-icon-wrapper" :style="{ background: getFileColor(file.type) }">
              <span class="file-icon">{{ getFileIcon(file.type) }}</span>
            </div>
            <div class="file-info">
              <span class="file-name">{{ file.name }}</span>
              <span class="file-type">{{ file.type.toUpperCase() }}</span>
            </div>
          </button>
        </div>

        <!-- Empty state -->
        <div v-if="!files.length" class="empty">
          No files in this folder
        </div>
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
          v-if="selectedFile.type === 'markdown'"
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

/* Landing page */
.landing-title {
  font-size: 32px;
  font-weight: 700;
  color: var(--md-c-text-1);
  margin-bottom: 32px;
}

.categories-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.category-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--md-c-bg-soft);
  border: 1px solid var(--md-c-divider-light);
  border-radius: 10px;
  text-decoration: none;
  color: var(--md-c-text-1);
  transition: all 0.2s;
}

.category-card:hover {
  border-color: var(--md-c-brand);
  background: var(--md-c-bg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.category-card .category-icon {
  font-size: 24px;
}

.category-name {
  font-size: 16px;
  font-weight: 600;
  flex: 1;
}

.subcategory-count {
  font-size: 12px;
  color: var(--md-c-text-2);
}

/* Category page */
.page-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--md-c-text-1);
  margin-bottom: 24px;
}

.subcategories-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

.subcategory-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--md-c-bg-soft);
  border: 1px solid var(--md-c-divider-light);
  border-radius: 10px;
  text-decoration: none;
  color: var(--md-c-text-1);
  transition: all 0.2s;
}

.subcategory-card:hover {
  border-color: var(--md-c-brand);
  background: var(--md-c-brand);
  color: white;
}

.subcategory-card:hover .file-count {
  color: rgba(255, 255, 255, 0.8);
}

.folder-icon {
  font-size: 20px;
}

.subcategory-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.subcategory-name {
  font-size: 15px;
  font-weight: 500;
}

.file-count {
  font-size: 12px;
  color: var(--md-c-text-2);
  transition: color 0.2s;
}

/* Subcategory content - Files */
.files-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.file-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--md-c-bg-soft);
  border: 1px solid var(--md-c-divider-light);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.file-card:hover {
  border-color: var(--md-c-brand);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.file-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-icon {
  font-size: 20px;
}

.file-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--md-c-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-type {
  font-size: 11px;
  color: var(--md-c-text-2);
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
}

.back-btn:hover {
  background: var(--md-c-brand);
  color: white;
  border-color: var(--md-c-brand);
}

.back-btn {
  white-space: nowrap;
  flex-shrink: 0;
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
