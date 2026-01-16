<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useDocsStore } from '@/stores/docstree'

const props = defineProps({
  toc: { type: Array, default: () => [] },
  tocOpen: { type: Boolean, default: true },
  tocActive: { type: String, default: '' },
})

const emit = defineEmits(['select-toc', 'select-example'])

const route = useRoute()
const docs = useDocsStore()

// Get current page data
const currentPage = computed(() => {
  const { section, chapter, page } = route.params
  return docs.getSidebarPage(section, chapter, page)
})

// Get examples for current page
const examples = computed(() => {
  return currentPage.value?.examples || []
})

// Get attachments for current page
const attachments = computed(() => {
  return currentPage.value?.attachments || []
})

function getFileIcon(type) {
  const icons = {
    code: '📄',
    pdf: '📕',
    excel: '📊',
    powerpoint: '📽️',
    image: '🖼️',
    markdown: '📝'
  }
  return icons[type] || '📄'
}

function onTocClick() {
  emit('select-toc')
}

function onExampleClick(example, file) {
  emit('select-example', { example, file })
}
</script>

<template>
  <aside class="right-panel" :class="{ open: tocOpen }">
    <!-- Table of Contents -->
    <section class="panel-section toc-section" v-if="toc.length">
      <h3 class="section-title">MỤC LỤC</h3>
      <nav class="toc-nav">
        <a
          v-for="item in toc"
          :key="item.id"
          :href="`#${item.id}`"
          class="toc-link"
          :class="{ active: item.id === tocActive }"
          :style="{ paddingLeft: `${(item.level - 2) * 12}px` }"
          @click="onTocClick"
        >
          {{ item.text }}
        </a>
      </nav>
    </section>

    <!-- Examples -->
    <section class="panel-section examples-section" v-if="examples.length">
      <h3 class="section-title">VÍ DỤ CODE</h3>
      <div class="examples-list">
        <div
          v-for="example in examples"
          :key="example.name"
          class="example-group"
        >
          <div class="example-name">
            <span class="folder-icon">📁</span>
            {{ example.name }}
          </div>
          <div class="example-files">
            <button
              v-for="file in example.files"
              :key="file.path"
              class="file-btn"
              @click="onExampleClick(example, file)"
            >
              <span class="file-icon">{{ getFileIcon(file.type) }}</span>
              <span class="file-name">{{ file.name }}</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Attachments -->
    <section class="panel-section attachments-section" v-if="attachments.length">
      <h3 class="section-title">Attachments</h3>
      <div class="attachments-list">
        <button
          v-for="file in attachments"
          :key="file.path"
          class="file-btn"
          @click="emit('select-example', { file })"
        >
          <span class="file-icon">{{ getFileIcon(file.type) }}</span>
          <span class="file-name">{{ file.name }}</span>
        </button>
      </div>
    </section>
  </aside>
</template>

<style scoped>
.right-panel {
  position: sticky;
  top: calc(var(--md-nav-height) + 40px);
  width: 224px;
  height: fit-content;
  max-height: calc(100vh - var(--md-nav-height) - 72px);
  display: none;
  overflow-y: auto;
}

/* Custom scrollbar */
.right-panel::-webkit-scrollbar {
  width: 4px;
}

.right-panel::-webkit-scrollbar-track {
  background: transparent;
}

.right-panel::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}

.right-panel::-webkit-scrollbar-thumb:hover {
  background: #999;
}

@media (min-width: 1280px) {
  .right-panel {
    display: block;
  }
}

/* Mobile styles */
.right-panel.open {
  position: fixed;
  top: var(--md-nav-height);
  right: 0;
  bottom: 0;
  width: 280px;
  max-height: none;
  background: var(--md-c-white);
  border-left: 1px solid var(--md-c-divider-light-2);
  padding: 24px 16px;
  z-index: 999;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  display: block;
}

.panel-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.02em;
  margin-bottom: 12px;
}

.toc-link {
  display: block;
  padding: 4px 0;
  color: var(--md-c-text-light-2);
  font-size: 14px;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-decoration: none;
  transition: all 0.2s;
}

.toc-link.active,
.toc-link:hover {
  color: var(--md-c-text-light-1);
  font-weight: 600;
}

/* Examples styles */
.examples-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.example-group {
  background: var(--md-c-white-soft);
  border-radius: 8px;
  padding: 10px;
}

.example-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--md-c-text-light-1);
  margin-bottom: 8px;
}

.folder-icon {
  font-size: 14px;
}

.example-files,
.attachments-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: var(--md-c-white);
  border: 1px solid var(--md-c-divider-light-2);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.file-btn:hover {
  background: var(--md-c-green);
  border-color: var(--md-c-green);
  color: white;
}

.file-icon {
  font-size: 12px;
}

.file-name {
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
