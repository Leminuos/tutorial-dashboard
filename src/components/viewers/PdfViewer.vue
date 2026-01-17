<script setup>
import { ref, watch, computed } from 'vue'
import { buildRawUrl } from '@/stores/docstree'

const props = defineProps({
  path: { type: String, required: true },
  fileName: { type: String, default: '' }
})

const loading = ref(true)
const error = ref(null)

const pdfUrl = computed(() => {
  if (!props.path) return ''
  return buildRawUrl(props.path)
})

// Use Google Docs Viewer as fallback for CORS issues
const googleViewerUrl = computed(() => {
  if (!pdfUrl.value) return ''
  return `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl.value)}&embedded=true`
})

function onLoad() {
  loading.value = false
}

function onError() {
  loading.value = false
  error.value = 'Failed to load PDF'
}

watch(() => props.path, () => {
  loading.value = true
  error.value = null
})
</script>

<template>
  <div class="pdf-viewer">
    <div class="pdf-header" v-if="fileName">
      <span class="file-icon">📕</span>
      <span class="file-name">{{ fileName }}</span>
      <a :href="pdfUrl" target="_blank" class="download-btn" title="Open in new tab">
        ↗
      </a>
    </div>

    <div v-if="loading" class="loading">
      Loading PDF...
    </div>

    <div v-if="error" class="error">
      {{ error }}
      <a :href="pdfUrl" target="_blank" class="fallback-link">
        Open PDF in new tab
      </a>
    </div>

    <iframe
      v-show="!error"
      :src="googleViewerUrl"
      class="pdf-frame"
      @load="onLoad"
      @error="onError"
      frameborder="0"
      allowfullscreen
    ></iframe>
  </div>
</template>

<style scoped>
.pdf-viewer {
  border: 1px solid var(--md-c-divider-light);
  border-radius: 8px;
  overflow: hidden;
  background: var(--md-c-bg);
}

.pdf-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--md-c-bg-soft);
  border-bottom: 1px solid var(--md-c-divider-light);
  font-size: 13px;
  font-weight: 500;
  color: var(--md-c-text-1);
}

.file-icon {
  font-size: 14px;
}

.file-name {
  flex: 1;
}

.download-btn {
  padding: 4px 8px;
  border-radius: 4px;
  color: var(--md-c-text-2);
  text-decoration: none;
  transition: all 0.2s;
}

.download-btn:hover {
  background: var(--md-c-divider);
  color: var(--md-c-text-1);
}

.loading {
  padding: 24px;
  text-align: center;
  color: var(--md-c-text-2);
}

.error {
  padding: 24px;
  text-align: center;
  color: #e53935;
}

.fallback-link {
  display: block;
  margin-top: 12px;
  color: var(--md-c-brand);
}

.pdf-frame {
  width: 100%;
  height: 80vh;
  min-height: 500px;
  border: none;
}
</style>
