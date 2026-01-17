<script setup>
import { computed, ref, watch } from 'vue'
import { buildRawUrl } from '@/stores/docstree'

const props = defineProps({
  path: { type: String, required: true },
  fileName: { type: String, default: '' }
})

const loading = ref(true)
const error = ref(null)

// Use Office Online Viewer for PowerPoint files
const viewerUrl = computed(() => {
  if (!props.path) return ''
  const rawUrl = buildRawUrl(props.path)
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(rawUrl)}`
})

const downloadUrl = computed(() => {
  if (!props.path) return ''
  return buildRawUrl(props.path)
})

function onLoad() {
  loading.value = false
}

function onError() {
  loading.value = false
  error.value = 'Failed to load PowerPoint. The file might not be publicly accessible.'
}

watch(() => props.path, () => {
  loading.value = true
  error.value = null
})
</script>

<template>
  <div class="pptx-viewer">
    <div class="pptx-header">
      <span class="file-icon">📽️</span>
      <span class="file-name">{{ fileName || 'PowerPoint Presentation' }}</span>
      <a :href="downloadUrl" target="_blank" class="download-btn" title="Download">
        ⬇️
      </a>
    </div>

    <div v-if="loading" class="loading">
      Loading PowerPoint...
    </div>

    <div v-if="error" class="error">
      <p>{{ error }}</p>
      <a :href="downloadUrl" target="_blank" class="fallback-link">
        Download PowerPoint file
      </a>
    </div>

    <iframe
      v-show="!error"
      :src="viewerUrl"
      class="pptx-frame"
      @load="onLoad"
      @error="onError"
      frameborder="0"
      allowfullscreen
    ></iframe>
  </div>
</template>

<style scoped>
.pptx-viewer {
  border: 1px solid var(--md-c-divider-light);
  border-radius: 8px;
  overflow: hidden;
  background: var(--md-c-bg);
}

.pptx-header {
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.download-btn {
  padding: 4px 8px;
  border-radius: 4px;
  text-decoration: none;
  transition: all 0.2s;
}

.download-btn:hover {
  background: var(--md-c-divider);
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
  display: inline-block;
  margin-top: 12px;
  padding: 8px 16px;
  background: var(--md-c-brand);
  color: white;
  border-radius: 6px;
  text-decoration: none;
  transition: opacity 0.2s;
}

.fallback-link:hover {
  opacity: 0.8;
}

.pptx-frame {
  width: 100%;
  height: 80vh;
  min-height: 500px;
  border: none;
}
</style>
