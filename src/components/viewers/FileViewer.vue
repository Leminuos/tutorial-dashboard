<script setup>
import { computed, defineAsyncComponent } from 'vue'
import { getFileType } from '@/config/fileTypes.config'

const props = defineProps({
  path: { type: String, required: true },
  fileName: { type: String, default: '' }
})

// Lazy load viewers
const MarkdownViewer = defineAsyncComponent(() =>
  import('./MarkdownViewer.vue')
)
const PdfViewer = defineAsyncComponent(() =>
  import('./PdfViewer.vue')
)
const ExcelViewer = defineAsyncComponent(() =>
  import('./ExcelViewer.vue')
)
const PowerPointViewer = defineAsyncComponent(() =>
  import('./PowerPointViewer.vue')
)
const CodeViewer = defineAsyncComponent(() =>
  import('./CodeViewer.vue')
)

const fileType = computed(() => {
  return getFileType(props.fileName || props.path)
})

const rendererComponent = computed(() => {
  switch (fileType.value) {
    case 'markdown':
      return MarkdownViewer
    case 'pdf':
      return PdfViewer
    case 'excel':
      return ExcelViewer
    case 'powerpoint':
      return PowerPointViewer
    case 'code':
    default:
      return CodeViewer
  }
})

// Get file name from path if not provided
const displayFileName = computed(() => {
  if (props.fileName) return props.fileName
  const parts = props.path.split('/')
  return parts[parts.length - 1]
})
</script>

<template>
  <div class="file-viewer">
    <component
      :is="rendererComponent"
      :path="path"
      :fileName="displayFileName"
    />
  </div>
</template>

<style scoped>
.file-viewer {
  width: 100%;
}
</style>
