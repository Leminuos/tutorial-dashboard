<script setup>
import { ref, onMounted, watch } from 'vue'
import { buildRawUrl } from '@/stores/docstree'
// Check if docx-preview is available, otherwise show instructions
let renderAsync = null

try {
  // Use string literal for better bundler support
  import('docx-preview').then(module => {
    renderAsync = module.renderAsync
    loadWord()
  }).catch((err) => {
    console.error("docx-preview import failed:", err)
    error.value = "Document viewer component could not be loaded."
    loading.value = false
  })
} catch (e) {
  console.error("docx-preview setup failed:", e)
}

onMounted(() => {
  if (renderAsync) loadWord()
})

const props = defineProps({
  path: { type: String, required: true },
  fileName: { type: String, default: '' }
})

const container = ref(null)
const loading = ref(true)
const error = ref(null)

async function loadWord() {
  if (!renderAsync) return // Waiting for module

  loading.value = true
  error.value = null

  try {
    const url = buildRawUrl(props.path)
    const res = await fetch(url)

    if (!res.ok) throw new Error(`Failed to load file: ${res.status}`)

    const blob = await res.blob()

    if (container.value) {
      container.value.innerHTML = '' // Clear previous
      await renderAsync(blob, container.value, container.value, {
        className: 'docx_viewer',
        inWrapper: true,
        ignoreWidth: false,
        breakPages: true,
        ignoreLastRenderedPageBreak: false,
        experimental: false,
        trimXmlDeclaration: true,
        useBase64URL: false,
        useMathMLPolyfill: false,
        showChanges: false,
        debug: false,
      })
    }
  } catch (err) {
    error.value = "Failed to render Word document: " + err.message
    console.error(err)
  } finally {
    loading.value = false
  }
}

watch(() => props.path, loadWord)
</script>

<template>
  <div class="word-viewer">
    <div class="header">
      <span class="file-icon">📝</span>
      <span class="file-name">{{ fileName || 'Document.docx' }}</span>
      <span class="app-name">- Word Viewer</span>
    </div>

    <div v-if="loading && !error" class="loading">
      <div class="spinner"></div> Loading Document...
    </div>

    <div v-if="error" class="error">
      <div class="error-icon">⚠️</div>
      <div class="error-msg">{{ error }}</div>
    </div>

    <div ref="container" class="document-container"></div>
  </div>
</template>

<style scoped>
.word-viewer {
  display: flex;
  flex-direction: column;
  background: #f3f2f1;
  border: 1px solid #e1dfdd;
  border-radius: 4px;
  height: 80vh;
  min-height: 500px;
}

.header {
  background: #2b579a; /* Word Blue */
  color: white;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Segoe UI', sans-serif;
  font-size: 14px;
}

.app-name {
  opacity: 0.8;
  font-weight: 400;
}

.document-container {
  flex: 1;
  overflow: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

/* Styles specifically for docx-preview wrapper if needed */
:deep(.docx_wrapper) {
  background: white;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  padding: 40px !important;
  max-width: 800px;
  margin: 0 auto;
}

.loading, .error {
  padding: 40px;
  text-align: center;
  color: #666;
}

.error-msg {
  color: #d13438;
  margin-top: 8px;
}

.install-hint {
  margin-top: 16px;
  background: #fff;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  display: inline-block;
}

.spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid #ccc;
  border-top-color: #2b579a;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 8px;
  vertical-align: middle;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
