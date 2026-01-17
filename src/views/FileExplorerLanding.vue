<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDocsStore } from '@/stores/docstree'

const docs = useDocsStore()
const router = useRouter()

// Get all folder-layout docs (e.g., Project, etc.)
const folderDocs = computed(() => {
  return docs.folderDocs
})

function navigateToFolder(docId) {
  // Navigate to root-level folder path: /:section
  router.push(`/${docId}`)
}
</script>

<template>
  <div class="explorer-landing">
    <div class="explorer-header">
      <h1 class="page-title">File Explorer</h1>
      <p class="page-subtitle">Browse documentation folders</p>
    </div>

    <div class="drives-grid">
      <div
        v-for="doc in folderDocs"
        :key="doc.id"
        class="drive-card"
        @click="navigateToFolder(doc.id)"
      >
        <div class="drive-icon">📁</div>
        <div class="drive-info">
          <h2 class="drive-title">{{ doc.title }}</h2>
          <span class="drive-meta">{{ doc.children?.length || 0 }} items</span>
        </div>
        <div class="drive-arrow">→</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.explorer-landing {
  margin: 0 auto;
  margin-top: calc(var(--md-nav-height) + 32px);
  padding: 0 40px;
  max-width: 1200px;
}

.explorer-header {
  margin-bottom: 40px;
  text-align: center;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  color: var(--md-c-text-1);
  margin-bottom: 8px;
}

.page-subtitle {
  font-size: 16px;
  color: var(--md-c-text-2);
}

.drives-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.drive-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: var(--md-c-bg-soft);
  border: 1px solid var(--md-c-divider-light);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.drive-card:hover {
  transform: translateY(-2px);
  border-color: var(--md-c-brand);
  background: var(--md-c-bg-mute);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.drive-icon {
  font-size: 40px;
}

.drive-info {
  flex: 1;
}

.drive-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--md-c-text-1);
  margin-bottom: 4px;
}

.drive-meta {
  font-size: 14px;
  color: var(--md-c-text-2);
}

.drive-arrow {
  color: var(--md-c-text-3);
  font-size: 20px;
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.2s ease;
}

.drive-card:hover .drive-arrow {
  opacity: 1;
  transform: translateX(0);
  color: var(--md-c-brand);
}
</style>
