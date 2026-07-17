<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDocsStore } from '@/stores/docstree'

const docs = useDocsStore()
const router = useRouter()

const folderDocs = computed(() => docs.folderDocs)

function navigateToFolder(docId) {
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
      <button
        v-for="doc in folderDocs"
        :key="doc.id"
        class="drive-card"
        type="button"
        @click="navigateToFolder(doc.id)"
      >
        <span class="drive-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"></path>
          </svg>
        </span>
        <span class="drive-info">
          <span class="drive-title">{{ doc.title }}</span>
          <span class="drive-meta">{{ doc.children?.length || 0 }} items</span>
        </span>
        <svg class="drive-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M5 12h14"></path>
          <path d="m12 5 7 7-7 7"></path>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.explorer-landing {
  max-width: 1120px;
  margin: 0 auto;
  margin-top: calc(var(--md-nav-height) + 32px);
  padding: 0 32px 48px;
}

.explorer-header {
  margin-bottom: 32px;
  text-align: left;
}

.page-title {
  margin-bottom: 8px;
  color: var(--md-c-text-1);
  font-size: 32px;
  font-weight: 700;
}

.page-subtitle {
  color: var(--md-c-text-2);
  font-size: 16px;
}

.drives-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.drive-card {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 104px;
  padding: 20px;
  color: inherit;
  text-align: left;
  background: var(--md-c-bg-soft);
  border: 1px solid var(--md-c-divider-light);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.drive-card:hover {
  transform: translateY(-2px);
  border-color: var(--md-c-brand);
  background: var(--md-c-bg);
  box-shadow: 0 12px 28px rgba(15, 23, 42, .08);
}

.drive-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  color: var(--md-c-brand);
  background: var(--md-c-brand-soft);
  border-radius: 8px;
}

.drive-icon svg {
  width: 24px;
  height: 24px;
}

.drive-info {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.drive-title {
  color: var(--md-c-text-1);
  font-size: 18px;
  font-weight: 600;
}

.drive-meta {
  color: var(--md-c-text-2);
  font-size: 14px;
}

.drive-arrow {
  width: 20px;
  height: 20px;
  color: var(--md-c-text-3);
  opacity: 0;
  transform: translateX(-10px);
  transition: color 0.2s ease, opacity 0.2s ease, transform 0.2s ease;
}

.drive-card:hover .drive-arrow {
  opacity: 1;
  transform: translateX(0);
  color: var(--md-c-brand);
}

@media (max-width: 768px) {
  .explorer-landing {
    margin-top: calc(var(--md-nav-height) + 24px);
    padding: 0 18px 36px;
  }
}
</style>
