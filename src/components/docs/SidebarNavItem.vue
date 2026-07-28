<script setup>
import { computed, inject } from 'vue'

const props = defineProps({
  node: { type: Object, required: true },
  depth: { type: Number, default: 0 },
})

const nav = inject('sidebarNav')

const hasChildren = computed(() => Boolean(props.node.children?.length))
const expanded = computed(() => hasChildren.value && nav.isExpanded(props.node.key))
const isActive = computed(() => nav.isActive(props.node))
</script>

<template>
  <li class="nav-item">
    <div
      class="nav-row"
      :class="[`kind-${node.kind}`, { active: isActive, expanded }]"
      :style="{ '--nav-indent': `${depth * 12}px` }"
    >
      <button
        v-if="hasChildren"
        class="nav-toggle"
        type="button"
        :aria-expanded="expanded"
        :aria-label="expanded ? `Thu gọn ${node.title}` : `Mở rộng ${node.title}`"
        @click.stop="nav.toggle(node.key)"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="9 6 15 12 9 18"></polyline>
        </svg>
      </button>
      <span v-else class="nav-toggle-spacer" />

      <router-link
        v-if="node.to"
        class="nav-label nav-link"
        :to="node.to"
        @click="nav.onNavigate(node)"
      >
        {{ node.title }}
      </router-link>

      <a
        v-else-if="node.headingId"
        class="nav-label nav-link"
        :href="`#${node.headingId}`"
        @click.prevent="nav.onHeading(node)"
      >
        {{ node.title }}
      </a>

      <button v-else class="nav-label nav-group" type="button" @click="nav.toggle(node.key)">
        {{ node.title }}
      </button>
    </div>

    <ul v-if="expanded" class="nav-children">
      <sidebar-nav-item
        v-for="child in node.children"
        :key="child.key"
        :node="child"
        :depth="depth + 1"
      />
    </ul>
  </li>
</template>

<style scoped>
.nav-item {
  list-style: none;
}

.nav-row {
  display: flex;
  align-items: center;
  gap: 2px;
  padding-left: var(--nav-indent, 0px);
  border-radius: 6px;
}

.nav-row:hover {
  background: var(--md-c-bg-soft);
}

.nav-toggle {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: none;
  color: var(--md-c-text-3);
  cursor: pointer;
}

.nav-toggle:hover {
  color: var(--md-c-text-1);
  background: var(--md-c-divider-light);
}

.nav-toggle svg {
  transition: transform 0.2s ease;
}

.nav-row.expanded .nav-toggle svg {
  transform: rotate(90deg);
}

.nav-toggle-spacer {
  flex: 0 0 auto;
  width: 22px;
}

.nav-label {
  display: block;
  flex: 1 1 auto;
  min-width: 0;
  padding: 5px 4px;
  border: none;
  background: none;
  color: var(--md-c-text-2);
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  text-align: left;
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.25s;
}

.nav-row:hover .nav-label {
  color: var(--md-c-text-1);
}

.nav-row.kind-section .nav-label {
  color: var(--md-c-text-1);
  font-size: 14px;
  font-weight: 700;
}

.nav-row.kind-chapter .nav-label {
  color: var(--md-c-text-1);
  font-weight: 600;
}

.nav-row.kind-heading .nav-label {
  font-size: 13px;
  font-weight: 500;
}

.nav-row.active > .nav-label {
  color: var(--md-c-brand);
  font-weight: 600;
}

.nav-children {
  margin: 0;
  padding: 0;
}
</style>
