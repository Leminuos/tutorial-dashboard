<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useDocsStore } from '@/stores/docstree'

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

// The column is always reserved so the content keeps the same width; this only
// marks the empty state for assistive technology.
const hasPanelContent = computed(() => examples.value.length > 0 || attachments.value.length > 0)

// Folder nodes start open so the files stay visible without an extra click;
// collapsing is there for pages that ship many examples.
const collapsed = ref(new Set())

function isExpanded(name) {
  return !collapsed.value.has(name)
}

function toggle(name) {
  const next = new Set(collapsed.value)
  if (next.has(name)) next.delete(name)
  else next.add(name)
  collapsed.value = next
}

// A new page brings a new set of folders; drop the previous open/closed state.
watch(examples, () => {
  collapsed.value = new Set()
})

// Outline icons drawn on a 24px grid, same visual language as the sidebar
// chevrons. Shapes differ per type so the file kind never relies on color.
const FILE_SHEET = '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>'

const FILE_ICONS = {
  code: `${FILE_SHEET}<path d="M10 12.5 8.5 14.5 10 16.5"/><path d="m14 12.5 1.5 2-1.5 2"/>`,
  pdf: `${FILE_SHEET}<path d="M9 13h6"/><path d="M9 16.5h6"/><path d="M9 9.5h1.5"/>`,
  excel: `${FILE_SHEET}<path d="M9 12.5h6"/><path d="M9 16.5h6"/><path d="M12 12.5v4"/>`,
  powerpoint: `${FILE_SHEET}<rect x="9" y="12" width="6" height="4.5" rx="1"/>`,
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m4 17 4.5-4.5a2 2 0 0 1 2.8 0L20 20"/>',
  markdown: `${FILE_SHEET}<path d="M9 16.5v-4l1.75 2 1.75-2v4"/>`,
}

function getFileIcon(type) {
  return FILE_ICONS[type] || FILE_SHEET
}

function onExampleClick(example, file) {
  emit('select-example', { example, file })
}
</script>

<template>
  <aside class="right-panel" :aria-hidden="!hasPanelContent" aria-label="Tài nguyên của trang">
    <!-- Examples -->
    <section class="panel-section" v-if="examples.length">
      <h3 class="section-title">VÍ DỤ CODE</h3>

      <ul class="tree">
        <li v-for="example in examples" :key="example.name" class="tree-node">
          <button
            class="tree-row folder-row"
            type="button"
            :aria-expanded="isExpanded(example.name)"
            @click="toggle(example.name)"
          >
            <svg
              class="chevron"
              :class="{ open: isExpanded(example.name) }"
              viewBox="0 0 24 24"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <polyline points="9 6 15 12 9 18" />
            </svg>

            <svg
              class="row-icon folder-icon"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path
                v-if="isExpanded(example.name)"
                d="M3 19V6a1 1 0 0 1 1-1h5l2 2.5h8a1 1 0 0 1 1 1v1H7.5L5 19Z"
              />
              <path v-else d="M3 19V6a1 1 0 0 1 1-1h5l2 2.5h8a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
            </svg>

            <span class="row-label" :title="example.name">{{ example.name }}</span>
            <span class="row-count">{{ example.files.length }}</span>
          </button>

          <ul v-show="isExpanded(example.name)" class="tree-children">
            <li v-for="file in example.files" :key="file.path" class="tree-node">
              <button
                class="tree-row file-row"
                type="button"
                :title="file.name"
                @click="onExampleClick(example, file)"
              >
                <svg
                  class="row-icon"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                  v-html="getFileIcon(file.type)"
                />
                <span class="row-label">{{ file.name }}</span>
              </button>
            </li>
          </ul>
        </li>
      </ul>
    </section>

    <!-- Attachments -->
    <section class="panel-section" v-if="attachments.length">
      <h3 class="section-title">Attachments</h3>

      <ul class="tree">
        <li v-for="file in attachments" :key="file.path" class="tree-node">
          <button
            class="tree-row file-row root-file"
            type="button"
            :title="file.name"
            @click="emit('select-example', { file })"
          >
            <svg
              class="row-icon"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
              v-html="getFileIcon(file.type)"
            />
            <span class="row-label">{{ file.name }}</span>
          </button>
        </li>
      </ul>
    </section>
  </aside>
</template>

<style scoped>
.right-panel {
  position: sticky;
  top: calc(var(--md-nav-height) + 40px);
  /* Same width as the left sidebar's text column, at every breakpoint. */
  width: var(--md-sidebar-inner);
  height: fit-content;
  max-height: calc(100vh - var(--md-nav-height) - 72px);
  display: none;
  flex: 0 0 auto;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: var(--md-c-divider-light) transparent;
  /* No right padding: the panel's right edge is the page gutter itself, which
     is what keeps it flush with the navbar container. */
}

@media (min-width: 960px) {
  .right-panel {
    display: block;
  }
}

.panel-section + .panel-section {
  margin-top: 28px;
}

/* Eyebrow label: sits below the article H1 in the hierarchy, so it stays small
   and quiet instead of competing with page headings. */
.section-title {
  margin: 0 0 8px;
  padding-bottom: 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--md-c-text-2);
  border-bottom: 1px solid var(--md-c-divider-light);
}

.tree,
.tree-children {
  margin: 0;
  padding: 0;
  list-style: none;
}

/* Guide rail aligned to the centre of the parent's folder icon (12px chevron
   slot + half of the 16px icon), so children read as one branch. */
.tree-children {
  margin-left: 19px;
  padding-left: 6px;
  border-left: 1px solid var(--md-c-divider-light);
}

.tree-row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-height: 30px;
  padding: 4px 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--md-c-text-2);
  font-family: inherit;
  font-size: 13px;
  line-height: 20px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.18s ease, color 0.18s ease;
}

.tree-row:hover {
  background: var(--md-c-bg-soft);
  color: var(--md-c-text-1);
}

.tree-row:active {
  background: var(--md-c-brand-soft);
}

.tree-row:focus-visible {
  outline: 2px solid var(--md-c-brand);
  outline-offset: -2px;
  color: var(--md-c-text-1);
}

.folder-row {
  font-weight: 600;
  color: var(--md-c-text-1);
}

/* Leaf rows line up with their parent's label instead of its chevron. */
.file-row {
  padding-left: 4px;
}

.root-file {
  padding-left: 24px;
}

.chevron {
  flex: 0 0 auto;
  color: var(--md-c-text-3);
  transition: transform 0.18s ease;
}

.chevron.open {
  transform: rotate(90deg);
}

.row-icon {
  flex: 0 0 auto;
  color: var(--md-c-text-3);
  transition: color 0.18s ease;
}

.folder-icon {
  color: var(--md-c-text-2);
}

.file-row:hover .row-icon,
.file-row:focus-visible .row-icon {
  color: var(--md-c-brand);
}

.row-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-count {
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--md-c-text-3);
}

@media (prefers-reduced-motion: reduce) {
  .tree-row,
  .chevron,
  .row-icon {
    transition: none;
  }
}
</style>
