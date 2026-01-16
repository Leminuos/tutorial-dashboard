<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useSearchStore } from '@/stores/searchStore'

const router = useRouter()
const searchStore = useSearchStore()
const inputRef = ref(null)
const resultsRef = ref(null)

// Focus input when modal opens
watch(() => searchStore.isOpen, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
})

// Handle search input
function onInput(e) {
  searchStore.search(e.target.value)
}

// Handle keyboard navigation
function onKeydown(e) {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      searchStore.selectNext()
      scrollToSelected()
      break
    case 'ArrowUp':
      e.preventDefault()
      searchStore.selectPrev()
      scrollToSelected()
      break
    case 'Enter':
      e.preventDefault()
      navigateToSelected()
      break
    case 'Escape':
      e.preventDefault()
      searchStore.close()
      break
  }
}

function scrollToSelected() {
  nextTick(() => {
    const selected = resultsRef.value?.querySelector('.result-item.selected')
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' })
    }
  })
}

function navigateToSelected() {
  const result = searchStore.getSelectedResult()
  if (result) {
    router.push(result.path)
    searchStore.close()
  }
}

function onResultClick(result) {
  router.push(result.path)
  searchStore.close()
}

function onOverlayClick(e) {
  if (e.target === e.currentTarget) {
    searchStore.close()
  }
}

// Global keyboard shortcut
function handleGlobalKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    searchStore.open()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown)
})

function getTypeIcon(type) {
  switch (type) {
    case 'sidebar': return '📖'
    case 'dropdown-category': return '📁'
    case 'dropdown-subcategory': return '📂'
    default: return '📄'
  }
}

function highlightMatch(text, query) {
  if (!query || query.length < 2) return text
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="searchStore.isOpen"
        class="search-overlay"
        @click="onOverlayClick"
      >
        <div class="search-modal">
          <!-- Search Input -->
          <div class="search-header">
            <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              ref="inputRef"
              type="text"
              class="search-input"
              placeholder="Search documentation..."
              :value="searchStore.query"
              @input="onInput"
              @keydown="onKeydown"
            />
            <button class="close-btn" @click="searchStore.close">
              <kbd>ESC</kbd>
            </button>
          </div>

          <!-- Results -->
          <div class="search-results" ref="resultsRef">
            <!-- Has Results -->
            <template v-if="searchStore.hasResults">
              <div
                v-for="(result, index) in searchStore.results"
                :key="result.id"
                class="result-item"
                :class="{ selected: index === searchStore.selectedIndex }"
                @click="onResultClick(result)"
                @mouseenter="searchStore.selectedIndex = index"
              >
                <span class="result-icon">{{ getTypeIcon(result.type) }}</span>
                <div class="result-content">
                  <span
                    class="result-title"
                    v-html="highlightMatch(result.title, searchStore.query)"
                  ></span>
                  <span class="result-path">
                    {{ result.section }}
                    <template v-if="result.chapter"> › {{ result.chapter }}</template>
                  </span>
                </div>
                <svg class="result-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            </template>

            <!-- No Results -->
            <div v-else-if="searchStore.showNoResults" class="no-results">
              <p>No results found for "<strong>{{ searchStore.query }}</strong>"</p>
              <p class="hint">Try different keywords</p>
            </div>

            <!-- Initial State -->
            <div v-else class="search-hint">
              <p>Type to search documentation</p>
              <div class="keyboard-hints">
                <span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span>
                <span><kbd>Enter</kbd> to select</span>
                <span><kbd>Esc</kbd> to close</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.search-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10vh;
  backdrop-filter: blur(2px);
}

.search-modal {
  width: 100%;
  max-width: 600px;
  margin: 0 16px;
  background: var(--md-c-white);
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.search-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--md-c-divider-light-2);
}

.search-icon {
  flex-shrink: 0;
  color: var(--md-c-text-light-2);
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 18px;
  background: transparent;
  color: var(--md-c-text-light-1);
}

.search-input::placeholder {
  color: var(--md-c-text-light-2);
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.close-btn kbd {
  display: inline-block;
  padding: 4px 8px;
  font-size: 11px;
  font-family: inherit;
  background: var(--md-c-white-soft);
  border: 1px solid var(--md-c-divider-light-2);
  border-radius: 4px;
  color: var(--md-c-text-light-2);
}

.search-results {
  max-height: 400px;
  overflow-y: auto;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  cursor: pointer;
  transition: background 0.1s;
}

.result-item:hover,
.result-item.selected {
  background: var(--md-c-white-soft);
}

.result-item.selected {
  background: var(--md-c-green);
  color: white;
}

.result-item.selected .result-path {
  color: rgba(255, 255, 255, 0.8);
}

.result-item.selected .result-arrow {
  color: white;
}

.result-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.result-content {
  flex: 1;
  min-width: 0;
}

.result-title {
  display: block;
  font-size: 15px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-title :deep(mark) {
  background: rgba(66, 184, 131, 0.3);
  color: inherit;
  padding: 0 2px;
  border-radius: 2px;
}

.result-item.selected .result-title :deep(mark) {
  background: rgba(255, 255, 255, 0.3);
}

.result-path {
  display: block;
  font-size: 12px;
  color: var(--md-c-text-light-2);
  margin-top: 2px;
}

.result-arrow {
  flex-shrink: 0;
  color: var(--md-c-text-light-2);
}

.no-results,
.search-hint {
  padding: 32px 20px;
  text-align: center;
  color: var(--md-c-text-light-2);
}

.no-results strong {
  color: var(--md-c-text-light-1);
}

.hint {
  font-size: 13px;
  margin-top: 4px;
  opacity: 0.7;
}

.keyboard-hints {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;
  font-size: 12px;
}

.keyboard-hints kbd {
  display: inline-block;
  padding: 2px 6px;
  margin: 0 2px;
  font-size: 11px;
  font-family: inherit;
  background: var(--md-c-white-soft);
  border: 1px solid var(--md-c-divider-light-2);
  border-radius: 4px;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .search-modal,
.modal-leave-active .search-modal {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .search-modal,
.modal-leave-to .search-modal {
  transform: scale(0.95) translateY(-10px);
  opacity: 0;
}
</style>
