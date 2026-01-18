<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDocsStore, buildRawUrl } from '@/stores/docstree'
import { geminiService } from '@/service/gemini/geminiService'

import FileViewer from '@/components/viewers/FileViewer.vue'
import MarkdownViewer from '@/components/viewers/MarkdownViewer.vue'

const route = useRoute()
const router = useRouter()
const docs = useDocsStore()

// AI Summary states
const isSummarizing = ref(false)
const summaryContent = ref('')
const showSummaryModal = ref(false)

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

// Selected file for viewing
const selectedFile = ref(null)

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
}



function closeViewer() {
  if (selectedFile.value) {
    // If we are at a file path (currentNode is file), go up
    if (currentNode.value?.type === 'file') {
      const currentPath = pathSegments.value
      // Remove last segment (filename)
      const parentPath = currentPath.slice(0, -1).join('/')
      const separator = parentPath ? '/' : ''
      router.push(`/${route.params.section}${separator}${parentPath}`)
    } else {
      // Just clear selection if we are in a folder view
      selectedFile.value = null
    }
  }
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

// Auto-select file if currentNode is a file
watch(currentNode, (node) => {
  if (node && node.type === 'file') {
    selectedFile.value = node
  } else {
    // Only clear if we are not navigating to another file
    // Wait, if node is folder, we should clear
    selectedFile.value = null
  }
}, { immediate: true })

// AI Summary function
async function summarizeContent() {
  if (!selectedFile.value || isSummarizing.value) return

  // Check if AI is configured
  if (!geminiService.isConfigured()) {
    summaryContent.value = '⚠️ **Tính năng AI chưa được kích hoạt**\n\nHiện tại tính năng AI Summary chưa được cấu hình. Vui lòng thử lại sau.'
    showSummaryModal.value = true
    return
  }

  isSummarizing.value = true
  summaryContent.value = ''
  showSummaryModal.value = true

  const fileType = selectedFile.value.fileType

  try {
    // For binary files (PDF, Word, PowerPoint), show info message
    if (['pdf', 'word', 'powerpoint'].includes(fileType)) {
      // These files can't be easily read in browser
      // Ask AI to explain based on filename
      const fileName = selectedFile.value.name
      const prompt = `Dựa vào tên file "${fileName}" (loại ${fileType}), hãy đoán và mô tả ngắn gọn về nội dung có thể có trong file này. Nếu không thể đoán được, hãy đưa ra các gợi ý về cách đọc và tóm tắt file ${fileType.toUpperCase()}.`

      const summary = await geminiService.sendMessage(prompt)
      summaryContent.value = `📄 **File ${fileType.toUpperCase()}**\n\n${summary}\n\n---\n*Lưu ý: Để tóm tắt chi tiết hơn, cần đọc nội dung file. Hiện tại chưa hỗ trợ trích xuất text từ file ${fileType.toUpperCase()} trực tiếp.*`
    } else {
      // For text-based files (markdown, code), fetch and summarize content
      const url = buildRawUrl(selectedFile.value.path)
      const response = await fetch(url)
      const content = await response.text()

      // Truncate if too long (keep first 8000 chars for context)
      const truncatedContent = content.length > 8000
        ? content.substring(0, 8000) + '\n\n[Nội dung đã được rút gọn...]'
        : content

      // Ask Gemini to summarize
      const prompt = `Hãy tóm tắt nội dung sau đây bằng tiếng Việt, ngắn gọn và dễ hiểu. Tập trung vào các điểm chính, khái niệm quan trọng. Sử dụng bullet points nếu có nhiều ý:\n\n---\n${truncatedContent}\n---\n\nTóm tắt:`

      const summary = await geminiService.sendMessage(prompt)
      summaryContent.value = summary
    }
  } catch (error) {
    console.error('Summary error:', error)
    summaryContent.value = '❌ Không thể tóm tắt nội dung. Vui lòng thử lại sau.'
  } finally {
    isSummarizing.value = false
  }
}

function closeSummaryModal() {
  showSummaryModal.value = false
  summaryContent.value = ''
}

// Simple markdown to HTML for summary
function renderSummary(text) {
  if (!text) return ''
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n/g, '<br>')
}
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
          <span class="back-icon">←</span>
          <span class="back-text">Back to files</span>
        </button>
        <span class="viewer-title">{{ selectedFile.name }}</span>

        <!-- AI Summary Button -->
        <button
          v-if="['markdown', 'code', 'pdf', 'word', 'powerpoint'].includes(selectedFile.fileType)"
          class="ai-summary-btn"
          :class="{ 'loading': isSummarizing }"
          @click="summarizeContent"
          :disabled="isSummarizing"
          title="AI Tóm tắt"
        >
          <svg v-if="!isSummarizing" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5"></path>
            <path d="M2 12l10 5 10-5"></path>
          </svg>
          <span v-else class="spinner"></span>
          <span>{{ isSummarizing ? 'Đang tóm tắt...' : 'AI Tóm tắt' }}</span>
        </button>
      </div>

      <div class="viewer-content">
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
          @close="closeViewer"
        />
      </div>
    </div>

    <!-- AI Summary Modal -->
    <Teleport to="body">
      <div v-if="showSummaryModal" class="summary-modal-overlay" @click.self="closeSummaryModal">
        <div class="summary-modal">
          <div class="summary-header">
            <h3>🤖 AI Tóm tắt</h3>
            <button class="close-modal-btn" @click="closeSummaryModal">×</button>
          </div>
          <div class="summary-body">
            <div v-if="isSummarizing" class="summary-loading">
              <div class="loading-spinner"></div>
              <p>Đang phân tích và tóm tắt nội dung...</p>
            </div>
            <div v-else class="summary-content" v-html="renderSummary(summaryContent)"></div>
          </div>
        </div>
      </div>
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
  display: flex;
  align-items: center;
  justify-content: center;
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

.back-btn .back-icon {
  flex-shrink: 0;
}

.back-btn .back-text {
  margin-left: 4px;
}

@media (max-width: 640px) {
  .back-btn .back-text {
    display: none;
  }

  .back-btn {
    padding: 8px 12px;
  }

  .ai-summary-btn span:last-child {
    display: none;
  }

  .ai-summary-btn {
    padding: 8px 12px;
  }
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

/* AI Summary Button */
.ai-summary-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.ai-summary-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.ai-summary-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

.ai-summary-btn .spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Summary Modal */
.summary-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.summary-modal {
  background: var(--md-c-bg);
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--md-c-divider-light);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px 16px 0 0;
  color: white;
}

.summary-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-modal-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 8px;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.close-modal-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.summary-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.summary-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 20px;
  color: var(--md-c-text-2);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--md-c-divider-light);
  border-top-color: var(--md-c-brand);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.summary-content {
  font-size: 15px;
  line-height: 1.8;
  color: var(--md-c-text-1);
}

.summary-content ul {
  padding-left: 20px;
  margin: 12px 0;
}

.summary-content li {
  margin-bottom: 8px;
}

.summary-content strong {
  color: var(--md-c-brand);
}
</style>
