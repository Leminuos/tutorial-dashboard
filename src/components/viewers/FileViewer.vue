<script setup>
import { computed, defineAsyncComponent, ref, onMounted } from 'vue'
import { getFileType } from '@/config/fileTypes.config'
import { buildRawUrl } from '@/stores/docstree'

const props = defineProps({
  path: { type: String, required: true },
  fileName: { type: String, default: '' }
})

const emit = defineEmits(['close'])

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

// Mobile detection
const isMobile = ref(false)

onMounted(() => {
  isMobile.value = window.innerWidth < 768
})

const fileType = computed(() => {
  return getFileType(props.fileName || props.path)
})

// Check if file is Office type (excel, powerpoint, or word)
const isOfficeFile = computed(() => {
  const officeTypes = ['excel', 'powerpoint', 'word']
  return officeTypes.includes(fileType.value)
})

// Check if file is unsupported (unknown type)
const isUnsupportedFile = computed(() => {
  return fileType.value === 'unknown'
})

// Should show popup
const showPopup = computed(() => {
  // Case 1: Office files on mobile
  if (isMobile.value && isOfficeFile.value) return true
  // Case 2: Unsupported files on any device
  if (isUnsupportedFile.value) return true
  return false
})

// Popup message
const popupMessage = computed(() => {
  if (isMobile.value && isOfficeFile.value) {
    return {
      title: 'File không hỗ trợ trên Mobile',
      message: 'File Office (Excel, PowerPoint, Word) không thể xem trên thiết bị di động. Vui lòng sử dụng máy tính để xem file này.',
      icon: '📱',
      canDownload: true
    }
  }
  if (isUnsupportedFile.value) {
    return {
      title: 'File không được hỗ trợ',
      message: 'Định dạng file này chưa được hỗ trợ để xem trực tiếp. Bạn có thể tải file về để mở.',
      icon: '⚠️',
      canDownload: true
    }
  }
  return null
})

const WordViewer = defineAsyncComponent(() =>
  import('./WordViewer.vue')
)

const rendererComponent = computed(() => {
  if (showPopup.value) return null

  switch (fileType.value) {
    case 'markdown':
      return MarkdownViewer
    case 'pdf':
      return PdfViewer
    case 'excel':
      return ExcelViewer
    case 'powerpoint':
      return PowerPointViewer
    case 'word':
      return WordViewer
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

// Download file
function downloadFile() {
  const url = buildRawUrl(props.path)
  window.open(url, '_blank')
}

// Close popup
function closePopup() {
  emit('close')
}
</script>

<template>
  <div class="file-viewer">
    <!-- Popup for unsupported files -->
    <div v-if="showPopup" class="unsupported-popup">
      <div class="popup-content">
        <span class="popup-icon">{{ popupMessage.icon }}</span>
        <h3 class="popup-title">{{ popupMessage.title }}</h3>
        <p class="popup-message">{{ popupMessage.message }}</p>
        <div class="popup-file-name">
          <span class="file-label">File:</span>
          <span class="file-name">{{ displayFileName }}</span>
        </div>
        <div class="popup-actions">
          <button v-if="popupMessage.canDownload" class="btn-download" @click="downloadFile">
            📥 Tải xuống
          </button>
          <button class="btn-close" @click="closePopup">
            Đóng
          </button>
        </div>
      </div>
    </div>

    <!-- Normal file viewer -->
    <component
      v-else
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

.unsupported-popup {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  padding: 24px;
}

.popup-content {
  max-width: 400px;
  text-align: center;
  padding: 32px;
  background: var(--md-c-bg-soft);
  border: 1px solid var(--md-c-divider-light);
  border-radius: 16px;
}

.popup-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}

.popup-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--md-c-text-1);
  margin-bottom: 12px;
}

.popup-message {
  font-size: 14px;
  color: var(--md-c-text-2);
  line-height: 1.6;
  margin-bottom: 16px;
}

.popup-file-name {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--md-c-bg);
  border-radius: 8px;
  margin-bottom: 24px;
  font-size: 13px;
}

.file-label {
  color: var(--md-c-text-2);
}

.file-name {
  color: var(--md-c-text-1);
  font-weight: 500;
  word-break: break-all;
}

.popup-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn-download,
.btn-close {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-download {
  background: var(--md-c-brand);
  color: white;
  border: none;
}

.btn-download:hover {
  background: var(--md-c-brand-dark);
  transform: translateY(-1px);
}

.btn-close {
  background: transparent;
  color: var(--md-c-text-2);
  border: 1px solid var(--md-c-divider-light);
}

.btn-close:hover {
  background: var(--md-c-bg);
  border-color: var(--md-c-text-2);
}
</style>
