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
</script>

<template>
  <div class="code-viewer">
    <div class="code-header" v-if="fileName">
      <span class="file-icon">📄</span>
      <span class="file-name">{{ fileName }}</span>
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
  border: 1px solid var(--md-c-divider-light-2);
  border-radius: 8px;
  overflow: hidden;
  background: var(--md-c-white);
}

.code-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--md-c-white-soft);
  border-bottom: 1px solid var(--md-c-divider-light-2);
  font-size: 13px;
  font-weight: 500;
  color: var(--md-c-text-light-1);
}

.file-icon {
  font-size: 14px;
}

.loading,
.error {
  padding: 24px;
  text-align: center;
  color: var(--md-c-text-light-2);
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
  background: #f8f9fa;
}

.plain code {
  font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
}
</style>
