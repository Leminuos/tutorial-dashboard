<script setup>
import { ref, watch, onMounted } from 'vue'
import { buildRawUrl } from '@/stores/docstree'
import { createHighlighter } from 'shiki'
import shikiConfig from '@/config/shiki.config'

const props = defineProps({
  path: { type: String, required: true },
  fileName: { type: String, default: '' }
})

const code = ref('')
const highlightedCode = ref('')
const loading = ref(true)
const error = ref(null)
const highlighter = ref(null)

// Map file extensions to Shiki language IDs
const langMap = {
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.hpp': 'cpp',
  '.cc': 'cpp',
  '.py': 'python',
  '.pyw': 'python',
  '.js': 'javascript',
  '.jsx': 'jsx',
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.vue': 'vue',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'bash',
  '.html': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'sass',
  '.java': 'java',
  '.kt': 'kotlin',
  '.kts': 'kotlin',
  '.go': 'go',
  '.rs': 'rust',
  '.rb': 'ruby',
  '.sql': 'sql',
  '.graphql': 'graphql',
  '.xml': 'xml',
  '.toml': 'toml',
  '.ini': 'ini',
  '.makefile': 'makefile',
  '.cmake': 'cmake',
  '.dockerfile': 'dockerfile',
  '.md': 'markdown',
}

function getLanguage(fileName) {
  const lowerName = fileName.toLowerCase()

  // Special filenames
  if (lowerName === 'makefile') return 'makefile'
  if (lowerName === 'dockerfile') return 'dockerfile'
  if (lowerName === 'cmakelists.txt') return 'cmake'

  const ext = '.' + lowerName.split('.').pop()
  return langMap[ext] || 'text'
}

async function loadCode() {
  loading.value = true
  error.value = null

  try {
    const url = buildRawUrl(props.path)
    const res = await fetch(url)

    if (!res.ok) {
      throw new Error(`Failed to load file: ${res.status}`)
    }

    code.value = await res.text()

    // Highlight code
    if (highlighter.value) {
      const lang = getLanguage(props.fileName || props.path)
      highlightedCode.value = highlighter.value.codeToHtml(code.value, {
        lang,
        theme: shikiConfig.theme || 'github-light'
      })
    }
  } catch (err) {
    error.value = err.message
    console.error('Failed to load code:', err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    highlighter.value = await createHighlighter({
      themes: [shikiConfig.theme || 'github-light'],
      langs: Object.values(langMap).filter((v, i, a) => a.indexOf(v) === i)
    })
  } catch (err) {
    console.warn('Failed to initialize Shiki highlighter:', err)
  }

  await loadCode()
})

watch(() => props.path, loadCode)

// Copy and download functionality
const copied = ref(false)

async function copyCode() {
  try {
    await navigator.clipboard.writeText(code.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

function downloadFile() {
  const blob = new Blob([code.value], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = props.fileName || props.path.split('/').pop()
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="code-viewer">
    <div class="code-header">
      <div class="header-left">
        <span class="file-icon">📄</span>
        <span class="file-name">{{ fileName }}</span>
      </div>
      <div class="header-actions" v-if="!loading && !error">
        <button class="action-btn" @click="copyCode" :title="copied ? 'Đã copy!' : 'Copy code'">
          <svg v-if="!copied" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#42b883" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
        <button class="action-btn" @click="downloadFile" title="Tải xuống">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      Loading code...
    </div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <div v-else class="code-content">
      <div v-if="highlightedCode" v-html="highlightedCode" class="highlighted"></div>
      <pre v-else class="plain"><code>{{ code }}</code></pre>
    </div>
  </div>
</template>

<style scoped>
.code-viewer {
  border: 1px solid var(--md-c-divider-light);
  border-radius: 8px;
  overflow: hidden;
  background: var(--md-c-bg);
}

.code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--md-c-bg-soft);
  border-bottom: 1px solid var(--md-c-divider-light);
  font-size: 13px;
  font-weight: 500;
  color: var(--md-c-text-1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--md-c-text-2);
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--md-c-divider-light);
  color: var(--md-c-text-1);
}

.file-icon {
  font-size: 14px;
}

.loading,
.error {
  padding: 24px;
  text-align: center;
  color: var(--md-c-text-2);
}

.error {
  color: #e53935;
}

.code-content {
  overflow-x: auto;
}

.highlighted :deep(pre) {
  margin: 0;
  padding: 16px;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
}

.highlighted :deep(code) {
  font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
}

.plain {
  margin: 0;
  padding: 16px;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
  background: var(--md-c-bg-soft);
}

.plain code {
  font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
}
</style>
