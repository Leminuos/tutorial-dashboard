<script setup>
import { computed, provide, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useDocsStore } from '@/stores/docstree'
import SidebarNavItem from '@/components/docs/SidebarNavItem.vue'

const emit = defineEmits(['select', 'select-heading'])
const props = defineProps({
  toggleSidebar: { type: Boolean, required: true },
  toc: { type: Array, default: () => [] },
  tocActive: { type: String, default: '' },
})

const route = useRoute()
const docs = useDocsStore()

const currentDoc = computed(() => {
  const tree = docs.tree
  if (!tree?.docs?.length) return null
  return tree.docs.find((d) => String(d.id) === route.params.section) ?? null
})

const currentPageKey = computed(() => {
  const { section, chapter, page } = route.params
  if (!section || !chapter || !page) return ''
  return `p:${section}/${chapter}/${page}`
})

/**
 * Turn the flat toc ([{ level, text, id }]) into a nested tree so that a
 * heading only reveals the headings one level below it when expanded.
 */
function buildTocTree(items, pageKey) {
  const root = []
  const stack = []

  for (const item of items) {
    const node = {
      key: `${pageKey}#${item.id}`,
      kind: 'heading',
      title: item.text,
      headingId: item.id,
      children: [],
    }

    while (stack.length && stack[stack.length - 1].level >= item.level) stack.pop()

    if (stack.length) stack[stack.length - 1].node.children.push(node)
    else root.push(node)

    stack.push({ level: item.level, node })
  }

  return root
}

// The sidebar header already names the current tutorial, so the tree starts at
// its sections (chapters in the docs tree) instead of repeating that root node.
const navTree = computed(() => {
  const section = currentDoc.value
  if (section?.layout !== 'tutorial') return []

  return (section.chapters || []).map((chapter) => ({
    key: `c:${section.id}/${chapter.id}`,
    kind: 'section',
    title: chapter.title,
    children: (chapter.pages || []).map((page) => {
      const key = `p:${section.id}/${chapter.id}/${page.id}`
      return {
        key,
        kind: 'chapter',
        title: page.title,
        to: `/docs/${section.id}/${chapter.id}/${page.id}`,
        // Headings are only known for the page currently rendered.
        children: key === currentPageKey.value ? buildTocTree(props.toc, key) : [],
      }
    }),
  }))
})

// key -> parent key, used to reveal the branch holding the active item.
const parentMap = computed(() => {
  const map = new Map()

  const walk = (nodes, parentKey) => {
    for (const node of nodes) {
      map.set(node.key, parentKey)
      if (node.children?.length) walk(node.children, node.key)
    }
  }

  walk(navTree.value, null)
  return map
})

const headingKeys = computed(() => {
  const map = new Map()

  const walk = (nodes) => {
    for (const node of nodes) {
      if (node.headingId) map.set(node.headingId, node.key)
      if (node.children?.length) walk(node.children)
    }
  }

  walk(navTree.value)
  return map
})

const expandedKeys = ref(new Set())

function expandBranch(key, { includeSelf = true } = {}) {
  if (!key) return
  let current = includeSelf ? key : parentMap.value.get(key)
  while (current) {
    expandedKeys.value.add(current)
    current = parentMap.value.get(current)
  }
}

function toggle(key) {
  if (expandedKeys.value.has(key)) expandedKeys.value.delete(key)
  else expandBranch(key)
}

function isActive(node) {
  if (node.headingId) return node.headingId === props.tocActive
  if (node.to) return node.key === currentPageKey.value
  return false
}

// Keep the branch of the current page (and of the heading being read) open.
watch(
  [currentPageKey, () => props.tocActive, navTree],
  () => {
    expandBranch(currentPageKey.value)
    expandBranch(headingKeys.value.get(props.tocActive), { includeSelf: false })
  },
  { immediate: true },
)

provide('sidebarNav', {
  isExpanded: (key) => expandedKeys.value.has(key),
  isActive,
  toggle,
  onNavigate: (node) => {
    expandBranch(node.key)
    emit('select')
  },
  onHeading: (node) => {
    expandBranch(node.key)
    emit('select-heading', node.headingId)
  },
})
</script>

<template>
  <aside id="sidebar" class="docs-sidebar" :class="{ active: props.toggleSidebar }">
    <div class="sidebar-header">
      <h1 class="header">{{ currentDoc?.title || "Unknown" }}</h1>
    </div>

    <p v-if="currentDoc?.error" class="sidebar-error">
      Không đọc được mục lục của phần này. Hãy kiểm tra file <code>index.json</code>.
    </p>

    <nav class="sidebar-nav" aria-label="Documentation navigation">
      <ul class="nav-root">
        <sidebar-nav-item
          v-for="node in navTree"
          :key="node.key"
          :node="node"
          :depth="0"
        />
      </ul>
    </nav>

    <div class="sidebar-footer">Designed by Bui Nguyen</div>
  </aside>
</template>

<style scoped>
.docs-sidebar {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 1000;
  width: calc(var(--md-sidebar-expand) + 8px);
  background-color: var(--md-c-bg);
  border-right: 1px solid var(--md-c-divider-light);
  overflow-x: hidden;
  overflow-y: auto;
  transform: translateX(-100%);
  transition: transform 0.5s ease;
}

.docs-sidebar.active {
  padding: 32px 16px;
  transform: translateX(0);
}

/* From tablet up the sidebar shares the navbar gutter, so its first column of
   text starts on the same vertical line as the logo. */
@media (min-width: 960px) {
  .docs-sidebar {
    top: var(--md-nav-height);
    width: calc(var(--md-sidebar-expand) + var(--md-page-gutter));
    padding: 32px var(--md-sidebar-pad-end) 32px var(--md-page-gutter);
    transform: translateX(0);
  }
}

.sidebar-header {
  color: var(--md-c-brand);
  padding-bottom: 24px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--md-c-divider);
}

.sidebar-error {
  margin-bottom: 24px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--md-c-text-2);
}

.sidebar-nav {
  margin-bottom: 24px;
}

.nav-root {
  margin: 0;
  padding: 0;
}

.sidebar-footer {
  padding-top: 20px;
  font-size: 12px;
  font-weight: 700;
  border-top: 1px solid var(--md-c-divider-light);
  color: var(--md-c-text-1);
}
</style>
