<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useDocsStore } from '@/stores/docstree'
import ExampleTreeNode from '@/components/docs/ExampleTreeNode.vue'

const emit = defineEmits(['select-example'])

const route = useRoute()
const docs = useDocsStore()

// Get current page data
const currentPage = computed(() => {
  const { section, chapter, page } = route.params
  return docs.getTutorialPage(section, chapter, page)
})

// Get examples for current page
const examples = computed(() => {
  return currentPage.value?.examples || []
})

// Get attachments for current page
const attachments = computed(() => {
  return currentPage.value?.attachments || []
})

// The button only exists on pages that ship resources; the article itself keeps
// the same width either way.
const hasPanelContent = computed(() => examples.value.length > 0 || attachments.value.length > 0)

const totalFiles = computed(() =>
  examples.value.reduce((sum, ex) => sum + ex.files.length, 0) + attachments.value.length
)

const open = ref(false)
const rootEl = ref(null)

function close() {
  open.value = false
}

function onDocumentClick(e) {
  if (open.value && rootEl.value && !rootEl.value.contains(e.target)) close()
}

function onKeydown(e) {
  if (e.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})

// A new page brings a new set of resources; the popover should not stay open.
watch(examples, close)

/**
 * Turn each example's flat file list into nested folders, using paths relative
 * to the example's `dir`. Folders sort before files, both alphabetically.
 */
function buildExampleTree(example) {
  const root = { type: 'folder', key: example.dir || example.name, name: example.name, children: [] }
  const prefix = example.dir ? `${example.dir}/` : ''

  for (const file of example.files) {
    const rel = prefix && file.path.startsWith(prefix) ? file.path.slice(prefix.length) : file.name
    const parts = rel.split('/')
    let folder = root

    for (const part of parts.slice(0, -1)) {
      let next = folder.children.find(c => c.type === 'folder' && c.name === part)
      if (!next) {
        next = { type: 'folder', key: `${folder.key}/${part}`, name: part, children: [] }
        folder.children.push(next)
      }
      folder = next
    }

    folder.children.push({ type: 'file', key: file.path, file })
  }

  return finalizeFolder(root)
}

function finalizeFolder(folder) {
  let count = 0
  for (const child of folder.children) {
    if (child.type === 'folder') count += finalizeFolder(child).count
    else count += 1
  }
  folder.children.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    const nameA = a.type === 'folder' ? a.name : a.file.name
    const nameB = b.type === 'folder' ? b.name : b.file.name
    return nameA.localeCompare(nameB)
  })
  folder.count = count
  return folder
}

const exampleTree = computed(() => examples.value.map(buildExampleTree))

const attachmentNodes = computed(() =>
  attachments.value.map(file => ({ type: 'file', key: file.path, file }))
)

function onSelectFile(file) {
  close()
  emit('select-example', { file })
}
</script>

<template>
  <div v-if="hasPanelContent" ref="rootEl" class="examples-root">
    <button
      class="examples-toggle"
      :class="{ open }"
      type="button"
      :aria-expanded="open"
      aria-controls="examples-panel"
      @click="open = !open"
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.9"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M3 19V6a1 1 0 0 1 1-1h5l2 2.5h8a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
        <path d="m10.5 12.5-1.75 1.75 1.75 1.75" />
        <path d="m13.5 12.5 1.75 1.75-1.75 1.75" />
      </svg>
      <span class="toggle-label">Ví dụ</span>
      <span class="toggle-count">{{ totalFiles }}</span>
    </button>

    <Transition name="examples-pop">
      <aside v-show="open" id="examples-panel" class="examples-panel" aria-label="Tài nguyên của trang">
        <!-- Examples -->
        <ul v-if="exampleTree.length" class="tree">
          <example-tree-node
            v-for="node in exampleTree"
            :key="node.key"
            :node="node"
            @select="onSelectFile"
          />
        </ul>

        <!-- Attachments -->
        <section class="panel-section" v-if="attachmentNodes.length">
          <h3 class="section-title">Tệp đính kèm</h3>

          <ul class="tree">
            <example-tree-node
              v-for="node in attachmentNodes"
              :key="node.key"
              :node="node"
              @select="onSelectFile"
            />
          </ul>
        </section>
      </aside>
    </Transition>
  </div>
</template>

<style scoped>
.examples-root {
  position: fixed;
  right: max(16px, var(--md-page-gutter, 16px));
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  z-index: 1400;
}

.examples-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 12px 0 14px;
  border: 1px solid var(--md-c-divider-light);
  border-radius: 999px;
  background: var(--md-c-bg);
  color: var(--md-c-text-1);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.12);
  cursor: pointer;
  transition: border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.examples-toggle svg {
  color: var(--md-c-brand);
}

.examples-toggle:hover,
.examples-toggle.open {
  border-color: var(--md-c-brand);
  color: var(--md-c-brand);
}

.examples-toggle:focus-visible {
  outline: 2px solid var(--md-c-brand);
  outline-offset: 2px;
}

.toggle-count {
  min-width: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--md-c-brand) 12%, transparent);
  color: var(--md-c-brand);
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

/* Popover opens above the button, right-aligned to it */
.examples-panel {
  position: absolute;
  right: 0;
  bottom: calc(100% + 10px);
  width: min(320px, calc(100vw - 32px));
  max-height: min(60vh, 480px);
  padding: 8px;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--md-c-divider-light) transparent;
  border: 1px solid var(--md-c-divider-light);
  border-radius: 12px;
  background: var(--md-c-bg);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
  transform-origin: bottom right;
}

:global(html.dark) .examples-toggle,
:global(html.dark) .examples-panel {
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
}

.examples-pop-enter-active,
.examples-pop-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.examples-pop-enter-from,
.examples-pop-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.98);
}

.tree {
  margin: 0;
  padding: 0;
  list-style: none;
}

.panel-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--md-c-divider-light);
}

.panel-section:first-child {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}

.section-title {
  margin: 0 0 6px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--md-c-text-3);
}

@media (prefers-reduced-motion: reduce) {
  .examples-toggle,
  .examples-pop-enter-active,
  .examples-pop-leave-active {
    transition: none;
  }
}
</style>
