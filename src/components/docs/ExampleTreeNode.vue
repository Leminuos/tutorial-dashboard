<script setup>
import { ref } from 'vue'

const props = defineProps({
  // { type: 'folder', key, name, count, children } | { type: 'file', key, file }
  node: { type: Object, required: true },
  depth: { type: Number, default: 0 },
})

const emit = defineEmits(['select'])

// Top-level folders start open so their files show without an extra click;
// deeper folders start closed to keep big examples short. Nodes are keyed by
// path, so a new page mounts fresh nodes with a fresh state.
const open = ref(props.depth === 0)

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

// Show the extension dimmer than the name, like an editor's file explorer
function splitName(name) {
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return { base: name, ext: '' }
  return { base: name.slice(0, dot), ext: name.slice(dot) }
}
</script>

<template>
  <li class="tree-node">
    <template v-if="node.type === 'folder'">
      <button
        class="tree-row folder-row"
        type="button"
        :title="node.name"
        :aria-expanded="open"
        @click="open = !open"
      >
        <svg
          class="chevron"
          :class="{ open }"
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
          <path v-if="open" d="M3 19V6a1 1 0 0 1 1-1h5l2 2.5h8a1 1 0 0 1 1 1v1H7.5L5 19Z" />
          <path v-else d="M3 19V6a1 1 0 0 1 1-1h5l2 2.5h8a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
        </svg>

        <span class="row-label">{{ node.name }}</span>
        <span class="row-count">{{ node.count }}</span>
      </button>

      <ul v-show="open" class="tree-children">
        <ExampleTreeNode
          v-for="child in node.children"
          :key="child.key"
          :node="child"
          :depth="depth + 1"
          @select="emit('select', $event)"
        />
      </ul>
    </template>

    <button
      v-else
      class="tree-row file-row"
      :class="[`type-${node.file.type}`, { 'root-file': depth === 0 }]"
      type="button"
      :title="node.file.name"
      @click="emit('select', node.file)"
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
        v-html="getFileIcon(node.file.type)"
      />
      <span class="row-label file-name">{{ splitName(node.file.name).base }}<span class="file-ext">{{ splitName(node.file.name).ext }}</span></span>
    </button>
  </li>
</template>

<style scoped>
.tree-node {
  list-style: none;
}

/* Guide rail aligned to the centre of the parent's folder icon (8px padding +
   12px chevron + 7px gap + half of the 16px icon), so children read as one branch. */
.tree-children {
  position: relative;
  margin: 2px 0 4px 21px;
  padding: 0 0 0 6px;
  list-style: none;
}

.tree-children::before {
  position: absolute;
  top: 0;
  bottom: 6px;
  left: 0;
  width: 1px;
  content: '';
  background: var(--md-c-divider-light);
  transition: background-color 0.18s ease;
}

.tree-node:hover > .tree-children::before {
  background: var(--md-c-divider);
}

.tree-row {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  min-height: 28px;
  padding: 3px 8px;
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

/* A file at the root has no chevron; indent it so its icon lines up with the
   folder icons above it. */
.root-file {
  padding-left: 27px;
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
  color: var(--file-tint, var(--md-c-text-3));
}

.folder-icon {
  color: var(--md-c-brand);
}

/* Tint per file kind; the icon shapes already differ, color only reinforces */
.type-code { --file-tint: #3b82f6; }
.type-markdown { --file-tint: #64748b; }
.type-pdf { --file-tint: #e5484d; }
.type-excel { --file-tint: #16a34a; }
.type-powerpoint { --file-tint: #ea580c; }
.type-image { --file-tint: #a855f7; }

:global(html.dark) .tree-row.type-code { --file-tint: #60a5fa; }
:global(html.dark) .tree-row.type-markdown { --file-tint: #94a3b8; }
:global(html.dark) .tree-row.type-pdf { --file-tint: #f87171; }
:global(html.dark) .tree-row.type-excel { --file-tint: #4ade80; }
:global(html.dark) .tree-row.type-powerpoint { --file-tint: #fb923c; }
:global(html.dark) .tree-row.type-image { --file-tint: #c084fc; }

.row-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-name {
  font-family: 'Fira Code', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 12.5px;
}

.file-ext {
  color: var(--md-c-text-3);
}

.file-row:hover .file-ext {
  color: var(--md-c-text-2);
}

.row-count {
  flex: 0 0 auto;
  min-width: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--md-c-bg-soft);
  color: var(--md-c-text-2);
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.folder-row:hover .row-count {
  background: var(--md-c-bg);
}

@media (prefers-reduced-motion: reduce) {
  .tree-row,
  .chevron,
  .tree-children::before {
    transition: none;
  }
}
</style>
